// Corpus : arrêté du 30 septembre 1957 relatif aux mesures de sécurité
// applicables aux chambres froides ou climatisées.
//
// ENTRÉ LE 2026-10-14 (revue de `lot/materiels-non-couverts-1014`, point 4).
// L'aide de la catégorie « Installation frigorifique » cite les articles 2 à 4
// de l'annexe ; la garde `citations-ecran` exige que tout arrêté cité à
// l'écran soit au corpus. Décision de la propriétaire du 2026-10-14 : AUCUNE
// obligation créée ; les trois articles entrent NON COUVERTS, annoncés par
// cette aide.
//
// Relu par l'API Légifrance le 2026-10-14, en BAC À SABLE (LEGIFRANCE_ENV =
// sandbox) : articles 1 et 2 de l'arrêté, articles 1 à 4 de l'annexe
// « Dispositions générales portant mesures de prévention en matière de
// chambres froides ou climatisées », tous EN VIGUEUR.

import type { Corpus } from "./types";

const DECLARE_A =
  "Formulaire de déclaration d'un équipement, aide de la catégorie « Installation frigorifique » (`src/lib/equipements/labels.ts`, `DESCRIPTION_CATEGORIE.INSTALLATION_FRIGORIFIQUE`) : « Rojer ne suit pas ces dispositifs de sécurité des chambres froides »";

const MOTIF =
  "Décision de la propriétaire du 2026-10-14 : aucune obligation créée. L'aide de la catégorie « Installation frigorifique » dit ce que l'annexe demande et que Rojer ne le suit pas. Ce sont des états d'équipement (une porte, une alarme, un voyant), sans rythme écrit, que le référentiel ne porte pas.";

export const ARRETE_1957_09_30_CHAMBRES_FROIDES: Corpus = {
  id: "arrete-1957-09-30-chambres-froides",
  intitule:
    "Arrêté du 30 septembre 1957 relatif aux mesures de sécurité applicables aux chambres froides ou climatisées",
  url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006072491/",
  etendue: "articles_cites",
  portee:
    "Les articles 2 à 4 de l'annexe, que l'aide de l'installation frigorifique cite. L'article 1er de l'annexe donne les définitions (chambre « froide » : température de régime inférieure ou égale à 0 °C ; « climatisée » : au-dessus) ; il est lu, pas classé. Les articles 1 et 2 de l'arrêté rendent l'annexe obligatoire et fixent l'entrée en vigueur.",
  articles: [
    {
      ref: "Arrêté 1957-09-30 annexe art. 2",
      intitule: "Portes des chambres froides ou climatisées ouvrables à la main de l'intérieur",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006677482",
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      citationCle:
        "Dans tous les cas, les portes de ces deux types de chambres doivent pouvoir être ouvertes manuellement par toute personne se trouvant à l'intérieur de ces chambres.",
      statut: "non_couvert",
      declareA: DECLARE_A,
      motif: MOTIF,
    },
    {
      ref: "Arrêté 1957-09-30 annexe art. 3",
      intitule: "Dispositif d'avertissement sonore des chambres froides de plus de 10 m³",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006677483",
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      citationCle:
        "Toute chambre froide d'une capacité utile supérieure à 10 mètres cubes doit être munie d'un dispositif d'avertissement sonore simple et robuste permettant à toute personne qui se trouverait accidentellement enfermée à l'intérieur de cette chambre de donner l'alarme à l'extérieur.",
      statut: "non_couvert",
      declareA: DECLARE_A,
      motif: MOTIF,
    },
    {
      ref: "Arrêté 1957-09-30 annexe art. 4",
      intitule: "Voyant lumineux extérieur des installations neuves de plus de 10 m³",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006677484",
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      citationCle:
        "Toute installation neuve de chambre froide ou climatisée, d'une capacité utile supérieure à 10 mètres cubes, doit comporter, à l'extérieur et au voisinage immédiat de chacune des portes, un voyant lumineux s'éclairant lorsque la chambre est elle-même éclairée pour permettre au personnel d'y travailler.",
      statut: "non_couvert",
      declareA: DECLARE_A,
      motif: MOTIF,
    },
  ],
};
