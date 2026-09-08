// Ce que les deux balayages de portée (`tenancy-lectures.test.ts`,
// `tenancy-ecritures.test.ts`) partagent : la lecture du source et la liste
// des marqueurs. Un seul exemplaire, parce que le mode d'échec de ces gardes
// — un commentaire qui couvre du code nu — est le même pour les deux, et une
// correction faite d'un côté ne doit pas manquer de l'autre.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Retire commentaires et chaînes avant de chercher les marqueurs.
 *
 * ⚠ SANS ÇA, LA GARDE EST DÉCORATIVE, et ça a été vérifié en la cassant : la
 * première rédaction cherchait les marqueurs dans le source brut. En retirant
 * le prédicat d'appartenance de `listerEtatsPermanents` pour éprouver le test,
 * il est resté VERT — parce que le commentaire qui explique le prédicat
 * contient le mot « requireEtablissement ». Le code était nu, la prose le
 * couvrait.
 *
 * C'est le mode d'échec propre aux gardes qui lisent du source, et il est
 * d'autant plus vicieux ici que ce sont les modules les mieux commentés — donc
 * ceux qui expliquent leur portée — qui se seraient exemptés tout seuls.
 */
export function sansCommentairesNiChaines(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, " ")
    .replace(/'(?:[^'\\]|\\.)*'/g, " ");
}

/**
 * Ce qui, dans le corps d'une fonction, établit la portée au user.
 *
 * LES HELPERS DE PORTÉE SE DÉRIVENT, ILS NE SE RECOPIENT PAS.
 * `assertEtablissementOwnership` figurait à la main dans la première liste, et
 * sa jumelle `assertEntrepriseOwnership` — même corps — n'y figurait pas. Une
 * lecture parfaitement scopée a donc été dénoncée le 2026-09-04, et le remède
 * évident aurait été d'ajouter le second nom : c'est-à-dire de réparer la
 * liste en recopiant, ce que ce dépôt s'interdit — une liste qu'on répare
 * ainsi cesse de vérifier.
 *
 * Ils se relèvent donc dans `scope.ts`, qui est l'endroit où ils vivent :
 * tout export nommé `require…` ou `assert…`. Le suivant s'ajoutera de lui-même.
 * S'y ajoutent `requireUser` (qui vit dans `require-user.ts`), le constructeur
 * de prédicat `portee(` et le champ `userId` lui-même, porté dans un `where`.
 */
export function marqueursDePortee(): string[] {
  const source = readFileSync(
    join(process.cwd(), "src/lib/auth/scope.ts"),
    "utf8",
  );
  const helpers = [
    ...source.matchAll(
      /export (?:async function|const) ((?:require|assert)\w+)\b/g,
    ),
  ].map((m) => m[1]);
  if (helpers.length === 0) {
    throw new Error(
      "Aucun helper de portée relevé dans auth/scope.ts. Soit ils ont été " +
        "renommés, soit ce relevé est cassé — dans les deux cas la garde ne " +
        "garde plus, et il faut regarder plutôt que la contourner.",
    );
  }
  return [...helpers, "requireUser", "portee(", "userId"];
}
