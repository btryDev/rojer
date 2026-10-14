// La recherche de matériel du formulaire d'équipement (décision de la
// propriétaire du 2026-10-14).
//
// Le `<select>` de vingt-sept catégories demandait au dirigeant de connaître
// le nom que le référentiel donne à son appareil : « chaudière » n'y était
// nulle part, « chambre froide » se cachait sous « Installation frigorifique ».
// La recherche filtre les catégories par leur libellé ET par une table de
// synonymes, et trouve aussi les matériels que Rojer ne suit pas
// (`materiels-non-couverts.ts`).
//
// DÉTERMINISTE ET VERSIONNÉE. La table est écrite à la main, ici ; la
// correspondance est une inclusion de mots, sans accents ni casse — aucune
// distance, aucun score, aucun classement appris. La même saisie rend
// toujours la même liste, dans l'ordre de `CATEGORIES_EQUIPEMENT`.
//
// ELLE PROPOSE, ELLE NE DÉCIDE PAS. Ce que le dirigeant tape ici n'est pas
// enregistré ; seul son choix l'est. Le libellé de l'équipement n'est jamais
// lu (zéro heuristique).
//
// Module pur.

import {
  CATEGORIES_EQUIPEMENT,
  type CategorieEquipement,
} from "@/lib/referentiels/types-communs";
import { LABEL_CATEGORIE_EQUIPEMENT } from "./labels";
import {
  MATERIELS_NON_COUVERTS,
  type MaterielNonCouvert,
} from "./materiels-non-couverts";

/**
 * Les synonymes de chaque catégorie, en plus de son libellé. Une entrée ne
 * dit que le mot courant d'un objet que la catégorie VISE — son aide au
 * formulaire reste ce qui borne la catégorie.
 *
 * Trois sont des décisions de la propriétaire du 2026-10-14 : « chaudière »
 * et « chauffage gaz » → installation de gaz ; « chambre froide » →
 * installation frigorifique ; « monte-charge » → levage. [Ce dernier est
 * signalé dans le rendu du lot : `conformite/levage.ts` relève que l'annexe
 * de l'arrêté du 1er mars 2004 exclut les monte-charges INSTALLÉS À DEMEURE ;
 * la recherche propose la catégorie, l'aide du levage et la question « lever
 * des personnes » disent la suite.]
 */
export const SYNONYMES_CATEGORIE: Readonly<Record<CategorieEquipement, readonly string[]>> = {
  INSTALLATION_ELECTRIQUE: ["électricité", "tableau électrique", "TGBT", "disjoncteur", "groupe électrogène"],
  EXTINCTEUR: ["extincteur"],
  RIA: ["robinet d'incendie", "RIA"],
  BAES: ["éclairage de secours", "bloc de secours", "BAES"],
  ALARME_INCENDIE: ["alarme", "détecteur de fumée", "SSI", "déclencheur manuel"],
  DESENFUMAGE: ["exutoire", "trappe de désenfumage"],
  VMC: ["ventilation", "VMC", "aération", "extracteur d'air"],
  CTA: ["traitement d'air", "climatisation", "CTA"],
  HOTTE_PRO: ["hotte", "extraction de cuisine"],
  APPAREIL_CUISSON_ERP: ["four", "friteuse", "fourneau", "piano de cuisson", "grill", "plancha", "cuisson"],
  ASCENSEUR: ["ascenseur"],
  PORTE_AUTO: ["porte automatique", "porte coulissante", "porte motorisée"],
  PORTAIL_AUTO: ["portail", "portail motorisé"],
  EQUIPEMENT_SOUS_PRESSION: ["compresseur", "air comprimé"],
  STOCKAGE_MATIERE_DANGEREUSE: ["produits chimiques", "liquides inflammables", "solvants"],
  EQUIPEMENT_LEVAGE: ["monte-charge", "palan", "chariot élévateur", "gerbeur", "hayon élévateur", "nacelle", "treuil"],
  INSTALLATION_FRIGORIFIQUE: ["chambre froide", "réfrigérateur", "frigo", "congélateur", "vitrine réfrigérée", "groupe froid"],
  COMPACTEUR_PRESSE_DECHETS_MOTORISE: ["compacteur", "presse à cartons", "presse à balles"],
  EPI: ["casque", "gants", "chaussures de sécurité", "lunettes de protection", "protection auditive"],
  EPI_ANTICHUTE: ["harnais", "longe", "antichute"],
  EPI_RESPIRATOIRE: ["masque à cartouche", "cartouche filtrante", "appareil respiratoire"],
  EPI_GILET_SAUVETAGE: ["gilet de sauvetage"],
  INSTALLATION_GAZ: ["chaudière", "chauffage gaz", "chauffage au gaz", "gaz", "citerne de gaz", "cuve de propane", "chauffe-eau gaz"],
  AUTRE: [],
};

/** Minuscules, sans accents, apostrophes et traits d'union ramenés à l'espace. */
export function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’ʼ'\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chaque mot de la saisie figure dans l'un des termes. */
function correspond(mots: readonly string[], termes: readonly string[]): boolean {
  const botte = termes.map(normaliser).join(" | ");
  return mots.every((m) => botte.includes(m));
}

export type ResultatRecherche = {
  categories: CategorieEquipement[];
  materiels: MaterielNonCouvert[];
};

/**
 * Les catégories et les matériels non couverts que la saisie désigne.
 *
 * Saisie vide : toutes les catégories, aucun matériel — la liste fermée de
 * l'ancien `<select>`, rien de plus. Les matériels non suivis n'apparaissent
 * que quand on les cherche.
 */
export function rechercherMateriel(saisie: string): ResultatRecherche {
  const mots = normaliser(saisie).split(" ").filter(Boolean);
  if (mots.length === 0) {
    return { categories: [...CATEGORIES_EQUIPEMENT], materiels: [] };
  }
  return {
    categories: CATEGORIES_EQUIPEMENT.filter((c) =>
      correspond(mots, [LABEL_CATEGORIE_EQUIPEMENT[c], ...SYNONYMES_CATEGORIE[c]]),
    ),
    materiels: MATERIELS_NON_COUVERTS.filter((m) => correspond(mots, [m.libelle, ...m.synonymes])),
  };
}
