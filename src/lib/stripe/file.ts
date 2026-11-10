import "server-only";
// La file des relectures Stripe (ADR-053 § 5, amendé le 2026-11-10) : une
// ligne par client Stripe (`SynchronisationStripe`), hors compte. Seul usage
// du client brut et du SQL brut pour cette table (`portee/imports.test.ts`).
//
// - Une DEMANDE augmente `demandes` : chaque événement aiguillé, chaque geste
//   de l'utilisateur qui change l'abonnement, le rapprochement quotidien.
//   Le client est dû tant que `demandes > traitees`.
// - Le BAIL (`bailJusquAu`, 3 min) sérialise les relectures d'un même client
//   sans tenir de connexion pendant les appels à Stripe ; son JETON
//   (`bailJeton`, augmenté à chaque prise) est vérifié par la transaction qui
//   écrit : un worker dont le bail a expiré n'écrit rien (`clore`).
// - La clôture ne couvre que les demandes lues à la prise du bail : une
//   demande arrivée pendant la relecture laisse le client dû.
// - Un échec se retente de plus en plus loin (`ESSAIS_EN_MINUTES`, trois
//   jours comme les relances de Stripe), puis devient durable (alerte) ; une
//   nouvelle demande le relance.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Au-delà du pire relecture (une dizaine d'appels de 3 à 5 s). */
export const BAIL_MS = 3 * 60_000;

/** Délai avant l'essai suivant, après le n-ième échec ; au-delà : échec durable. */
export const ESSAIS_EN_MINUTES = [1, 5, 15, 60, 180, 360, 720, 1440, 1440] as const;

/** L'instant du prochain essai après `tentatives` échecs ; `null` : échec durable. */
export function prochainEssai(tentatives: number, maintenant: Date): Date | null {
  const minutes = ESSAIS_EN_MINUTES[tentatives - 1];
  return minutes === undefined ? null : new Date(maintenant.getTime() + minutes * 60_000);
}

/** Une transaction (brute ou bornée : le SQL brut n'est pas borné) ; absente, le client brut. */
type Executeur = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;

const executer = (requete: Prisma.Sql, db?: Executeur) => (db ? db.$executeRaw(requete) : prisma.$executeRaw(requete));

/**
 * Demande une relecture du client. `abonnementId` : le dernier abonnement vu
 * (relu par son identifiant si le client a été supprimé). Relance un échec
 * durable avec tout son cycle d'essais (tentatives remises à zéro) : une
 * demande neuve mérite trois jours, pas un essai puis une alerte.
 */
export async function demanderSynchronisation(
  customerId: string,
  maintenant: Date,
  { abonnementId = null, db }: { abonnementId?: string | null; db?: Executeur } = {},
): Promise<void> {
  await executer(
    Prisma.sql`
    INSERT INTO "SynchronisationStripe" ("customerId", "demandes", "prochainEssaiLe", "abonnementId")
    VALUES (${customerId}, 1, ${maintenant}, ${abonnementId})
    ON CONFLICT ("customerId") DO UPDATE SET
      "demandes" = "SynchronisationStripe"."demandes" + 1,
      "prochainEssaiLe" = LEAST("SynchronisationStripe"."prochainEssaiLe", ${maintenant}),
      "tentatives" = CASE WHEN "SynchronisationStripe"."echecDurableLe" IS NULL THEN "SynchronisationStripe"."tentatives" ELSE 0 END,
      "echecDurableLe" = NULL,
      "abonnementId" = COALESCE(EXCLUDED."abonnementId", "SynchronisationStripe"."abonnementId")`,
    db,
  );
}

/** Demande la relecture de plusieurs clients, en une requête (le rapprochement quotidien). */
export async function demanderSynchronisations(customerIds: string[], maintenant: Date): Promise<void> {
  if (customerIds.length === 0) return;
  await prisma.$executeRaw`
    INSERT INTO "SynchronisationStripe" ("customerId", "demandes", "prochainEssaiLe")
    SELECT c, 1, ${maintenant} FROM unnest(${customerIds}::text[]) AS c
    ON CONFLICT ("customerId") DO UPDATE SET
      "demandes" = "SynchronisationStripe"."demandes" + 1,
      "prochainEssaiLe" = LEAST("SynchronisationStripe"."prochainEssaiLe", ${maintenant}),
      "tentatives" = CASE WHEN "SynchronisationStripe"."echecDurableLe" IS NULL THEN "SynchronisationStripe"."tentatives" ELSE 0 END,
      "echecDurableLe" = NULL`;
}

export type Bail = { customerId: string; jeton: number; demandes: number; tentatives: number; abonnementId: string | null };

/**
 * Prend le bail du client s'il est libre (jamais pris, ou expiré). Rend le
 * jeton et les demandes à couvrir ; `null` : une autre relecture le tient.
 */
export async function prendreBail(customerId: string, maintenant: Date): Promise<Bail | null> {
  const lignes = await prisma.$queryRaw<{ jeton: number; demandes: number; tentatives: number; abonnementId: string | null }[]>`
    UPDATE "SynchronisationStripe"
    SET "bailJeton" = "bailJeton" + 1, "bailJusquAu" = ${new Date(maintenant.getTime() + BAIL_MS)}
    WHERE "customerId" = ${customerId} AND ("bailJusquAu" IS NULL OR "bailJusquAu" < ${maintenant})
    RETURNING "bailJeton" AS "jeton", "demandes", "tentatives", "abonnementId"`;
  const l = lignes[0];
  return l ? { customerId, ...l } : null;
}

/** Les clients dus, les plus anciens d'abord, dont le bail est libre. */
export async function clientsDus(maintenant: Date, combien: number): Promise<string[]> {
  const lignes = await prisma.$queryRaw<{ customerId: string }[]>`
    SELECT "customerId" FROM "SynchronisationStripe"
    WHERE "demandes" > "traitees" AND "echecDurableLe" IS NULL AND "prochainEssaiLe" <= ${maintenant}
      AND ("bailJusquAu" IS NULL OR "bailJusquAu" < ${maintenant})
    ORDER BY "prochainEssaiLe" ASC
    LIMIT ${combien}`;
  return lignes.map((l) => l.customerId);
}

/**
 * Vérifie le jeton du bail et verrouille la ligne jusqu'au commit : à
 * appeler en tête de la transaction qui écrit l'abonnement. `false` : le bail
 * a été repris (jeton changé), la transaction ne doit rien écrire. Une prise
 * concurrente attend le commit, puis relit Stripe après cette écriture.
 */
export async function verrouillerSousBail(db: Executeur, bail: Bail): Promise<boolean> {
  const lignes = await db.$queryRaw<unknown[]>`
    SELECT 1 FROM "SynchronisationStripe"
    WHERE "customerId" = ${bail.customerId} AND "bailJeton" = ${bail.jeton}
    FOR UPDATE`;
  return lignes.length === 1;
}

/**
 * Clôt la relecture sous le bail : les demandes lues à la prise sont
 * couvertes (une demande arrivée depuis laisse le client dû), le bail rendu.
 * `false` si le bail a été repris.
 */
export async function clore(bail: Bail, maintenant: Date, db?: Executeur): Promise<boolean> {
  const n = await executer(
    Prisma.sql`
    UPDATE "SynchronisationStripe"
    SET "traitees" = GREATEST("traitees", ${bail.demandes}), "bailJusquAu" = NULL, "tentatives" = 0,
        "derniereErreur" = NULL, "echecDurableLe" = NULL, "synchroniseLe" = ${maintenant}
    WHERE "customerId" = ${bail.customerId} AND "bailJeton" = ${bail.jeton}`,
    db,
  );
  return n === 1;
}

/** Rend le bail sans couvrir les demandes : le client reste dû, la file le reprend. */
export async function rendreBail(bail: Bail, db?: Executeur): Promise<boolean> {
  const n = await executer(
    Prisma.sql`
    UPDATE "SynchronisationStripe" SET "bailJusquAu" = NULL
    WHERE "customerId" = ${bail.customerId} AND "bailJeton" = ${bail.jeton}`,
    db,
  );
  return n === 1;
}

/**
 * Note un échec sous le bail : essai suivant plus loin, ou échec durable.
 * `motif` : écrit par Rojer, jamais un message reçu. Rend `true` si l'échec
 * devient durable (à signaler).
 */
export async function echouer(bail: Bail, maintenant: Date, motif: string, db?: Executeur): Promise<boolean> {
  const tentatives = bail.tentatives + 1;
  const suivant = prochainEssai(tentatives, maintenant);
  const n = await executer(
    Prisma.sql`
    UPDATE "SynchronisationStripe"
    SET "tentatives" = ${tentatives}, "bailJusquAu" = NULL, "derniereErreur" = ${motif},
        "prochainEssaiLe" = ${suivant ?? maintenant}, "echecDurableLe" = ${suivant ? null : maintenant}
    WHERE "customerId" = ${bail.customerId} AND "bailJeton" = ${bail.jeton}`,
    db,
  );
  return n === 1 && suivant === null;
}

/** Les clients en échec durable, pour le bilan. */
export async function enEchecDurable(): Promise<number> {
  const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS "n" FROM "SynchronisationStripe" WHERE "echecDurableLe" IS NOT NULL`;
  return n;
}
