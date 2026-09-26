// Dater une action : obligation, ou simple confort d'outil ?
//
// La réponse dépend de l'effectif **déclaré par la structure**, pas de la
// cible du produit. Art. L. 4121-3-1 du Code du travail : les résultats de
// l'évaluation des risques débouchent
//
//   - dans les entreprises d'au moins cinquante salariés, sur un programme
//     annuel de prévention qui **inclut un calendrier de mise en œuvre**,
//     les conditions d'exécution de chaque mesure, des indicateurs de
//     résultat et l'estimation de son coût ;
//   - dans les entreprises de moins de cinquante salariés, sur « la
//     définition d'actions de prévention des risques et de protection des
//     salariés », dont la liste est consignée dans le document unique.
//     Le texte n'y exige **ni date, ni délai, ni calendrier**.
//
// En dessous du seuil, l'outil ne peut donc pas présenter une échéance
// comme une obligation : ce serait du conseil juridique inventé. Il énonce
// alors le fait qui le concerne — sans date, l'action n'a pas de jour où se
// poser et n'apparaît pas au calendrier (ADR-010).
//
// Même doctrine que `SEUIL_MAJ_ANNUELLE_DUERP` : le seuil vit dans une
// constante nommée, la règle est pure et testée.

import {
  mentionAConfirmer,
  seuilEntrepriseAtteint,
  type EffectifsDeclares,
} from "@/lib/matching/effectif-entreprise";

/** Seuil légal du programme annuel de prévention (L. 4121-3-1, 1°). */
export const SEUIL_CALENDRIER_ACTIONS = 50;

export type ExigenceEcheance = {
  /** true ⇔ le calendrier de mise en œuvre est imposé par le texte. */
  exigee: boolean;
  /** Ce que l'écran dit à côté du compteur, selon le cas. Jamais une
   *  obligation quand il n'y en a pas. */
  mention: string;
  /** Référence à afficher, uniquement quand l'obligation existe. */
  reference: string | null;
  /**
   * Le seuil n'est atteint que par la prudence commune aux seuils
   * d'entreprise (C37) : l'entreprise est déclarée sous cinquante, le site en
   * compte cinquante ou plus.
   */
  aConfirmer: boolean;
};

export function exigenceEcheanceActions(
  effectifs: EffectifsDeclares,
): ExigenceEcheance {
  // La règle commune à tous les seuils d'entreprise : la couverture annonçait
  // le programme annuel à un site de cinquante sous une entreprise déclarée à
  // quarante-neuf, pendant que cet écran disait « sans échéance ».
  const seuil = seuilEntrepriseAtteint(SEUIL_CALENDRIER_ACTIONS, effectifs);
  if (seuil.atteint) {
    return {
      exigee: true,
      mention: seuil.aConfirmer
        ? `à dater, ${mentionAConfirmer(SEUIL_CALENDRIER_ACTIONS)}`
        : "à dater — votre programme annuel doit porter un calendrier",
      reference: seuil.aConfirmer
        ? "Art. L. 4121-3-1 CT · à confirmer"
        : "Art. L. 4121-3-1 CT",
      aConfirmer: seuil.aConfirmer,
    };
  }
  return {
    exigee: false,
    aConfirmer: false,
    // Un fait d'outil, pas une injonction : le dirigeant reste libre de
    // laisser une action non datée, le texte ne le lui interdit pas.
    mention: "sans échéance — absentes de ce calendrier",
    reference: null,
  };
}
