import type { CategorieEquipement } from "@prisma/client";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";

/**
 * La famille sous laquelle un équipement se range à l'écran : un domaine du
 * référentiel, ou une famille propre à l'écran qu'aucune obligation ne porte.
 * Règle de rangement (décision de la propriétaire du 2026-11-13) : une
 * famille = une installation. Le réseau de gaz est une installation comme le
 * réseau électrique ; ce qui cuit, au gaz ou non, reste sous Cuisson.
 */
export type FamilleEquipement = DomaineObligation | "gaz" | "scene";

export const LABEL_FAMILLE_EQUIPEMENT: Record<FamilleEquipement, string> = {
  ...LABEL_DOMAINE,
  // Le nom du domaine dit l'établissement ; la famille range des buts et
  // des paniers (2026-11-13).
  etablissement_sportif: "Équipements sportifs",
  // La famille range aussi l'escalier mécanique et le trottoir roulant
  // (2026-11-13), que le chapitre IX du livre II réunit avec l'ascenseur.
  ascenseur: "Ascenseurs et escaliers mécaniques",
  // Les appareils rangés sous `incendie` (extincteurs, RIA, alarme,
  // désenfumage) sont des moyens de secours : la famille le dit (décision de
  // la propriétaire du 2026-11-13). Le domaine du calendrier garde « Incendie /
  // sécurité » : il porte aussi des consignes, des exercices et le registre.
  incendie: "Moyens de secours",
  gaz: "Gaz",
  scene: "Scène",
};

/**
 * Le domaine sous lequel une catégorie d'équipement se range à l'écran
 * (points à corriger, lot 2 — décision de la propriétaire du 2026-10-24 :
 * « des grosses catégories », comme le calendrier les nomme). Une catégorie,
 * un domaine principal ; `null` pour « Autre », qui n'en a pas.
 *
 * Table écrite, pas déduite : une catégorie dont les obligations relèvent de
 * plusieurs domaines se range là où le dirigeant la cherche. Le test vérifie
 * que le domaine choisi est bien l'un de ceux de ses obligations, sauf pour
 * les catégories de `RANGEES_HORS_DE_LEURS_OBLIGATIONS`.
 */
export const FAMILLE_DE_CATEGORIE: Record<CategorieEquipement, FamilleEquipement | null> = {
  INSTALLATION_ELECTRIQUE: "electricite",
  EXTINCTEUR: "incendie",
  RIA: "incendie",
  COLONNE_SECHE: "incendie",
  BAES: "electricite",
  ALARME_INCENDIE: "incendie",
  DESENFUMAGE: "incendie",
  VENTILATION: "aeration",
  HOTTE_PRO: "cuisson_hotte",
  APPAREIL_CUISSON_ERP: "cuisson_hotte",
  ASCENSEUR: "ascenseur",
  PORTE_PORTAIL_MOTORISE: "porte_portail",
  EQUIPEMENT_SOUS_PRESSION: "equipement_sous_pression",
  STOCKAGE_MATIERE_DANGEREUSE: "stockage_dangereux",
  EQUIPEMENT_LEVAGE: "levage",
  INSTALLATION_FRIGORIFIQUE: "froid",
  COMPACTEUR_PRESSE_DECHETS_MOTORISE: "compactage_dechets",
  EPI: "epi",
  INSTALLATION_GAZ: "gaz",
  DEFIBRILLATEUR: "secours",
  EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC: "eau_chaude_sanitaire",
  BUT_PANIER_SPORTIF: "etablissement_sportif",
  SCENE: "scene",
  ESCALIER_MECANIQUE: "ascenseur",
  AUTRE: null,
};

/**
 * Les catégories rangées à l'écran hors du domaine de leurs obligations. Le
 * référentiel n'en est pas changé : rangement d'écran seulement.
 */
export const RANGEES_HORS_DE_LEURS_OBLIGATIONS: ReadonlySet<CategorieEquipement> = new Set([
  // Retour d'un testeur du 2026-11-13 : le dirigeant cherche ses blocs de
  // secours avec l'électricité — c'est un appareil électrique, posé et
  // contrôlé par l'électricien. Ses obligations restent au domaine incendie
  // (éclairage de sécurité : R. 4227-14 CT, EC du règlement de 1980).
  "BAES",
  // Même retour : une installation de gaz chauffe, produit l'eau chaude,
  // stocke du propane — la ranger sous Cuisson la disait de cuisine. C'est un
  // réseau, comme l'électricité. Ses obligations restent aux domaines cuisson
  // (GZ 15) et incendie (PE 4 § 2, PO 1 § 3) ; les appareils de cuisson au
  // gaz restent sous Cuisson.
  "INSTALLATION_GAZ",
  // Même règle, même jour : une scène (plateau, accroches, éclairage
  // scénique) est une installation à part entière. Ses obligations restent
  // aux domaines incendie et électricité.
  "SCENE",
]);

/** Ce qu'un domaine pèse, pour le ranger. */
export type PoidsDomaine = { libelle: string | null; enRetard: number; proche: number };

/**
 * L'ordre des domaines, le même sur la page Équipements et dans la vue « par
 * équipement » du calendrier (contrôle visuel du 2026-10-24 : les deux
 * écrans les rangeaient autrement). Le plus de lignes dépassées d'abord, puis
 * le plus d'échéances sous 30 jours, puis l'ordre alphabétique ; un groupe
 * sans domaine (« Autres ») en dernier.
 */
export function comparerDomaines(a: PoidsDomaine, b: PoidsDomaine): number {
  if ((a.libelle === null) !== (b.libelle === null)) return a.libelle === null ? 1 : -1;
  return b.enRetard - a.enRetard || b.proche - a.proche || (a.libelle ?? "").localeCompare(b.libelle ?? "");
}
