// L'assistance de prévention est-elle ouverte pour ce compte ? (ADR-050,
// amendée le 2026-11-24 : les questions de prévention, et bientôt le
// rendez-vous annuel, sont réservés à la formule Pro.)
//
// Même lecture que le connecteur (`formuleOuverte`) : un abonnement OUVERT,
// impayé en cours compris, dont la formule compte des heures avec l'expert
// (`heuresExpertParAn`). L'essai porte sur l'Essentiel : il n'ouvre pas
// l'assistance de prévention, une ligne sans formule non plus.

import { formuleOuverte, type LigneFormule } from "./droits";
import { FORMULES } from "./formules";

export function assistanceProOuverte(ligne: LigneFormule): boolean {
  const formule = formuleOuverte(ligne);
  return formule !== null && FORMULES[formule].quotas.heuresExpertParAn > 0;
}

/** Ce que l'e-mail adressé à l'équipe dit de la formule du compte. */
export function libelleFormuleDuCompte(ligne: LigneFormule): string {
  const formule = formuleOuverte(ligne);
  return formule ? FORMULES[formule].libelle : "Essai ou sans abonnement";
}
