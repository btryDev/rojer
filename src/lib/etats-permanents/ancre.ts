// L'ancre d'une ligne de « Ce qui doit être en place » (2026-10-16, contrôle
// visuel E5). Un lien qui renvoie à cet écran pour une obligation précise —
// le « Déclarer » de la section « Équipements de sécurité » — arrive sur sa
// ligne, pas en haut de page. Une seule fonction pour l'id posé par la ligne
// et pour le lien qui le vise : les deux ne peuvent pas diverger.
//
// Module pur, à part de `regle.ts` : celui-ci est relevé par le sceau du
// moteur de calendrier, et une ancre d'écran n'y a rien à faire.

export function ancreEtatPermanent(obligationId: string): string {
  return `etat-${obligationId}`;
}
