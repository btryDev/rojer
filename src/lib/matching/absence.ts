// La politique de l'absence, déclarée UNE FOIS (analyse du 2026-09-27, § 6.1).
//
// POURQUOI CE MODULE. Chaque évaluateur du moteur décidait seul de ce que
// valait une réponse absente : onze points de décision, trois sens (retient et
// le dit, retient sans le dire, écarte), quatre canaux de marque. C'est ce qui
// a produit l'asymétrie qu'aucun document ne formulait — la catégorie d'ERP
// qui écartait quand la famille d'habitation retenait, les matières lues
// « non » quand les chiffons retenaient.
//
// CE QUE LA TABLE FAIT, ET CE QU'ELLE NE FAIT PAS.
//   - Elle est INDEXÉE PAR LES ATTRIBUTS NULLABLES d'`EtablissementMatching`,
//     par un type projeté : un attribut neuf ne compile pas sans que le sens
//     de son absence soit déclaré ici.
//   - Les évaluateurs y lisent la QUESTION qu'ils portent en marque
//     (`sansReponse`) : la clé n'est écrite qu'ici.
//   - Elle porte le DOMAINE de chaque attribut, que la garde générique
//     (`absence.test.ts`) parcourt en appelant le moteur : pour tout attribut
//     et toute valeur, passer de la valeur à null ne doit retirer aucune ligne
//     que la table ne déclare pas pouvoir retirer.
//   - Elle ne CONDUIT pas les évaluateurs : la borne basse des personnes
//     présentes et les types où le sommeil est plausible gardent leur logique
//     propre, qu'une table n'exprime pas. C'est la garde, en appelant le
//     moteur, qui vérifie que chacun tient ce que la table déclare.
//
// Module pur, sans dépendance au runtime.

import {
  CATEGORIES_ERP,
  CLASSES_IGH,
  FAMILLES_HABITATION,
  TYPES_ERP,
  type TypologieApplication,
} from "@/lib/referentiels/types-communs";
import type { EtablissementMatching, QuestionSansReponse } from "./types";

/** Les attributs d'établissement que le moteur lit et qui admettent `null`. */
export type AttributNullable = {
  [K in keyof EtablissementMatching]-?: null extends EtablissementMatching[K]
    ? K
    : never;
}[keyof EtablissementMatching];

export type PolitiqueAbsence<V> = {
  /** Les valeurs que la garde confronte à `null`. */
  valeurs: readonly V[];
} & (
  | {
      /** La règle du non-renseigné (ADR-022) : l'absence retient, et le dit. */
      sens: "retient_a_confirmer";
      /**
       * La question que la marque nomme ; `null` quand aucun écran ne la pose
       * plus — la raison seule le dit alors.
       */
      question: QuestionSansReponse | null;
      /**
       * Un cas où l'absence écarte malgré tout, par une règle écrite. Porté
       * par l'établissement, jamais par l'obligation.
       */
      exception?: { si: (e: EtablissementMatching) => boolean; regle: string };
      /**
       * Un ALLÈGEMENT ne se donne pas sur une absence supposée : l'obligation
       * qui ne vise que la réponse « non » peut disparaître au silence — son
       * membre général, lui, survit.
       */
      allegement?: { si: (t: TypologieApplication) => boolean; regle: string };
    }
  | {
      /** L'absence écarte — admissible seulement si la base l'interdit. */
      sens: "ecarte_par_regle_ecrite";
      regle: string;
      /** Le nom de la contrainte en base qui rend l'absence impossible. */
      contrainteEnBase: string;
      /** Là où la contrainte mord ; hors de là, l'attribut n'est pas lu. */
      portee: (e: EtablissementMatching) => boolean;
    }
);

const CONTRAINTE_ERP = "Etablissement_erp_type_categorie_requis";

export const POLITIQUE_ABSENCE = {
  typeErp: {
    valeurs: TYPES_ERP,
    sens: "ecarte_par_regle_ecrite",
    regle:
      "la restriction `types` écarte un ERP sans type ; la base interdit ce cas depuis le 2026-09-27",
    contrainteEnBase: CONTRAINTE_ERP,
    portee: (e) => e.estERP,
  },
  categorieErp: {
    valeurs: CATEGORIES_ERP,
    sens: "ecarte_par_regle_ecrite",
    regle:
      "la restriction `categories` écarte un ERP sans catégorie ; la base interdit ce cas depuis le 2026-09-27",
    contrainteEnBase: CONTRAINTE_ERP,
    portee: (e) => e.estERP,
  },
  classeIgh: {
    valeurs: CLASSES_IGH,
    sens: "retient_a_confirmer",
    // Question retirée des formulaires le 2026-09-03 : la raison le dit.
    question: null,
  },
  familleHabitation: {
    valeurs: FAMILLES_HABITATION,
    sens: "retient_a_confirmer",
    question: null,
  },
  personnesPresentesHabituellement: {
    // Les deux côtés du seuil de R. 4227-34 (« plus de cinquante »), et un
    // total qu'aucune catégorie n'atteint.
    valeurs: [1, 50, 51, 5000],
    sens: "retient_a_confirmer",
    question: "personnes_presentes",
    exception: {
      si: (e) => !e.estERP,
      regle:
        "ADR-022 § 7 : sans public, l'effectif salarié EST le total, pas une borne",
    },
  },
  manipuleMatieresR422722: {
    valeurs: [true, false],
    sens: "retient_a_confirmer",
    question: "matieres_r4227_22",
  },
  comporteLocauxSommeilPublic: {
    valeurs: [true, false],
    sens: "retient_a_confirmer",
    question: "locaux_sommeil_public",
    allegement: {
      si: (t) => t.locauxSommeilPublic === false,
      regle:
        "un allègement conditionné à l'absence de locaux à sommeil ne se donne pas sur le silence (ADR-022 § 7)",
    },
  },
  chiffonsImpregnes: {
    valeurs: [true, false],
    sens: "retient_a_confirmer",
    question: "chiffons_impregnes",
  },
} as const satisfies {
  [K in AttributNullable]: PolitiqueAbsence<
    NonNullable<EtablissementMatching[K]>
  >;
};
