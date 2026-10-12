/**
 * L'« Historique des versions » qu'imprime le PDF d'une version du DUERP.
 *
 * Une version ne connaît que celles qui l'ont précédée, et elle-même. Le PDF
 * de la v1, rouvert après la v3, listait la v2 et la v3 (audit du
 * 2026-10-12) : un document daté d'hier qui cite ce qui s'est passé depuis.
 * Les trois surfaces qui impriment le document — la version, l'aperçu du
 * brouillon, le ZIP du contrôle — passent par ici.
 *
 * Module pur : ni Prisma, ni React.
 */

export type LigneHistorique = {
  numero: number;
  genereLe: string;
  motif: string | null;
};

export function historiqueJusqua(
  versions: ReadonlyArray<{ numero: number; createdAt: Date; motif: string | null }>,
  numero: number,
): LigneHistorique[] {
  return versions
    .filter((v) => v.numero <= numero)
    .map((v) => ({
      numero: v.numero,
      genereLe: v.createdAt.toISOString(),
      motif: v.motif,
    }));
}
