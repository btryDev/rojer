import { publicAppUrl } from "@/lib/email";

/**
 * Les liens envoyés par e-mail pour un compte (ADR-052). Leur adresse vient de
 * `PUBLIC_APP_URL`, jamais de la requête ni du formulaire : un POST forgé
 * ferait sinon envoyer par Rojer un lien vers un site tiers, qui recevrait le
 * jeton (audit du 2026-10-13, C3). Sans adresse publique en production,
 * `publicAppUrl` lève : aucun lien faux ne part.
 */
export function lienVerification(token: string): string {
  return `${publicAppUrl()}/auth/verification?token=${encodeURIComponent(token)}`;
}

export function lienReinitialisation(token: string): string {
  return `${publicAppUrl()}/auth/reinitialisation?token=${encodeURIComponent(token)}`;
}
