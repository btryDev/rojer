import "server-only";
// Les réglages du tableau de bord Stripe dont Rojer dépend sans les porter
// (audit du 2026-11-16), relus chaque jour par la tâche quotidienne. Un
// réglage changé à la main ne casse rien de visible : il ouvre une porte.
//
// - Le PORTAIL client : le changement de formule doit y être fermé (il se
//   fait dans Rojer, qui contrôle les plafonds, ADR-053 § 10), la
//   résiliation ouverte et en fin de période (`docs/lancement-abonnements.md`
//   § 4). Ouvert, un client passerait en Essentiel en gardant cinq sites.
// - Les RELANCES : un impayé (`past_due`) garde la saisie ouverte
//   (`droits.ts`) ; c'est le réglage « marquer l'abonnement comme impayé »,
//   à la fin des tentatives, qui la ferme (§ 3). Un `past_due` dont la plus
//   ANCIENNE facture ouverte dépasse la plus longue fenêtre de relance dit
//   que ce réglage manque — pas la dernière : un mensuel en reçoit une
//   chaque mois, qui ne vieillirait jamais.
//
// Les deux contrôles sont indépendants : l'échec de l'un n'empêche pas
// l'autre, puis remonte (la tâche le dit en échec). Rien n'est corrigé ici :
// une alerte par jour, à un humain. Les lignes ne portent que des
// identifiants Stripe.

import { idStripe } from "./ids";
import type Stripe from "stripe";
import { alerterUneFoisParJour } from "@/lib/alertes";
import { toutLister } from "./synchronisation";

/** Au-delà, un impayé n'est plus « en relance » : la fenêtre de Stripe est réglée à un mois au plus (§ 3). */
export const IMPAYE_TROP_LONG_JOURS = 35;
/** Au plus, par alerte. */
const AU_PLUS_LISTES = 20;

/** Ce qui ne va pas dans la configuration par défaut du portail ; vide : rien. */
export function defautsDuPortail(c: Stripe.BillingPortal.Configuration | null): string[] {
  if (!c) return ["aucune configuration par défaut active du portail client"];
  const f = c.features;
  const defauts: string[] = [];
  if (f.subscription_update?.enabled) defauts.push("le changement de formule est ouvert dans le portail (il doit se faire dans Rojer)");
  if (!f.subscription_cancel?.enabled) defauts.push("la résiliation est fermée dans le portail");
  else if (f.subscription_cancel.mode !== "at_period_end") defauts.push("la résiliation du portail est immédiate (attendu : en fin de période)");
  return defauts;
}

/** Un impayé : l'abonnement, son client, et l'échéance (secondes) de sa plus ancienne facture ouverte. */
export type Impaye = { id: string; client: string; depuis: number | null };

/** Les impayés plus vieux que `IMPAYE_TROP_LONG_JOURS` jours. */
export function impayesTropLongs(impayes: Impaye[], maintenant: Date): Impaye[] {
  const limite = maintenant.getTime() / 1000 - IMPAYE_TROP_LONG_JOURS * 86_400;
  return impayes.filter((i) => i.depuis !== null && i.depuis < limite);
}


/** Les abonnements `past_due`, chacun daté par sa plus ancienne facture encore ouverte. */
async function lireImpayes(stripe: Stripe): Promise<Impaye[]> {
  const abonnements = await toutLister(stripe.subscriptions.list({ status: "past_due", limit: 100 }), 1000);
  return Promise.all(
    abonnements.map(async (s) => {
      const ouvertes = await toutLister(stripe.invoices.list({ subscription: s.id, status: "open", limit: 100 }), 1000);
      const echeances = ouvertes.map((f) => f.due_date ?? f.created);
      return { id: s.id, client: idStripe(s.customer)!, depuis: echeances.length ? Math.min(...echeances) : null };
    }),
  );
}

async function controlerLePortail(stripe: Stripe, maintenant: Date): Promise<number> {
  const { data } = await stripe.billingPortal.configurations.list({ is_default: true, active: true, limit: 1 });
  const defauts = defautsDuPortail(data[0] ?? null);
  if (defauts.length > 0) {
    await alerterUneFoisParJour("reglages:portail", "portail client Stripe à régler", [
      ...defauts,
      "Corriger dans Stripe : Billing > Portail client (docs/lancement-abonnements.md § 4).",
    ], maintenant);
  }
  return defauts.length;
}

async function controlerLesImpayes(stripe: Stripe, maintenant: Date): Promise<number> {
  const anciens = impayesTropLongs(await lireImpayes(stripe), maintenant);
  if (anciens.length > 0) {
    await alerterUneFoisParJour("reglages:impayes", "impayés qui gardent la saisie ouverte", [
      `${anciens.length} abonnement(s) impayé(s) depuis plus de ${IMPAYE_TROP_LONG_JOURS} jours (${AU_PLUS_LISTES} au plus listés) :`,
      ...anciens.slice(0, AU_PLUS_LISTES).map((i) => `${i.id} — client ${i.client}`),
      "Leur saisie reste ouverte tant que Stripe ne les marque pas impayés : Billing > Récupération des revenus, « si toutes les tentatives échouent : marquer l'abonnement comme impayé », fenêtre d'un mois au plus (docs/lancement-abonnements.md § 3).",
    ], maintenant);
  }
  return anciens.length;
}

export type BilanReglages = { portail: number; impayesTropLongs: number };

export async function controlerLesReglagesStripe(stripe: Stripe, maintenant: Date): Promise<BilanReglages> {
  const [portail, impayes] = await Promise.allSettled([controlerLePortail(stripe, maintenant), controlerLesImpayes(stripe, maintenant)]);
  // L'un a échoué : l'autre a fait son office, l'échec remonte (journal de la tâche).
  if (portail.status === "rejected") throw portail.reason;
  if (impayes.status === "rejected") throw impayes.reason;
  return { portail: portail.value, impayesTropLongs: impayes.value };
}
