import "server-only";
// Les créneaux du rendez-vous annuel (ADR-063) : une table hors compte, que le
// client borné ne lit ni n'écrit (`portee/correspondance.ts`). Ils sont ouverts
// hors de l'application — par script, puis par un agent qui lit un agenda.
// Rojer n'en fait que trois choses, en SQL paramétré : lire les libres,
// prendre un créneau s'il l'est encore, le rendre. Nommé dans la garde du SQL
// brut (`portee/imports.test.ts`).
//
// Les colonnes sont des TIMESTAMP(3) sans fuseau où Prisma range de l'UTC
// (ADR-011 § 1) : l'heure de la base se convertit en UTC, comme ailleurs.

import type { Prisma } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";

export type Creneau = { id: string; debut: Date; fin: Date };

/** La fenêtre où un créneau se prend (`fenetreDesCreneaux`). */
export type Fenetre = { depuis: Date; jusqua: Date };

/** Les créneaux libres qui commencent dans la fenêtre, dans l'ordre. */
export async function creneauxLibres(db: Db, { depuis, jusqua }: Fenetre): Promise<Creneau[]> {
  return db.$queryRaw<Creneau[]>`
    SELECT "id", "debut", "fin" FROM "CreneauAssistance"
    WHERE "reserveLe" IS NULL
      AND "debut" >= (${depuis}::timestamptz AT TIME ZONE 'UTC')
      AND "debut" < (${jusqua}::timestamptz AT TIME ZONE 'UTC')
    ORDER BY "debut"
    LIMIT 200`;
}

/**
 * Prend le créneau s'il est encore libre et commence dans la fenêtre : une
 * écriture conditionnelle, que deux comptes ne gagnent jamais ensemble.
 * `null` : pris entre-temps, hors de la fenêtre, ou inconnu.
 */
export async function prendreLeCreneau(
  tx: Prisma.TransactionClient,
  id: string,
  { depuis, jusqua }: Fenetre,
): Promise<Creneau | null> {
  const [pris] = await tx.$queryRaw<Creneau[]>`
    UPDATE "CreneauAssistance" SET "reserveLe" = (now() AT TIME ZONE 'UTC')
    WHERE "id" = ${id}::uuid AND "reserveLe" IS NULL
      AND "debut" >= (${depuis}::timestamptz AT TIME ZONE 'UTC')
      AND "debut" < (${jusqua}::timestamptz AT TIME ZONE 'UTC')
    RETURNING "id", "debut", "fin"`;
  return pris ?? null;
}

/**
 * Le créneau est-il pris ? `null` s'il n'existe pas. Lu après un refus de
 * `prendreLeCreneau`, pour dire « pris » ou « hors de la fenêtre ».
 */
export async function creneauEstPris(tx: Prisma.TransactionClient, id: string): Promise<boolean | null> {
  const [ligne] = await tx.$queryRaw<{ pris: boolean }[]>`
    SELECT ("reserveLe" IS NOT NULL) AS "pris" FROM "CreneauAssistance" WHERE "id" = ${id}::uuid`;
  return ligne ? ligne.pris : null;
}

/** Rend le créneau d'un rendez-vous déplacé ou annulé : il redevient libre. */
export async function rendreLeCreneau(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$executeRaw`UPDATE "CreneauAssistance" SET "reserveLe" = NULL WHERE "id" = ${id}::uuid`;
}
