import "server-only";
// Le registre des événements Stripe reçus (ADR-053 § 5) : hors compte, écrit
// AVANT toute identité — il dédoublonne les livraisons et empêche deux
// livraisons simultanées de traiter le même événement. Seul usage du client
// brut ici (`portee/imports.test.ts`).
//
// Une ligne par identifiant `evt_…`. La prise en charge pose
// `traitementDebuteLe` par une mise à jour CONDITIONNELLE : de deux livraisons
// simultanées, une seule la gagne, et seule celle qui la tient encore marque
// l'issue (la date de la prise sert de jeton). Une prise plus vieille que
// `PRISE_EXPIREE_MS` est abandonnée (processus tué au milieu) : la livraison
// suivante la reprend.

import { prisma } from "@/lib/prisma";

/** Bien au-delà du pire traitement (quatre appels de 3 s, `OPTIONS_WEBHOOK`). */
export const PRISE_EXPIREE_MS = 2 * 60_000;
/** Stripe ne relance plus après 3 jours ; un renvoi à la main va jusqu'à 30. */
export const CONSERVATION_MS = 45 * 24 * 60 * 60_000;

export type Prise = { etat: "prise"; prise: Date } | { etat: "deja-traite" | "en-cours" };

export async function prendreEnCharge(id: string, type: string, maintenant = new Date()): Promise<Prise> {
  await prisma.evenementStripe.createMany({ data: [{ id, type }], skipDuplicates: true });
  const { count } = await prisma.evenementStripe.updateMany({
    where: {
      id,
      traiteLe: null,
      OR: [
        { traitementDebuteLe: null },
        { traitementDebuteLe: { lt: new Date(maintenant.getTime() - PRISE_EXPIREE_MS) } },
      ],
    },
    data: { traitementDebuteLe: maintenant },
  });
  if (count === 1) return { etat: "prise", prise: maintenant };
  const ligne = await prisma.evenementStripe.findUnique({ where: { id }, select: { traiteLe: true } });
  return { etat: ligne?.traiteLe ? "deja-traite" : "en-cours" };
}

/** `motif` : une raison écrite par Rojer, jamais la charge utile ni un message d'erreur reçu. */
export async function marquerTraite(id: string, prise: Date, motif: string | null = null, maintenant = new Date()) {
  await prisma.evenementStripe.updateMany({
    where: { id, traitementDebuteLe: prise, traiteLe: null },
    data: { traiteLe: maintenant, derniereErreur: motif },
  });
}

/** Rend l'événement à la relance suivante de Stripe. */
export async function marquerEchec(id: string, prise: Date, motif: string) {
  await prisma.evenementStripe.updateMany({
    where: { id, traitementDebuteLe: prise, traiteLe: null },
    data: { traitementDebuteLe: null, derniereErreur: motif },
  });
}

/** Le ménage : index sur `recuLe`. */
export async function oublierLesAnciens(maintenant = new Date()) {
  await prisma.evenementStripe.deleteMany({
    where: { recuLe: { lt: new Date(maintenant.getTime() - CONSERVATION_MS) } },
  });
}
