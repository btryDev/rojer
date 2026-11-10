import "server-only";
// Le traitement de la file Stripe (ADR-053 § 5, amendé le 2026-11-10), hors
// de la requête du webhook : lancé juste après sa réponse (`after()`), et
// chaque minute par la crontab — ce qu'un déploiement ou un plantage a
// interrompu est repris là, rien ne vit seulement en mémoire.
//
// 1. Aiguillage : chaque événement reçu est pris (prise datée), son objet
//    relu chez Stripe pour trouver le client — avec les effets propres à
//    l'objet —, puis, en une transaction, le client marqué « à relire » et
//    l'événement aiguillé (`evenements.ts`).
// 2. Relecture : chaque client dû, une fois, sous son bail
//    (`synchroniserSousBail`) — cinq événements d'un même client donnent
//    une seule relecture.
//
// Plusieurs traitements peuvent tourner à la fois (instances, crontab
// rejouée pendant un déploiement) : les prises et les baux en base les
// départagent. Dans un même processus, un seul tourne ; un appel pendant
// qu'il tourne le fait repasser une fois.

import type Stripe from "stripe";
import { alerter } from "@/lib/alertes";
import { finaliserCarte } from "@/lib/abonnements/souscription";
import {
  type Aiguillage,
  type EvenementAAiguiller,
  etatDesEvenements,
  evenementsAAiguiller,
  marquerAiguille,
  marquerEchec,
  oublierLesAnciens,
  prendre,
} from "./evenements";
import { clientsDus, enEchecDurable } from "./file";
import { rendrePlanningEchu } from "./parcours";
import { idStripe, motifDErreur, synchroniserSousBail } from "./synchronisation";
import { OPTIONS_WEBHOOK } from "./client";

const EVENEMENTS_PAR_TOUR = 20;
const CLIENTS_PAR_TOUR = 10;
/** Un traitement rend la main avant la minute suivante de la crontab. */
export const BUDGET_MS = 45_000;

function horlogeReelle(): Date {
  return new Date();
}

const montant = (centimes: number, devise: string) => `${(centimes / 100).toFixed(2)} ${devise.toUpperCase()}`;

/**
 * Le client Stripe de l'objet de la notification, relu par l'API, et les
 * effets propres à l'objet. `clientStripe` nul : rien à suivre.
 */
export async function aiguillageDe(stripe: Stripe, type: string, objetId: string | null): Promise<Aiguillage> {
  if (!objetId) return { clientStripe: null, motif: "notification sans objet" };
  switch (type) {
    case "v1.customer.subscription.created":
    case "v1.customer.subscription.updated":
    case "v1.customer.subscription.deleted":
    case "v1.customer.subscription.paused":
    case "v1.customer.subscription.resumed":
    case "v1.customer.subscription.trial_will_end": {
      const abonnement = await stripe.subscriptions.retrieve(objetId, {}, OPTIONS_WEBHOOK);
      // Une baisse vient de prendre effet : son planning est rendu (sinon le
      // portail refuserait la résiliation pendant une période). Sans effet
      // sur l'aiguillage s'il échoue : la prochaine notification le refera.
      if (abonnement.schedule) await rendrePlanningEchu(stripe, abonnement).catch(() => {});
      return { clientStripe: idStripe(abonnement.customer), abonnementId: abonnement.id };
    }
    case "v1.checkout.session.completed": {
      const session = await stripe.checkout.sessions.retrieve(objetId, { expand: ["setup_intent"] }, OPTIONS_WEBHOOK);
      // La carte d'un abonnement qui court sans payer : la formule choisie
      // s'applique ici si le retour de Checkout ne l'a pas déjà fait. La
      // relecture suit, par la file.
      if (session.mode === "setup") await finaliserCarte(stripe, session, { synchroniser: false });
      const suivi = session.mode === "subscription" || session.mode === "setup";
      return suivi ? { clientStripe: idStripe(session.customer) } : { clientStripe: null, motif: "session sans abonnement" };
    }
    case "v1.invoice.paid":
    case "v1.invoice.payment_failed":
    case "v1.invoice.payment_action_required":
      return { clientStripe: idStripe((await stripe.invoices.retrieve(objetId, {}, OPTIONS_WEBHOOK)).customer) };
    case "v1.charge.dispute.created": {
      // Un litige : l'abonnement continue de prélever (doc Stripe) — à
      // traiter à la main (preuves sous 7 à 21 jours), ou par le réglage
      // « Gérer les paiements contestés », qui l'annule.
      const litige = await stripe.disputes.retrieve(objetId, { expand: ["charge"] }, OPTIONS_WEBHOOK);
      const charge = typeof litige.charge === "object" ? litige.charge : null;
      const client = idStripe(charge?.customer);
      await alerter("litige sur un paiement", [
        `litige ${litige.id} (${litige.reason}), ${montant(litige.amount, litige.currency)}`,
        `client ${client ?? "inconnu"}`,
        "Répondre dans Stripe (preuves) ; l'abonnement continue sauf réglage « Gérer les paiements contestés ».",
      ]);
      return { clientStripe: client };
    }
    case "v1.charge.refunded": {
      // Un remboursement ne change pas l'abonnement : il se double d'une
      // résiliation dans Stripe si l'accès doit cesser.
      const charge = await stripe.charges.retrieve(objetId, {}, OPTIONS_WEBHOOK);
      const client = idStripe(charge.customer);
      await alerter("remboursement", [
        `paiement ${charge.id}, remboursé ${montant(charge.amount_refunded, charge.currency)} sur ${montant(charge.amount, charge.currency)}`,
        `client ${client ?? "inconnu"}`,
        "L'abonnement continue : le résilier dans Stripe si l'accès doit cesser.",
      ]);
      return { clientStripe: client };
    }
    default:
      return { clientStripe: null, motif: "type non suivi" };
  }
}

/** Aiguille un événement : prise, lecture chez Stripe, puis l'issue en une transaction. */
export async function aiguiller(stripe: Stripe, e: EvenementAAiguiller, maintenant: () => Date): Promise<"aiguille" | "pris" | "echec"> {
  const prise = await prendre(e.id, maintenant());
  if (!prise) return "pris";
  const debut = Date.now();
  try {
    const a = await aiguillageDe(stripe, e.type, e.objetId);
    await marquerAiguille(e.id, prise, a, Date.now() - debut, maintenant());
    return "aiguille";
  } catch (err) {
    const motif = motifDErreur(err);
    console.error(`stripe : ${e.type} ${e.id} non aiguillé — ${motif}`);
    if (await marquerEchec(e, prise, motif, maintenant()).catch(() => false)) {
      await alerter("événement Stripe en échec durable", [
        `${e.type} ${e.id}`,
        motif,
        "Corriger la cause, puis le renvoyer depuis Stripe (Dashboard 15 jours, CLI `stripe events resend` 30 jours).",
      ]);
    }
    return "echec";
  }
}

export type BilanFile = { aiguilles: number; echecs: number; relus: number; relecturesEnEchec: number };

/** Vide la file dans le budget de temps : les événements d'abord, puis les clients dus. */
export async function traiterLaFile(
  stripe: Stripe,
  { maintenant = horlogeReelle, budgetMs = BUDGET_MS }: { maintenant?: () => Date; budgetMs?: number } = {},
): Promise<BilanFile> {
  const bilan: BilanFile = { aiguilles: 0, echecs: 0, relus: 0, relecturesEnEchec: 0 };
  const fin = Date.now() + budgetMs;
  for (;;) {
    let fait = 0;
    for (const e of await evenementsAAiguiller(maintenant(), EVENEMENTS_PAR_TOUR)) {
      if (Date.now() > fin) return bilan;
      const r = await aiguiller(stripe, e, maintenant);
      if (r === "aiguille") bilan.aiguilles++;
      if (r === "echec") bilan.echecs++;
      fait++;
    }
    for (const customerId of await clientsDus(maintenant(), CLIENTS_PAR_TOUR)) {
      if (Date.now() > fin) return bilan;
      try {
        const r = await synchroniserSousBail(stripe, customerId, { maintenant, strict: true });
        if (r.issue !== "en_file") bilan.relus++;
      } catch {
        bilan.relecturesEnEchec++;
      }
      fait++;
    }
    if (fait === 0) return bilan;
  }
}

let enCours: Promise<BilanFile> | null = null;
let encore = false;

/**
 * Le traitement de ce processus : un seul à la fois ; un appel pendant qu'il
 * tourne le fait repasser une fois (un événement arrivé entre-temps). Ne
 * lève jamais.
 */
export function traiterLaFileIci(stripe: Stripe): Promise<BilanFile | null> {
  if (enCours) {
    encore = true;
    return enCours;
  }
  const tour = async (): Promise<BilanFile> => {
    let bilan: BilanFile;
    do {
      encore = false;
      bilan = await traiterLaFile(stripe);
    } while (encore);
    return bilan;
  };
  enCours = tour().finally(() => {
    enCours = null;
  });
  return enCours.catch((e: unknown) => {
    console.error(`stripe : traitement de la file en échec — ${motifDErreur(e)}`);
    return null;
  });
}

/** Ce que la crontab de chaque minute rend, et le ménage des anciens événements. */
export async function etatDeLaFile(maintenant: Date) {
  const [evenements, clientsEnEchecDurable] = await Promise.all([etatDesEvenements(maintenant), enEchecDurable()]);
  await oublierLesAnciens(maintenant).catch(() => console.warn("stripe : ménage des événements en échec"));
  return { ...evenements, clientsEnEchecDurable };
}
