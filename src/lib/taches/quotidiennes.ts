import "server-only";
// Les tâches de Rojer, appelées CHAQUE MINUTE par la crontab de Clever
// Cloud (`clevercloud/cron.json`) au travers de `/api/taches/chaque-minute`.
// La garde est un secret partagé (`TACHES_SECRET`) : sans lui, la route
// n'existe pas.
//
// - Chaque minute : la file Stripe (`stripe/traitement.ts`), reprise de ce
//   que le traitement d'après la réponse du webhook n'a pas fini.
// - Une fois par jour civil, dès 9 h (Paris) : les tâches quotidiennes,
//   enregistrées par jour (`taches/jour.ts`). La crontab tourne sur chaque
//   instance et peut jouer deux fois pendant un déploiement : le bail du
//   jour départage ; une exécution tuée est reprise ; une minute de 9 h
//   manquée est rattrapée à la suivante. Chaque tâche est en outre sans
//   doublon par elle-même (marques conditionnelles).

import { createHash, timingSafeEqual } from "node:crypto";
import { rappelerLaVeilleDeLaFinDEssai } from "@/lib/abonnements/rappels";
import {
  avertirAvantSuppression,
  libererFichiersEnAttente,
  purgerTracesEchues,
  supprimerComptesEchus,
} from "@/lib/abonnements/suppression";
import { alerter } from "@/lib/alertes";
import { composantesCiviles, cleJourCivil } from "@/lib/dates";
import { clientStripe, clientStripeWebhook } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { rapprocher } from "@/lib/stripe/rapprochement";
import { etatDeLaFile, traiterLaFileIci } from "@/lib/stripe/traitement";
import { contexteDroits, offreLancee } from "@/lib/abonnements/lancement";
import { prendreLeJour, terminerLeJour } from "./jour";

function horlogeReelle(): Date {
  return new Date();
}

/** L'heure (Paris) à partir de laquelle les tâches du jour se lancent. */
export const HEURE_DES_TACHES = 9;

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
 * échus (ADR-058), puis le retrait de leurs fichiers du stockage. Une tâche
 * qui échoue n'empêche pas les suivantes. Le ménage (fichiers notés, traces
 * de plus de cinq ans) se fait même offre retirée : il ne s'annonce à personne.
 */
export async function lancerTachesQuotidiennes(maintenant: Date) {
  const config = configurationStripe();
  const menage = async () => ({
    fichiersALiberer: await tenter("fichiers à libérer", () => libererFichiersEnAttente()),
    tracesPurgees: await tenter("traces de comptes supprimés", () => purgerTracesEchues(maintenant)),
    // Le rapprochement avec Stripe : tout client dont l'abonnement court est
    // relu par la file (un événement peut ne jamais être créé).
    ...(config.active ? { rapprochement: await tenter("rapprochement Stripe", () => rapprocher(maintenant)) } : {}),
    ...(config.active ? { fileStripe: await tenter("état de la file Stripe", () => signalerLaFile(maintenant)) } : {}),
  });
  // L'offre pas lancée (ou retirée) : la saisie est ouverte à tous, rien ne
  // se rappelle ni ne se supprime — un compte ne lirait nulle part ce que
  // l'e-mail lui annonce.
  if (!offreLancee(contexteDroits())) return { offreLancee: false as const, ...(await menage()) };
  const stripe = config.active ? clientStripe(config) : null;
  return {
    rappelsVeilleFinEssai: await tenter("rappel de fin d'essai", () => rappelerLaVeilleDeLaFinDEssai(maintenant)),
    avertissementsAvantSuppression: await tenter("avertissements avant suppression", () => avertirAvantSuppression(maintenant)),
    suppressions: await tenter("suppressions", () => supprimerComptesEchus(maintenant, stripe)),
    ...(await menage()),
  };
}

/** L'état de la file Stripe, et une alerte s'il reste des événements bloqués ou des échecs durables. */
async function signalerLaFile(maintenant: Date) {
  const etat = await etatDeLaFile(maintenant);
  if (etat.bloques + etat.enEchecDurable + etat.clientsEnEchecDurable > 0) {
    await alerter("file Stripe à surveiller", [
      `${etat.bloques} événement(s) en attente depuis plus d'une heure`,
      `${etat.enEchecDurable} événement(s) et ${etat.clientsEnEchecDurable} client(s) en échec durable`,
    ]);
  }
  return etat;
}

/**
 * Ce que la crontab de chaque minute lance : la file Stripe, puis les tâches
 * du jour si elles sont dues (dès `HEURE_DES_TACHES`, une fois par jour civil).
 */
export async function lancerTaches(maintenant: () => Date = horlogeReelle) {
  const config = configurationStripe();
  const fileStripe = config.active ? await traiterLaFileIci(clientStripeWebhook(config)) : null;
  return { fileStripe, jour: await lancerTachesDuJour(maintenant()) };
}

export async function lancerTachesDuJour(maintenant: Date) {
  if (composantesCiviles(maintenant).heure < HEURE_DES_TACHES) return { etat: "pas-encore" as const };
  const jour = cleJourCivil(maintenant);
  const jeton = await prendreLeJour(jour, maintenant);
  if (jeton === null) return { etat: "deja-faite-ou-en-cours" as const, jour };
  const bilan = await lancerTachesQuotidiennes(maintenant);
  await terminerLeJour(jour, jeton, new Date(), bilan);
  console.info(`tâches du ${jour} : ${JSON.stringify(bilan)}`);
  return { etat: "faite" as const, jour, bilan };
}

async function tenter<T>(nom: string, tache: () => Promise<T>): Promise<T | { erreur: true }> {
  try {
    return await tache();
  } catch (e) {
    console.error(`tâche quotidienne « ${nom} » en échec — ${e instanceof Error ? e.message : "erreur"}`);
    return { erreur: true };
  }
}
