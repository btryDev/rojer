/**
 * Pour chaque titre du catalogue salarié, le texte qui en fait une obligation
 * de l'employeur, et la NATURE exacte de cette obligation — l'audit de la
 * décision E8.
 *
 * LA RÈGLE, dite par la propriétaire le 2026-09-27 : « une obligation légale
 * pour l'employeur vis-à-vis du salarié. Mais c'est la même ligne que pour
 * tout Rojer : on ne fait rien et on n'annonce rien qui ne soit pas légal. »
 * Un titre qui n'y répond pas n'a pas sa place dans Rojer.
 *
 * C'EST CE QUI REND VRAI LE TEXTE DE `droits.ts`, et il ne doit rien dire de
 * plus que ce tableau. La première écriture (6a0b993) rangeait tout sous
 * « formation, visite, habilitation ou autorisation » et citait, pour les
 * visites, la charge de leur COÛT (R. 4624-39) comme si elle obligeait à les
 * faire passer ; la contre-lecture du 2026-09-27 l'a relevé. Chaque entrée dit
 * désormais ce que le texte met à la charge de l'employeur, et
 * `obligation-employeur.test.ts` exige que le texte au salarié nomme chacune
 * des natures présentes.
 *
 * `article` est l'article dont la phrase fonde l'obligation de l'employeur —
 * pas toujours le fondateur du titre. `employeurNommePar` dit où le Code
 * nomme l'employeur : dans la phrase, ou, pour `R. 4224-15`, qui écrit sans
 * sujet, dans l'intitulé de la division qui le porte (relevé sur Légifrance
 * le 2026-09-27 ; le corpus ne porte pas les intitulés de division, et la
 * garde ne peut pas le confronter).
 */

export type NatureObligation =
  /** Organiser une formation, ou la faire recevoir. */
  | "formation"
  /** Délivrer une habilitation. */
  | "habilitation"
  /** Délivrer une autorisation. */
  | "autorisation"
  /** Conserver la copie d'une pièce que le travailleur présente. */
  | "piece_a_conserver"
  /** Organiser le service de prévention et de santé au travail, qui réalise la visite. */
  | "service_de_sante";

export type ObligationEmployeur = {
  fondateur: string;
  nature: NatureObligation;
  /**
   * `salarie` : envers la personne qui détient le titre. `collectif` : envers
   * le personnel, et elle s'exécute en formant cette personne (secourisme).
   */
  envers: "salarie" | "collectif";
  article: string;
  phrase: string;
  employeurNommePar: "phrase" | { intituleDeDivision: string };
  condition: string | null;
};

/** Le suivi de santé : le fondateur dit « bénéficie » ; L. 4622-1 fait organiser le service. */
const VISITE = {
  nature: "service_de_sante",
  envers: "salarie",
  article: "L. 4622-1",
  phrase:
    "Les employeurs relevant du présent titre organisent des services de prévention et de santé au travail.",
  employeurNommePar: "phrase",
} as const;

export const OBLIGATION_EMPLOYEUR: Record<string, ObligationEmployeur> = {
  "conduite-salarie-formation": {
    fondateur: "R. 4323-55",
    nature: "formation",
    envers: "salarie",
    article: "L. 4741-1",
    phrase:
      "le fait pour l'employeur ou son délégataire de méconnaître par sa faute personnelle les dispositions suivantes et celles des décrets en Conseil d'Etat pris pour leur application : 1° Titres Ier, III et IV ainsi que section 2 du chapitre IV du titre V du livre Ier ; 2° Titre II du livre II ; 3° Livre III",
    employeurNommePar: "phrase",
    condition:
      "la conduite d'équipements de travail mobiles automoteurs ou servant au levage lui est confiée",
  },
  "conduite-salarie-autorisation": {
    fondateur: "R. 4323-56",
    nature: "autorisation",
    envers: "salarie",
    article: "R. 4323-56",
    phrase:
      "est subordonnée à l'obtention d'une autorisation de conduite délivrée par l'employeur",
    employeurNommePar: "phrase",
    condition:
      "il conduit un équipement présentant des risques particuliers, de ceux qu'un arrêté soumet à autorisation (R. 4323-57)",
  },
  "conduite-salarie-attestation-medicale": {
    fondateur: "R. 4323-56",
    nature: "piece_a_conserver",
    envers: "salarie",
    article: "R. 4323-56",
    phrase:
      "Elle est présentée par le travailleur à l'employeur, qui en conserve une copie pendant toute sa durée de validité.",
    employeurNommePar: "phrase",
    condition: "il détient une autorisation de conduite",
  },
  "elec-salarie-habilitation": {
    fondateur: "R. 4544-10",
    nature: "habilitation",
    envers: "salarie",
    article: "R. 4544-10",
    phrase:
      "L'habilitation, délivrée par l'employeur, spécifie la nature des opérations qu'il est autorisé à effectuer.",
    employeurNommePar: "phrase",
    condition:
      "des opérations sur les installations électriques ou dans leur voisinage lui sont confiées",
  },
  "elec-salarie-attestation-medicale-voisinage": {
    fondateur: "R. 4544-11-1",
    nature: "piece_a_conserver",
    envers: "salarie",
    article: "R. 4544-11-1",
    phrase:
      "Elle est présentée par le travailleur à l'employeur, qui en conserve une copie pendant toute sa durée de validité.",
    employeurNommePar: "phrase",
    condition:
      "son habilitation autorise les opérations au voisinage de pièces nues sous tension (R. 4544-10)",
  },
  "formation-securite-salarie-accueil": {
    fondateur: "L. 4141-2",
    nature: "formation",
    envers: "salarie",
    article: "L. 4141-2",
    phrase:
      "L'employeur organise une formation pratique et appropriée à la sécurité au bénéfice : 1° Des travailleurs qu'il embauche",
    employeurNommePar: "phrase",
    condition: null,
  },
  "formation-securite-salarie-designe-competent": {
    fondateur: "L. 4644-1",
    nature: "formation",
    envers: "salarie",
    article: "L. 4644-1",
    phrase:
      "Le ou les salariés ainsi désignés par l'employeur bénéficient d'une formation en matière de santé au travail",
    employeurNommePar: "phrase",
    condition:
      "l'employeur l'a désigné pour s'occuper des activités de protection et de prévention",
  },
  "formation-securite-salarie-cse-sst": {
    fondateur: "L. 2315-18",
    nature: "formation",
    envers: "salarie",
    article: "L. 2315-18",
    phrase:
      "le financement de la formation prévue au premier alinéa du présent article est pris en charge par l'employeur",
    employeurNommePar: "phrase",
    condition: "il est membre de la délégation du personnel du CSE, ou référent",
  },
  "secours-salarie-secouriste": {
    fondateur: "R. 4224-15",
    nature: "formation",
    envers: "collectif",
    article: "R. 4224-15",
    phrase:
      "Un membre du personnel reçoit la formation de secouriste nécessaire pour donner les premiers secours en cas d'urgence",
    employeurNommePar: {
      intituleDeDivision:
        "Titre II : Obligations de l'employeur pour l'utilisation des lieux de travail",
    },
    condition:
      "il est le membre du personnel formé dans un atelier où sont accomplis des travaux dangereux, ou sur un chantier employant vingt travailleurs au moins pendant plus de quinze jours où sont réalisés des travaux dangereux",
  },
  "sante-travail-salarie-vip": {
    fondateur: "R. 4624-10",
    ...VISITE,
    condition: null,
  },
  "sante-travail-salarie-vip-adaptee": {
    fondateur: "R. 4624-17",
    ...VISITE,
    condition:
      "son état de santé, son âge, ses conditions de travail ou ses risques le nécessitent — travailleur handicapé, pensionné d'invalidité, de nuit, de moins de dix-huit ans",
  },
  "sante-travail-salarie-sir": {
    fondateur: "R. 4624-22",
    ...VISITE,
    condition: "il est affecté à un poste présentant des risques particuliers",
  },
  "sante-travail-salarie-sir-visite-intermediaire": {
    fondateur: "R. 4624-28",
    ...VISITE,
    condition: "il bénéficie d'un suivi individuel renforcé",
  },
  "sante-travail-salarie-sir-categorie-a": {
    fondateur: "R. 4451-82",
    ...VISITE,
    condition:
      "il est classé en catégorie A au titre des rayonnements ionisants (R. 4451-57)",
  },
};
