import "server-only";
// Les tâches quotidiennes de Rojer, appelées une fois par jour par la
// crontab de Clever Cloud (`clevercloud/cron.json`) au travers de
// `/api/taches/quotidiennes`. La garde est un secret partagé
// (`TACHES_SECRET`) : sans lui, la route n'existe pas. Chaque tâche se joue
// sans doublon — la crontab tourne sur chaque instance, et un déploiement
// peut la jouer deux fois.

import { createHash, timingSafeEqual } from "node:crypto";
import { rappelerLaVeilleDeLaFinDEssai } from "@/lib/abonnements/rappels";
import { avertirAvantSuppression, supprimerComptesEchus } from "@/lib/abonnements/suppression";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";

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

/**
 * Dans cet ordre : les avertissements avant la suppression (une date posée
 * aujourd'hui est à 30 jours au moins), puis la suppression des comptes
 * échus (ADR-058). Une tâche qui échoue n'empêche pas les suivantes.
 */
export async function lancerTachesQuotidiennes(maintenant: Date) {
  const config = configurationStripe();
  const stripe = config.active ? clientStripe(config) : null;
  return {
    rappelsVeilleFinEssai: await tenter("rappel de fin d'essai", () => rappelerLaVeilleDeLaFinDEssai(maintenant)),
    avertissementsAvantSuppression: await tenter("avertissements avant suppression", () => avertirAvantSuppression(maintenant)),
    suppressions: await tenter("suppressions", () => supprimerComptesEchus(maintenant, stripe)),
  };
}

async function tenter<T>(nom: string, tache: () => Promise<T>): Promise<T | { erreur: true }> {
  try {
    return await tache();
  } catch (e) {
    console.error(`tâche quotidienne « ${nom} » en échec — ${e instanceof Error ? e.message : "erreur"}`);
    return { erreur: true };
  }
}
