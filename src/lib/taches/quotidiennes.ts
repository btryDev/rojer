import "server-only";
// Les tâches quotidiennes de Rojer, appelées une fois par jour par la
// crontab de Clever Cloud (`clevercloud/cron.json`) au travers de
// `/api/taches/quotidiennes`. La garde est un secret partagé
// (`TACHES_SECRET`) : sans lui, la route n'existe pas. Chaque tâche est
// idempotente — la crontab tourne sur chaque instance, et un déploiement
// peut la jouer deux fois.

import { createHash, timingSafeEqual } from "node:crypto";
import { rappelerLaVeilleDeLaFinDEssai } from "@/lib/abonnements/rappels";

/** Le secret des tâches, ou `null` : la route répond alors 404. */
export function secretDesTaches(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.TACHES_SECRET?.trim();
  return s ? s : null;
}

/** L'en-tête `Authorization: Bearer <secret>` est-il le bon ? Comparaison à temps constant. */
export function appelAutorise(entete: string | null, secret: string): boolean {
  const recu = /^Bearer (.+)$/.exec(entete ?? "")?.[1] ?? "";
  const empreinte = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(empreinte(recu), empreinte(secret));
}

export async function lancerTachesQuotidiennes(maintenant: Date) {
  return { rappelsVeilleFinEssai: await rappelerLaVeilleDeLaFinDEssai(maintenant) };
}
