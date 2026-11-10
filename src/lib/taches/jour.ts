import "server-only";
// L'exécution des tâches quotidiennes, une par jour civil de Paris (ADR-053
// § 5, amendé le 2026-11-10). La crontab tourne sur chaque instance, et deux
// instances numérotées 0 coexistent pendant un déploiement (doc Clever
// Cloud : « a job can then run twice ») : la sûreté vient d'ici, pas de
// `INSTANCE_NUMBER`. Seul usage du client brut pour cette table
// (`portee/imports.test.ts`).
//
// - Prise : la ligne du jour est créée si absente, puis prise par une mise à
//   jour conditionnelle (pas finie, bail libre ou expiré), qui augmente le
//   jeton. Une exécution tuée en route est reprise quand son bail expire.
// - Fin : posée seulement par le jeton qui a pris — une exécution dont le
//   bail a été repris ne marque rien.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Au-delà de la pire exécution (dix suppressions, des e-mails, le rapprochement). */
export const BAIL_DU_JOUR_MS = 30 * 60_000;

/** Prend l'exécution du jour ; rend le jeton, `"faite"`, ou `null` (en cours ailleurs, bail encore valide). */
export async function prendreLeJour(jour: string, maintenant: Date): Promise<number | "faite" | null> {
  await prisma.tacheQuotidienne.createMany({ data: [{ jour }], skipDuplicates: true });
  const lignes = await prisma.$queryRaw<{ jeton: number }[]>`
    UPDATE "TacheQuotidienne"
    SET "bailJeton" = "bailJeton" + 1, "bailJusquAu" = ${new Date(maintenant.getTime() + BAIL_DU_JOUR_MS)}
    WHERE "jour" = ${jour} AND "termineeLe" IS NULL AND ("bailJusquAu" IS NULL OR "bailJusquAu" < ${maintenant})
    RETURNING "bailJeton" AS "jeton"`;
  if (lignes[0]) return lignes[0].jeton;
  const ligne = await prisma.tacheQuotidienne.findUnique({ where: { jour }, select: { termineeLe: true } });
  return ligne?.termineeLe ? "faite" : null;
}

/** Marque l'exécution du jour finie, avec son bilan ; seulement sous le jeton qui l'a prise. */
export async function terminerLeJour(jour: string, jeton: number, maintenant: Date, bilan: unknown): Promise<boolean> {
  const { count } = await prisma.tacheQuotidienne.updateMany({
    where: { jour, bailJeton: jeton, termineeLe: null },
    data: { termineeLe: maintenant, bailJusquAu: null, bilan: bilan as Prisma.InputJsonValue },
  });
  return count === 1;
}
