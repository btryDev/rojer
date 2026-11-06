import "server-only";
// Les plafonds des formules (ADR-053 § 14). Une seule porte : `prendreQuota`,
// appelée DANS la transaction qui crée l'élément plafonné, sous le verrou du
// compte (garde : `quotas-garde.test.ts`). Les utilisateurs passent par les
// limites du plugin d'authentification (`limitesMembresDuPlugin`).

import type { Prisma, PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import { invitationsDuCompte, membresDuCompte } from "@/lib/auth/membres";
import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { CLES_FORMULES, FORMULES, LIBELLES_PLAFONDS, LIMITES_ESSAI, formuleDeLookupKey, type CleFormule } from "./formules";
import { contexteDroits, offreLancee } from "./saisie";

/** Les plafonds appliqués (les autres clés de `Quotas` ne le sont pas encore). */
export type CleQuota = keyof typeof LIBELLES_PLAFONDS;
/** Ceux que Rojer compte lui-même ; les membres, c'est le plugin. */
export type CleQuotaComptee = Exclude<CleQuota, "membres">;

/** Ceux qui se comptent au journal, depuis la date anniversaire. */
const PAR_AN = ["permisDeFeuParAn", "plansDePreventionParAn"] as const;
type CleAnnuelle = (typeof PAR_AN)[number];
const estAnnuelle = (cle: CleQuota): cle is CleAnnuelle => (PAR_AN as readonly string[]).includes(cle);

const lancee = () => offreLancee(contexteDroits());

/** La formule qui fixe les plafonds : celle de l'abonnement, sinon la plus petite. */
export function formuleDesPlafonds(formule: string | null | undefined): CleFormule {
  const connue = formuleDeLookupKey(formule)?.formule;
  if (connue) return connue;
  console.error(JSON.stringify({ type: "quotas_formule_inconnue", formule: formule ?? null }));
  return CLES_FORMULES[0];
}

/**
 * L'essai d'un compte : `en_cours` (Stripe le dit `trialing`), ou
 * `paiement_attendu` — le compte n'a JAMAIS payé (`debutPayantLe` vide) : un
 * premier paiement en échec à la fin de l'essai (`past_due`) garde la saisie
 * ouverte, il n'ouvre pas les volumes de la formule. `null` : il a payé.
 */
export type Essai = "en_cours" | "paiement_attendu" | null;
export function essaiDe(ligne: { statut: string | null; debutPayantLe: Date | null } | null): Essai {
  if (ligne?.statut === "trialing") return "en_cours";
  return ligne?.debutPayantLe ? null : "paiement_attendu";
}

/** Ce qui fixe les plafonds d'un compte : sa formule, et l'essai. */
export type Regime = { formule: CleFormule; essai: Essai };

const estLimiteDEssai = (cle: CleQuota): cle is keyof typeof LIMITES_ESSAI => Object.hasOwn(LIMITES_ESSAI, cle);

/** Le plafond d'une clé ; `null` : illimité. Tant que le compte n'a pas payé, les limites de l'essai priment. */
export function plafondDe({ formule, essai }: Regime, cle: CleQuota): number | null {
  return essai && estLimiteDEssai(cle) ? LIMITES_ESSAI[cle] : FORMULES[formule].quotas[cle];
}

/** Le refus, avec ce qui lève le plafond : la formule supérieure, ou le premier paiement. */
export function motifDuRefus(regime: Regime, cle: CleQuota): string {
  const plafond = plafondDe(regime, cle) ?? 0;
  const couvre = LIBELLES_PLAFONDS[cle](plafond);
  if (regime.essai && estLimiteDEssai(cle))
    return regime.essai === "en_cours"
      ? `L'essai gratuit couvre ${couvre} : choisissez votre formule depuis la page Abonnement de votre compte pour en ajouter.`
      : `Tant que votre premier paiement n'est pas confirmé, Rojer garde les limites de l'essai (${couvre}) : réglez votre abonnement depuis la page Abonnement de votre compte.`;
  const plus = CLES_FORMULES.find((f) => {
    const q = FORMULES[f].quotas[cle];
    return q === null || q > plafond;
  });
  const suite = plus
    ? `passez à ${FORMULES[plus].libelle} depuis la page Abonnement de votre compte.`
    : "au-delà, la formule Sur mesure s'établit sur devis.";
  return `Votre formule ${FORMULES[regime.formule].libelle} couvre ${couvre} : ${suite}`;
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
  const d = new Date(ancre);
  const dernierJour = new Date(Date.UTC(annee, ancre.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCFullYear(annee, ancre.getUTCMonth(), Math.min(ancre.getUTCDate(), dernierJour));
  return d;
}

/**
 * Le début de l'année en cours des plafonds annuels : le dernier anniversaire
 * du premier abonnement payant du compte (`debutPayantLe`) ; sans lui (essai,
 * jamais payé), les douze derniers mois. La première année part du début de
 * l'essai (`debutEssai`) s'il le précède — au plus un an avant l'ancre : ce
 * qui a été créé pendant l'essai compte dans la première année payée.
 */
export function debutDeLAnnee(ancre: Date | null | undefined, maintenant: Date, debutEssai?: Date | null): Date {
  if (!ancre) return anniversaire(maintenant, maintenant.getUTCFullYear() - 1);
  const cetteAnnee = anniversaire(ancre, maintenant.getUTCFullYear());
  const debut = cetteAnnee <= maintenant ? cetteAnnee : anniversaire(ancre, maintenant.getUTCFullYear() - 1);
  if (!(debut <= ancre && debutEssai && debutEssai < debut)) return debut;
  // L'essai ne remonte pas au-delà d'un an avant l'ancre : un compte qui paie
  // quatorze mois après son essai n'a pas une première année de vingt-six mois.
  return debutEssai < anniversaire(ancre, ancre.getUTCFullYear() - 1) ? anniversaire(ancre, ancre.getUTCFullYear() - 1) : debutEssai;
}

/** Ce que le compte a déjà, pour une clé (le client est borné au compte). */
async function utilise(db: Lecteur, cle: CleQuotaComptee, debutAnnee: Date): Promise<number> {
  switch (cle) {
    case "etablissements":
      return db.etablissement.count();
    case "prestataires":
      return db.prestataire.count();
    // Toutes les lignes, retirées comprises : retirer puis recréer ne contourne rien.
    case "equipements":
      return db.equipement.count();
    case "prescriptions":
      return db.prescriptionParticuliere.count();
    case "zones":
      return db.batiment.count();
    case "unitesTravail":
      return db.uniteTravail.count({ where: { estTransverse: false } });
    case "permisDeFeuParAn":
    case "plansDePreventionParAn":
      return db.consommationQuota.count({ where: { quota: cle, consommeLe: { gte: debutAnnee } } });
  }
}

/** Le régime et l'année des plafonds du compte, lus sur son abonnement recopié de Stripe. */
async function abonnementDesPlafonds(l: Lecteur | PrismaClient, compteId: string) {
  const ligne = await l.abonnement.findUnique({
    where: { compteId },
    select: { formule: true, statut: true, debutPayantLe: true, essaiUtiliseLe: true },
  });
  const regime: Regime = { formule: formuleDesPlafonds(ligne?.formule), essai: essaiDe(ligne) };
  return { regime, debutAnnee: debutDeLAnnee(ligne?.debutPayantLe, new Date(), ligne?.essaiUtiliseLe) };
}

/** Le verrou de la ligne du compte, pour la durée de la transaction. */
async function verrouiller(tx: Prisma.TransactionClient, compteId: string): Promise<void> {
  // NO KEY : verrou exclusif entre créations, sans bloquer les insertions
  // d'autres transactions qui référencent le compte (clé étrangère).
  await tx.$queryRaw`SELECT 1 FROM "Compte" WHERE "id" = ${compteId}::uuid FOR NO KEY UPDATE`;
}

/**
 * Ce qui reste sous le plafond (`Infinity` : sans limite), avec le régime pour
 * le motif. `verrou` : la transaction où le prendre, seulement s'il y a un
 * plafond — un compte sans limite ne bloque pas ses autres créations.
 */
async function reste(
  db: Lecteur,
  compteId: string,
  cle: CleQuotaComptee,
  verrou?: Prisma.TransactionClient,
): Promise<{ places: number; regime: Regime }> {
  const { regime, debutAnnee } = await abonnementDesPlafonds(db, compteId);
  const plafond = plafondDe(regime, cle);
  if (plafond === null) return { places: Infinity, regime };
  if (verrou) await verrouiller(verrou, compteId);
  return { places: Math.max(0, plafond - (await utilise(db, cle, debutAnnee))), regime };
}

/**
 * Pré-contrôle SANS verrou, pour refuser avant un travail coûteux (dépôt de
 * fichiers, création d'un DUERP). Ne remplace jamais `prendreQuota`.
 */
export async function refusQuota(db: Db, compteId: string, cle: CleQuotaComptee, nombre = 1): Promise<string | null> {
  if (!lancee()) return null;
  const { places, regime } = await reste(db, compteId, cle);
  return places >= nombre ? null : motifDuRefus(regime, cle);
}

/**
 * Prendre `nombre` unités d'un plafond, dans la transaction (du client borné)
 * qui crée les éléments. Lève `RefusQuota` si elles n'y tiennent pas toutes,
 * ce qui annule la transaction. `compteId` : celui de la portée du client
 * (`compte.compteId` de la garde), jamais une valeur reçue — le verrou, en
 * SQL brut, n'est pas borné.
 */
export async function prendreQuota(
  tx: Prisma.TransactionClient,
  compteId: string,
  cle: CleQuotaComptee,
  nombre = 1,
): Promise<void> {
  if (lancee()) {
    const { places, regime } = await reste(tx, compteId, cle, tx);
    if (places < nombre) throw new RefusQuota(motifDuRefus(regime, cle));
  }
  if (estAnnuelle(cle))
    await creerEnLotVerifie(tx, "ConsommationQuota", Array.from({ length: nombre }, () => ({ compteId, quota: cle })));
}

/**
 * Les places qui restent sous un plafond, sous le verrou (`Infinity` : sans
 * limite) : pour ne créer qu'une partie d'un lot (unités suggérées), sans
 * refuser. Pas pour les plafonds annuels, qui s'inscrivent au journal.
 */
export async function placesSousLePlafond(
  tx: Prisma.TransactionClient,
  compteId: string,
  cle: Exclude<CleQuotaComptee, CleAnnuelle>,
): Promise<number> {
  if (!lancee()) return Infinity;
  return (await reste(tx, compteId, cle, tx)).places;
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
  nombre = 1,
): Promise<{ ok: true; valeur: T } | { ok: false; motif: string }> {
  try {
    const valeur = await db.$transaction(async (tx) => {
      await prendreQuota(tx, compteId, cle, nombre);
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
  if (!lancee()) return "Ce compte a atteint le nombre maximal d'invitations en attente.";
  return motifDuRefus((await abonnementDesPlafonds(db, compteId)).regime, "membres");
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
  if (!lancee()) return { membres: LIMITE_DU_PLUGIN, invitations: LIMITE_DU_PLUGIN };
  const plafond = plafondDe((await abonnementDesPlafonds(lecteur, compteId)).regime, "membres");
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
  const cible: Regime = { formule: formuleDesPlafonds(formule), essai: null };
  const nombres = await Promise.all(
    STOCKS.map(async (cle) => {
      if (cle !== "membres") return utilise(db, cle, new Date());
      const [membres, invitations] = await Promise.all([membresDuCompte(compteId), invitationsDuCompte(compteId)]);
      return membres.length + invitations.length;
    }),
  );
  return STOCKS.flatMap((quota, i) => {
    const plafond = plafondDe(cible, quota);
    return plafond !== null && nombres[i] > plafond ? [{ quota, utilise: nombres[i], plafond }] : [];
  });
}
