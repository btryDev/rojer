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
// distance, aucun score, aucun classement appris. ~~Chaque mot de la saisie
// est cherché n'importe où dans les termes~~ [2026-10-17, revue du sous-lot B :
// « spa » trouvait « transpalette ». Chaque mot de la saisie doit désormais
// COMMENCER un mot d'un terme : la frappe en cours (« chaud » → chaudière)
// garde sa réponse, le milieu de mot n'en a plus. Reste « gaz » → « gazole »,
// un début de mot ; voir `docs/chantiers-ouverts.md`.] La même saisie rend
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
 * Deux sont des décisions de la propriétaire du 2026-10-14 : « chaudière »
 * et « chauffage gaz » → installation de gaz ; « chambre froide » →
 * installation frigorifique. ~~« monte-charge » → levage~~ [2026-10-14,
 * RETIRÉ après la revue indépendante du lot : l'annexe de l'arrêté du 1er mars
 * 2004 exclut les monte-charges installés à demeure (`conformite/levage.ts`),
 * et le moteur leur servait pourtant les lignes de levage. Le monte-charge
 * n'est orienté nulle part — ni levage, ni ascenseur, ni « non couvert » :
 * son texte (arrêté du 29 décembre 2010) n'est pas au corpus, et la décision
 * D10 reste ouverte. `recherche-materiel.test.ts` tient qu'il ne trouve rien.]
 *
 * 2026-10-17, sous-lot B du plan « mise à jour du référentiel » (inventaire
 * validé par la propriétaire ; décisions de c6 du même jour) :
 *  - climatisation, climatiseur, pompe à chaleur, split → installation
 *    frigorifique (contrôle d'étanchéité du fluide, CH 35 § 3 c) dans l'aide) ;
 *    « climatisation » reste aussi sur la CTA : la recherche propose les deux,
 *    l'aide de chaque catégorie borne ;
 *  - réservoir d'air comprimé → équipement sous pression ;
 *  - plateforme élévatrice mobile, PEMP, table élévatrice, pont élévateur →
 *    levage : l'annexe de l'arrêté du 1er mars 2004 nomme « tables
 *    élévatrices, hayons élévateurs », « ponts élévateurs de véhicule » et
 *    « plates-formes élévatrices mobiles de personnes » (relue le 2026-10-17) ;
 *  - panneaux photovoltaïques, onduleur, borne de recharge, IRVE → installation
 *    électrique : R. 4226-16 fait vérifier périodiquement « les installations
 *    électriques », sans en excepter aucune ; aucun texte propre à
 *    l'exploitant d'une installation photovoltaïque ou d'une borne n'a été
 *    trouvé, et la recherche n'en suppose aucun ;
 *  - rideau métallique, rideau de fer, grille roulante, barrière levante →
 *    portail automatique. DÉCISION de c6 du 2026-10-17. L'arrêté du
 *    21 décembre 1993, art. 1er : « les portes ou portails automatiques et
 *    semi-automatiques sont des fermetures automatiques et semi-automatiques » ;
 *    son annexe renvoie la définition de ces termes à la norme NF P 25-362, que
 *    le dépôt n'a pas lue. ~~Lecture retenue : au sens courant de « fermeture
 *    d'une baie ou d'un passage ».~~ [2026-10-18, relecture de c6 : lecture
 *    inversée — l'article dit que les portes SONT des fermetures, pas que toute
 *    fermeture est une porte.] Fondement : R. 4224-11 vise « les portes et
 *    portails s'ouvrant vers le haut » — le rideau de devanture, de fer ou la
 *    grille roulante en sont. La barrière levante est couverte [2026-10-18,
 *    précision de c6] parce que la norme de référence de l'arrêté, selon
 *    l'OPPBTP — la NF EN 13241-1, qui a remplacé la NF P 25-362 —, couvre les
 *    « portes, portails et barrières », rideaux à lames et grilles à
 *    enroulement compris (AFNOR, guide de motorisation de la FFB) ; même appui
 *    pour le rideau. NF EN 13241 non lue, champ cité d'après l'OPPBTP et la
 *    FFB. L'aide
 *    de la catégorie le dit (`DESCRIPTION_CATEGORIE.PORTAIL_AUTO`). Le volet
 *    roulant motorisé n'est PAS un synonyme (décision de c6 du même jour) : il
 *    reste un matériel non couvert ~~, à confirmer avec le préventeur dans la
 *    même note~~ [2026-10-18 : il ferme une fenêtre ou une vitrine, ni porte ni
 *    portail].
 */
export const SYNONYMES_CATEGORIE: Readonly<Record<CategorieEquipement, readonly string[]>> = {
  INSTALLATION_ELECTRIQUE: ["électricité", "tableau électrique", "TGBT", "disjoncteur", "groupe électrogène", "panneaux photovoltaïques", "onduleur", "borne de recharge", "IRVE"],
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
  PORTAIL_AUTO: ["portail", "portail motorisé", "rideau métallique", "rideau métallique motorisé", "rideau de fer", "grille roulante", "barrière levante"],
  EQUIPEMENT_SOUS_PRESSION: ["compresseur", "air comprimé", "réservoir d'air comprimé"],
  STOCKAGE_MATIERE_DANGEREUSE: ["produits chimiques", "liquides inflammables", "solvants"],
  EQUIPEMENT_LEVAGE: ["palan", "chariot élévateur", "gerbeur", "hayon élévateur", "nacelle", "treuil", "plateforme élévatrice mobile", "PEMP", "table élévatrice", "pont élévateur"],
  INSTALLATION_FRIGORIFIQUE: ["chambre froide", "réfrigérateur", "frigo", "congélateur", "vitrine réfrigérée", "groupe froid", "climatisation", "climatiseur", "pompe à chaleur", "split"],
  COMPACTEUR_PRESSE_DECHETS_MOTORISE: ["compacteur", "presse à cartons", "presse à balles"],
  EPI: ["casque", "gants", "chaussures de sécurité", "lunettes de protection", "protection auditive"],
  EPI_ANTICHUTE: ["harnais", "longe", "antichute"],
  EPI_RESPIRATOIRE: ["masque à cartouche", "cartouche filtrante", "appareil respiratoire"],
  EPI_GILET_SAUVETAGE: ["gilet de sauvetage"],
  INSTALLATION_GAZ: ["chaudière", "chauffage gaz", "chauffage au gaz", "gaz", "citerne de gaz", "cuve de propane", "chauffe-eau gaz"],
  DEFIBRILLATEUR: ["défibrillateur", "DAE", "défibrillateur automatisé externe"],
  EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC: ["douche", "douches", "eau chaude sanitaire", "ECS", "ballon d'eau chaude", "chauffe-eau collectif", "production d'eau chaude", "légionelles", "légionellose", "bain à remous", "jacuzzi", "spa"],
  BUT_PANIER_SPORTIF: ["but", "cage de but", "but de football", "but de handball", "but de hockey", "panier de basket", "but de basket", "basket-ball"],
  // 2026-10-17, sous-lot G : les mots de l'art. L 49 (scène, estrade, plateau,
  // piste) et ceux du bloc-scène (gril, cintres, machinerie scénique).
  SCENE: ["scène", "estrade", "plateau", "piste", "espace scénique", "bloc-scène", "gril", "cintres", "machinerie scénique", "salle de spectacle", "théâtre"],
  AUTRE: [],
};

/**
 * Minuscules, sans accents, apostrophes, traits d'union et ponctuation ramenés
 * à l'espace. [2026-10-17, relecture de B : la parenthèse restait collée au mot
 * — « (motorise) » — et « motorisé » ne trouvait plus le compacteur.]
 */
export function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    // ~~`/[’ʼ'\-]/` puis une liste de ponctuation~~ — 2026-10-17, suites de
    // B : tout ce qui n'est ni lettre ni chiffre, tirets typographiques et
    // trait d'union insécable (U+2011, « chauffe‑eau ») compris.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chaque mot de la saisie commence l'un des mots des termes. */
function correspond(mots: readonly string[], termes: readonly string[]): boolean {
  const debuts = termes.flatMap((t) => normaliser(t).split(" "));
  return mots.every((m) => debuts.some((d) => d.startsWith(m)));
}

/** Les tables où la recherche lit — injectables, pour éprouver un synonyme. */
export type TablesRecherche = {
  synonymes: Readonly<Record<CategorieEquipement, readonly string[]>>;
  materiels: readonly MaterielNonCouvert[];
};

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
export function rechercherMateriel(
  saisie: string,
  tables: TablesRecherche = { synonymes: SYNONYMES_CATEGORIE, materiels: MATERIELS_NON_COUVERTS },
): ResultatRecherche {
  const mots = normaliser(saisie).split(" ").filter(Boolean);
  if (mots.length === 0) {
    return { categories: [...CATEGORIES_EQUIPEMENT], materiels: [] };
  }
  return {
    categories: CATEGORIES_EQUIPEMENT.filter((c) =>
      correspond(mots, [LABEL_CATEGORIE_EQUIPEMENT[c], ...tables.synonymes[c]]),
    ),
    materiels: tables.materiels.filter((m) => correspond(mots, [m.libelle, ...m.synonymes])),
  };
}
