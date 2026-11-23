// Le connecteur MCP est-il ouvert pour ce compte ? (ADR-062 § 4, décision de
// la propriétaire du 2026-11-17 : seulement en formule Pro.)
//
// Une seule règle, lue par le serveur MCP à chaque requête, par la page de
// consentement et par la page « Connecter un assistant » : un abonnement
// OUVERT (`OUVRENT`, ADR-053 — impayé en cours compris, comme le reste de
// l'application) dont la formule a `connecterUnAssistant`. L'essai porte sur
// l'Essentiel (`FORMULE_D_ESSAI`) : il n'ouvre pas le connecteur, et une
// ligne sans formule non plus.

import { OUVRENT } from "./droits";
import { FORMULES, formuleDeLookupKey } from "./formules";

export type LigneConnecteur = { statut: string | null; formule: string | null } | null;

export function connecteurOuvert(ligne: LigneConnecteur): boolean {
  if (!ligne?.statut || !OUVRENT.has(ligne.statut)) return false;
  const formule = formuleDeLookupKey(ligne.formule)?.formule;
  return formule !== undefined && FORMULES[formule].quotas.connecterUnAssistant;
}

export const MESSAGE_CONNECTEUR_PRO =
  "Le connecteur d'assistant est réservé à la formule Pro. Le titulaire du compte peut changer de formule depuis la page Abonnement de Rojer.";
