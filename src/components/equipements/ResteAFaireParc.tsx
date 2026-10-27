// « Ce qu'il reste à faire » en tête de la page Équipements : une ligne par
// geste (`resteAFaireDuParc`), jamais une par appareil — les appareils
// concernés portent la pastille « À compléter » sur leur tuile. Ambre : c'est
// l'attention, pas le retard (charte board, couleur § 4). Ne se pose pas quand
// la liste est vide.

import type { LigneResteAFaire } from "@/lib/equipements/reste-a-faire";
import { CadreACompleter, PuceACompleter } from "@/components/ui-kit/CadreACompleter";
import { OuvrirSuggestions } from "./SuggestionsEnFenetre";

export function ResteAFaireParc({ lignes }: { lignes: LigneResteAFaire[] }) {
  if (lignes.length === 0) return null;
  const pastille = lignes.some((l) => l.cle !== "suggestions");

  return (
    <CadreACompleter
      id="reste-a-faire-titre"
      titre="Ce qu'il reste à faire"
      // Pourquoi, en une phrase (2026-10-27). Les suggestions seules n'en
      // relèvent pas : déclarer, c'est autre chose que dater.
      phrase={pastille ? "Sans ces informations, Rojer ne peut pas calculer vos échéances." : undefined}
    >
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {lignes.map((l) => (
          <li key={l.cle} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-2.5 text-[14px] font-semibold text-[color:var(--board-ink)]">
              <PuceACompleter />
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
    </CadreACompleter>
  );
}
