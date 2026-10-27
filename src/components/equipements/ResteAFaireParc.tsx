// « Ce qu'il reste à faire » en tête de la page Équipements : une ligne par
// geste (`resteAFaireDuParc`), jamais une par appareil — les appareils
// concernés portent la pastille « À compléter » sur leur tuile. Ambre : c'est
// l'attention, pas le retard (charte board, couleur § 4). Ne se pose pas quand
// la liste est vide.

import type { LigneResteAFaire } from "@/lib/equipements/reste-a-faire";
import { OuvrirSuggestions } from "./SuggestionsEnFenetre";

export function ResteAFaireParc({ lignes }: { lignes: LigneResteAFaire[] }) {
  if (lignes.length === 0) return null;
  const pastille = lignes.some((l) => l.cle !== "suggestions");

  return (
    <section
      aria-labelledby="reste-a-faire-titre"
      className="rounded-[30px] bg-[color:var(--board-amber-wash)] px-7 py-5 shadow-[inset_0_0_0_1px_var(--board-amber)] sm:px-8"
    >
      <h2
        id="reste-a-faire-titre"
        className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-amber-ink)]"
      >
        Ce qu&apos;il reste à faire
      </h2>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {lignes.map((l) => (
          <li key={l.cle} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-2.5 text-[14px] font-semibold text-[color:var(--board-ink)]">
              <span
                aria-hidden
                className="size-[8px] flex-none rounded-full bg-[color:var(--board-amber)] shadow-[inset_0_0_0_1px_var(--board-amber-ink)]"
              />
              {l.texte}
            </span>
            {l.cle === "suggestions" ? <OuvrirSuggestions forme="bouton" libelle="Voir les suggestions" /> : null}
          </li>
        ))}
      </ul>
      {pastille ? (
        <p className="m-0 mt-3 text-[12.5px] text-[color:var(--board-slate-mid)]">
          Les équipements concernés portent la pastille « À compléter » ci-dessous.
        </p>
      ) : null}
    </section>
  );
}
