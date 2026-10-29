// La projection « dernière réalisation » sur des lignes, pure : hors du moteur
// de calendrier (`derniere-realisation.ts` est scellé par
// `version-moteur.test.ts`), elle ne change rien à ce que la régénération
// écrit. [2026-10-27, plan performance, lot 1a.]

import type { DerniereRealisation } from "./derniere-realisation";

/** Une ligne, et la date et le résultat de sa dernière réalisation. */
export type AvecDerniereRealisation<T> = T & {
  derniereRealisation: Date | null;
  dernierResultat: string | null;
};

/**
 * Joint à des lignes la date et le résultat de leur dernière réalisation, lus
 * dans un index par ligne (`dernieresRealisationsDeLEtablissement`). Pure :
 * l'appelant qui lance la lecture de l'index en parallèle de celle de ses
 * lignes (barre latérale, tableau de bord) projette ici.
 */
export function projeterDernieresRealisations<T extends { id: string }>(
  lignes: T[],
  index: ReadonlyMap<string, DerniereRealisation>,
): AvecDerniereRealisation<T>[] {
  return lignes.map((l) => {
    const derniere = index.get(l.id) ?? null;
    return {
      ...l,
      derniereRealisation: derniere?.dateRapport ?? null,
      dernierResultat: derniere?.resultat ?? null,
    };
  });
}
