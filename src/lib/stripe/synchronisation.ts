import "server-only";
// Recopier chez Rojer l'état d'un client Stripe (ADR-053 § 5). Une seule
// voie, quel que soit l'événement reçu : relire le client et ses abonnements
// par l'API, retenir l'abonnement courant, l'écrire. L'ordre d'arrivée des
// événements, que Stripe ne garantit pas, cesse de compter.
//
// - Le compte est le `metadata.compteId` posé par Rojer sur le client Stripe
//   relu, ou à défaut sur l'abonnement (seul encore lisible d'un client
//   supprimé) — jamais un identifiant pris dans la notification. Un client
//   créé avant l'ADR-054 ne porte que `metadata.userId` : le compte est alors
//   celui dont cette personne est l'unique propriétaire.
// - La ligne n'est écrite que si elle porte CE client Stripe ; un conflit
//   (autre client, autre compte, compte disparu) ne s'écrit pas : il se
//   signale (`alerte`).
// - Les relectures d'un même client sont SÉRIALISÉES (ADR-053 § 5, amendé le
//   2026-11-10) : chacune tient le bail du client (`file.ts`), et
//   l'écriture se fait dans une transaction qui vérifie d'abord le jeton du
//   bail, ligne verrouillée jusqu'au commit — un worker dont le bail a
//   expiré n'écrit rien. Les listes v1 de Stripe étant immédiatement
//   cohérentes, une relecture qui commence après la précédente voit au moins
//   ce qu'elle a vu : la dernière écrite est la plus fraîche.
// - En second rempart, écriture conditionnelle sur `relueLe` (l'heure du
//   début de la relecture) : une relecture lancée plus tôt n'écrase pas une
//   lancée plus tard.
// - Une liste tronquée par la pagination est un échec, jamais un état
//   complet ; une erreur de Stripe n'écrit rien (aucun droit retiré).

import Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { alerter } from "@/lib/alertes";
import { type Bail, clore, demanderSynchronisation, echouer, prendreBail, rendreBail, verrouillerSousBail } from "./file";
import { clientDuClientStripe } from "@/lib/auth/compte-hors-session";
import { compteDontEstProprietaire } from "@/lib/auth/membres";
import { OPTIONS_WEBHOOK } from "./client";
import { formuleDuPrix } from "@/lib/abonnements/formules";
import { OUVRENT } from "@/lib/abonnements/droits";

/** L'identifiant d'une référence Stripe, développée ou non. */
export const idStripe = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Rang d'un état pour retenir l'abonnement courant : celui qui paie d'abord,
 * puis l'impayé ou suspendu, puis celui qui attend son premier paiement,
 * puis les terminés. Un état inconnu passe avec les impayés.
 */
const RANGS: Record<string, number> = {
  active: 0,
  trialing: 0,
  past_due: 0,
  unpaid: 1,
  paused: 1,
  incomplete: 2,
  canceled: 3,
  incomplete_expired: 3,
};
const rang = (s: Stripe.Subscription) => RANGS[s.status] ?? 1;

const date = (s: number | null | undefined) => (s ? new Date(s * 1000) : null);

/**
 * L'abonnement qui fait foi pour le client : le meilleur rang, puis le plus
 * récent. Un abonnement neuf en attente de paiement ne remplace donc pas celui
 * qui paie, et un ancien résilié ne ferme rien. `plusieurs` : deux abonnements
 * en cours à la fois, ce que le parcours doit empêcher — à signaler.
 */
export function abonnementCourant(abonnements: Stripe.Subscription[]): {
  courant: Stripe.Subscription | null;
  plusieurs: boolean;
} {
  const tries = [...abonnements].sort((a, b) => rang(a) - rang(b) || b.created - a.created);
  return { courant: tries[0] ?? null, plusieurs: abonnements.filter((s) => rang(s) <= 1).length > 1 };
}

/** Les colonnes d'`Abonnement` que porte un abonnement Stripe (ou son absence). */
export function colonnesDe(s: Stripe.Subscription | null) {
  const item = s?.items.data[0];
  return {
    stripeSubscriptionId: s?.id ?? null,
    statut: s?.status ?? null,
    formule: item ? formuleDuPrix(item.price) : null,
    stripePriceId: item?.price.id ?? null,
    finPeriode: date(item?.current_period_end),
    finEssai: date(s?.trial_end),
    resilieEnFinDePeriode: s?.cancel_at_period_end ?? false,
    finPrevueLe: date(s?.cancel_at),
  };
}

/**
 * Depuis quand le compte est sans abonnement ouvert (ADR-058) : la fin chez
 * Stripe (`ended_at` ; une pause de fin d'essai n'en a pas, c'est
 * `trial_end`), sinon la date déjà notée, sinon `relueLe` (un impayé
 * définitif n'a pas de date chez Stripe). Ouvert : vide, et les
 * avertissements avant suppression avec — un compte qui se réabonne repart
 * de zéro. Fermé : les avertissements ne sont pas touchés.
 */
export function horlogeDeSuppression(
  s: Stripe.Subscription | null,
  dejaNotee: Date | null,
  relueLe: Date,
):
  | { sansAbonnementDepuis: Date }
  | { sansAbonnementDepuis: null; suppressionPrevueLe: null; avertiSuppression30Le: null; avertiSuppression7Le: null } {
  if (s && OUVRENT.has(s.status)) {
    return { sansAbonnementDepuis: null, suppressionPrevueLe: null, avertiSuppression30Le: null, avertiSuppression7Le: null };
  }
  const fin = date(s?.ended_at) ?? (s?.status === "paused" ? date(s.trial_end) : null);
  return { sansAbonnementDepuis: fin ?? dejaNotee ?? relueLe };
}

/**
 * Le premier paiement CONFIRMÉ du client (ADR-053 § 14) : la date de la plus
 * ancienne facture payée d'un montant non nul. Ni un état `active` (Stripe
 * l'affiche environ une heure avant de prélever la fin d'un essai), ni une
 * facture à zéro (celle de l'essai, ou couverte par un crédit ou une remise
 * de 100 % : un abonnement gratuit n'est pas prévu). Lue seulement tant que
 * le compte n'en a pas : une fois écrite, elle ne change plus. Limite
 * assumée : un paiement remboursé ou contesté reste un paiement — la
 * facture reste `paid` chez Stripe.
 */
export async function premierPaiement(stripe: Stripe, customerId: string): Promise<Date | null> {
  const payees = await toutLister(stripe.invoices.list({ customer: customerId, status: "paid", limit: 100 }, OPTIONS_WEBHOOK), 1000);
  const dates = payees
    .filter((f) => f.amount_paid > 0 && f.status_transitions?.paid_at)
    .map((f) => f.status_transitions.paid_at as number);
  return dates.length ? date(Math.min(...dates)) : null;
}

/** Une liste tronquée par la pagination n'est pas un état complet (stripe-node tronque en silence). */
export class ListeTronquee extends Error {
  constructor(public readonly max: number) {
    super(`liste Stripe tronquée à ${max} éléments`);
    this.name = "ListeTronquee";
  }
}

/** Toute la liste, ou une erreur : à la limite, `autoPagingToArray` s'arrête sans rien dire. */
export async function toutLister<T>(liste: { autoPagingToArray(o: { limit: number }): Promise<T[]> }, max: number): Promise<T[]> {
  const tous = await liste.autoPagingToArray({ limit: max });
  if (tous.length >= max) throw new ListeTronquee(max);
  return tous;
}

/** Le premier essai pris par ce client, sur quelque abonnement que ce soit. */
export function premierEssai(abonnements: Stripe.Subscription[]): Date | null {
  const debuts = abonnements.map((s) => s.trial_start).filter((t): t is number => !!t);
  return debuts.length ? date(Math.min(...debuts)) : null;
}

/** Ce que le client Stripe RELU désigne : un compte, ou (avant l'ADR-054) son propriétaire. */
export type CompteDesigne = { compteId: string } | { proprietaire: string };

/**
 * Le compte d'un client Stripe RELU : le `metadata.compteId` posé par Rojer
 * sur le client, ou à défaut sur l'abonnement courant (seul encore lisible
 * d'un client supprimé). Sans lui, le `metadata.userId` d'avant l'ADR-054,
 * qui désigne le propriétaire. Seule déduction du compte.
 */
export function compteDuClientStripe(
  client: Stripe.Customer | Stripe.DeletedCustomer,
  courant: Stripe.Subscription | null,
): CompteDesigne | null {
  const lire = (cle: string) => {
    const v = (client.deleted ? undefined : client.metadata?.[cle]) ?? courant?.metadata?.[cle];
    return typeof v === "string" && UUID.test(v) ? v : null;
  };
  const compteId = lire("compteId");
  if (compteId) return { compteId };
  const proprietaire = lire("userId");
  return proprietaire ? { proprietaire } : null;
}

/** Code d'une erreur Prisma, reconnu à sa forme (aussi lu par `motifDErreur`). */
export const codePrisma = (e: unknown) => {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : null;
};

export type Synchronisation =
  | { issue: "ecrit" | "inchange"; facturesEnEchecDurable?: true }
  | { issue: "ignore"; motif: string; alerte?: true }
  /** Une autre relecture tient le client : la demande est notée, elle la couvrira ou la suivra. */
  | { issue: "en_file" };

const ECRIT = { issue: "ecrit" } as const;
const INCHANGE = { issue: "inchange" } as const;
const EN_FILE = { issue: "en_file" } as const;
const SANS_COMPTE = { issue: "ignore", motif: "client Stripe sans compte Rojer (metadata.compteId)" } as const;
const INTROUVABLE = { issue: "ignore", motif: "compte Rojer introuvable", alerte: true } as const;
const DEJA_LIE = { issue: "ignore", motif: "client ou abonnement Stripe déjà lié à un autre compte", alerte: true } as const;
const AUTRE_CLIENT = { issue: "ignore", motif: "le compte est lié à un autre client Stripe", alerte: true } as const;

/** Un motif écrit par Rojer : la nature de l'erreur, jamais son message (qui peut citer des données). */
export function motifDErreur(e: unknown): string {
  if (e instanceof Stripe.errors.StripeError) {
    return `API Stripe : ${e.type}${e.statusCode ? ` ${e.statusCode}` : ""}${e.code ? ` (${e.code})` : ""}`;
  }
  if (e instanceof ListeTronquee) return `liste Stripe tronquée (${e.max})`;
  const code = codePrisma(e);
  return code ? `base : ${code}` : "erreur inattendue";
}

/** Le bail a été repris par un autre worker pendant la relecture : rien n'est écrit. */
class BailPerdu extends Error {}

type Tx = Prisma.TransactionClient;
type Donnees = ReturnType<typeof colonnesDe> &
  ReturnType<typeof horlogeDeSuppression> & { relueLe: Date; essaiUtiliseLe: Date | null };

async function mettreAJour(tx: Tx, compteId: string, customerId: string, donnees: Donnees) {
  const { count } = await tx.abonnement.updateMany({
    where: { compteId, stripeCustomerId: customerId, OR: [{ relueLe: null }, { relueLe: { lt: donnees.relueLe } }] },
    data: donnees,
  });
  return count === 1 ? ECRIT : INCHANGE;
}

function horlogeReelle(): Date {
  return new Date();
}

type OptionsSynchro = {
  maintenant?: () => Date;
  /**
   * La file (worker) : la date du premier paiement doit être lue, sinon le
   * client est retenté plus tard. Depuis un geste de l'utilisateur, elle
   * viendra à la relecture suivante.
   */
  strict?: boolean;
};

/**
 * Demande la relecture du client, puis la fait si personne ne la tient
 * (`en_file` sinon : la relecture en cours, ou la file, la couvrira). La
 * seule porte des gestes de l'utilisateur et des scripts.
 */
export async function synchroniserClientStripe(
  stripe: Stripe,
  customerId: string,
  options: OptionsSynchro = {},
): Promise<Synchronisation> {
  await demanderSynchronisation(customerId, (options.maintenant ?? horlogeReelle)());
  return synchroniserSousBail(stripe, customerId, options);
}

/** La relecture d'un client déjà demandé, sous son bail. La porte de la file. */
export async function synchroniserSousBail(
  stripe: Stripe,
  customerId: string,
  options: OptionsSynchro = {},
): Promise<Synchronisation> {
  const maintenant = options.maintenant ?? horlogeReelle;
  const bail = await prendreBail(customerId, maintenant());
  if (!bail) return EN_FILE;
  try {
    const issue = await relireEtEcrire(stripe, bail, maintenant(), options.strict === true);
    // Un compte introuvable a pour cas normal un compte supprimé faute
    // d'abonnement (ADR-058), dont les événements de résiliation arrivent
    // après : journal seulement. Les conflits de liaison, eux, se signalent.
    if (issue.issue === "ignore" && issue.alerte && issue.motif !== INTROUVABLE.motif) {
      await alerter("client Stripe non enregistré", [`client ${customerId}`, issue.motif]);
    } else if (issue.issue === "ignore" && issue.alerte) console.error(`stripe : client ${customerId} — ${issue.motif}`);
    if (issue.issue !== "ignore" && issue.issue !== "en_file" && issue.facturesEnEchecDurable) {
      await alerterEchecDurable(customerId, "API Stripe : factures illisibles (premier paiement)");
    }
    return issue;
  } catch (e) {
    const motif = motifDErreur(e);
    if (await echouer(bail, maintenant(), motif).catch(() => false)) await alerterEchecDurable(customerId, motif);
    throw e;
  }
}

async function alerterEchecDurable(customerId: string, motif: string) {
  await alerter("relecture Stripe en échec durable", [
    `client ${customerId}`,
    motif,
    "La copie de l'abonnement n'est plus relue : vérifier le client dans Stripe, puis renvoyer depuis Stripe un événement de ce client (Dashboard 15 jours, CLI `stripe events resend` 30 jours) : la relecture reprend à sa réception.",
  ]);
}

async function relireEtEcrire(stripe: Stripe, bail: Bail, relueLe: Date, strict: boolean): Promise<Synchronisation> {
  const { customerId } = bail;
  // L'heure de la relecture est prise AVANT les lectures, lancées ensemble.
  const [client, liste] = await Promise.allSettled([
    stripe.customers.retrieve(customerId, {}, OPTIONS_WEBHOOK),
    toutLister(stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 }, OPTIONS_WEBHOOK), 10_000),
  ]);
  if (client.status === "rejected") throw client.reason;
  // Client supprimé : la liste peut être refusée ; le dernier abonnement vu à
  // l'aiguillage, relu par son identifiant, reste la trace du compte et de
  // la résiliation.
  const supprime = client.value.deleted === true;
  let abonnements: Stripe.Subscription[];
  if (liste.status === "fulfilled") abonnements = liste.value;
  else if (supprime) {
    const dernier = bail.abonnementId ? await stripe.subscriptions.retrieve(bail.abonnementId, {}, OPTIONS_WEBHOOK) : null;
    abonnements = dernier && idStripe(dernier.customer) === customerId ? [dernier] : [];
  } else throw liste.reason;

  const { courant, plusieurs } = abonnementCourant(abonnements);
  const designe = compteDuClientStripe(client.value, courant);
  if (!designe) return terminer(bail, relueLe, SANS_COMPTE);
  // Un client d'avant l'ADR-054 : le compte dont la personne est l'unique
  // propriétaire ; aucun, ou plusieurs, ne se devinent pas.
  const compteId = "compteId" in designe ? designe.compteId : await compteDontEstProprietaire(designe.proprietaire);
  if (!compteId) return terminer(bail, relueLe, INTROUVABLE);
  if (plusieurs) console.error(`stripe : plusieurs abonnements en cours pour un même client (${customerId})`);

  const db = clientDuClientStripe(compteId);
  const ligne = await db.abonnement.findUnique({
    where: { compteId },
    select: { stripeCustomerId: true, essaiUtiliseLe: true, debutPayantLe: true, sansAbonnementDepuis: true },
  });
  if (ligne && ligne.stripeCustomerId !== customerId) return terminer(bail, relueLe, AUTRE_CLIENT);

  // Le premier paiement confirmé, lu tant que la ligne n'en a pas. En échec :
  // l'état s'écrit quand même ; depuis la file, le client est retenté plus
  // tard pour la date.
  let factures: "lues" | "en_echec" = "lues";
  const debut =
    !ligne?.debutPayantLe && !supprime
      ? await premierPaiement(stripe, customerId).catch(() => {
          factures = "en_echec";
          return null;
        })
      : null;

  const donnees: Donnees = {
    ...colonnesDe(courant),
    ...horlogeDeSuppression(courant, ligne?.sansAbonnementDepuis ?? null, relueLe),
    relueLe,
    essaiUtiliseLe: ligne?.essaiUtiliseLe ?? premierEssai(abonnements),
  };
  // Dans la transaction, une erreur l'annule entière : la création d'une
  // ligne que l'essai vient de poser (`essai.ts`, même client) fait relire
  // la ligne, puis réécrire en mise à jour, une fois.
  const ecrire = (existe: boolean) =>
    db.$transaction(async (tx) => {
      // Le jeton d'abord, ligne verrouillée jusqu'au commit : un bail repris
      // entre-temps n'écrit rien.
      if (!(await verrouillerSousBail(tx, bail))) throw new BailPerdu();
      let issue: { issue: "ecrit" | "inchange"; facturesEnEchecDurable?: true };
      if (existe) issue = await mettreAJour(tx, compteId, customerId, donnees);
      else {
        await tx.abonnement.create({ data: { compteId, stripeCustomerId: customerId, ...donnees } });
        issue = ECRIT;
      }
      if (debut) {
        // Jamais écrasée : seulement là où la ligne n'en a pas.
        await tx.abonnement.updateMany({
          where: { compteId, stripeCustomerId: customerId, debutPayantLe: null },
          data: { debutPayantLe: debut },
        });
      }
      // Factures illisibles : l'état est écrit, la date du premier paiement
      // manque. Depuis la file, un échec retenté plus tard ; depuis un geste,
      // le bail est rendu sans couvrir les demandes — la file fera la
      // relecture stricte.
      if (factures === "en_echec") {
        if (!strict) {
          await rendreBail(bail, tx);
          return issue;
        }
        const durable = await echouer(bail, relueLe, "API Stripe : factures illisibles (premier paiement)", tx);
        return durable ? { ...issue, facturesEnEchecDurable: true as const } : issue;
      }
      await clore(bail, relueLe, tx);
      return issue;
    });
  try {
    try {
      return await ecrire(ligne !== null);
    } catch (e) {
      if (ligne || codePrisma(e) !== "P2002") throw e;
      // Unicité à la création : la ligne du compte existe maintenant, ou ce
      // client (ou cet abonnement) est déjà à un autre compte.
      const creee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
      if (!creee) return terminer(bail, relueLe, DEJA_LIE);
      if (creee.stripeCustomerId !== customerId) return terminer(bail, relueLe, AUTRE_CLIENT);
      return await ecrire(true);
    }
  } catch (e) {
    if (e instanceof BailPerdu) return EN_FILE;
    // Le compte a disparu (clé étrangère), ou l'abonnement relu est déjà sur
    // la ligne d'un autre compte (unicité) : la transaction est annulée, le
    // client clos sans rien écrire.
    switch (codePrisma(e)) {
      case "P2003":
      case "P2025":
        return terminer(bail, relueLe, INTROUVABLE);
      case "P2002":
        return terminer(bail, relueLe, DEJA_LIE);
      default:
        throw e;
    }
  }
}

/** Clôt la relecture d'un client sans rien écrire (rien à suivre, ou conflit signalé). */
async function terminer(bail: Bail, maintenant: Date, issue: Synchronisation): Promise<Synchronisation> {
  return (await clore(bail, maintenant)) ? issue : EN_FILE;
}
