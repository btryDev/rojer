// Ce qu'il reste à faire sur le parc d'équipements : une ligne par GESTE, pas
// par appareil.
//
// Le board dit « Compléter vos équipements » ; la page Équipements ne disait pas
// quoi compléter (retour de la propriétaire du 2026-10-27, compte de test du
// préventeur). Seconde passe, même jour : une ligne par appareil faisait « liste
// à rallonge ». La liste annonce donc les catégories de gestes, et chaque
// appareil concerné porte sur sa tuile la pastille « À compléter » et son geste.
//
// Module pur : ni Prisma, ni React.

import type { ChampTriEtat } from "./schema";

/** Les gestes, dits une fois : la tuile, la liste et la fiche les lisent ici. */
export const GESTE_USAGE = "Préciser son usage";
export const GESTE_DATE = "Renseigner la date du dernier contrôle";

/**
 * La question, courte, posée à l'appareil — pour le bandeau de sa fiche. Le
 * formulaire la pose en entier avec son aide (`EquipementForm`).
 */
export const QUESTION_COURTE: Record<ChampTriEtat, string> = {
  aGroupeElectrogene: "Un groupe électrogène de sécurité est-il présent ?",
  estVmcGaz: "La VMC est-elle raccordée à des appareils à gaz ?",
  aExtinctionAutomatique: "Une extinction automatique est-elle installée ?",
  sertAuLevageDePersonnes: "L'appareil sert-il à lever des personnes ?",
  estMuParForceHumaine: "L'appareil est-il manuel (mû par la seule force humaine) ?",
  estChariotOuGerbeur: "Est-ce un chariot élévateur, un gerbeur, un hayon ou un appareil de la même liste ?",
  aAccessoiresDeLevage: "Des accessoires de levage sont-ils utilisés ?",
  estSoumisSuiviEnService: "L'équipement est-il suivi en service (arrêté du 20 novembre 2017) ?",
  estChargeSousSeuilControle: "La charge en fluide est-elle sous le seuil de contrôle ?",
  estHermetiquementScelleSousSeuil: "L'équipement est-il hermétiquement scellé et sous le seuil ?",
  estChargeSuperieure50TCo2: "La charge dépasse-t-elle 50 t équivalent CO₂ ?",
  estChargeSuperieure500TCo2: "La charge dépasse-t-elle 500 t équivalent CO₂ ?",
  aDetectionDeFuites: "Une détection fixe des fuites est-elle installée ?",
  estSsiCategorieAouB: "Le SSI est-il de catégorie A ou B ?",
  estDesenfumageMecanique: "Le désenfumage est-il mécanique ?",
};

/**
 * Les gestes d'un appareil, dans l'ordre où ils se font : l'usage d'abord — une
 * réponse peut changer le rythme, donc la date qu'une déclaration donnerait.
 * Vide = rien à compléter.
 */
export function gestesDeLAppareil(a: { questionsSansReponse: number; controlesSansDate: number }): string[] {
  return [
    ...(a.questionsSansReponse > 0 ? [GESTE_USAGE] : []),
    ...(a.controlesSansDate > 0 ? [GESTE_DATE] : []),
  ];
}

export type LigneResteAFaire = {
  cle: "usage" | "dates" | "suggestions";
  texte: string;
};

const equipements = (n: number) => `${n} équipement${n > 1 ? "s" : ""}`;

/**
 * Les lignes de la liste, une par geste. Les SUGGESTIONS n'en sont une que tant
 * qu'aucun équipement n'est déclaré (décision du 2026-10-27, « masquer
 * seulement ») : rien ne retient « je n'en ai pas ».
 */
export function resteAFaireDuParc({
  nbAPreciser,
  nbADater,
  nbEquipements,
  nbSuggestions,
}: {
  /** Appareils auxquels manque une réponse exigée. */
  nbAPreciser: number;
  /** Appareils dont des contrôles à rythme n'ont pas d'échéance connue (ADR-051). */
  nbADater: number;
  nbEquipements: number;
  nbSuggestions: number;
}): LigneResteAFaire[] {
  const lignes: LigneResteAFaire[] = [];
  if (nbAPreciser > 0) {
    lignes.push({ cle: "usage", texte: `Préciser l'usage de ${equipements(nbAPreciser)}` });
  }
  if (nbADater > 0) {
    lignes.push({
      cle: "dates",
      texte: `Renseigner la date du dernier contrôle (ou de mise en service) de ${equipements(nbADater)}`,
    });
  }
  if (nbEquipements === 0 && nbSuggestions > 0) {
    lignes.push({ cle: "suggestions", texte: "Déclarer vos équipements" });
  }
  return lignes;
}
