// Pour les tests seulement : un faux module `joindre-realisations`, qui rend
// en mémoire ce que rend sa requête (~~`DISTINCT ON`~~ [2026-10-28 : une
// descente d'index par ligne, `LATERAL … LIMIT 1`]) sur des rapports factices —
// le dernier rapport de chaque ligne.
//
// Les tests qui éprouvent les lectures du calendrier et du tableau de bord le
// branchent par `vi.mock("@/lib/rapports/joindre-realisations", …)`. Le
// départage est celui du moteur (`indexerDernieresRealisations`) ; que le SQL
// rende la même chose est tenu, contre une vraie base, par
// `joindre-realisations.integration.test.ts`.

import { indexerDernieresRealisations } from "./derniere-realisation";
import { projeterDernieresRealisations } from "./projeter-realisations";
import { estResultatRealise, type Resultat } from "./resultats";

export type RapportFactice = {
  verificationId: string;
  dateRapport: Date;
  createdAt?: Date;
  resultat?: string;
};

function indexer(rapports: ReadonlyArray<RapportFactice>, realisesSeulement: boolean) {
  return indexerDernieresRealisations(
    rapports
      .filter((r) => !realisesSeulement || r.resultat === undefined || estResultatRealise(r.resultat as Resultat))
      .map((r) => ({ ...r, createdAt: r.createdAt ?? new Date(0) })),
  );
}

/** Le faux module, sur les rapports que `source` rend au moment de l'appel. */
export function fauxModuleDernieresRealisations(source: () => ReadonlyArray<RapportFactice>) {
  return {
    dernieresRealisationsDeLEtablissement: async () => indexer(source(), true),
    derniersRapportsDeLEtablissement: async () => indexer(source(), false),
    joindreDernieresRealisations: async <T extends { id: string }>(_etablissementId: string, lignes: T[]) =>
      projeterDernieresRealisations(lignes, indexer(source(), true)),
  };
}
