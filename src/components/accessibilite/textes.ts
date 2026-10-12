/**
 * Ce que l'écran du registre d'accessibilité dit de son contenu, au regard
 * de `R. 164-6` CCH et de l'arrêté du 19 avril 2017 (2026-10-12, audit des
 * modules). Rangé sous `src/components` pour être balayé avec les textes
 * d'écran, et tenu par `textes.test.ts` contre le verbatim du corpus.
 *
 * ~~« L'arrêté du 19 avril 2017 définit 4 rubriques obligatoires :
 * prestations fournies, pièces administratives d'accessibilité, formation du
 * personnel, et modalités de maintenance. »~~ · ~~« Registre complet » /
 * « Toutes les rubriques de l'arrêté sont renseignées. »~~ — faux tous deux :
 * l'arrêté (art. 1er I) énumère NEUF pièces, plus une attestation annuelle de
 * formation en 1ʳᵉ à 4ᵉ catégorie (II), et aucune ne se dépose dans Rojer.
 * Les quatre sections sont celles du module. Déposer les pièces est une
 * décision de la propriétaire (audit, § 4.3), non prise ici.
 */
export const CONTENU_REGISTRE =
  "Le registre contient une information sur les prestations, la liste des pièces relatives à l'accessibilité et la description des actions de formation du personnel d'accueil (art. R. 164-6 CCH). L'arrêté du 19 avril 2017 (art. 1er) en énumère les pièces : neuf pour tout ERP, la plupart selon la situation de l'établissement — attestations, calendrier et bilan de l'Ad'AP, arrêtés de dérogation, notice d'accessibilité, document d'aide à l'accueil, modalités de maintenance des équipements —, plus, en 1ʳᵉ à 4ᵉ catégorie, une attestation annuelle de formation. Rojer en saisit des informations, dont les modalités de maintenance ; les pièces elles-mêmes ne s'y déposent pas et se tiennent à côté.";

/** Le titre et la phrase de la jauge des quatre sections du module. */
export function libelleProgression(progression: number): {
  titre: string;
  phrase: string;
} {
  if (progression === 0) {
    return {
      titre: "Registre vide",
      phrase: "Remplissez chaque section en plusieurs passes — rien n'est bloquant.",
    };
  }
  if (progression < 100) {
    return {
      titre: "En cours de remplissage",
      phrase: "Remplissez chaque section en plusieurs passes — rien n'est bloquant.",
    };
  }
  return {
    titre: "Quatre sections renseignées",
    phrase:
      "Les quatre sections de Rojer sont renseignées. Les pièces que l'arrêté du 19 avril 2017 fait figurer au registre (art. 1er) restent à tenir hors de Rojer.",
  };
}
