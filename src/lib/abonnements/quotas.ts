import "server-only";
// Les plafonds des formules (ADR-053 § 14). Une seule porte : `prendreQuota`,
// appelée DANS la transaction qui crée l'élément plafonné, sous le verrou du
// compte (garde : `quotas-garde.test.ts`). Les utilisateurs passent par les
// limites du plugin d'authentification (`limitesMembresDuPlugin`).

import type { Prisma, PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import { CLES_FORMULES, FORMULES, LIBELLES_PLAFONDS, formuleDeLookupKey, type CleFormule } from "./formules";
import { invitationsDuCompte, membresDuCompte } from "@/lib/auth/membres";
import { contexteDroits, offreLancee } from "./saisie";

/** Les plafonds appliqués (les autres clés de `Quotas` ne le sont pas encore). */
export type CleQuota = keyof typeof LIBELLES_PLAFONDS;
/** Ceux que Rojer compte lui-même ; les membres, c'est le plugin. */
export type CleQuotaComptee = Exclude<CleQuota, "membres">;

/** Ceux qui se comptent au journal, depuis la date anniversaire. */
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

/** L'anniversaire d'`ancre` dans l'année `annee` (le 29 février tombe le 28). */
function anniversaire(ancre: Date, annee: number): Date {
  const mois = ancre.getUTCMonth();
  const jour = Math.min(ancre.getUTCDate(), new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate());
  return new Date(Date.UTC(annee, mois, jour, ancre.getUTCHours(), ancre.getUTCMinutes(), ancre.getUTCSeconds(), ancre.getUTCMilliseconds()));
}

/**
 * Le début de l'année en cours des plafonds annuels : le dernier anniversaire
 * du premier abonnement payant du compte (`debutPayantLe`) ; sans lui (essai,
 * jamais payé), les douze derniers mois.
 */
export function debutDeLAnnee(ancre: Date | null | undefined, maintenant: Date): Date {
  if (!ancre) return anniversaire(maintenant, maintenant.getUTCFullYear() - 1);
  const cetteAnnee = anniversaire(ancre, maintenant.getUTCFullYear());
  return cetteAnnee <= maintenant ? cetteAnnee : anniversaire(ancre, maintenant.getUTCFullYear() - 1);
}

/** Ce que le compte a déjà, pour une clé (le client est borné au compte). */
async function utilise(db: Lecteur, cle: CleQuotaComptee, debutAnnee: Date): Promise<number> {
  switch (cle) {
    case "etablissements":
      return db.etablissement.count();
    case "prestataires":
      return db.prestataire.count();
    case "permisDeFeuParAn":
    case "plansDePreventionParAn":
      return db.consommationQuota.count({ where: { quota: cle, consommeLe: { gte: debutAnnee } } });
  }
}

/** La formule et l'ancre annuelle de l'abonnement du compte, recopiées de Stripe. */
const abonnementDesPlafonds = (l: Lecteur | PrismaClient, compteId: string) =>
  l.abonnement.findUnique({ where: { compteId }, select: { formule: true, debutPayantLe: true } });

/** Le motif du refus si le compte est au plafond, sinon `null`. */
async function auPlafond(db: Lecteur, compteId: string, cle: CleQuotaComptee): Promise<string | null> {
  const ligne = await abonnementDesPlafonds(db, compteId);
  const formule = formuleDesPlafonds(ligne?.formule);
  const plafond = FORMULES[formule].quotas[cle];
  if (plafond === null || (await utilise(db, cle, debutDeLAnnee(ligne?.debutPayantLe, new Date()))) < plafond) return null;
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
 * `compteId` : celui de la portée du client (`compte.compteId` de la garde),
 * jamais une valeur reçue — le verrou, en SQL brut, n'est pas borné.
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
  // Avant le lancement, seule la limite par défaut du plugin peut refuser.
  if (!offreLancee(contexteDroits())) return "Ce compte a atteint le nombre maximal d'invitations en attente.";
  return motifDuRefus(formuleDesPlafonds((await abonnementDesPlafonds(db, compteId))?.formule), "membres");
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
  const plafond = FORMULES[formuleDesPlafonds((await abonnementDesPlafonds(lecteur, compteId))?.formule)].quotas.membres;
  if (plafond === null) return { membres: LIMITE_DU_PLUGIN, invitations: LIMITE_DU_PLUGIN };
  const membres = await lecteur.membre.count({ where: { compteId } });
  return { membres: plafond, invitations: Math.max(0, plafond - membres) };
}

/** Un plafond de stock que le compte dépasse pour une formule. */
export type Depassement = { quota: CleQuota; utilise: number; plafond: number };

/** Les plafonds de STOCK : ceux qu'une baisse de formule fait dépasser (les annuels repartent à l'anniversaire). */
const STOCKS = ["etablissements", "membres", "prestataires"] as const satisfies readonly CleQuota[];

/**
 * Ce que le compte dépasse dans la formule `formule` (une `lookup_key`), pour
 * une baisse (ADR-053 § 14) : utilisateurs (invitations en attente
 * comprises) — la baisse est alors refusée —, établissements et prestataires —
 * l'excédent sera gelé. Vide : rien ne dépasse.
 */
export async function depassements(db: Db, compteId: string, formule: string): Promise<Depassement[]> {
  const cible = formuleDesPlafonds(formule);
  const nombres = await Promise.all(
    STOCKS.map(async (cle) => {
      if (cle !== "membres") return utilise(db, cle, new Date());
      const [membres, invitations] = await Promise.all([membresDuCompte(compteId), invitationsDuCompte(compteId)]);
      return membres.length + invitations.length;
    }),
  );
  return STOCKS.flatMap((quota, i) => {
    const plafond = FORMULES[cible].quotas[quota];
    return plafond !== null && nombres[i] > plafond ? [{ quota, utilise: nombres[i], plafond }] : [];
  });
}
