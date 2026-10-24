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
 * Les lignes qu'~~Équipe › Formations~~ [2026-10-24 : section « Formations à organiser » d'Équipe] AFFICHE et compte : pas celles qui ne
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

/*
 * ~~`formationsEnAttenteDeReponse`~~ (retirée le 2026-10-24, revue qualité :
 * plus d'appelant depuis que l'onglet Formations est devenu une section).
 */

/**
 * POURQUOI une formation est due à l'établissement et non sur une fiche, en
 * une phrase (2026-10-24, retour de la propriétaire : « si ce n'est pas sur la
 * fiche d'un salarié, ça veut dire que… »). Rojer ne sait pas qui est
 * concerné ; la phrase dit d'où vient l'obligation.
 */
export function pourquoiALEtablissement(
  l: Pick<LigneEtatPermanent, "parLesTitres" | "questionsSansReponse" | "obligation" | "aConfirmer">,
): string {
  // Établie d'après les titres de toute l'équipe : la phrase de
  // `par-les-titres.ts`, qui compte les titres et nomme les échéances.
  if (l.parLesTitres) return l.parLesTitres.phrase;
  // Retenue sous réserve d'effectif (revue qualité du 2026-10-24 : la réserve
  // ne se lisait qu'en ouvrant la fiche, qui en donne le détail).
  if (l.aConfirmer) {
    return "À confirmer : elle dépend de votre effectif, qui ne se lit pas pareil sur la fiche de l'entreprise et sur ce site. Le détail est dans la fiche.";
  }
  if (l.questionsSansReponse.length > 0) {
    // Les questions du DUERP muettes cachent la ligne
    // (`lignesFormationAffichees`) : il ne reste ici que celles de la fiche.
    return "À confirmer : une question de la fiche de l'établissement n'a pas encore de réponse.";
  }
  if (l.obligation.typologies.activite) {
    return "Votre DUERP le signale : à organiser pour les salariés concernés.";
  }
  // Neutre : certaines visent tout le personnel, d'autres des agents désignés
  // (M 29, N 17) — revue de justesse du 2026-10-24.
  return "Due par l'établissement : Rojer ne sait pas quels salariés sont concernés.";
}

/**
 * Combien de formations restent à organiser pour l'établissement — le compte
 * de la section « Formations à organiser » (revue qualité du 2026-10-24 : la
 * section recopiait une formule). Le widget compte, lui, toutes les lignes du
 * dossier, cachées comprises, comme le score. Les lignes affichées (`lignesFormationAffichees`), comptées comme
 * l'en-tête (`compteParLEquipe`, mode « état » seul), plus les titres que le
 * DUERP signale et que personne ne porte.
 */
export function aOrganiserALEtablissement(
  lignes: readonly LigneEtatPermanent[],
  titresSansPorteur = 0,
): number {
  const c = compteParLEquipe(lignesFormationAffichees(lignes));
  return c.total - c.enPlace + titresSansPorteur;
}
