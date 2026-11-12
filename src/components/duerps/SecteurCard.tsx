"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { choisirSecteur } from "@/lib/duerps/actions";

type Props = {
  duerpId: string;
  secteurId: string;
  nom: string;
  description: string;
  codesNaf: string[];
  recommande: boolean;
  dejaChoisi: boolean;
};

/**
 * Un secteur proposé au choix (2026-11-12, reprise) : nom, description, codes
 * NAF, et un vrai bouton « Choisir ce secteur → » en bas à droite. Les
 * comptes d'unités et de risques sont retirés — ils ne servent pas à choisir.
 * La carte entière n'est plus un bouton : seul le bouton agit.
 */
export function SecteurCard({
  duerpId,
  secteurId,
  nom,
  description,
  codesNaf,
  dejaChoisi,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    // Le choix courant se marque par un liseré d'encre, pas par une seconde
    // ombre recopiée en littéral (interdit 26).
    <div
      className={`carte-board flex h-full flex-col px-7 py-6 sm:px-8 ${
        dejaChoisi
          ? "ring-1 ring-[color:var(--board-ink)] ring-offset-2 ring-offset-[color:var(--board-canvas)]"
          : ""
      }`}
    >
      <h3 className="board-titre m-0 text-[22px]">{nom}</h3>
      <p className="m-0 mt-2.5 text-[12.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {codesNaf.slice(0, 4).map((n) => (
          <span
            key={n}
            className="board-surtitre rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-0.5 text-[color:var(--board-slate-mid)]"
          >
            {n}
          </span>
        ))}
        {codesNaf.length > 4 && (
          <span className="board-surtitre self-center">+{codesNaf.length - 4}</span>
        )}
      </div>

      <div className="mt-auto flex justify-end pt-6">
        <Button
          data-ecriture
          type="button"
          variant="boardClair"
          size="boardSm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await choisirSecteur(duerpId, secteurId);
            });
          }}
        >
          {pending ? "Application…" : "Choisir ce secteur →"}
        </Button>
      </div>
    </div>
  );
}
