"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import {
  supprimerEquipement,
  type SuppressionEquipementResult,
} from "@/lib/equipements/actions";

/**
 * Retirer un équipement ne détruit plus son historique : dès qu'une
 * vérification porte un rapport, une action corrective ou une date de
 * réalisation, l'équipement est **désactivé** et ses preuves sont conservées
 * (art. L. 4711-5 CT). Le message de confirmation annonçait exactement
 * l'inverse, et le résultat de l'action — désactivation, ou échec du recalcul
 * des échéances — était jeté.
 *
 * Le bouton vit désormais en pied de fiche, dans un encadré qui dit sa
 * conséquence avant le clic : « retirer » n'est pas « supprimer », et
 * l'écran ne doit pas laisser croire qu'on efface une preuve.
 */
export function SupprimerEquipementButton({
  id,
  label = "Retirer",
  redirectTo,
}: {
  id: string;
  label?: string;
  /** Où aller une fois l'équipement retiré. Sans cela, on reste sur place
   *  — ce qui n'a de sens que si l'écran survit au retrait. */
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [resultat, setResultat] = useState<SuppressionEquipementResult | null>(
    null,
  );
  const router = useRouter();
  const { demander, confirmation } = useConfirmation();

  const estErreur = resultat?.statut === "erreur";

  const retirer = () => {
    setResultat(null);
    startTransition(async () => {
      const res = await supprimerEquipement(id);
      setResultat(res);
      // On ne quitte l'écran que si le retrait a bien eu lieu :
      // sur une erreur, le message doit rester lisible là où il est né.
      if (redirectTo && res.statut !== "erreur") router.push(redirectTo);
    });
  };

  return (
    <div className="space-y-3">
      <Button
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() =>
          demander({
            titre: "Retirer cet équipement du parc ?",
            detail:
              "Il sortira du calendrier et ne générera plus d'échéance. Ses " +
              "rapports de vérification et ses actions correctives restent au " +
              "dossier.",
            agir: "Retirer l'équipement",
            alors: retirer,
          })
        }
      >
        {pending ? "Retrait…" : label}
      </Button>

      {confirmation}

      {resultat && resultat.statut !== "supprime" && (
        <section
          role="alert"
          className={
            "rounded-[18px] px-4 py-3 " +
            (estErreur
              ? "bg-[color:var(--board-signal-wash)]"
              : "bg-[color:var(--board-slate-pale)]")
          }
        >
          <p
            className={
              "board-eyebrow m-0 text-[10px] tracking-[0.16em] " +
              (estErreur
                ? "text-[color:var(--board-signal-ink)]"
                : "text-[color:var(--board-slate-soft)]")
            }
          >
            {estErreur
              ? "Échéances non recalculées"
              : "Équipement retiré · historique conservé"}
          </p>
          <p className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {resultat.message}
          </p>
        </section>
      )}
    </div>
  );
}
