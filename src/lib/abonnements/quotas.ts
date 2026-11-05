import "server-only";
// Les plafonds des formules (ADR-053 § 14). Une seule porte : `prendreQuota`,
// appelée DANS la transaction qui crée l'élément plafonné, sous le verrou du
// compte (garde : `quotas-garde.test.ts`). Les utilisateurs passent par les
// limites du plugin d'authentification (`limitesMembresDuPlugin`).

import type { Prisma, PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import { CLES_FORMULES, FORMULES, LIBELLES_PLAFONDS, formuleDeLookupKey, type CleFormule } from "./formules";
import { contexteDroits, offreLancee } from "./saisie";

/** Les plafonds appliqués (les autres clés de `Quotas` ne le sont pas encore). */
export type CleQuota = keyof typeof LIBELLES_PLAFONDS;
/** Ceux que Rojer compte lui-même ; les membres, c'est le plugin. */
export type CleQuotaComptee = Exclude<CleQuota, "membres">;

/** Ceux qui se comptent au journal, sur douze mois glissants. */
const PAR_AN: ReadonlySet<CleQuota> = new Set(["permisDeFeuParAn", "plansDePreventionParAn"]);

/** La formule qui fixe les plafonds : celle de l'abonnement, sinon la plus petite. */
export function formuleDesPlafonds(formule: string | null | undefined): CleFormule {
  const connue = formuleDeLookupKey(formule)?.formule;
  if (connue) return connue;
  console.error(JSON.stringify({ type: "quotas_formule_inconnue", formule: formule ?? null }));
  return CLES_FORMULES[0];
}

/** Le refus, avec la formule qui lève le plafond. */
export function motifDuRefus(actuelle: CleFormule, cle: CleQuota): string {
  const plafond = FORMULES[actuelle].quotas[cle] ?? 0;
  const plus = CLES_FORMULES.find((f) => {
    const q = FORMULES[f].quotas[cle];
    return q === null || q > plafond;
  });
  const suite = plus
    ? `passez à ${FORMULES[plus].libelle} depuis la page Abonnement de votre compte.`
    : "au-delà, la formule Sur mesure s'établit sur devis.";
  return `Votre formule ${FORMULES[actuelle].libelle} couvre ${LIBELLES_PLAFONDS[cle](plafond)} : ${suite}`;
}

/** Une création refusée au plafond ; `motif` se montre tel quel. Lever annule la transaction. */
export class RefusQuota extends Error {
  constructor(readonly motif: string) {
    super(motif);
    this.name = "RefusQuota";
  }
}

type Lecteur = Db | Prisma.TransactionClient;

/** Ce que le compte a déjà, pour une clé (le client est borné au compte). */
async function utilise(db: Lecteur, cle: CleQuotaComptee, maintenant: Date): Promise<number> {
  switch (cle) {
    case "etablissements":
      return db.etablissement.count();
    case "prestataires":
      return db.prestataire.count();
    case "permisDeFeuParAn":
    case "plansDePreventionParAn": {
      const debut = new Date(maintenant);
      debut.setUTCFullYear(debut.getUTCFullYear() - 1);
      return db.consommationQuota.count({ where: { quota: cle, consommeLe: { gt: debut } } });
    }
  }
}

/** La formule de l'abonnement du compte, telle que recopiée de Stripe. */
const formuleDuCompte = async (l: Lecteur | PrismaClient, compteId: string) =>
  (await l.abonnement.findUnique({ where: { compteId }, select: { formule: true } }))?.formule;

/** Le motif du refus si le compte est au plafond, sinon `null`. */
async function auPlafond(db: Lecteur, compteId: string, cle: CleQuotaComptee): Promise<string | null> {
  const formule = formuleDesPlafonds(await formuleDuCompte(db, compteId));
  const plafond = FORMULES[formule].quotas[cle];
  if (plafond === null || (await utilise(db, cle, new Date())) < plafond) return null;
  return motifDuRefus(formule, cle);
}

/**
 * Pré-contrôle SANS verrou, pour refuser avant un travail coûteux (dépôt de
 * fichiers). Ne remplace jamais `prendreQuota`. `null` : pas de refus.
 */
export async function refusQuota(db: Db, compteId: string, cle: CleQuotaComptee): Promise<string | null> {
  if (!offreLancee(contexteDroits())) return null;
  return auPlafond(db, compteId, cle);
}

/**
 * Prendre une unité d'un plafond, dans la transaction (du client borné) qui
 * crée l'élément. Lève `RefusQuota` au plafond, ce qui annule la transaction.
 */
export async function prendreQuota(tx: Prisma.TransactionClient, compteId: string, cle: CleQuotaComptee): Promise<void> {
  if (offreLancee(contexteDroits())) {
    // NO KEY : verrou exclusif entre créations, sans bloquer les insertions
    // d'autres transactions qui référencent le compte (clé étrangère).
    await tx.$queryRaw`SELECT 1 FROM "Compte" WHERE "id" = ${compteId}::uuid FOR NO KEY UPDATE`;
    const motif = await auPlafond(tx, compteId, cle);
    if (motif) throw new RefusQuota(motif);
  }
  if (PAR_AN.has(cle)) await tx.consommationQuota.create({ data: { compteId, quota: cle } });
}

/**
 * Créer un élément plafonné : transaction, porte, création. Le refus revient
 * en valeur, pour être rendu tel quel par l'action.
 */
export async function creerSousPlafond<T>(
  db: Db,
  compteId: string,
  cle: CleQuotaComptee,
  creer: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<{ ok: true; valeur: T } | { ok: false; motif: string }> {
  try {
    const valeur = await db.$transaction(async (tx) => {
      await prendreQuota(tx, compteId, cle);
      return creer(tx);
    });
    return { ok: true, valeur };
  } catch (e) {
    if (e instanceof RefusQuota) return { ok: false, motif: e.motif };
    throw e;
  }
}

/** Le refus d'une invitation au plafond d'utilisateurs, pour le propriétaire du compte. */
export async function motifPlafondMembres(db: Db, compteId: string): Promise<string> {
  return motifDuRefus(formuleDesPlafonds(await formuleDuCompte(db, compteId)), "membres");
}

/** La limite par défaut du plugin d'organisation, inchangée tant que l'offre n'est pas lancée. */
const LIMITE_DU_PLUGIN = 100;

/**
 * Les deux limites du plugin d'authentification pour un compte (ADR-053 §
 * 14) : `membres`, plafond des membres à l'acceptation ; `invitations`,
 * nombre d'invitations en attente admis, le plafond moins les membres — le
 * plugin refuse dès que les invitations en attente l'atteignent. `lecteur` :
 * le client brut de l'adaptateur (le plugin n'a pas de portée).
 */
export async function limitesMembresDuPlugin(
  lecteur: PrismaClient,
  compteId: string,
): Promise<{ membres: number; invitations: number }> {
  if (!offreLancee(contexteDroits())) return { membres: LIMITE_DU_PLUGIN, invitations: LIMITE_DU_PLUGIN };
  const plafond = FORMULES[formuleDesPlafonds(await formuleDuCompte(lecteur, compteId))].quotas.membres;
  if (plafond === null) return { membres: LIMITE_DU_PLUGIN, invitations: LIMITE_DU_PLUGIN };
  const membres = await lecteur.membre.count({ where: { compteId } });
  return { membres: plafond, invitations: Math.max(0, plafond - membres) };
}
