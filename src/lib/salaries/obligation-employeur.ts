/**
 * Pour chaque titre du catalogue salarié, le texte qui en fait une obligation
 * de l'employeur ENVERS LE SALARIÉ — l'audit de la décision E8.
 *
 * LA RÈGLE, dite par la propriétaire le 2026-09-27 : « une obligation légale
 * pour l'employeur vis-à-vis du salarié. Mais c'est la même ligne que pour
 * tout Rojer : on ne fait rien et on n'annonce rien qui ne soit pas légal. »
 * Un titre qui n'y répond pas n'a pas sa place dans Rojer.
 *
 * C'EST CE QUI REND VRAI LE TEXTE DE `droits.ts`. Il dit au salarié que le
 * traitement repose sur une obligation légale de l'employeur envers lui
 * (RGPD 6.1.c, d'où 17.3.b et 21). La phrase vaut pour les titres audités ici
 * et pour eux seuls : `obligation-employeur.test.ts` fait échouer tout titre
 * entré au catalogue sans y figurer, et toute phrase qui n'est pas mot pour
 * mot dans la `citationCle` de son article au corpus.
 *
 * `article` est l'article dont la phrase NOMME L'EMPLOYEUR — pas toujours
 * l'article fondateur du titre. Quatre fondateurs écrivent sans sujet
 * (« Tout travailleur bénéficie », « Un membre du personnel reçoit », « est
 * réservée aux travailleurs qui ») ; le Code nomme alors l'employeur ailleurs,
 * et c'est cet ailleurs qui est cité, avec le fondateur en `fondateur`.
 *
 * `condition` : `null` quand l'obligation vaut pour tout salarié ; sinon ce
 * qui la fait naître, en mots du texte autant que possible.
 */

export type ObligationEmployeur = {
  fondateur: string;
  article: string;
  phrase: string;
  condition: string | null;
};

/** Le suivi de santé : le fondateur dit « bénéficie », R. 4624-39 nomme l'employeur. */
const VISITE = {
  article: "R. 4624-39",
  phrase:
    "Le temps et les frais de transport nécessités par ces visites et ces examens sont pris en charge par l'employeur.",
} as const;

export const OBLIGATION_EMPLOYEUR: Record<string, ObligationEmployeur> = {
  "conduite-salarie-formation": {
    fondateur: "R. 4323-55",
    article: "L. 4741-1",
    phrase:
      "le fait pour l'employeur ou son délégataire de méconnaître par sa faute personnelle les dispositions suivantes et celles des décrets en Conseil d'Etat pris pour leur application : 1° Titres Ier, III et IV ainsi que section 2 du chapitre IV du titre V du livre Ier ; 2° Titre II du livre II ; 3° Livre III",
    condition:
      "la conduite d'équipements de travail mobiles automoteurs ou servant au levage lui est confiée",
  },
  "conduite-salarie-autorisation": {
    fondateur: "R. 4323-56",
    article: "R. 4323-56",
    phrase:
      "est subordonnée à l'obtention d'une autorisation de conduite délivrée par l'employeur",
    condition:
      "il conduit un équipement présentant des risques particuliers, de ceux qu'un arrêté soumet à autorisation (R. 4323-57)",
  },
  "conduite-salarie-attestation-medicale": {
    fondateur: "R. 4323-56",
    article: "R. 4323-56",
    phrase:
      "Elle est présentée par le travailleur à l'employeur, qui en conserve une copie pendant toute sa durée de validité.",
    condition: "il détient une autorisation de conduite",
  },
  "elec-salarie-habilitation": {
    fondateur: "R. 4544-10",
    article: "R. 4544-10",
    phrase:
      "L'habilitation, délivrée par l'employeur, spécifie la nature des opérations qu'il est autorisé à effectuer.",
    condition:
      "des opérations sur les installations électriques ou dans leur voisinage lui sont confiées",
  },
  "elec-salarie-attestation-medicale-voisinage": {
    fondateur: "R. 4544-11-1",
    article: "R. 4544-11-1",
    phrase:
      "Elle est présentée par le travailleur à l'employeur, qui en conserve une copie pendant toute sa durée de validité.",
    condition:
      "son habilitation autorise les opérations au voisinage de pièces nues sous tension (R. 4544-10)",
  },
  "formation-securite-salarie-accueil": {
    fondateur: "L. 4141-2",
    article: "L. 4141-2",
    phrase:
      "L'employeur organise une formation pratique et appropriée à la sécurité au bénéfice : 1° Des travailleurs qu'il embauche",
    condition: null,
  },
  "formation-securite-salarie-designe-competent": {
    fondateur: "L. 4644-1",
    article: "L. 2315-18",
    phrase:
      "le financement de la formation prévue au premier alinéa du présent article est pris en charge par l'employeur",
    condition:
      "l'employeur l'a désigné pour s'occuper des activités de protection et de prévention (L. 4644-1, qui renvoie à L. 2315-16 à L. 2315-18)",
  },
  "formation-securite-salarie-cse-sst": {
    fondateur: "L. 2315-18",
    article: "L. 2315-18",
    phrase:
      "le financement de la formation prévue au premier alinéa du présent article est pris en charge par l'employeur",
    condition: "il est membre de la délégation du personnel du CSE, ou référent",
  },
  "secours-salarie-secouriste": {
    fondateur: "R. 4224-15",
    article: "L. 4741-1",
    phrase:
      "le fait pour l'employeur ou son délégataire de méconnaître par sa faute personnelle les dispositions suivantes et celles des décrets en Conseil d'Etat pris pour leur application : 1° Titres Ier, III et IV ainsi que section 2 du chapitre IV du titre V du livre Ier ; 2° Titre II du livre II",
    condition:
      "il est le membre du personnel formé d'un atelier où sont accomplis des travaux dangereux, ou d'un chantier d'au moins vingt travailleurs",
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
    article: "R. 4451-57",
    phrase:
      "Au regard de la dose évaluée en application du 4° de l'article R. 4451-53, l'employeur classe :",
    condition:
      "l'employeur l'a classé en catégorie A au titre des rayonnements ionisants",
  },
};
