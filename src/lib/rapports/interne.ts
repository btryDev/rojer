// Qui peut enregistrer une vérification sans rapport de prestataire
// (2026-11-04, décision de la propriétaire). MODULE PUR : lu par l'action de
// dépôt, la fiche du contrôle et le formulaire (composant client).
//
// La règle se lit sur `Verification.realisateurRequis`, la liste figée sur la
// ligne depuis le référentiel (ou la prescription) :
//
//  - l'EXPLOITANT y figure (alarme hebdomadaire de MS 69, essai mensuel de
//    l'éclairage de sécurité…) : le formulaire s'ouvre sur « En interne » ;
//  - une PERSONNE QUALIFIÉE ou COMPÉTENTE seulement — qui peut appartenir à
//    l'établissement (R. 4323-24 : « appartenant ou non à l'établissement »),
//    mais qui est le plus souvent un prestataire : il s'ouvre sur
//    « Prestataire », l'interne reste possible ;
//  - un tiers seul (organisme agréé ou accrédité, bureau de contrôle,
//    fabricant, professionnel de santé) : pas d'interne, le rapport du tiers
//    est exigé (R. 4323-26, il s'annexe au registre).
//
// En interne, le fichier est facultatif : le formulaire EST le relevé. Par un
// prestataire, il reste obligatoire.

import type { Realisateur } from "@prisma/client";

/** Les réalisateurs qui peuvent être l'exploitant lui-même ou son équipe. */
export const REALISATEURS_INTERNES: readonly Realisateur[] = [
  "exploitant",
  "personne_qualifiee",
  "personne_competente",
];

export type FaitPar = "interne" | "prestataire";

/**
 * Le choix offert au formulaire : `null` = pas de choix (un tiers est exigé),
 * sinon le mode par lequel il s'ouvre.
 */
export function modeParDefaut(
  realisateurs: readonly Realisateur[],
): FaitPar | null {
  if (realisateurs.includes("exploitant")) return "interne";
  if (realisateurs.some((r) => REALISATEURS_INTERNES.includes(r))) {
    return "prestataire";
  }
  return null;
}

/**
 * Qui a fait la vérification, tel que le registre et la fiche l'impriment.
 * En interne, `organismeVerif` porte le nom de la personne, s'il est donné.
 * `null` : rien à dire (un rapport de prestataire sans organisme saisi).
 */
export function libelleRealisePar(r: {
  realiseEnInterne: boolean;
  organismeVerif: string | null;
}): string | null {
  if (r.realiseEnInterne) {
    return r.organismeVerif ? `En interne (${r.organismeVerif})` : "En interne";
  }
  return r.organismeVerif;
}

/**
 * La même chose avec « par » devant un organisme, pour une ligne de fiche :
 * « En interne (Marie) », « par Apave ».
 */
export function mentionRealisePar(r: {
  realiseEnInterne: boolean;
  organismeVerif: string | null;
}): string | null {
  const libelle = libelleRealisePar(r);
  if (libelle === null) return null;
  return r.realiseEnInterne ? libelle : `par ${libelle}`;
}

/**
 * Les mots de la fiche d'un contrôle, selon que l'interne y est possible.
 * Une seule table : la fiche ne dit plus « rapport » là où l'exploitant
 * consigne lui-même, et ne le redit pas dix fois à la main.
 */
export function libellesDepot(enInternePossible: boolean) {
  return enInternePossible
    ? {
        titreDepot: "Enregistrer la vérification",
        nouveau: "Nouvelle vérification",
        explicationNouveau:
          "Chaque vérification enregistrée met à jour la date de réalisation et recalcule la prochaine échéance.",
        titreSection: "Vérifications enregistrées",
        confirmation: "Vérification enregistrée.",
      }
    : {
        titreDepot: "Déposer le rapport",
        nouveau: "Nouveau rapport",
        explicationNouveau:
          "Un rapport additionnel met à jour la date de réalisation et régénère la prochaine échéance.",
        titreSection: "Rapports déposés",
        confirmation: "Rapport enregistré.",
      };
}

/** Une vérification de cette ligne peut-elle être enregistrée en interne ? */
export function interneAutorise(realisateurs: readonly Realisateur[]): boolean {
  return modeParDefaut(realisateurs) !== null;
}
