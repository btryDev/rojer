// Ce qu'une fiche demande, question par question.
//
// Les fiches du registre qu'aucun modèle métier ne remplit — renseignements
// généraux, téléphones utiles, personnel de sécurité, contrôles
// administratifs, événements — n'ont pas besoin d'un modèle chacune. Elles
// posent des questions et rangent des réponses : c'est une seule mécanique,
// déclinée sous deux formes.
//
// Le catalogue de questions vit donc ici, en TypeScript versionné, et non en
// base — même parti pris que le référentiel d'obligations (ADR-003) : la
// question qu'on a posée à un dirigeant se relit dans l'historique Git.
//
// Ce que ce module ne couvre pas, volontairement : les exercices de sécurité.
// Ils portent une périodicité, soldent une ligne du calendrier et reçoivent
// deux visas — ce n'est pas un formulaire, c'est une preuve datée.
//
// Module **pur** : ni Prisma, ni React.

export type TypeChamp =
  | "texte"
  | "texte_long"
  | "date"
  | "nombre"
  | "telephone"
  | "email";

export type ChampFiche = {
  cle: string;
  libelle: string;
  type: TypeChamp;
  /** Précision affichée sous le champ, quand l'intitulé ne suffit pas. */
  aide?: string;
};

/**
 * Comment la fiche se remplit.
 *
 * - `formulaire` : un seul jeu de réponses, qu'on met à jour. « Raison
 *   sociale », « effectif du public admis » — des faits qui changent rarement
 *   et dont il n'existe qu'une valeur courante.
 * - `journal` : des lignes qu'on empile sans jamais réécrire les précédentes.
 *   Un passage de commission, un début d'incendie, un nettoyage de hotte —
 *   des faits datés dont l'historique **est** la valeur. Un journal ne se
 *   corrige pas, il se complète : c'est ce qui en fait une pièce opposable.
 */
/**
 * Une question dont la réponse est déjà une donnée de l'établissement.
 *
 * Ces fiches ne stockent rien en propre : elles montrent et modifient la
 * colonne qui porte déjà la réponse. Sans quoi « raison sociale » existerait
 * à deux endroits — l'onglet établissement et le registre — et les deux
 * divergeraient au premier changement d'adresse. C'est le registre que l'on
 * présente à la commission : c'est lui qui afficherait la valeur périmée.
 */
export type ChampEtablissement = ChampFiche & {
  /** Le modèle et la colonne qui portent la réponse. Source unique. */
  source: `Etablissement.${string}` | `Entreprise.${string}`;
  /**
   * `false` tant que la colonne n'existe pas en base. La question est due,
   * l'emplacement pour y répondre reste à créer — c'est le lot « Organisation »
   * qui l'ajoutera. Afficher la question sans pouvoir l'enregistrer serait un
   * champ mort ; ne pas l'afficher du tout ferait croire le registre complet.
   */
  enBase: boolean;
};

export type FormeSaisie =
  | { forme: "etablissement"; champs: readonly ChampEtablissement[] }
  | { forme: "formulaire"; champs: readonly ChampFiche[] }
  | { forme: "journal"; colonnes: readonly ChampFiche[] };

/** Le visa qui clôt chaque ligne des fiches de contrôle du registre papier. */
const VISA: ChampFiche = {
  cle: "visa",
  libelle: "Visa",
  type: "texte",
  aide: "Nom de la personne qui vise cette ligne.",
};

const OBSERVATIONS: ChampFiche = {
  cle: "observations",
  libelle: "Observations",
  type: "texte_long",
};

/**
 * Les questions, par identifiant de fiche du catalogue `sections.ts`.
 *
 * Une fiche absente de cette table est une fiche qu'un modèle métier alimente
 * déjà (inventaire, vérifications) ou qui reste à outiller autrement.
 */
export const CHAMPS_PAR_SECTION: Readonly<Record<string, FormeSaisie>> = {
  // Ces deux fiches ne stockent rien : elles sont la fiche établissement,
  // relue sous l'angle du registre. On les édite là où la donnée vit déjà.
  "renseignements-generaux": {
    forme: "etablissement",
    champs: [
      {
        cle: "raisonSociale",
        libelle: "Raison sociale",
        type: "texte",
        source: "Entreprise.raisonSociale",
        enBase: true,
      },
      {
        cle: "adresse",
        libelle: "Adresse de l'établissement",
        type: "texte_long",
        source: "Etablissement.adresse",
        enBase: true,
      },
      {
        cle: "natureActivite",
        libelle: "Nature de l'activité",
        type: "texte_long",
        aide: "Ce que l'on fait ici, en clair — pas le code NAF.",
        source: "Etablissement.natureActivite",
        enBase: true,
      },
      {
        cle: "adresseSiege",
        libelle: "Adresse du siège social",
        type: "texte_long",
        aide: "À renseigner seulement si elle diffère de l'adresse ci-dessus.",
        source: "Entreprise.adresse",
        enBase: true,
      },
    ],
  },

  "renseignements-erp": {
    forme: "etablissement",
    champs: [
      {
        cle: "typeErp",
        libelle: "Type",
        type: "texte",
        source: "Etablissement.typeErp",
        enBase: true,
      },
      {
        cle: "categorieErp",
        libelle: "Catégorie",
        type: "texte",
        source: "Etablissement.categorieErp",
        enBase: true,
      },
      {
        cle: "effectifPublicAdmis",
        libelle: "Effectif du public susceptible d'être admis",
        type: "nombre",
        aide: "Le chiffre retenu au classement — distinct de votre effectif salarié.",
        source: "Etablissement.effectifPublicAdmis",
        enBase: true,
      },
      {
        cle: "dateAutorisationOuverture",
        libelle: "Autorisation d'ouverture donnée le",
        type: "date",
        source: "Etablissement.dateAutorisationOuverture",
        enBase: true,
      },
      {
        cle: "dateCertificatConformite",
        libelle: "Certificat de conformité délivré le",
        type: "date",
        source: "Etablissement.dateCertificatConformite",
        enBase: true,
      },
    ],
  },

  // Feuille 1 du registre imprimé : ce qu'on compose dans l'urgence. Un
  // numéro et rien d'autre — on ne cherche pas une adresse quand il faut
  // appeler les pompiers.
  "telephones-utiles": {
    forme: "formulaire",
    champs: [
      {
        cle: "sapeursPompiers",
        libelle: "Sapeurs-pompiers",
        type: "telephone",
        aide: "18 par défaut — indiquez le numéro direct du centre si vous l'avez.",
      },
      { cle: "samu", libelle: "SAMU", type: "telephone", aide: "15 par défaut." },
      { cle: "police", libelle: "Police", type: "telephone", aide: "17 par défaut." },
      { cle: "gendarmerie", libelle: "Gendarmerie", type: "telephone" },
      { cle: "electricite", libelle: "Électricité (secours)", type: "telephone" },
      { cle: "gaz", libelle: "Gaz (secours)", type: "telephone" },
      { cle: "serviceEaux", libelle: "Service des eaux", type: "telephone" },
      { cle: "hopital", libelle: "Hôpital", type: "telephone" },
      { cle: "centreAntiPoison", libelle: "Centre anti-poisons", type: "telephone" },
      {
        cle: "centreBrules",
        libelle: "Centre des brûlés",
        type: "telephone",
        aide: "Le centre de référence de votre région.",
      },
    ],
  },

  // Feuille 2 : ceux qu'on rappelle après, et chez qui on envoie quelqu'un —
  // d'où l'adresse à côté du téléphone, que le registre imprimé demande et
  // que la version précédente de cette fiche avait perdue.
  //
  // Les installateurs et les organismes agréés recoupent le modèle
  // `Prestataire`, qui porte déjà une raison sociale, un téléphone et des
  // domaines — mais pas d'adresse. Tant qu'il n'en porte pas, les redemander
  // ici est le moindre mal ; le jour où il en portera une, cette fiche devra
  // les lire plutôt que les redemander, comme les renseignements généraux
  // lisent l'établissement.
  "services-adresses-utiles": {
    forme: "formulaire",
    champs: [
      { cle: "mairieAdresse", libelle: "Mairie — adresse", type: "texte_long" },
      { cle: "mairie", libelle: "Mairie — téléphone", type: "telephone" },
      { cle: "prefectureAdresse", libelle: "Préfecture — adresse", type: "texte_long" },
      { cle: "prefecture", libelle: "Préfecture — téléphone", type: "telephone" },
      { cle: "medecinAdresse", libelle: "Médecin — adresse", type: "texte_long" },
      { cle: "medecin", libelle: "Médecin — téléphone", type: "telephone" },
      { cle: "ambulancesAdresse", libelle: "Ambulances — adresse", type: "texte_long" },
      { cle: "ambulances", libelle: "Ambulances — téléphone", type: "telephone" },
      {
        cle: "inspectionTravailAdresse",
        libelle: "Inspection du travail — adresse",
        type: "texte_long",
      },
      {
        cle: "inspectionTravail",
        libelle: "Inspection du travail — téléphone",
        type: "telephone",
      },
      {
        cle: "preventionCarsatAdresse",
        libelle: "Service prévention CARSAT — adresse",
        type: "texte_long",
        aide: "Anciennement CRAM. La caisse régionale dont vous dépendez.",
      },
      {
        cle: "preventionCarsat",
        libelle: "Service prévention CARSAT — téléphone",
        type: "telephone",
      },
      {
        cle: "installateurEau",
        libelle: "Installateur — eau",
        type: "texte",
        aide: "Nom et téléphone de celui qu'on appelle en cas de fuite.",
      },
      { cle: "installateurGaz", libelle: "Installateur — gaz", type: "texte" },
      {
        cle: "installateurElectricite",
        libelle: "Installateur — électricité",
        type: "texte",
      },
      {
        cle: "installateurChauffage",
        libelle: "Installateur — chauffage",
        type: "texte",
      },
      {
        cle: "installateurAscenseur",
        libelle: "Installateur — appareils élévateurs",
        type: "texte",
      },
      {
        cle: "installateurTelephone",
        libelle: "Installateur — téléphonie",
        type: "texte",
      },
      {
        cle: "organismesAgrees",
        libelle: "Organismes chargés des vérifications",
        type: "texte_long",
        aide: "Ceux qui interviennent chez vous, avec leur téléphone.",
      },
    ],
  },

  "service-securite-personnes-designees": {
    forme: "journal",
    colonnes: [
      { cle: "nom", libelle: "Nom et prénom", type: "texte" },
      {
        cle: "fonction",
        libelle: "Fonction",
        type: "texte",
        aide: "Sa fonction dans l'établissement, pas son rôle en sécurité.",
      },
      {
        cle: "role",
        libelle: "Rôle en sécurité",
        type: "texte",
        aide: "Par exemple : guide-file, serre-file, chargé de l'alerte.",
      },
      { cle: "telephone", libelle: "Téléphone", type: "telephone" },
      {
        cle: "formationLe",
        libelle: "Formé le",
        type: "date",
        aide: "Date de la dernière formation ou du dernier entraînement.",
      },
    ],
  },

  "service-securite-encadrement": {
    forme: "journal",
    colonnes: [
      { cle: "fonction", libelle: "Fonction", type: "texte" },
      { cle: "nom", libelle: "Nom", type: "texte" },
      { cle: "telephone", libelle: "Téléphone", type: "telephone" },
    ],
  },

  "service-securite-equipe": {
    forme: "journal",
    colonnes: [
      { cle: "fonction", libelle: "Fonction", type: "texte" },
      { cle: "nom", libelle: "Nom", type: "texte" },
      { cle: "certificat", libelle: "Certificat d'aptitude", type: "texte" },
      { cle: "delivreLe", libelle: "Délivré le", type: "date" },
      { cle: "delivrePar", libelle: "Délivré par", type: "texte" },
    ],
  },

  "service-securite-evacuation": {
    forme: "journal",
    colonnes: [
      { cle: "nom", libelle: "Nom", type: "texte" },
      { cle: "secteur", libelle: "Secteur", type: "texte" },
    ],
  },

  "service-securite-surveillance": {
    forme: "journal",
    colonnes: [{ cle: "nom", libelle: "Nom et prénom", type: "texte" }],
  },

  "verif-dispositions-constructives": {
    forme: "journal",
    colonnes: [
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "verificateur", libelle: "Nom du vérificateur", type: "texte" },
      OBSERVATIONS,
      VISA,
    ],
  },

  "verif-depoussierage": {
    forme: "journal",
    colonnes: [
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "societe", libelle: "Société de nettoyage", type: "texte" },
      {
        cle: "elements",
        libelle: "Éléments traités",
        type: "texte_long",
        aide: "Murs, plafonds, sièges, tentures, filtres…",
      },
      OBSERVATIONS,
      VISA,
    ],
  },

  "verif-essais-feu": {
    forme: "journal",
    colonnes: [
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "materiaux", libelle: "Matériaux ou éléments vérifiés", type: "texte" },
      { cle: "laboratoire", libelle: "Laboratoire agréé", type: "texte" },
      { cle: "classement", libelle: "Classement", type: "texte" },
      { cle: "numeroPv", libelle: "Numéro du procès-verbal", type: "texte" },
      VISA,
    ],
  },

  "controle-commission": {
    forme: "journal",
    colonnes: [
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "representant", libelle: "Représentant", type: "texte" },
      OBSERVATIONS,
      VISA,
    ],
  },

  "controle-administration": {
    forme: "journal",
    colonnes: [
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "representant", libelle: "Représentant", type: "texte" },
      OBSERVATIONS,
      VISA,
    ],
  },

  "controle-autres": {
    forme: "journal",
    colonnes: [
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "autorite", libelle: "Autorité représentée", type: "texte" },
      OBSERVATIONS,
      VISA,
    ],
  },

  evenements: {
    forme: "journal",
    colonnes: [
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "heure", libelle: "Heure", type: "texte" },
      {
        cle: "nature",
        libelle: "Nature de l'événement",
        type: "texte",
        aide: "Début d'incendie, incendie, travaux, modification importante…",
      },
      { cle: "circonstances", libelle: "Circonstances", type: "texte_long" },
      { cle: "materiels", libelle: "Matériels utilisés", type: "texte_long" },
      { cle: "suites", libelle: "Suites données", type: "texte_long" },
    ],
  },
};

/** La forme de saisie d'une fiche, si l'application sait la recueillir. */
export function saisiePourSection(sectionId: string): FormeSaisie | undefined {
  // `Object.hasOwn` et non un accès direct : `sectionId` vient du client, et
  // un objet littéral hérite du prototype. `CHAMPS_PAR_SECTION["constructor"]`
  // rendait une fonction — donc une valeur vraie — et le garde
  // `if (!saisie || !schema)` de `preparer` n'était jamais atteint. Un
  // identifiant forgé produisait une erreur 500 au lieu du refus prévu.
  return Object.hasOwn(CHAMPS_PAR_SECTION, sectionId)
    ? CHAMPS_PAR_SECTION[sectionId]
    : undefined;
}
