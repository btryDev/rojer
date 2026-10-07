import { Prisma } from "@prisma/client";

/**
 * Les colonnes `Duerp` au format `ReponsesFermees` (`reponses-fermees.ts`).
 *
 * Une liste FERMÉE, et c'est ce qui autorise `Prisma.raw` plus bas : le nom de
 * colonne est le seul morceau du SQL qui ne peut pas être un paramètre lié, et
 * il ne vient jamais d'un appelant libre — le type l'interdit à la
 * compilation, `COLONNES` le refuse à l'exécution.
 */
export type ColonneReponses = "reponsesActivitesNonCouvertes" | "reponsesTransverses";
const COLONNES: readonly ColonneReponses[] = [
  "reponsesActivitesNonCouvertes",
  "reponsesTransverses",
];

/** Ce dont l'écriture a besoin : le client Prisma, ou une transaction. */
type Executeur = Pick<Prisma.TransactionClient, "$executeRaw">;

/**
 * Écrit UNE réponse dans une colonne de réponses fermées : `true`, `false`, ou
 * `null` pour retirer la clé et rendre le silence de nouveau atteignable.
 * Rend le nombre de lignes touchées — zéro veut dire que le DUERP a disparu,
 * et c'est à l'appelant de ne pas s'en taire.
 *
 * ## Pourquoi du SQL brut
 *
 * Chaque question est une ligne indépendante avec son propre bouton : deux
 * réponses peuvent partir en même temps (deux onglets, un double-clic sur deux
 * lignes voisines). Une lecture-modification-écriture de tout l'objet JSON les
 * faisait se marcher dessus — la seconde repartait de la valeur d'avant et
 * effaçait la première. La clé redevenait **absente**, c'est-à-dire le silence
 * que ce format existe pour distinguer d'un « non ».
 *
 * `jsonb_set` écrit **une seule clé** en un seul UPDATE : le reste de l'objet
 * n'est jamais relu côté application, donc jamais rétabli dans un état périmé.
 * La dernière écriture d'une même clé gagne — un bouton ne répond que de sa
 * question.
 *
 * Trois détails portent le contrat de forme :
 * - `create_missing` à `true` (4ᵉ argument) : une clé jamais répondue est
 *   créée, au lieu d'être ignorée.
 * - le `CASE` sur `jsonb_typeof` : la colonne vaut `NULL` tant que rien n'a été
 *   répondu, et pourrait contenir un scalaire écrit à la main ; `jsonb_set`
 *   échouerait dessus. On repart d'un objet vide — ce que fait déjà
 *   `lireReponsesFermees`.
 * - `to_jsonb(... ::boolean)` : la valeur reste un booléen JSON. En chaîne, la
 *   lecture la rejetterait et la réponse redeviendrait un silence.
 *
 * Le retrait (`null`) suit la même règle avec l'opérateur `-`. Toutes les
 * valeurs venues de l'appelant sont des paramètres liés ; `updatedAt` est posé
 * à la main, parce que le `@updatedAt` de Prisma est appliqué par le client et
 * non par la base.
 *
 * Extrait de `activites/actions.ts` le 2026-10-05, quand les questions
 * transverses ont dû persister leur « non » (ADR-038) : la recopier aurait
 * fait deux écritures concurrentes à garder justes au lieu d'une.
 */
export async function ecrireReponseFermee(
  client: Executeur,
  colonne: ColonneReponses,
  duerpId: string,
  cle: string,
  valeur: boolean | null,
): Promise<number> {
  if (!COLONNES.includes(colonne)) {
    throw new Error(`Colonne de réponses inconnue : ${colonne}`);
  }
  const c = Prisma.raw(`"${colonne}"`);
  return valeur === null
    ? client.$executeRaw(Prisma.sql`
          UPDATE "Duerp"
             SET ${c} =
                   CASE
                     WHEN jsonb_typeof(${c}) = 'object'
                     THEN ${c} - ${cle}::text
                     ELSE '{}'::jsonb
                   END,
                 "updatedAt" = NOW()
           WHERE "id" = ${duerpId}`)
    : client.$executeRaw(Prisma.sql`
          UPDATE "Duerp"
             SET ${c} = jsonb_set(
                   CASE
                     WHEN jsonb_typeof(${c}) = 'object'
                     THEN ${c}
                     ELSE '{}'::jsonb
                   END,
                   ARRAY[${cle}]::text[],
                   to_jsonb(${valeur}::boolean),
                   true
                 ),
                 "updatedAt" = NOW()
           WHERE "id" = ${duerpId}`);
}
