import "server-only";
// Le registre des événements Stripe reçus (ADR-053 § 5, amendé le
// 2026-11-10) : hors compte, écrit AVANT toute identité. Seul usage du
// client brut ici (`portee/imports.test.ts`).
//
// Une ligne par identifiant `evt_…`, insérée « si absente » par le webhook,
// qui répond aussitôt : un doublon ne crée rien. L'aiguillage suit, hors de
// la requête : la prise pose `traitementDebuteLe` par une mise à jour
// CONDITIONNELLE (la date de la prise sert de jeton) ; seule la prise
// encore en place marque l'issue. Une prise plus vieille que
// `PRISE_EXPIREE_MS` est abandonnée (processus tué) et reprise. Un échec se
// retente de plus en plus loin (`prochainEssai`), puis devient durable.

import { prisma } from "@/lib/prisma";
import { demanderSynchronisation, prochainEssai } from "./file";

/** Bien au-delà du pire aiguillage (deux ou trois appels de 3 s, `clientStripeWebhook`). */
export const PRISE_EXPIREE_MS = 2 * 60_000;
/** Stripe ne relance plus après 3 jours ; un renvoi à la main va jusqu'à 30. */
export const CONSERVATION_MS = 45 * 24 * 60 * 60_000;

/** Enregistre l'événement s'il ne l'est pas déjà ; `false` : doublon. */
export async function enregistrer(id: string, type: string, objetId: string | null): Promise<boolean> {
  const { count } = await prisma.evenementStripe.createMany({ data: [{ id, type, objetId }], skipDuplicates: true });
  return count === 1;
}

export type EvenementAAiguiller = { id: string; type: string; objetId: string | null; tentatives: number };

const prisePerimee = (maintenant: Date) => ({
  OR: [{ traitementDebuteLe: null }, { traitementDebuteLe: { lt: new Date(maintenant.getTime() - PRISE_EXPIREE_MS) } }],
});

/** À aiguiller : pas encore aiguillé, ni en échec durable, à l'heure de son essai, prise libre ou abandonnée. */
const aAiguiller = (maintenant: Date) => ({
  traiteLe: null,
  echecDurableLe: null,
  AND: [{ OR: [{ prochainEssaiLe: null }, { prochainEssaiLe: { lte: maintenant } }] }, prisePerimee(maintenant)],
});

/** Les événements à aiguiller, les plus anciens d'abord. */
export async function evenementsAAiguiller(maintenant: Date, combien: number): Promise<EvenementAAiguiller[]> {
  return prisma.evenementStripe.findMany({
    where: aAiguiller(maintenant),
    orderBy: { recuLe: "asc" },
    take: combien,
    select: { id: true, type: true, objetId: true, tentatives: true },
  });
}

/** Prend l'événement ; la date rendue est le jeton. `null` : un autre worker le tient, ou il est déjà aiguillé. */
export async function prendre(id: string, maintenant: Date): Promise<Date | null> {
  const { count } = await prisma.evenementStripe.updateMany({
    where: { id, ...aAiguiller(maintenant) },
    data: { traitementDebuteLe: maintenant },
  });
  return count === 1 ? maintenant : null;
}

export type Aiguillage = {
  /** Le client Stripe à relire ; `null` : rien à suivre. */
  clientStripe: string | null;
  abonnementId?: string | null;
  /** Écrit par Rojer, jamais la charge utile. */
  motif?: string | null;
};

/**
 * L'issue de l'aiguillage, en UNE transaction sans appel réseau : le client
 * marqué « à relire » et l'événement marqué aiguillé, ou rien des deux (la
 * prise a été reprise entre-temps). Rend `false` dans ce cas.
 */
export async function marquerAiguille(
  id: string,
  prise: Date,
  a: Aiguillage,
  dureeMs: number,
  maintenant: Date,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.evenementStripe.updateMany({
      where: { id, traitementDebuteLe: prise, traiteLe: null },
      data: { traiteLe: maintenant, clientStripe: a.clientStripe, derniereErreur: a.motif ?? null, dureeMs },
    });
    if (count !== 1) return false;
    if (a.clientStripe) await demanderSynchronisation(a.clientStripe, maintenant, { abonnementId: a.abonnementId, db: tx });
    return true;
  });
}

/**
 * Rend l'événement à un essai suivant, ou le déclare en échec durable. Rend
 * `true` si l'échec devient durable (à signaler).
 */
export async function marquerEchec(
  e: Pick<EvenementAAiguiller, "id" | "tentatives">,
  prise: Date,
  motif: string,
  maintenant: Date,
): Promise<boolean> {
  const tentatives = e.tentatives + 1;
  const suivant = prochainEssai(tentatives, maintenant);
  const { count } = await prisma.evenementStripe.updateMany({
    where: { id: e.id, traitementDebuteLe: prise, traiteLe: null },
    data: {
      traitementDebuteLe: null,
      tentatives,
      derniereErreur: motif,
      prochainEssaiLe: suivant ?? maintenant,
      echecDurableLe: suivant ? null : maintenant,
    },
  });
  return count === 1 && suivant === null;
}

/** Le ménage : index sur `recuLe`. Un événement en échec durable part aussi, après 45 jours. */
export async function oublierLesAnciens(maintenant = new Date()) {
  await prisma.evenementStripe.deleteMany({
    where: { recuLe: { lt: new Date(maintenant.getTime() - CONSERVATION_MS) } },
  });
}

/** Ce que la file porte encore, pour le bilan et l'alerte. */
export async function etatDesEvenements(maintenant: Date) {
  const [enAttente, bloques, enEchecDurable] = await Promise.all([
    prisma.evenementStripe.count({ where: { traiteLe: null, echecDurableLe: null } }),
    // En attente depuis plus d'une heure : la file ne se vide plus.
    prisma.evenementStripe.count({
      where: { traiteLe: null, echecDurableLe: null, recuLe: { lt: new Date(maintenant.getTime() - 60 * 60_000) } },
    }),
    prisma.evenementStripe.count({ where: { echecDurableLe: { not: null } } }),
  ]);
  return { enAttente, bloques, enEchecDurable };
}
