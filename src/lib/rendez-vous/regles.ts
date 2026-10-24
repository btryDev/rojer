/**
 * Les règles du suivi d'un contrôle (ADR-049). Module pur : l'écran et
 * l'action serveur lisent les mêmes fonctions.
 */

import { formaterDateCourteFr, formaterDateHeureFr, formaterJourMoisFr, joursCivilsEntre } from "@/lib/dates";

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

/** La pastille d'un rendez-vous dans une liste tronquée (calendrier). */
export type PastilleRendezVous = { court: string; complet: string; passe: boolean };

/**
 * Posée au jour du rendez-vous, la ligne dit son échéance ; restée à
 * l'échéance (rendez-vous après elle), elle dit le rendez-vous, en rose.
 * `echeanceConnue` : faux pour une ligne « à planifier », dont `datePrevue`
 * n'est que la date de génération — tout rendez-vous y est bienvenu.
 */
export function pastilleRendezVous(
  v: { rendezVousLe: Date | null; datePrevue: Date; prestataire?: { raisonSociale: string } | null },
  maintenant: Date,
  echeanceConnue: boolean,
): PastilleRendezVous | null {
  const complet = mentionRendezVous(v, maintenant);
  if (!v.rendezVousLe || !complet) return null;
  if (rendezVousEnAttenteDeRapport(v.rendezVousLe, maintenant)) {
    return { court: "RDV passé", complet, passe: true };
  }
  if (!echeanceConnue) {
    return { court: `RDV ${formaterJourMoisFr(v.rendezVousLe)}`, complet, passe: false };
  }
  if (rendezVousAvantEcheance(v)) {
    return {
      court: `Échéance ${formaterDateCourteFr(v.datePrevue)}`,
      complet: `${complet} — échéance légale le ${formaterDateCourteFr(v.datePrevue)}`,
      passe: false,
    };
  }
  return {
    court: `RDV ${formaterJourMoisFr(v.rendezVousLe)}, après l'échéance`,
    complet: `${complet} — après l'échéance du ${formaterDateCourteFr(v.datePrevue)}`,
    passe: true,
  };
}

/**
 * Le rendez-vous se tient-il au plus tard le jour de l'échéance ? Alors la
 * ligne se place au calendrier à la date du rendez-vous, l'échéance écrite à
 * côté (décision de la propriétaire du 2026-10-24). Après l'échéance, la
 * ligne reste à l'échéance : le retard doit se voir.
 */
export function rendezVousAvantEcheance(
  v: { rendezVousLe?: Date | null; datePrevue: Date },
): boolean {
  return !!v.rendezVousLe && joursCivilsEntre(v.rendezVousLe, v.datePrevue) >= 0;
}

/**
 * La date où le calendrier pose une lecture : celle du rendez-vous pour
 * l'échéance ouverte quand il est À VENIR et la précède (ou que la ligne
 * est « à planifier »), sinon celle de la lecture. Un rendez-vous passé
 * sans rapport ne déplace rien : la ligne reste où son état la met.
 * Affichage seulement : retards et compteurs restent sur l'échéance.
 */
export function datePoseeAuCalendrier(
  v: { rendezVousLe?: Date | null; datePrevue: Date },
  lecture: { date: Date; lecture: string; registre: string },
  maintenant: Date,
  /**
   * La ligne a-t-elle une échéance connue (`aUnRendezVous`) ? Sans elle (« à
   * planifier », en retard ou non), tout rendez-vous à venir la pose : il
   * n'y a pas d'échéance à dépasser, et son état — retard compris — reste
   * celui de la ligne (revue du 2026-10-24).
   */
  echeanceConnue: boolean,
): Date {
  if (!v.rendezVousLe || lecture.lecture === "realisation") return lecture.date;
  if (rendezVousEnAttenteDeRapport(v.rendezVousLe, maintenant)) return lecture.date;
  if (!echeanceConnue) return v.rendezVousLe;
  if (lecture.registre === "enRetard") return lecture.date;
  return rendezVousAvantEcheance(v) ? v.rendezVousLe : lecture.date;
}

/** Les écarts que le formulaire signale à la saisie, sans bloquer. */
export function avertissementRendezVous(rendezVousLe: Date, echeance: Date | null): string | null {
  if (!echeance) return null;
  const avance = joursCivilsEntre(rendezVousLe, echeance);
  if (avance < 0) return "Après l'échéance : le contrôle sera en retard d'ici là.";
  if (avance > 92)
    return "Bien en avance sur l'échéance : la suivante sera comptée à partir de ce contrôle.";
  return null;
}
