// L'âge du calendrier d'un dossier, en TEXTE : le type, le prédicat et les
// phrases, sans base ni session (sortis de `fraicheur.ts` le 2026-11-10, lot
// pdf-b1). Les PDF, mis en page dans un fil séparé, n'importent que ce
// module ; la lecture du repère reste dans `fraicheur.ts`.

/**
 * Ce qu'on sait de l'âge du calendrier d'un dossier.
 *
 * Union fermée, sur le patron de `EtatCharge` (`src/lib/batiments/etat-charge.ts`,
 * retiré le 2026-10-25 avec la plaque des zones du hero) :
 * un `switch` exhaustif casse à la compilation le jour où un cas s'ajoute, là
 * où un booléen « à jour ? » aurait forcé à ranger « jamais généré » avec l'un
 * des deux autres — c'est exactement l'amalgame qui a produit le défaut.
 */
export type FraicheurCalendrier =
  /** Aucune ligne, aucun repère : le dossier n'a jamais eu de calendrier.
   *  Une liste vide ne veut alors PAS dire « rien à faire ». */
  | { etat: "jamais_genere" }
  /** Le repère a été effacé par `marquerCalendrierPerime` : une régénération a
   *  échoué. Des lignes existent, elles peuvent être fausses. */
  | { etat: "echec_regeneration" }
  /** Le repère diffère du sceau courant : le référentiel ou le moteur ont
   *  changé depuis le dernier calcul. Les lignes sont celles d'avant. */
  | { etat: "perime"; sceauPose: string; sceauAttendu: string }
  /** Le repère vaut le sceau courant. */
  | { etat: "a_jour" };

/**
 * Vrai quand ce que le dossier montre ne peut pas être présenté comme un état
 * établi. Les trois cas non sains y tombent — c'est le prédicat que les
 * sorties utilisent pour décider d'AJOUTER une phrase, jamais pour masquer ce
 * qu'elles rendent : les lignes existantes restent vraies, c'est leur
 * complétude qui ne l'est pas.
 */
export function calendrierIncertain(f: FraicheurCalendrier): boolean {
  return f.etat !== "a_jour";
}

/**
 * La phrase à montrer, ou `null` si le calendrier est à jour.
 *
 * Elle dit CE QUI EST, jamais ce qu'il faut en conclure : aucun de ces états
 * n'est une non-conformité, et le produit ne qualifie rien en droit (ADR-025).
 * Le verbe est au constat, et chaque phrase nomme le geste qui la lève, parce
 * qu'un avertissement sans issue ne fait qu'inquiéter.
 */
export function phraseFraicheur(
  f: FraicheurCalendrier,
  sujet?: SujetFraicheur,
): string | null {
  if (sujet) return phraseDEcran(f, sujet);
  switch (f.etat) {
    case "a_jour":
      return null;
    case "jamais_genere":
      return (
        "Le calendrier des vérifications n'a pas encore été calculé pour ce " +
        "dossier : ce qui suit ne recense aucune échéance, ce qui ne veut pas " +
        "dire qu'il n'y en a pas. Ouvrez le tableau de bord ou le calendrier " +
        "pour le calculer."
      );
    case "echec_regeneration":
      return (
        "Le dernier calcul du calendrier des vérifications n'a pas abouti : " +
        "les échéances ci-dessous peuvent être incomplètes ou dépassées. " +
        "Ouvrez le tableau de bord ou le calendrier pour le reprendre."
      );
    case "perime":
      return (
        "Le référentiel a évolué depuis le dernier calcul du calendrier : les " +
        "échéances ci-dessous sont celles d'avant cette évolution. Ouvrez le " +
        "tableau de bord ou le calendrier pour les recalculer."
      );
  }
}

/**
 * Ce qu'un ÉCRAN montre du calendrier, pour que la phrase le nomme.
 *
 * « Les échéances ci-dessous » est juste pour une liste d'échéances — un PDF,
 * le ZIP, « Préparer un contrôle ». Il est faux sur la fiche d'UNE échéance, et
 * sur le parc, qui ne montre que des compteurs (revue du 2026-10-13). Le sujet
 * porte son nombre, pour l'accord ; les phrases sont tournées pour qu'aucun
 * genre n'ait à s'accorder.
 */
export type SujetFraicheur = { texte: string; pluriel: boolean };

/** La fiche d'une échéance. */
export const SUJET_UNE_ECHEANCE: SujetFraicheur = {
  texte: "Cette échéance",
  pluriel: false,
};
/** La fiche d'un appareil. */
export const SUJET_ECHEANCES_DE_L_APPAREIL: SujetFraicheur = {
  texte: "Les échéances de cet appareil",
  pluriel: true,
};
/** Une fiche du registre de sécurité alimentée par le calendrier. */
export const SUJET_VERIFICATIONS_DE_LA_FICHE: SujetFraicheur = {
  texte: "Les vérifications reprises sur cette fiche",
  pluriel: true,
};
/** Le parc, qui compte les retards par appareil. */
export const SUJET_COMPTEURS_DU_PARC: SujetFraicheur = {
  texte: "Les compteurs de vérification de cet écran",
  pluriel: true,
};

function phraseDEcran(
  f: FraicheurCalendrier,
  { texte, pluriel }: SujetFraicheur,
): string | null {
  const geste =
    "Ouvrez le tableau de bord ou le calendrier pour le recalculer.";
  switch (f.etat) {
    case "a_jour":
      return null;
    case "jamais_genere":
      return (
        "Le calendrier des vérifications n'a pas encore été calculé pour ce " +
        "dossier : l'absence d'échéance ici ne veut pas dire qu'il n'y en a " +
        "pas. " +
        geste
      );
    case "echec_regeneration":
      return (
        "Le dernier calcul du calendrier des vérifications n'a pas abouti. " +
        `${texte} ${pluriel ? "peuvent" : "peut"} ne pas être à jour. ` +
        geste
      );
    case "perime":
      return (
        "Le référentiel a évolué depuis le dernier calcul du calendrier. " +
        `${texte} ${pluriel ? "datent" : "date"} d'avant cette évolution. ` +
        geste
      );
  }
}
