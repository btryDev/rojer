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
// - ~~En second rempart, écriture conditionnelle sur `relueLe`~~ [2026-11-17,
//   revue d'ensemble : retiré — il comparait les horloges de deux serveurs ;
//   le bail suffit (`mettreAJour`).]
// - Une liste tronquée par la pagination est un échec, jamais un état
//   complet ; une erreur de Stripe n'écrit rien (aucun droit retiré).

import Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { alerter, alerterUneFoisParJour } from "@/lib/alertes";
import { type Bail, clore, demanderSynchronisation, echouer, prendreBail, rendreBail, verrouillerSousBail } from "./file";
import { clientDuClientStripe } from "@/lib/auth/compte-hors-session";
import { compteDontEstProprietaire } from "@/lib/auth/membres";
import { OPTIONS_WEBHOOK } from "./client";
import { idStripe } from "./ids";
import { formuleDuPrix } from "@/lib/abonnements/formules";
import { OUVRENT } from "@/lib/abonnements/droits";
import { laPlusRecente } from "@/lib/calendrier/echeance-de-ligne";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Rang d'un état pour retenir l'abonnement courant : celui qui paie d'abord,
 * puis l'impayé, puis celui qui attend son premier paiement,
 * puis les terminés. Un état inconnu passe avec les impayés.
 */
const RANGS: Record<string, number> = {
  active: 0,
  past_due: 0,
  unpaid: 1,
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
    resilieEnFinDePeriode: s?.cancel_at_period_end ?? false,
    finPrevueLe: date(s?.cancel_at),
  };
}

/**
 * Depuis quand le compte est sans abonnement ouvert (ADR-058) : ~~la fin chez
 * Stripe (`ended_at`), sinon la date déjà notée~~ [2026-11-17 : la date déjà
 * notée, sinon la fin chez Stripe (`ended_at`)], sinon `relueLe` (un impayé
 * définitif n'a pas de date chez Stripe) — jamais avant la fin de l'essai. Ouvert : vide, et les
 * avertissements avant suppression avec — un compte qui se réabonne repart
 * de zéro. Fermé : les avertissements ne sont pas touchés.
 */
export function horlogeDeSuppression(
  s: Stripe.Subscription | null,
  dejaNotee: Date | null,
  relueLe: Date,
  // L'horloge ne part jamais avant la fin de l'essai (compté chez Rojer,
  // ADR-053 § 9 amendé) : une souscription abandonnée pendant l'essai ne
  // l'avance pas (relecture du 2026-11-17).
  finEssai: Date | null = null,
):
  | { sansAbonnementDepuis: Date }
  | { sansAbonnementDepuis: null; suppressionPrevueLe: null; avertiSuppression30Le: null; avertiSuppression7Le: null } {
  if (s && OUVRENT.has(s.status)) {
    return { sansAbonnementDepuis: null, suppressionPrevueLe: null, avertiSuppression30Le: null, avertiSuppression7Le: null };
  }
  // La date déjà notée d'abord : les avertissements partis et la date de
  // suppression annoncée en dépendent. Une résiliation tardive d'un impayé,
  // ou une tentative de réabonnement expirée, ne la redate pas (revue du
  // 2026-11-17) ; elle est vidée dès qu'un abonnement rouvre.
  return { sansAbonnementDepuis: laPlusRecente(dejaNotee ?? date(s?.ended_at) ?? relueLe, finEssai)! };
}

/**
 * Le premier paiement CONFIRMÉ du client (ADR-053 § 14) : la date de la plus
 * ancienne facture payée — pas un état `active`. ~~Pas une facture à zéro
 * (couverte par un crédit ou une remise de 100 % : un abonnement gratuit
 * n'est pas prévu).~~ [2026-11-26, décision de la propriétaire : une facture
 * ramenée à zéro par une REMISE compte — c'est ainsi qu'une formule s'offre,
 * par un coupon à 100 % posé dans le tableau de bord Stripe (Checkout
 * n'accepte aucun code promo). Une facture à zéro pour une autre raison —
 * crédit du client, prorata, ancien essai chez Stripe — ne compte toujours
 * pas : `offerteParUneRemise`.] Lue seulement tant que
 * le compte n'en a pas : une fois écrite, elle ne change plus. Limite
 * assumée : un paiement remboursé ou contesté reste un paiement — la
 * facture reste `paid` chez Stripe.
 */
/** Une facture à zéro parce qu'une remise en couvre tout le montant (coupon de 100 %). */
export function offerteParUneRemise(f: Pick<Stripe.Invoice, "subtotal" | "total" | "total_discount_amounts">): boolean {
  const remise = (f.total_discount_amounts ?? []).reduce((somme, d) => somme + d.amount, 0);
  return f.subtotal > 0 && f.total === 0 && remise >= f.subtotal;
}

export async function premierPaiement(stripe: Stripe, customerId: string): Promise<Date | null> {
  const payees = await toutLister(stripe.invoices.list({ customer: customerId, status: "paid", limit: 100 }, OPTIONS_WEBHOOK), 1000);
  const dates = payees
    .filter((f) => (f.amount_paid > 0 || offerteParUneRemise(f)) && f.status_transitions?.paid_at)
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
  /** `plusieurs` : deux abonnements en cours pour ce client (à signaler). */
  | { issue: "ecrit" | "inchange"; facturesEnEchecDurable?: true; plusieurs?: true }
  /** `journalSeul` : un cas attendu, qui ne mérite pas d'e-mail. */
  | { issue: "ignore"; motif: string; alerte?: true; journalSeul?: true }
  /** Une autre relecture tient le client : la demande est notée, elle la couvrira ou la suivra. */
  | { issue: "en_file" };

const ECRIT = { issue: "ecrit" } as const;
const INCHANGE = { issue: "inchange" } as const;
const EN_FILE = { issue: "en_file" } as const;
const SANS_COMPTE = { issue: "ignore", motif: "client Stripe sans compte Rojer (metadata.compteId)" } as const;
const INTROUVABLE = { issue: "ignore", motif: "compte Rojer introuvable", alerte: true, journalSeul: true } as const;
/**
 * Le même, quand l'abonnement relu court encore : Stripe facture un client
 * dont Rojer n'a plus le compte. Ce n'est plus le cas normal (un compte
 * supprimé faute d'abonnement n'en a pas d'ouvert) : il se signale (revue de
 * la mécanique, 2026-11-16).
 */
const INTROUVABLE_QUI_PAIE = {
  issue: "ignore",
  motif: "compte Rojer introuvable alors que l'abonnement Stripe court encore (il facture) : résilier chez Stripe ou rattacher le client",
  alerte: true,
} as const;
const introuvable = (courant: Stripe.Subscription | null) =>
  courant && OUVRENT.has(courant.status) ? INTROUVABLE_QUI_PAIE : INTROUVABLE;
/** Un client d'avant l'ADR-054 dont la personne n'est propriétaire d'aucun compte, ou de plusieurs : il paie peut-être et n'est jamais relu. */
const PROPRIETAIRE_AMBIGU = {
  issue: "ignore",
  motif: "client Stripe d'avant les comptes (metadata.userId) : la personne n'est propriétaire d'aucun compte, ou de plusieurs — poser metadata.compteId",
  alerte: true,
} as const;
const DEJA_LIE = { issue: "ignore", motif: "client ou abonnement Stripe déjà lié à un autre compte", alerte: true } as const;
const AUTRE_CLIENT = { issue: "ignore", motif: "le compte est lié à un autre client Stripe", alerte: true } as const;

/** Un motif écrit par Rojer : la nature de l'erreur, jamais son message (qui peut citer des données). */
export function motifDErreur(e: unknown): string {
  if (e instanceof Stripe.errors.StripeError) {
    // L'identifiant de requête retrouve le refus dans le tableau de bord de
    // Stripe (son message exact) ; il ne porte aucune donnée (2026-11-16).
    return `API Stripe : ${e.type}${e.statusCode ? ` ${e.statusCode}` : ""}${e.code ? ` (${e.code})` : ""}${e.requestId ? ` [${e.requestId}]` : ""}`;
  }
  if (e instanceof ListeTronquee) return `liste Stripe tronquée (${e.max})`;
  const code = codePrisma(e);
  return code ? `base : ${code}` : "erreur inattendue";
}

/** Le bail a été repris par un autre worker pendant la relecture : rien n'est écrit. */
class BailPerdu extends Error {}

type Tx = Prisma.TransactionClient;
type Donnees = ReturnType<typeof colonnesDe> &
  ReturnType<typeof horlogeDeSuppression> & { relueLe: Date };

/**
 * L'écriture de la copie, sous le bail vérifié et verrouillé dans la même
 * transaction (`verrouillerSousBail`) : la relecture qui écrit est la plus
 * récente. ~~Second rempart sur `relueLe`~~ [2026-11-17, revue d'ensemble :
 * retiré — il comparait les horloges de deux serveurs et pouvait écarter une
 * relecture plus fraîche, laissant « paiement en attente » à qui avait payé.]
 */
async function mettreAJour(tx: Tx, compteId: string, customerId: string, donnees: Donnees) {
  const { count } = await tx.abonnement.updateMany({
    where: { compteId, stripeCustomerId: customerId },
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
  /**
   * Un geste qui doit montrer l'état relu (retour de Checkout) : si une autre
   * relecture tient le bail, l'attendre jusqu'à ce délai puis relire, au lieu
   * de rendre `en_file` — sinon la page s'affiche avant la relecture
   * (répétition du 2026-11-17 : « Essai en cours » juste après avoir payé).
   */
  attendreMs?: number;
};

const PAS_D_ATTENTE_MS = 250;

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
  const limite = Date.now() + (options.attendreMs ?? 0);
  for (;;) {
    const issue = await synchroniserSousBail(stripe, customerId, options);
    if (issue.issue !== "en_file" || Date.now() + PAS_D_ATTENTE_MS > limite) return issue;
    await new Promise((r) => setTimeout(r, PAS_D_ATTENTE_MS));
  }
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
    if (issue.issue === "ignore" && issue.alerte && !issue.journalSeul) {
      await alerter("client Stripe non enregistré", [`client ${customerId}`, issue.motif]);
    } else if (issue.issue === "ignore" && issue.alerte) console.error(`stripe : client ${customerId} — ${issue.motif}`);
    // Deux abonnements en cours : le client paie peut-être deux fois. Le
    // parcours l'empêche ; s'il arrive, un humain doit en résilier un —
    // une fois par jour, pas à chaque relecture (revue du 2026-11-16).
    if (issue.issue !== "ignore" && issue.issue !== "en_file" && issue.plusieurs) {
      await alerterUneFoisParJour(`plusieurs:${customerId}`, "plusieurs abonnements en cours pour un même client", [
        `client ${customerId}`,
        "Le client paie peut-être deux fois : garder l'abonnement voulu dans Stripe, résilier l'autre, rembourser s'il y a lieu.",
      ], maintenant());
    }
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
  if (!compteId) return terminer(bail, relueLe, "compteId" in designe ? introuvable(courant) : PROPRIETAIRE_AMBIGU);
  // Deux abonnements en cours : remonté dans l'issue, signalé par
  // `synchroniserSousBail` après l'écriture (revue du 2026-11-16).
  const signale = <T extends { issue: "ecrit" | "inchange" }>(i: T) => (plusieurs ? { ...i, plusieurs: true as const } : i);

  const db = clientDuClientStripe(compteId);
  const ligne = await db.abonnement.findUnique({
    where: { compteId },
    select: { stripeCustomerId: true, finEssai: true, debutPayantLe: true, sansAbonnementDepuis: true },
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
    ...horlogeDeSuppression(courant, ligne?.sansAbonnementDepuis ?? null, relueLe, ligne?.finEssai ?? null),
    relueLe,
  };
  // Dans la transaction, une erreur l'annule entière : une ligne créée entre
  // la lecture et l'écriture (un démarrage d'essai, une réservation de
  // client) fait relire la ligne, puis réécrire en mise à jour, une fois.
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
      return signale(await ecrire(ligne !== null));
    } catch (e) {
      if (ligne || codePrisma(e) !== "P2002") throw e;
      // Unicité à la création : la ligne du compte existe maintenant, ou ce
      // client (ou cet abonnement) est déjà à un autre compte.
      const creee = await db.abonnement.findUnique({ where: { compteId }, select: { stripeCustomerId: true } });
      if (!creee) return terminer(bail, relueLe, DEJA_LIE);
      if (creee.stripeCustomerId !== customerId) return terminer(bail, relueLe, AUTRE_CLIENT);
      return signale(await ecrire(true));
    }
  } catch (e) {
    if (e instanceof BailPerdu) return EN_FILE;
    // Le compte a disparu (clé étrangère), ou l'abonnement relu est déjà sur
    // la ligne d'un autre compte (unicité) : la transaction est annulée, le
    // client clos sans rien écrire.
    switch (codePrisma(e)) {
      case "P2003":
      case "P2025":
        return terminer(bail, relueLe, introuvable(courant));
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
