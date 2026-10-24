/**
 * Les règles du suivi d'un contrôle (ADR-049). Module pur : l'écran et
 * l'action serveur lisent les mêmes fonctions.
 */

import { formaterDateHeureFr, joursCivilsEntre } from "@/lib/dates";

/**
 * Un contrôle reçoit un prestataire et un rendez-vous s'il est ouvert et
 * matériel : pas une ligne éteinte, pas l'échéance d'une personne (formation,
 * visite médicale), que l'outil ne fait pas planifier.
 */
export function recoitUnSuivi(v: { archiveLe: Date | null; salarieId: string | null }): boolean {
  return v.archiveLe === null && v.salarieId === null;
}

/**
 * Le rendez-vous est passé sans qu'un rapport l'ait consommé : le dépôt du
 * rapport efface le rendez-vous, donc un rendez-vous encore là et passé
 * attend son rapport. Passé = un jour civil au moins après.
 */
export function rendezVousEnAttenteDeRapport(rendezVousLe: Date | null, maintenant: Date): boolean {
  return rendezVousLe !== null && joursCivilsEntre(rendezVousLe, maintenant) >= 1;
}

/**
 * Ce qu'une ligne de liste dit du rendez-vous (calendrier, fiche d'un
 * appareil) : rien sans rendez-vous.
 */
export function mentionRendezVous(
  v: { rendezVousLe: Date | null; prestataire?: { raisonSociale: string } | null },
  maintenant: Date,
): string | null {
  if (!v.rendezVousLe) return null;
  const avec = v.prestataire ? ` avec ${v.prestataire.raisonSociale}` : "";
  return rendezVousEnAttenteDeRapport(v.rendezVousLe, maintenant)
    ? `RDV du ${formaterDateHeureFr(v.rendezVousLe)} passé : rapport attendu`
    : `RDV le ${formaterDateHeureFr(v.rendezVousLe)}${avec}`;
}
