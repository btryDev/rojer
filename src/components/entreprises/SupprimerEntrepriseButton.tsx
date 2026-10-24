"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import {
  supprimerEntreprise,
  type SuppressionEntrepriseResult,
} from "@/lib/entreprises/actions";
import {
  detailSuppressionEntreprise,
  type PerimetreEntreprise,
} from "@/lib/suppression/perimetre";

/**
 * Même logique que la suppression d'établissement : le refus de conservation
 * (art. R. 4121-4 CT) n'est pas une erreur technique, c'est une réponse que
 * l'utilisateur doit pouvoir lire. En cas de succès l'action redirige, donc le
 * composant ne reçoit rien.
 *
 * **Le périmètre est une prop, et il est mesuré.** La carte annonçait
 * « L'établissement s'en va avec elle » — au singulier, écrit en dur, sans rien
 * compter — pendant que l'ADR-028 laissait un compte en porter autant qu'il en
 * tient et que le dossier de démonstration en portait deux. Le composant ne
 * sait plus rien du dossier : il reçoit ce que le serveur a compté
 * (`lib/suppression/queries.ts`) et le met en mots
 * (`lib/suppression/perimetre.ts`).
 */
export function SupprimerEntrepriseButton({
  id,
  perimetre,
}: {
  id: string;
  perimetre: PerimetreEntreprise;
}) {
  const [pending, startTransition] = useTransition();
  const [refus, setRefus] = useState<SuppressionEntrepriseResult | null>(null);
  const { demander, confirmation } = useConfirmation();

  const supprimer = () => {
    setRefus(null);
    startTransition(async () => {
      const resultat = await supprimerEntreprise(id);
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
            titre: "Supprimer cette entreprise et tout son dossier ?",
            detail: detailSuppressionEntreprise(perimetre),
            agir: "Supprimer l'entreprise",
            alors: supprimer,
          })
        }
      >
        {pending ? "Suppression…" : "Supprimer l'entreprise"}
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
