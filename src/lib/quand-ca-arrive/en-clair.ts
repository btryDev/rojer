/**
 * « Quand ça arrive », en clair (2026-10-20).
 *
 * La page présentait le texte de loi comme contenu : le titre de chaque carte
 * était `faitGenerateur`, verbatim — sept phrases de `R. 4515-8` et `-9` pour
 * le protocole de sécurité. Le dirigeant lit ici deux phrases courtes : quand,
 * et quoi faire. Le texte reste à un clic, sous le livre de la carte.
 *
 * Ce sont des libellés d'écran, pas du droit : ils n'entrent ni au
 * référentiel ni à son empreinte, et ne remplacent jamais la citation. Chacun
 * a été écrit en relisant `faitGenerateur`, `libelle` et `description` de son
 * obligation ; il simplifie, il n'ajoute rien que le texte ne dise pas.
 * `en-clair.test.ts` exige une entrée pour chaque obligation de la page.
 */

export type EnClair = {
  /** Le fait, en une phrase. */
  quand: string;
  /** Ce qu'il faut faire, en une phrase. */
  quoi: string;
};

export const EN_CLAIR: Readonly<Record<string, EnClair>> = {
  "formation-securite-etablissement-information": {
    quand: "À l'embauche, puis chaque fois que c'est nécessaire.",
    quoi: "Informer et former le salarié aux risques de son poste, et lui dire comment consulter le document unique.",
  },
  "formation-securite-etablissement-travail-sur-ecran": {
    quand:
      "Avant qu'un salarié commence à travailler sur écran, et quand son poste change nettement.",
    quoi: "L'informer et le former à l'utilisation de l'écran et du poste qui l'accueille.",
  },
  "formation-securite-etablissement-apres-accident-grave": {
    quand:
      "Après un accident du travail ou une maladie professionnelle grave — ou qui se répète au même poste ou dans la même fonction.",
    quoi: "Analyser les conditions de travail ou de circulation, et former à la sécurité les salariés concernés si besoin.",
  },
  "formation-securite-etablissement-modification-circulation-exploitation": {
    quand:
      "Quand vous changez la circulation dans les locaux ou la façon d'exploiter, surtout s'il y a un risque d'intoxication, d'incendie ou d'explosion.",
    quoi: "Analyser les nouvelles conditions, et former à la sécurité les salariés concernés si besoin.",
  },
  "sante-travail-etablissement-examen-de-reprise": {
    quand:
      "Quand un salarié revient d'un congé maternité, d'une maladie professionnelle, de 30 jours d'arrêt ou plus pour accident du travail, ou de 60 jours ou plus pour maladie ou accident hors travail.",
    quoi: "Dès que vous connaissez la date de retour, prévenir le service de santé au travail : il organise la visite de reprise, au plus tard 8 jours après le retour.",
  },
  "sante-travail-etablissement-information-arret-accident-moins-trente-jours":
    {
      quand:
        "Quand un salarié est arrêté moins de 30 jours après un accident du travail.",
      quoi: "Prévenir le médecin du travail.",
    },
  "sante-travail-etablissement-information-possibilite-prereprise": {
    quand: "Quand un salarié est en arrêt depuis plus de 30 jours.",
    quoi: "Lui dire qu'il peut demander une visite de préreprise avec le médecin du travail.",
  },
  "sante-travail-etablissement-fin-exposition-suivi-renforce": {
    quand:
      "Quand un salarié en suivi médical renforcé n'est plus exposé à ses risques, quitte l'entreprise ou part à la retraite.",
    quoi: "Prévenir le service de santé au travail dès que vous le savez, et dire au salarié que vous l'avez fait.",
  },
  "prevention-etablissement-chaleur-eau-fraiche": {
    quand: "Pendant un épisode de chaleur intense.",
    quoi: "Fournir assez d'eau potable fraîche, gardée au frais près des postes toute la journée.",
  },
  "prevention-etablissement-chaleur-travailleur-vulnerable": {
    quand:
      "Quand vous apprenez qu'un salarié est particulièrement fragile face à la chaleur (âge, santé…).",
    quoi: "Adapter pour lui les mesures contre la chaleur, avec le service de santé au travail.",
  },
  "prevention-etablissement-chaleur-mise-en-oeuvre": {
    quand: "Pendant un épisode de chaleur intense.",
    quoi: "Appliquer les mesures prévues contre la chaleur, et les renforcer si elle s'intensifie.",
  },
  "prevention-etablissement-mise-a-jour-duerp-sur-fait": {
    quand:
      "Quand vous décidez d'un aménagement important qui change les conditions de travail, ou que vous apprenez du nouveau sur un risque.",
    quoi: "Mettre à jour le document unique.",
  },
  "co-activite-etablissement-protocole-securite": {
    quand:
      "Avant qu'une entreprise extérieure vienne charger ou décharger des marchandises chez vous.",
    quoi: "Rédiger avec elle un protocole de sécurité, daté et signé. Pour des livraisons régulières des mêmes entreprises, un seul suffit tant que rien ne change.",
  },
};
