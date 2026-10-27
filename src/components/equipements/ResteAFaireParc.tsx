// « Ce qu'il reste à faire » en tête de la page Équipements : une ligne par
// geste (`resteAFaireDuParc`), jamais une par appareil — les appareils
// concernés portent la pastille « À compléter » sur leur tuile. Ambre : c'est
// l'attention, pas le retard (charte board, couleur § 4). Ne se pose pas quand
// la liste est vide.

import type { LigneResteAFaire } from "@/lib/equipements/reste-a-faire";
import { CadreACompleter, PuceACompleter } from "@/components/ui-kit/CadreACompleter";
import { OuvrirSuggestions } from "./SuggestionsEnFenetre";

export function ResteAFaireParc({
  lignes,
  toutesZones = false,
}: {
  lignes: LigneResteAFaire[];
  /**
   * Un filtre de zone est actif : la liste compte quand même tout le parc — une
   * réponse manquante ne se cache pas derrière un filtre de lieu —, et le dit,
   * sans quoi elle annonce des pastilles que l'écran filtré ne montre pas
   * (revue du 2026-10-27).
   */
  toutesZones?: boolean;
}) {
  if (lignes.length === 0) return null;
  const pastille = lignes.some((l) => l.cle !== "suggestions");
  // La phrase dit ce que manquer coûte, et seulement ce qui est vrai : sans
  // rapport ni mise en service, pas d'échéance ; sans réponse sur l'usage,
  // l'échéance existe mais son rythme peut changer (revue du 2026-10-27).
  const phrase = lignes.some((l) => l.cle === "dates")
    ? "Sans ces informations, Rojer ne peut pas calculer vos échéances."
    : lignes.some((l) => l.cle === "usage")
      ? "Ces réponses décident du rythme de vos vérifications."
      : undefined;

  return (
    <CadreACompleter id="reste-a-faire-titre" titre="Ce qu'il reste à faire" phrase={phrase}>
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
          {toutesZones
            ? "Compté sur toutes vos zones. Les équipements concernés portent la pastille « À compléter »."
            : "Les équipements concernés portent la pastille « À compléter » ci-dessous."}
        </p>
      ) : null}
    </CadreACompleter>
  );
}
