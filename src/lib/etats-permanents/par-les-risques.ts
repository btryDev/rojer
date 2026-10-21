/**
 * Les lignes de « Ce qui doit être en place » qui se déclarent sous une
 * question d'activité (2026-10-21, décision de la propriétaire).
 *
 * Une ligne que seul un fait d'activité fait naître (ADR-041 : manutention,
 * écran, opérations électriques…) n'est pas un état de l'établissement comme
 * une affiche ou un extincteur : c'est ce qu'un risque déclaré rend dû à une
 * partie de l'effectif. Elle se lit et se déclare donc sous la question qui la
 * déclenche, dans Équipe › « Évaluer les risques de vos salariés », et non
 * plus sur l'écran « en place ».
 *
 * Rien ne change au moteur ni au compte : la ligne reste un état permanent du
 * dossier, comptée dans l'en-tête, le score, le widget et le PDF. Seul l'endroit
 * où on la voit change. `epiPresents` n'en est pas : sa question vit sur la
 * fiche établissement (ADR-025), sa ligne reste sur l'écran « en place ».
 *
 * Module pur.
 */

import type { Obligation } from "@/lib/referentiels/conformite";
import type { LigneEtatPermanent } from "./queries";
import {
  estChampFaitActivite,
  type ChampFaitActivite,
} from "@/lib/etablissements/faits-activite";

/** Le fait d'activité qui fait naître la ligne, s'il en est un de ce registre. */
export function faitDeLaLigne(o: Obligation): ChampFaitActivite | null {
  const activite = o.typologies.activite;
  return activite && estChampFaitActivite(activite) ? activite : null;
}

/**
 * Le chemin, sous `/etablissements/<id>`, de l'endroit où une ligne de « Ce
 * qui doit être en place » se déclare : sa question sur la page des risques
 * quand un fait d'activité la fait naître, sinon l'écran « en place » — avec
 * l'ancre de la ligne quand `ancre` est donnée. Lu par les liens qui mènent à
 * une ligne précise (fiche équipement, équipements de sécurité) : un lien vers
 * l'écran « en place » viserait une ligne qu'il n'affiche plus.
 */
export function cheminDeDeclaration(o: Obligation, ancre?: string): string {
  const champ = faitDeLaLigne(o);
  if (champ) return `/equipe/risques#${champ}`;
  return ancre ? `/etats-permanents#${ancre}` : "/etats-permanents";
}

/**
 * Le « x sur n » des lignes déclarées sous une question d'activité, compté
 * comme celui d'une famille (`listerEtatsPermanents`) : les seules lignes en
 * mode « état », en place d'après les titres quand un titre les porte, sinon
 * d'après la déclaration. Les familles plus ce compte font l'en-tête.
 */
export function compteParLesRisques(
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
