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
// LE DÉFIBRILLATEUR N'EST PAS ICI, et c'est voulu : une autre session
// l'encode (décision du 2026-10-14).
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

export const MATERIELS_NON_COUVERTS: readonly MaterielNonCouvert[] = [
  {
    cle: "chaudiere",
    libelle: "Chaudière",
    synonymes: ["chaudière", "chaudière gaz", "chaudière fioul", "chaudière murale"],
    phrase: `Rojer ne suit pas ${nonPorte("l'entretien annuel des chaudières de 4 à 400 kW")} (code de l'environnement, art. R. 224-41-4 et suivants).`,
    references: [{ libelle: "Code de l'environnement, art. R. 224-41-4 et suivants" }],
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
    phrase: `Rojer ne suit pas ${nonPorte("la vérification annuelle des escaliers mécaniques et des trottoirs roulants")} par une personne ou un organisme agréé, ni ${nonPorte("l'examen des chaînes et crémaillères au milieu de l'année")}, ni ${nonPorte("la vérification de l'escalier mécanique avant sa remise en service après une transformation importante")}, que le règlement de sécurité impose aux établissements recevant du public des quatre premières catégories.`,
    references: [{ libelle: "Arrêté du 25 juin 1980, art. AS 10", corpus: "AS 10" }],
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
    ],
    // Reprise mot pour mot de la rubrique « Réseaux intérieurs d'eau » de
    // `manques-annonces.ts` (2026-09-27), déplacée.
    phrase: `Rojer ne suit pas ${nonPorte("la protection des réseaux intérieurs d'eau contre les retours d'eau")}, ni ${nonPorte("l'entretien des réservoirs et bâches de stockage d'eau")}. L'arrêté du 10 septembre 2021 vise les réseaux mis en place ou rénovés totalement à partir du 1er janvier 2023, et en charge le propriétaire des réseaux intérieurs de distribution, que Rojer ne sait pas identifier.`,
    references: [
      { libelle: "Code de la santé publique, art. R. 1321-60", corpus: "R. 1321-60" },
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
    cle: "piscine_equipement_sportif",
    libelle: "Piscine ou équipement sportif",
    synonymes: ["piscine", "bassin de natation", "équipement sportif", "agrès"],
    phrase: `Rojer ne suit pas ${nonPorte("les piscines et les équipements sportifs")} : ils sont hors de son périmètre.`,
    references: [{ libelle: "Hors du périmètre de Rojer" }],
  },
];

/** L'entrée d'une clé, ou `null` pour une clé absente ou inconnue. */
export function materielNonCouvert(
  cle: string | null | undefined,
): MaterielNonCouvert | null {
  if (!cle) return null;
  return MATERIELS_NON_COUVERTS.find((m) => m.cle === cle) ?? null;
}
