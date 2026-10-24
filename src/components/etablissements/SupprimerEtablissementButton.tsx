"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import {
  supprimerEtablissement,
  type SuppressionResult,
} from "@/lib/etablissements/actions";
import {
  detailSuppressionEtablissement,
  type PerimetreEtablissement,
} from "@/lib/suppression/perimetre";

/**
 * La suppression peut être **refusée par la loi** : les versions figées du DUERP
 * se conservent 40 ans (art. R. 4121-4 CT). L'action ne redirige donc plus
 * systématiquement, elle peut rendre un refus motivé — et ce refus doit être
 * lu par l'utilisateur. Ignorer la valeur de retour, comme on le faisait,
 * produisait le pire des comportements : le clic ne faisait rien, sans un mot
 * d'explication.
 *
 * En cas de succès, l'action redirige côté serveur : le composant ne reçoit
 * rien et la navigation se fait seule.
 *
 * **Ce bouton n'était monté nulle part jusqu'au 2026-09-04** : il existait,
 * il avait été migré vers ce composant de confirmation, et aucun fichier ne
 * l'importait. Il n'y avait donc aucun écran d'où supprimer un établissement,
 * alors que l'ADR-028 laisse un compte en porter plusieurs — le seul recours
 * était de supprimer l'entreprise entière, ce que la conservation du DUERP
 * refuse souvent. Il vit maintenant dans la « zone sensible » de
 * `/etablissements/<id>/modifier`, jumelle de celle de
 * `/entreprises/<id>/modifier` : l'écran où l'on change l'établissement, pas
 * celui où on le consulte tous les jours.
 *
 * Le périmètre est mesuré côté serveur et passé en prop, pour la raison qui a
 * fait mentir la carte de l'entreprise : une question de suppression ne doit
 * annoncer que ce qu'elle a compté.
 */
export function SupprimerEtablissementButton({
  id,
  perimetre,
}: {
  id: string;
  perimetre: PerimetreEtablissement;
}) {
  const [pending, startTransition] = useTransition();
  const [refus, setRefus] = useState<SuppressionResult | null>(null);
  const { demander, confirmation } = useConfirmation();

  const supprimer = () => {
    setRefus(null);
    startTransition(async () => {
      const resultat = await supprimerEtablissement(id);
      if (resultat?.statut === "refus") setRefus(resultat);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="boardClair"
        size="board"
        className="text-[color:var(--board-signal-ink)]"
        disabled={pending}
        onClick={() =>
          demander({
            titre: "Supprimer cet établissement et tout ce qu'il porte ?",
            detail: detailSuppressionEtablissement(perimetre),
            agir: "Supprimer l'établissement",
            alors: supprimer,
          })
        }
      >
        {pending ? "Suppression…" : "Supprimer l'établissement"}
      </Button>

      {confirmation}

      {refus && (
        // Le refus est un état, pas une décoration : champ du signal et
        // encre du signal, jamais l'un sans l'autre.
        <section
          role="alert"
          className="rounded-[22px] bg-[color:var(--board-signal-wash)] px-5 py-4 ring-1 ring-[color:var(--board-signal)]"
        >
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-signal-ink)]">
            Suppression refusée · conservation légale
          </p>
          <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
            {refus.message}
          </p>
          <Link
            href={refus.exportHref}
            className="mt-3 inline-block text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
          >
            Exporter mes documents
          </Link>
        </section>
      )}
    </div>
  );
}
