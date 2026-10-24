/**
 * Les lignes de « Ce qui doit être en place » qui se suivent dans Équipe ›
 * Formations (décision de la propriétaire du 2026-10-24).
 *
 * ~~Les lignes nées d'un fait d'activité se déclaraient sous leur question,
 * dans « Évaluer les risques de vos salariés » (2026-10-21).~~ [2026-10-24 :
 * cette page ne pose plus que les questions. Une FORMATION des salariés
 * (`estFormation`) se suit dans Équipe, avec les titres de chacun ; les autres
 * lignes nées d'un fait — le carnet de prescriptions, la consigne d'utilisation
 * des EPI, des documents — reviennent sur « Ce qui doit être en place ».]
 *
 * Rien ne change au moteur ni au score : la ligne reste un état permanent du
 * dossier, comptée dans le score et le PDF. Seul l'endroit où on la voit et où
 * on la déclare change, et le compteur de « Ce qui doit être en place » ne la
 * compte plus (`compteDeLaPage`).
 *
 * Module pur.
 */

import type { Obligation } from "@/lib/referentiels/conformite";
import { estFormation } from "@/lib/referentiels/conformite/types";
import type { LigneEtatPermanent } from "./queries";
import { dependDUnFaitMuet } from "@/lib/etablissements/guide-par-module";

/**
 * Le chemin, sous `/etablissements/<id>`, de l'endroit où une ligne de « Ce
 * qui doit être en place » se déclare : ~~Équipe › Formations~~ la section
 * « Formations à organiser » d'Équipe pour une formation [2026-10-24, l'onglet
 * devient une section], sinon l'écran « en place » — avec l'ancre de la ligne quand
 * `ancre` est donnée. Lu par les liens qui mènent à une ligne précise (fiche
 * équipement, équipements de sécurité) : un lien vers un écran viserait une
 * ligne qu'il n'affiche pas.
 */
export function cheminDeDeclaration(o: Obligation, ancre?: string): string {
  const base = estFormation(o) ? "/equipe" : "/etats-permanents";
  return ancre ? `${base}#${ancre}` : base;
}

/**
 * Le « x sur n » des lignes suivies dans Équipe, compté comme celui d'une
 * famille (`listerEtatsPermanents`) : les seules lignes en mode « état », en
 * place d'après les titres quand un titre les porte, sinon d'après la
 * déclaration.
 */
export function compteParLEquipe(
  lignes: readonly LigneEtatPermanent[],
): { enPlace: number; total: number; lignes: number } {
  const etats = lignes.filter((l) => l.compteDansLEnTete);
  return {
    enPlace: etats.filter((l) =>
      l.parLesTitres ? l.parLesTitres.enPlace : l.declareLe !== null,
    ).length,
    total: etats.length,
    /** Toutes les lignes, celles « à dater » comprises (hors compte). */
    lignes: lignes.length,
  };
}

/**
 * Les lignes qu'Équipe › Formations AFFICHE et compte : pas celles qui ne
 * tiennent qu'à une question d'activité sans réponse (« à confirmer » par un
 * fait muet). Les montrer avant la réponse laissait croire qu'elles étaient
 * déjà dues (décision de la propriétaire du 2026-10-22, revue du 2026-10-24).
 * Elles restent comptées par le score et le PDF, comme toute ligne retenue
 * par prudence.
 */
export function lignesFormationAffichees(
  lignes: readonly LigneEtatPermanent[],
): LigneEtatPermanent[] {
  return lignes.filter((l) => !dependDUnFaitMuet(l.questionsSansReponse));
}

/** Combien de lignes attendent une réponse avant de s'afficher. */
export function formationsEnAttenteDeReponse(
  lignes: readonly LigneEtatPermanent[],
): number {
  return lignes.length - lignesFormationAffichees(lignes).length;
}

/**
 * POURQUOI une formation est due à l'établissement et non sur une fiche, en
 * une phrase (2026-10-24, retour de la propriétaire : « si ce n'est pas sur la
 * fiche d'un salarié, ça veut dire que… »). Rojer ne sait pas qui est
 * concerné ; la phrase dit d'où vient l'obligation.
 */
export function pourquoiALEtablissement(
  l: Pick<LigneEtatPermanent, "parLesTitres" | "questionsSansReponse" | "obligation">,
): string {
  // Établie d'après les titres de toute l'équipe : la phrase de
  // `par-les-titres.ts`, qui compte les titres et nomme les échéances.
  if (l.parLesTitres) return l.parLesTitres.phrase;
  if (l.questionsSansReponse.length > 0) {
    return "À confirmer : une question du DUERP qui la décide n'a pas encore de réponse.";
  }
  if (l.obligation.typologies.activite) {
    return "Votre DUERP le signale : à organiser pour les salariés concernés.";
  }
  return "Due pour le personnel de l'établissement, quel que soit le poste.";
}
