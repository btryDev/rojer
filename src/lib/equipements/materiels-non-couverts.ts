// Les matériels que Rojer ne suit pas, et qu'on peut pourtant déclarer.
//
// DÉCISION DE LA PROPRIÉTAIRE DU 2026-10-14. Un dirigeant qui cherche
// « escabeau » ou « chaudière » dans le formulaire d'équipement ne trouvait
// aucune catégorie, et rangeait l'objet en « Autre » sans savoir pourquoi rien
// n'en sortait. Il trouve désormais le matériel, et lit ce que Rojer ne suit
// pas pour lui. L'équipement s'enregistre en catégorie `AUTRE`, avec la clé
// dans `Equipement.materielNonCouvert` (colonne facultative, migration
// `20261014130000_equipement_materiel_non_couvert`), validée contre cette liste
// (`equipements/schema.ts`). Sa fiche, l'indicateur « sans échéance »
// (`hors-referentiel.ts`) et le dossier de conformité disent la phrase propre
// au matériel au lieu du message générique.
//
// RIEN N'Y EST NEUF. Chaque entrée reprend ce que le dépôt a déjà classé :
// les annonces de la page « Ce que Rojer ne couvre pas » (`manques-annonces.ts`)
// pour les escaliers mécaniques, l'eau et les échelles — DÉPLACÉES ici, pas
// dupliquées —, le § 7 « Hors cadre » de `docs/couverture-declaree-du-produit.md`
// pour les autres, et les références telles que le corpus les cite. La seule
// référence absente du corpus est celle de la chaudière (C. env.,
// R. 224-41-4 et s.), hors cadre par décision du 2026-09-20 et relue sur
// Légifrance par la propriétaire le 2026-10-14.
//
// ~~LE DÉFIBRILLATEUR N'EST PAS ICI, et c'est voulu : une autre session
// l'encode (décision du 2026-10-14).~~ [2026-10-15, rayé — `lot/dae-materiel-1015` :
// le défibrillateur a sa catégorie, `DEFIBRILLATEUR` ; il n'a pas à figurer
// parmi les matériels non suivis.]
//
// ZÉRO HEURISTIQUE. La liste propose ; seul le choix explicite du dirigeant
// écrit la clé. Le libellé saisi n'est jamais lu, ni pour suggérer ni pour
// classer.
//
// Chaque sujet non suivi passe par `nonPorte(…)` : le balayage de
// `perimetre/non-couverture-balayage.ts` lit ce dossier et échoue le jour où
// le référentiel porterait ce que la phrase dit qu'il ne porte pas.
//
// Module pur.

import { nonPorte } from "@/lib/perimetre/non-couverture";
import { PHRASE_PLAN_SCHEMATIQUE_CHAUFFAGE } from "./labels";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

export const CLES_MATERIELS_NON_COUVERTS = [
  "chaudiere",
  "escalier_mecanique",
  "echelle",
  "echafaudage",
  "point_ancrage",
  "reservoir_eau",
  "groupe_electrogene",
  "tribune_telescopique",
  "cuisine_mobile",
  "centrifugeuse_terrassement",
  "massicot_presse_atelier",
  "box_stockage_parking",
  "piscine_equipement_sportif",
  // 2026-10-17, sous-lot B du plan « mise à jour du référentiel » (plan, § 3,
  // et inventaire validé par la propriétaire).
  "cabine_uv",
  "bain_a_remous",
  "materiel_fitness",
  "aire_de_jeux",
  "cuve_fioul",
  "transpalette",
  "machine_outil",
  "rayonnage",
  "fontaine_glacons",
  "store_volet_roulant",
  "sauna_hammam",
  "autoclave",
] as const;

export type CleMaterielNonCouvert = (typeof CLES_MATERIELS_NON_COUVERTS)[number];

/** Une référence, telle que le dépôt la cite. */
export type ReferenceMateriel = {
  /** La citation lisible. */
  libelle: string;
  /** La référence du corpus (`CorpusArticle.ref`) quand le dépôt l'a lue. */
  corpus?: string;
};

export type MaterielNonCouvert = {
  cle: CleMaterielNonCouvert;
  libelle: string;
  /** Les mots par lesquels la recherche le trouve, en plus du libellé. */
  synonymes: readonly string[];
  /** « Rojer ne suit pas … » — affichée à l'écran et dans le dossier. */
  phrase: string;
  references: readonly ReferenceMateriel[];
  /**
   * Une catégorie suivie à laquelle le matériel appartient parfois — la
   * chaudière au gaz fait partie de l'installation de gaz. Le formulaire
   * propose d'y basculer ; il ne décide pas à la place du dirigeant.
   */
  orienteVers?: { categorie: CategorieEquipement; phrase: string };
};

/**
 * Le contrôle des boxes de stockage : la phrase est AUSSI celle de la page
 * « Ce que Rojer ne couvre pas » (rubrique « Immeuble d'habitation »), où
 * l'arrêté du 31 janvier 1986, art. 78-1 reste annoncé au dossier d'habitation.
 * Une seule rédaction, importée par `manques-annonces.ts`.
 */
export const PHRASE_BOXES_DE_STOCKAGE = `Rojer ne suit pas ${nonPorte("le contrôle visuel des boxes de stockage d'un parc de stationnement couvert annexe")}, que le gestionnaire du parc fait au moins une fois par an et à chaque changement d'utilisateur.`;

/**
 * Les machines et les rayonnages : la phrase prudente décidée par c6 le
 * 2026-10-17. Elle ne tranche pas si un rayonnage est un « équipement de
 * travail » au sens du code du travail ; elle dit ce que Rojer ne suit pas.
 */
export const PHRASE_MAINTIEN_EN_ETAT_R_4322_1 = `Rojer ne suit pas ${nonPorte("le maintien en état de conformité des machines et équipements de travail")} (code du travail, art. R. 4322-1).`;

/**
 * Les matériels pour lesquels le dépôt n'a lu AUCUN texte qui impose un
 * entretien ou une vérification à l'exploitant. Leur phrase le dit, sans
 * affirmer qu'il n'en existe aucun (ligne de partage 8 : ne jamais qualifier).
 * Toute autre entrée cite au moins un texte (`materiels-non-couverts.test.ts`).
 */
export const SANS_TEXTE_LU: ReadonlySet<CleMaterielNonCouvert> = new Set([
  "materiel_fitness",
  "fontaine_glacons",
  "store_volet_roulant",
  "sauna_hammam",
]);

const AUCUN_TEXTE_LU =
  "Rojer n'a lu aucun texte qui en impose à l'exploitant, ce qui ne veut pas dire qu'il n'en existe aucun.";

export const MATERIELS_NON_COUVERTS: readonly MaterielNonCouvert[] = [
  {
    cle: "chaudiere",
    libelle: "Chaudière",
    synonymes: ["chaudière", "chaudière gaz", "chaudière fioul", "chaudière murale"],
    // 2026-10-17, sous-lot B : la seconde phrase annonce CH 23 § 3 et CH 24 § 5,
    // dont l'adresse est l'aide « Installation de gaz » (même constante). La
    // référence ne porte pas la clé du corpus : un article `non_couvert` que
    // la liste cite par sa clé doit avoir la liste pour adresse.
    phrase: `Rojer ne suit pas ${nonPorte("l'entretien annuel des chaudières de 4 à 400 kW")} (code de l'environnement, art. R. 224-41-4 et suivants). ${PHRASE_PLAN_SCHEMATIQUE_CHAUFFAGE}`,
    references: [
      { libelle: "Code de l'environnement, art. R. 224-41-4 et suivants" },
      { libelle: "Arrêté du 25 juin 1980, art. CH 23 et CH 24" },
    ],
    orienteVers: {
      categorie: "INSTALLATION_GAZ",
      phrase:
        "Une chaudière au gaz fait partie de l'installation de gaz : déclarez plutôt l'installation, Rojer en suit la vérification annuelle dans un établissement recevant du public des quatre premières catégories (art. GZ 15).",
    },
  },
  {
    cle: "escalier_mecanique",
    libelle: "Escalier mécanique ou trottoir roulant",
    synonymes: ["escalier mécanique", "escalator", "trottoir roulant", "tapis roulant"],
    // Reprise mot pour mot de la rubrique « Escaliers mécaniques et
    // trottoirs roulants » de `manques-annonces.ts` (2026-10-13), déplacée.
    phrase: `Rojer ne suit pas ${nonPorte("la vérification annuelle des escaliers mécaniques et des trottoirs roulants")} par une personne ou un organisme agréé, ni ${nonPorte("l'examen des chaînes et crémaillères au milieu de l'année")}, ni ${nonPorte("la vérification de l'escalier mécanique avant sa remise en service après une transformation importante")}, ni ${nonPorte("l'entretien des appareils par un personnel spécialisé de l'établissement ou d'une entreprise liée par un contrat d'entretien")}, que le règlement de sécurité impose aux établissements recevant du public des quatre premières catégories.`,
    // 2026-10-17, sous-lot B : AS 8 (entretien) nommé à côté d'AS 10.
    references: [
      { libelle: "Arrêté du 25 juin 1980, art. AS 8", corpus: "AS 8" },
      { libelle: "Arrêté du 25 juin 1980, art. AS 10", corpus: "AS 10" },
    ],
  },
  {
    cle: "echelle",
    libelle: "Échelle, escabeau ou marchepied",
    synonymes: ["échelle", "escabeau", "marchepied"],
    // Reprise mot pour mot de la rubrique « Travail en hauteur » de
    // `manques-annonces.ts` (2026-09-27), déplacée.
    phrase: `Rojer ne suit pas ${nonPorte("l'usage des échelles, escabeaux et marchepieds comme poste de travail")}. Le texte l'interdit, sauf impossibilité technique de recourir à une protection collective, ou risque évalué comme faible pour des travaux de courte durée sans caractère répétitif.`,
    references: [{ libelle: "Code du travail, art. R. 4323-63", corpus: "R. 4323-63" }],
  },
  {
    cle: "echafaudage",
    libelle: "Échafaudage",
    synonymes: ["échafaudage", "échafaudage roulant"],
    phrase: `Rojer ne suit pas ${nonPorte("les vérifications des échafaudages")} — avant mise ou remise en service, examen quotidien, examen approfondi trimestriel —, ni ${nonPorte("la notice et la note de calcul de l'échafaudage")}, ni ${nonPorte("la formation au montage et au démontage des échafaudages")}.`,
    references: [
      { libelle: "Arrêté du 21 décembre 2004, art. 4", corpus: "Arrêté 21-12-2004 art. 4" },
      { libelle: "Arrêté du 21 décembre 2004, art. 5", corpus: "Arrêté 21-12-2004 art. 5" },
      { libelle: "Arrêté du 21 décembre 2004, art. 6", corpus: "Arrêté 21-12-2004 art. 6" },
      { libelle: "Code du travail, art. R. 4323-69", corpus: "R. 4323-69" },
      { libelle: "Code du travail, art. R. 4323-70", corpus: "R. 4323-70" },
      { libelle: "Code du travail, art. R. 4323-72", corpus: "R. 4323-72" },
    ],
  },
  {
    cle: "point_ancrage",
    libelle: "Point d'ancrage ou ligne de vie",
    synonymes: ["point d'ancrage", "ligne de vie", "ancrage"],
    phrase: `Rojer ne suit pas ${nonPorte("la notice des points d'ancrage")} que l'employeur rédige et détient.`,
    references: [{ libelle: "Code du travail, art. R. 4323-61", corpus: "R. 4323-61" }],
    orienteVers: {
      categorie: "EPI_ANTICHUTE",
      phrase:
        "Le harnais, la longe et l'antichute qu'une personne porte sont suivis : déclarez-les dans leur catégorie, Rojer en suit la vérification tous les douze mois.",
    },
  },
  {
    cle: "reservoir_eau",
    libelle: "Réservoir ou bâche d'eau, clapet anti-retour",
    synonymes: [
      "réservoir d'eau",
      "bâche d'eau",
      "bâche de stockage",
      "cuve d'eau",
      "clapet anti-retour",
      "disconnecteur",
      "adoucisseur",
      "adoucisseur d'eau",
    ],
    // Reprise de la rubrique « Réseaux intérieurs d'eau » de
    // `manques-annonces.ts` (2026-09-27), déplacée ; les articles y sont
    // désormais cités (revue du lot, point 3).
    phrase: `Rojer ne suit pas ${nonPorte("la protection des réseaux intérieurs d'eau contre les retours d'eau")} (arrêté du 10 septembre 2021, art. 4, 8, 9, 10 et 12), ni ${nonPorte("l'entretien des réservoirs et bâches de stockage d'eau")} (code de la santé publique, art. R. 1321-60). L'arrêté du 10 septembre 2021 vise les réseaux mis en place ou rénovés totalement à partir du 1er janvier 2023, et en charge le propriétaire des réseaux intérieurs de distribution, que Rojer ne sait pas identifier. Rojer ne suit pas non plus ${nonPorte("l'entretien d'un adoucisseur d'eau")} : le code de la santé publique fait vérifier et entretenir les dispositifs de traitement qui équipent les installations collectives de distribution (art. R. 1321-61), sans en fixer le rythme.`,
    references: [
      { libelle: "Code de la santé publique, art. R. 1321-60", corpus: "R. 1321-60" },
      { libelle: "Code de la santé publique, art. R. 1321-61", corpus: "R. 1321-61" },
      { libelle: "Arrêté du 10 septembre 2021, art. 4", corpus: "Arrêté 10-09-2021 art. 4" },
      { libelle: "Arrêté du 10 septembre 2021, art. 8", corpus: "Arrêté 10-09-2021 art. 8" },
      { libelle: "Arrêté du 10 septembre 2021, art. 9", corpus: "Arrêté 10-09-2021 art. 9" },
      { libelle: "Arrêté du 10 septembre 2021, art. 10", corpus: "Arrêté 10-09-2021 art. 10" },
      { libelle: "Arrêté du 10 septembre 2021, art. 12", corpus: "Arrêté 10-09-2021 art. 12" },
    ],
  },
  {
    cle: "groupe_electrogene",
    libelle: "Groupe électrogène d'un immeuble d'habitation",
    synonymes: ["groupe électrogène"],
    phrase: `Rojer ne suit pas ${nonPorte("la vérification mensuelle du groupe électrogène qui secourt la ventilation d'un immeuble d'habitation")}.`,
    references: [
      { libelle: "Arrêté du 31 janvier 1986, art. 60", corpus: "Arrêté 1986-01-31 art. 60" },
    ],
    // Le groupe électrogène de SÉCURITÉ d'un ERP est suivi (EL 18 § 4), par
    // la question posée sur l'installation électrique : la recherche ne doit
    // pas laisser croire le contraire.
    orienteVers: {
      categorie: "INSTALLATION_ELECTRIQUE",
      phrase:
        "Dans un établissement recevant du public, le groupe électrogène de sécurité est suivi : déclarez l'installation électrique et répondez « Oui » à la question du groupe électrogène (art. EL 18 § 4).",
    },
  },
  {
    cle: "tribune_telescopique",
    libelle: "Tribune télescopique",
    synonymes: ["tribune", "gradins"],
    phrase: `Rojer ne suit pas ${nonPorte("l'inspection quinquennale des tribunes télescopiques de plus d'un mètre")}.`,
    references: [{ libelle: "Arrêté du 25 juin 1980, art. CO 61", corpus: "CO 61" }],
  },
  {
    cle: "cuisine_mobile",
    libelle: "Cuisine mobile ou module de cuisson temporaire",
    synonymes: ["cuisine mobile", "module de cuisson", "conteneur de cuisson"],
    phrase: `Rojer ne suit pas ${nonPorte("le nettoyage semestriel du conduit d'un module de cuisson temporaire")}.`,
    references: [{ libelle: "Arrêté du 25 juin 1980, art. GC 18", corpus: "GC 18" }],
  },
  {
    cle: "centrifugeuse_terrassement",
    libelle: "Centrifugeuse ou engin de terrassement",
    synonymes: ["centrifugeuse", "engin de terrassement", "pelleteuse", "mini-pelle"],
    phrase: `Rojer ne suit pas ${nonPorte("la vérification annuelle des centrifugeuses et des machines mobiles de terrassement à conducteur porté")}.`,
    references: [
      { libelle: "Arrêté du 5 mars 1993, art. 2", corpus: "Arrêté 1993-03-05 art. 2" },
    ],
  },
  {
    cle: "massicot_presse_atelier",
    libelle: "Massicot motorisé ou presse d'atelier",
    synonymes: ["massicot", "presse d'atelier", "presse hydraulique", "presse à découper"],
    phrase: `Rojer ne suit pas ${nonPorte("la vérification trimestrielle des massicots motorisés et des presses d'atelier")} ; il ne la suit que pour les compacteurs à déchets et les presses à balles, qui ont leur propre catégorie.`,
    references: [
      { libelle: "Arrêté du 5 mars 1993, art. 1er", corpus: "Arrêté 1993-03-05 art. 1" },
    ],
  },
  {
    cle: "box_stockage_parking",
    libelle: "Box de stockage d'un parc de stationnement",
    synonymes: ["box", "box de stockage", "box de parking"],
    phrase: PHRASE_BOXES_DE_STOCKAGE,
    references: [
      { libelle: "Arrêté du 31 janvier 1986, art. 78-1", corpus: "Arrêté 1986-01-31 art. 78-1" },
    ],
  },
  {
    // ~~libellé « Piscine ou équipement sportif », phrase « Rojer ne suit pas
    // les piscines et les équipements sportifs : ils sont hors de son
    // périmètre. », sans référence~~ — 2026-10-17, sous-lot B : « équipements
    // sportifs » sort de l'exclusion `risque_specialise` (le sous-lot E du plan
    // les instruit) ; la piscine y reste. La CLÉ ne change pas : elle est
    // stockée en base.
    cle: "piscine_equipement_sportif",
    libelle: "Piscine",
    synonymes: ["piscine", "bassin de natation"],
    phrase: `Rojer ne suit pas ${nonPorte("les piscines")} : elles sont hors de son périmètre. Le code de la santé publique soumet à des normes d'hygiène de l'eau les piscines publiques et privées à usage collectif (art. D. 1332-1 et D. 1332-2). Dans une piscine couverte recevant du public, Rojer ne suit pas non plus ${nonPorte("les vérifications de l'installation de traitement des eaux")} (règlement de sécurité, annexe du chapitre X), ni ${nonPorte("l'affichage de l'effectif admis d'une piscine transformable ou mixte")} (art. X 1).`,
    references: [
      { libelle: "Code de la santé publique, art. D. 1332-1", corpus: "CSP D. 1332-1" },
      { libelle: "Code de la santé publique, art. D. 1332-2", corpus: "CSP D. 1332-2" },
      { libelle: "Arrêté du 25 juin 1980, annexe du chapitre X", corpus: "X annexe" },
      {
        libelle: "Arrêté du 25 juin 1980, art. X 1",
        corpus: "X 1 § 2 — affichage de l'effectif des piscines transformables et mixtes",
      },
    ],
  },
  {
    cle: "cabine_uv",
    libelle: "Cabine UV ou appareil de bronzage",
    synonymes: ["cabine UV", "solarium", "appareil de bronzage", "banc solaire", "bronzage", "UV"],
    phrase: `Rojer ne suit pas ${nonPorte("les appareils de bronzage")} : ils sont hors de son périmètre. Leur exploitant les déclare au préfet, et un établissement qui en met un à disposition du public fait l'objet d'un contrôle par un organisme accrédité tous les deux ans (décret n° 2013-1261 du 27 décembre 2013, art. 15 et 17 ; arrêté du 20 octobre 2014, art. 2 et 9).`,
    references: [
      { libelle: "Décret n° 2013-1261 du 27 décembre 2013, art. 15", corpus: "Décret 2013-1261 art. 15" },
      { libelle: "Décret n° 2013-1261 du 27 décembre 2013, art. 17", corpus: "Décret 2013-1261 art. 17" },
      { libelle: "Arrêté du 20 octobre 2014, art. 2", corpus: "Arrêté 2014-10-20 art. 2" },
      { libelle: "Arrêté du 20 octobre 2014, art. 9", corpus: "Arrêté 2014-10-20 art. 9" },
    ],
  },
  {
    cle: "bain_a_remous",
    libelle: "Bain à remous, spa ou jacuzzi",
    synonymes: ["bain à remous", "spa", "jacuzzi", "bain bouillonnant"],
    phrase: `Rojer ne suit pas ${nonPorte("les bains à remous")} : ils sont hors de son périmètre. Le code de la santé publique soumet à des normes d'hygiène de l'eau les piscines publiques et privées à usage collectif (art. D. 1332-1 et D. 1332-2) ; un bain à remous n'en relève que s'il répond à leur définition.`,
    references: [
      { libelle: "Code de la santé publique, art. D. 1332-1", corpus: "CSP D. 1332-1" },
      { libelle: "Code de la santé publique, art. D. 1332-2", corpus: "CSP D. 1332-2" },
    ],
  },
  {
    // Plan, § 3 : la NF EN ISO 20957 n'est citée que si elle est lue — elle ne
    // l'est pas.
    cle: "materiel_fitness",
    libelle: "Matériel de fitness ou de musculation",
    synonymes: ["fitness", "musculation", "tapis de course", "vélo d'appartement", "rameur", "elliptique", "banc de musculation"],
    phrase: `Rojer ne suit pas ${nonPorte("l'entretien du matériel de fitness et de musculation")}. ${AUCUN_TEXTE_LU}`,
    references: [],
  },
  {
    // Décision de c6 du 2026-10-17 : une annonce (sécurité des personnes),
    // avec le texte cité.
    cle: "aire_de_jeux",
    libelle: "Aire de jeux pour enfants",
    synonymes: ["aire de jeux", "jeux pour enfants", "toboggan", "balançoire"],
    phrase: `Rojer ne suit pas ${nonPorte("le plan d'entretien et de maintenance d'une aire collective de jeux, son inspection régulière et le registre de ses contrôles")} (décret n° 96-1136 du 18 décembre 1996, art. 3 et annexe), ni ${nonPorte("l'affichage du nom et de l'adresse de son exploitant")} (art. 4).`,
    references: [
      { libelle: "Décret n° 96-1136 du 18 décembre 1996, art. 3", corpus: "Décret 96-1136 art. 3" },
      { libelle: "Décret n° 96-1136 du 18 décembre 1996, art. 4", corpus: "Décret 96-1136 art. 4" },
      { libelle: "Décret n° 96-1136 du 18 décembre 1996, annexe", corpus: "Décret 96-1136 annexe" },
    ],
  },
  {
    cle: "cuve_fioul",
    libelle: "Cuve de fioul ou de gazole",
    synonymes: ["cuve de fioul", "cuve à fioul", "réservoir de fioul", "cuve de gazole", "fioul", "fuel"],
    phrase: `Rojer ne suit pas ${nonPorte("l'entretien d'une cuve de fioul ou de gazole")} (arrêté du 1er juillet 2004, art. 27), ni ${nonPorte("les opérations dues avant de remettre en service un réservoir abandonné, contrôle d'étanchéité compris")} (art. 29). Cet arrêté ne vise que les réservoirs implantés hors d'une installation classée et hors d'un établissement recevant du public (art. 2).`,
    references: [
      { libelle: "Arrêté du 1er juillet 2004, art. 2", corpus: "Arrêté 2004-07-01 art. 2" },
      { libelle: "Arrêté du 1er juillet 2004, art. 27", corpus: "Arrêté 2004-07-01 art. 27" },
      { libelle: "Arrêté du 1er juillet 2004, art. 29", corpus: "Arrêté 2004-07-01 art. 29" },
    ],
  },
  {
    cle: "transpalette",
    libelle: "Transpalette à levée basse",
    synonymes: ["transpalette", "tire-palette"],
    phrase: `Rojer ne suit pas ${nonPorte("les transpalettes qui lèvent la charge juste de la hauteur nécessaire pour la déplacer")} : l'arrêté du 1er mars 2004 les exclut des vérifications des appareils de levage.`,
    references: [{ libelle: "Arrêté du 1er mars 2004, annexe", corpus: "Arrêté 2004-03-01 annexe" }],
    orienteVers: {
      categorie: "EQUIPEMENT_LEVAGE",
      phrase:
        "Un transpalette qui lève la charge plus haut, pour la gerber, est un gerbeur : déclarez-le en équipement de levage.",
    },
  },
  {
    cle: "machine_outil",
    libelle: "Machine-outil (scie, trancheuse, pétrin…)",
    synonymes: ["machine outil", "scie", "trancheuse", "pétrin", "batteur", "tour", "perceuse à colonne", "machine"],
    phrase: PHRASE_MAINTIEN_EN_ETAT_R_4322_1,
    references: [{ libelle: "Code du travail, art. R. 4322-1", corpus: "R. 4322-1" }],
  },
  {
    cle: "rayonnage",
    libelle: "Rayonnage ou rack de stockage",
    synonymes: ["rayonnage", "rack", "étagère de stockage", "palettier"],
    phrase: PHRASE_MAINTIEN_EN_ETAT_R_4322_1,
    references: [{ libelle: "Code du travail, art. R. 4322-1", corpus: "R. 4322-1" }],
  },
  {
    // Ligne de partage 4 : hors du champ de la santé et sécurité au travail.
    cle: "fontaine_glacons",
    libelle: "Fontaine à eau ou machine à glaçons",
    synonymes: ["fontaine à eau", "machine à glaçons", "distributeur d'eau"],
    phrase: `Rojer ne suit pas ${nonPorte("l'hygiène des fontaines à eau et des machines à glaçons")}, qui relève de la sécurité sanitaire des aliments, hors de son champ.`,
    references: [],
  },
  {
    cle: "store_volet_roulant",
    libelle: "Store ou volet roulant motorisé",
    synonymes: ["store", "volet roulant", "store banne"],
    phrase: `Rojer ne suit pas ${nonPorte("les stores et volets roulants motorisés")}. ${AUCUN_TEXTE_LU}`,
    references: [],
  },
  {
    cle: "sauna_hammam",
    libelle: "Sauna ou hammam",
    synonymes: ["sauna", "hammam", "bain de vapeur"],
    phrase: `Rojer ne suit pas ${nonPorte("l'entretien des saunas et des hammams")}. ${AUCUN_TEXTE_LU}`,
    references: [],
  },
  {
    cle: "autoclave",
    libelle: "Autoclave, stérilisateur ou autocuiseur professionnel",
    synonymes: ["autoclave", "stérilisateur", "autocuiseur", "cocotte"],
    // Un équipement sous pression déclaré ne reçoit que la requalification
    // des compresseurs (C64, 2026-10-08) : orienter l'autoclave vers cette
    // catégorie lui promettrait un suivi qu'il n'aurait pas.
    phrase: `Rojer ne suit pas ${nonPorte("les autoclaves, stérilisateurs et autocuiseurs")}. Le code de l'environnement réserve le suivi en service des équipements sous pression à ceux qui dépassent des seuils de pression et de volume (art. R. 557-14-1) ; Rojer ne dit pas de quel côté de ces seuils se trouve un appareil donné.`,
    references: [{ libelle: "Code de l'environnement, art. R. 557-14-1", corpus: "C. env. R. 557-14-1" }],
  },
];

/** L'entrée d'une clé, ou `null` pour une clé absente ou inconnue. */
export function materielNonCouvert(
  cle: string | null | undefined,
): MaterielNonCouvert | null {
  if (!cle) return null;
  return MATERIELS_NON_COUVERTS.find((m) => m.cle === cle) ?? null;
}
