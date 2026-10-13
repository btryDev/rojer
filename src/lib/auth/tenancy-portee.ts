// Ce que les gardes de portée en LECTURE ajoutent à `tenancy-sonde.ts`, sans
// le modifier (vérification ASVS du 2026-10-13, V8.4.1).
//
// `tenancy-sonde.ts` reste la sonde : son découpage (`fonctions`) et son
// critère d'appartenance (`etablitLAppartenance`) sont repris tels quels. Ce
// module n'y ajoute que trois choses, chacune née d'un trou mesuré :
//
//  1. `normaliser` — `fonctions` ne voit ni `export const x = cache(async
//     function x(`, ni `export function f<T>(`. Trois lectures exportées de
//     `*/queries.ts` lui échappaient (`getDashboardData`,
//     `composerRegistreDeLEtablissement`, `grouperChargeParBatiment`). On
//     réécrit ces formes en déclarations ordinaires avant de découper.
//  2. `PORTEE_RELATIONNELLE` — le prédicat `entreprise: { userId …` posé hors
//     d'un littéral `where: {` (une variable `scope`, un argument de
//     `toutesLesConditions(…)`). C'est aussi la forme que prennent les
//     lectures bornées au compte d'une autre branche (`appareilDuCompte`,
//     `permisDuCompte` : `where: { id, etablissement: { entreprise: { userId
//     } } }`) : elle doit compter comme une portée établie.
//  3. `etablitSaPorteeLocale` — la même récursion que `etablitSaPortee`, mais
//     sur un découpage déjà normalisé, que `etablitSaPortee` (qui relit le
//     fichier) ne verrait pas.
//
// `requireUser` seul NE COMPTE PAS : il prouve l'authentification, pas
// l'appartenance. C'est ce qui laissait passer M2 (`getEtablissement` sans
// son prédicat `userId`, le corps gardant son `requireUser()`).

import { etablitLAppartenance, fonctions, type Fonction } from "./tenancy-sonde";

/** Réécrit les déclarations que `fonctions` ne découpe pas. */
export function normaliser(source: string): string {
  return source
    .replace(
      /^export const (\w+) = cache\(\s*async function \w+\(/gm,
      "export async function $1(",
    )
    .replace(/^export const (\w+) = cache\(\s*async \(/gm, "export const $1 = async (")
    .replace(/^(export )?(async )?function (\w+)<[\s\S]*?>\(/gm, "$1$2function $3(");
}

/** Les fonctions de premier niveau, formes normalisées comprises. */
export function decoupe(source: string): Map<string, Fonction> {
  return new Map(fonctions(normaliser(source)).map((f) => [f.nom, f]));
}

/**
 * Les noms exportés comme valeurs, relevés le plus largement possible — pour
 * la contre-épreuve : tout ce qui est ici doit être vu par `decoupe`, ou n'être
 * pas une fonction.
 */
export function exportsDeValeur(source: string): string[] {
  return [
    ...source.matchAll(/^export (?:async )?(?:function\*? |const |let )(\w+)/gm),
  ].map((m) => m[1]);
}

/** Le prédicat propriétaire posé hors d'un littéral `where: {`. */
export const PORTEE_RELATIONNELLE = /\bentreprise\s*:\s*\{\s*userId\b/;

/** Le corps porte, à lui seul, une portée au propriétaire. */
export function portePortee(corps: string): boolean {
  return etablitLAppartenance(corps) || PORTEE_RELATIONNELLE.test(corps);
}

/** Une lecture Prisma, quel que soit le nom du client, ou une requête brute. */
export const LECTURE =
  /\b\w+\.\w+\.(?:findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy)\(|\.\$queryRaw(?:Unsafe)?\b/;

/** `nom` est référencé comme valeur dans `corps` (pas dans un `typeof`). */
function reference(nom: string, corps: string): boolean {
  return new RegExp(`(?<![\\w$.])(?<!typeof )${nom}\\b`).test(corps);
}

/** `nom` lit en base, lui-même ou par une fonction du même fichier. */
export function litDansLeFichier(
  fns: Map<string, Fonction>,
  nom: string,
  vus = new Set<string>(),
): boolean {
  if (vus.has(nom)) return false;
  vus.add(nom);
  const fn = fns.get(nom);
  if (!fn) return false;
  if (LECTURE.test(fn.corps)) return true;
  for (const autre of fns.keys()) {
    if (autre !== nom && reference(autre, fn.corps) && litDansLeFichier(fns, autre, vus)) {
      return true;
    }
  }
  return false;
}

/** `nom` établit sa portée, lui-même ou par une fonction du même fichier qu'il appelle. */
export function etablitSaPorteeLocale(
  fns: Map<string, Fonction>,
  nom: string,
  vus = new Set<string>(),
): boolean {
  if (vus.has(nom)) return false;
  vus.add(nom);
  const fn = fns.get(nom);
  if (!fn) return false;
  if (portePortee(fn.corps)) return true;
  for (const autre of fns.keys()) {
    if (
      autre !== nom &&
      new RegExp(`(?<![\\w$.])${autre}\\(`).test(fn.corps) &&
      etablitSaPorteeLocale(fns, autre, vus)
    ) {
      return true;
    }
  }
  return false;
}
