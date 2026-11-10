import "server-only";

/**
 * Combien d'exports (PDF, ZIP de contrôle) le processus mène de front
 * (audit Next.js du 2026-10-14, H3).
 *
 * LA CAUSE. ~~La mise en page `@react-pdf` est du calcul synchrone : pendant
 * qu'elle tourne, la boucle d'événements ne sert personne d'autre~~
 * [2026-11-10, ADR-059 : en production, la mise en page tourne dans un fil
 * séparé ; la boucle reste libre. La file borne désormais la MÉMOIRE — un fil
 * par export en cours, chacun avec son tas.] Mesuré avant l'ADR-059 :
 * jusqu'à 250 ms d'un tenant par PDF, 470 ms avec quatre ZIP lancés ensemble
 * (`scripts/mesure-exports.ts`). Et quatre ZIP construits ensemble montaient
 * le processus à 1,8 Go. Sur Vercel (Fluid Compute), une instance sert
 * déjà plusieurs requêtes à la fois, et le sémaphore s'y applique par
 * instance ; sur un Node permanent à une instance (Clever Cloud), tous les
 * utilisateurs partagent cette boucle et cette mémoire.
 *
 * LE REMÈDE ICI. Un sémaphore de processus, partagé par toutes les routes
 * d'export : au plus `EXPORTS_SIMULTANES` exports à la fois, quelques-uns en
 * file, et au-delà une réponse 503 avec `Retry-After` — l'utilisateur
 * réessaie, le serveur reste disponible pour les autres. Sur Vercel, chaque
 * instance a le sien : sans danger, et sans effet.
 *
 * Ce n'est pas un ordonnanceur : rien n'est conservé entre deux requêtes, et
 * une file pleine se dit au lieu de grossir.
 */

/**
 * Exports menés de front par défaut, sans `EXPORTS_SIMULTANES` : UN. Mesuré
 * sur quatre ZIP lancés ensemble (`scripts/mesure-exports.ts`, 2026-10-14) :
 * à 1, le plus long blocage de la boucle reste celui d'un seul rendu
 * (~230 ms) ; à 2, deux mises en page s'enchaînent sans rendre la main
 * (~420-470 ms), pour la même durée totale (~8 s) — le calcul est sur un seul
 * fil, mener deux exports de front ne va pas plus vite, et coûte plus de
 * mémoire.
 */
export const EXPORTS_SIMULTANES_DEFAUT = 1;
/** Exports en file, au-delà desquels on répond 503 tout de suite. */
export const EXPORTS_EN_ATTENTE_MAX = 8;
/** Attente maximale en file avant 503, en millisecondes. */
export const ATTENTE_EXPORT_MAX_MS = 20_000;
/** Ce que dit `Retry-After`, en secondes. */
export const REESSAYER_APRES_S = 5;
/**
 * Places qu'une même personne connectée tient à la fois, en cours ET en
 * attente (audit de sécurité du 2026-11-10) : sans cette part, un seul
 * utilisateur, même en essai, gardait la place et la file pleines, et tous
 * les autres recevaient 503. Deux : un export en cours et le suivant qui
 * attend. La part est celle de l'UTILISATEUR (sa session), quels que soient
 * l'établissement ou le DUERP exportés.
 */
export const EXPORTS_PAR_DEMANDEUR_MAX = 2;

/**
 * La forme admise de `EXPORTS_SIMULTANES` : un entier ≥ 1 écrit en chiffres.
 * UNE règle, lue ici et par `src/env.ts` au démarrage : les deux ne peuvent
 * pas se contredire (revue de la PR #127, 2026-10-30).
 */
export const FORME_EXPORTS_SIMULTANES = /^[1-9]\d*$/;

/**
 * La valeur de `EXPORTS_SIMULTANES` : absente, le défaut ; bien formée, sa
 * valeur ; mal formée, une erreur — jamais un repli silencieux, qui ferait
 * tourner l'instance avec un réglage qu'on croit autre.
 */
export function exportsSimultanes(valeur = process.env.EXPORTS_SIMULTANES): number {
  const v = valeur?.trim();
  if (!v) return EXPORTS_SIMULTANES_DEFAUT;
  if (!FORME_EXPORTS_SIMULTANES.test(v)) {
    throw new Error("EXPORTS_SIMULTANES doit être un entier ≥ 1.");
  }
  return Number(v);
}

import { creerLimiteur, type Liberer, type Limiteur } from "@/lib/securite/limiteur";

/** Le limiteur du processus, partagé par toutes les routes d'export. */
const limiteur = creerLimiteur({
  simultanes: exportsSimultanes(),
  enAttenteMax: EXPORTS_EN_ATTENTE_MAX,
  attenteMaxMs: ATTENTE_EXPORT_MAX_MS,
  parDemandeurMax: EXPORTS_PAR_DEMANDEUR_MAX,
});

/** Les en-têtes d'un refus de place : réessayer, texte, jamais en cache. */
const ENTETES_REFUS = {
  "Retry-After": String(REESSAYER_APRES_S),
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
};

/** La réponse d'une file pleine. */
export function reponseExportsSatures(): Response {
  return new Response(
    "Trop d'exports sont en cours de préparation. Réessayez dans quelques secondes.",
    { status: 503, headers: ENTETES_REFUS },
  );
}

/** La réponse à qui tient déjà sa part : ses propres exports, pas le serveur. */
export function reponsePartAtteinte(): Response {
  return new Response(
    "Vos exports précédents sont encore en préparation. Réessayez quand ils sont prêts.",
    { status: 429, headers: ENTETES_REFUS },
  );
}

/**
 * Une place d'export, à libérer quand le travail lourd est fini — ou la
 * réponse (429 ou 503) à rendre telle quelle. À appeler APRÈS les contrôles
 * d'accès : une requête refusée ne doit pas occuper la file.
 *
 * `demandeur` : l'identifiant de l'utilisateur connecté (`user.id`), qui ne
 * tient que sa part de la file (`EXPORTS_PAR_DEMANDEUR_MAX`).
 */
export async function reserverPlaceExport(
  demandeur: string,
  l: Limiteur = limiteur,
): Promise<Liberer | Response> {
  // Lu juste avant `reserver`, sans `await` entre les deux : rien ne se glisse.
  if (l.partAtteinte(demandeur)) return reponsePartAtteinte();
  return (await l.reserver(demandeur)) ?? reponseExportsSatures();
}
