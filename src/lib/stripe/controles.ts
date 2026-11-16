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
//   à la fin des tentatives, qui la ferme (§ 3). Un `past_due` qui dure plus
//   que la plus longue fenêtre de relance raisonnable dit que ce réglage
//   manque.
//
// Rien n'est corrigé ici : une alerte par jour, à un humain. Les lignes ne
// portent que des identifiants Stripe.

import type Stripe from "stripe";
import { alerterUneFoisParJour } from "@/lib/alertes";
import { toutLister } from "./synchronisation";

/** L'identifiant du client d'un abonnement (référence développée ou non). */
const clientDe = (s: Stripe.Subscription | undefined) => (typeof s?.customer === "string" ? s.customer : (s?.customer?.id ?? null));

/** Au-delà, un impayé n'est plus « en relance » : la fenêtre de Stripe est réglée à un mois au plus (§ 3). */
export const IMPAYE_TROP_LONG_JOURS = 35;

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

/** Les abonnements impayés depuis plus de `IMPAYE_TROP_LONG_JOURS` jours (date de leur dernière facture). */
export function impayesTropLongs(abonnements: Stripe.Subscription[], maintenant: Date): string[] {
  const limite = maintenant.getTime() / 1000 - IMPAYE_TROP_LONG_JOURS * 86_400;
  return abonnements
    .filter((s) => {
      const f = s.latest_invoice;
      const depuis = f && typeof f === "object" ? (f.due_date ?? f.created) : null;
      return s.status === "past_due" && depuis !== null && depuis < limite;
    })
    .map((s) => s.id);
}

export type BilanReglages = { portail: number; impayesTropLongs: number };

export async function controlerLesReglagesStripe(stripe: Stripe, maintenant: Date): Promise<BilanReglages> {
  const [configurations, impayes] = await Promise.all([
    stripe.billingPortal.configurations.list({ is_default: true, active: true, limit: 1 }),
    toutLister(stripe.subscriptions.list({ status: "past_due", limit: 100, expand: ["data.latest_invoice"] }), 1000),
  ]);
  const portail = defautsDuPortail(configurations.data[0] ?? null);
  if (portail.length > 0) {
    await alerterUneFoisParJour("reglages:portail", "portail client Stripe à régler", [
      ...portail,
      "Corriger dans Stripe : Billing > Portail client (docs/lancement-abonnements.md § 4).",
    ], maintenant);
  }
  const anciens = impayesTropLongs(impayes, maintenant);
  if (anciens.length > 0) {
    await alerterUneFoisParJour("reglages:impayes", "impayés qui gardent la saisie ouverte", [
      `${anciens.length} abonnement(s) impayé(s) depuis plus de ${IMPAYE_TROP_LONG_JOURS} jours (20 au plus listés) :`,
      ...anciens.slice(0, 20).map((id) => {
        const s = impayes.find((a) => a.id === id);
        return `${id} — client ${clientDe(s) ?? "inconnu"}`;
      }),
      "Leur saisie reste ouverte tant que Stripe ne les marque pas impayés : Billing > Récupération des revenus, « si toutes les tentatives échouent : marquer l'abonnement comme impayé », fenêtre d'un mois au plus (docs/lancement-abonnements.md § 3).",
    ], maintenant);
  }
  return { portail: portail.length, impayesTropLongs: anciens.length };
}
