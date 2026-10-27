// « Ce qu'il reste à faire » en tête de la page Équipements : une ligne par
// geste, et le bouton qui y mène. La liste est calculée par
// `resteAFaireDuParc` ; elle ne se pose pas quand elle est vide.

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { LigneResteAFaire } from "@/lib/equipements/reste-a-faire";
import { SuggestionsEnFenetre } from "./SuggestionsEnFenetre";

type PanneauSuggestions = Omit<
  React.ComponentProps<typeof SuggestionsEnFenetre>,
  "forme" | "libelle"
>;

export function ResteAFaireParc({
  lignes,
  suggestions,
}: {
  lignes: LigneResteAFaire[];
  /** Ce que la fenêtre des suggestions affiche, pour la ligne qui l'ouvre. */
  suggestions: PanneauSuggestions;
}) {
  if (lignes.length === 0) return null;

  return (
    <section aria-labelledby="reste-a-faire-titre" className="carte-board px-7 py-6 sm:px-8">
      <h2 id="reste-a-faire-titre" className="board-titre m-0 text-[18px]">
        Ce qu&apos;il reste à faire
      </h2>
      <ul className="-mx-7 m-0 mt-4 list-none divide-y divide-[color:var(--board-slate-line)] border-t border-[color:var(--board-slate-line)] p-0 sm:-mx-8">
        {lignes.map((l) => (
          <li
            key={l.cle}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-7 py-4 sm:px-8"
          >
            <div className="min-w-[220px] flex-1">
              <p className="m-0 text-[14px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
                {l.titre}
              </p>
              {l.genre === "questions" ? (
                <ul className="m-0 mt-1 list-none p-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {l.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {l.detail}
                </p>
              )}
            </div>
            {l.genre === "questions" ? (
              <Link href={l.href} className={buttonVariants({ variant: "board", size: "boardSm" })}>
                Répondre
              </Link>
            ) : (
              <SuggestionsEnFenetre {...suggestions} forme="bouton" libelle="Voir les suggestions" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
