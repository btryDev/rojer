// Les phrases que le DUERP ajoute à sa méthodologie pour dire ce qu'il ne
// traite pas (ADR-020).
//
// Elles vivaient dans le JSX du document, en trois ternaires imbriqués dans
// un `<Text>`. Les prédicats qui les commandent sont testés ; le fait que
// telle phrase sorte dans tel état ne l'était pas — le dossier `pdf/` n'a
// aucun test de rendu, et une condition inversée dans le JSX passait la suite
// verte. Or ces phrases sont la seule chose qui empêche un document
// d'apparence complète d'être lu comme exhaustif.
//
// Sorties d'ici, elles se vérifient. Le document n'a plus qu'à les rendre
// dans l'ordre, sans décider de rien.

import type { CouvertureSnapshot } from "@/lib/versions/snapshot";
import {
  activitesDeclareesSnapshot,
  activitesSansReponseSnapshot,
  mentionSansReponseIsolee,
} from "@/lib/activites/snapshot";

export type ContexteMentions = {
  couverture: CouvertureSnapshot | undefined;
  /** Nombre d'unités que le référentiel sectoriel n'a pas su outiller. */
  nbUnitesHorsReferentiel: number;
  /** Un aperçu n'a pas de date de validation : la formule change. */
  brouillon: boolean;
};

/**
 * Les phrases à ajouter au paragraphe « Modalités et découpage », dans
 * l'ordre. Tableau vide = rien à ajouter, et c'est un état normal : un
 * document dont le référentiel a tout couvert n'a rien à signaler.
 *
 * Chaque phrase décrit l'origine des données. Aucune ne conclut, aucune ne
 * reproche, aucune ne mesure — pas de taux de complétude, un décompte de
 * questions au plus.
 */
export function phrasesMethodologie(ctx: ContexteMentions): string[] {
  const { couverture, nbUnitesHorsReferentiel, brouillon } = ctx;
  const phrases: string[] = [];

  if (nbUnitesHorsReferentiel > 0) {
    phrases.push(
      "Certaines unités de travail ne correspondent à aucune unité type du " +
        "référentiel sectoriel : elles ont été évaluées sans base pré-chargée " +
        "et sont identifiées comme telles ci-dessous.",
    );
  }

  if (activitesDeclareesSnapshot(couverture).length > 0) {
    phrases.push(
      "Le référentiel sectoriel retenu ne couvre pas toutes les activités " +
        "déclarées par l'employeur : celles qu'il ne couvre pas sont nommées " +
        "ci-dessous, avec ce que le présent document ne traite pas à leur sujet.",
    );
  }

  // La mention isolée, et elle seule, se dit ici : sans elle, un « non » à
  // toutes les questions et un silence à toutes les questions donnaient le
  // même document. Quand des activités ont été déclarées, la liste porte déjà
  // la nuance et cette phrase n'a plus lieu d'être — c'est `mentionSansReponseIsolee`
  // qui tranche, pas ce module.
  if (mentionSansReponseIsolee(couverture)) {
    const n = activitesSansReponseSnapshot(couverture).length;
    phrases.push(
      `${n} question${n > 1 ? "s" : ""} sur le périmètre du référentiel ` +
        `${n > 1 ? "sont restées" : "est restée"} sans réponse ` +
        `${quandSansReponse(brouillon)} : le présent document n'affirme ni que ` +
        "ces activités sont exercées, ni qu'elles ne le sont pas.",
    );
  }

  return phrases;
}

/**
 * « à la date de validation » n'a de sens que sur une version figée. Sur un
 * aperçu, il n'existe aucune date de validation — le bandeau du document le
 * dit —, et la formule contredisait le bandeau qui l'accompagne.
 */
export function quandSansReponse(brouillon: boolean): string {
  return brouillon ? "à ce jour" : "à la date de validation";
}

/**
 * Ce que la page de garde ajoute sous la note quand une question de COUVERTURE
 * reste ouverte (D2 (a), 2026-09-28) — le pendant de `phraseIndetermines`,
 * pour la seconde source d'indétermination du score.
 *
 * Sans elle, la note imprimait « 100/100 · Reste à renseigner » pour un dossier
 * dont tous les états sont déclarés, sans rien qui dise ce qui reste. Le
 * détail est dans la section « Ce que ce dossier ne couvre pas », que ce
 * document porte déjà : la phrase y renvoie, sans nommer d'écran — le lecteur
 * n'a pas accès à l'application.
 */
export function phraseIndeterminationsCouverture(n: number): string | null {
  if (n <= 0) return null;
  const sujet =
    n === 1
      ? "Une question reste ouverte sur ce que cet outil couvre pour l'établissement"
      : `${n} questions restent ouvertes sur ce que cet outil couvre pour l'établissement`;
  return (
    `${sujet}. Elle${n === 1 ? "" : "s"} ne pénalise${n === 1 ? "" : "nt"} pas la note, ` +
    `elle${n === 1 ? "" : "s"} l'empêche${n === 1 ? "" : "nt"} de conclure. ` +
    "Le détail figure à la fin du dossier."
  );
}
