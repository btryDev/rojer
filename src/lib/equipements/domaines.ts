import type { CategorieEquipement } from "@prisma/client";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";

/**
 * Le domaine sous lequel une catégorie d'équipement se range à l'écran
 * (points à corriger, lot 2 — décision de la propriétaire du 2026-10-24 :
 * « des grosses catégories », comme le calendrier les nomme). Une catégorie,
 * un domaine principal ; `null` pour « Autre », qui n'en a pas.
 *
 * Table écrite, pas déduite : une catégorie dont les obligations relèvent de
 * plusieurs domaines se range là où le dirigeant la cherche. Le test vérifie
 * que le domaine choisi est bien l'un de ceux de ses obligations.
 */
export const DOMAINE_DE_CATEGORIE: Record<CategorieEquipement, DomaineObligation | null> = {
  INSTALLATION_ELECTRIQUE: "electricite",
  EXTINCTEUR: "incendie",
  RIA: "incendie",
  BAES: "incendie",
  ALARME_INCENDIE: "incendie",
  DESENFUMAGE: "incendie",
  VMC: "aeration",
  CTA: "aeration",
  HOTTE_PRO: "cuisson_hotte",
  APPAREIL_CUISSON_ERP: "cuisson_hotte",
  ASCENSEUR: "ascenseur",
  PORTE_AUTO: "porte_portail",
  PORTAIL_AUTO: "porte_portail",
  EQUIPEMENT_SOUS_PRESSION: "equipement_sous_pression",
  STOCKAGE_MATIERE_DANGEREUSE: "stockage_dangereux",
  EQUIPEMENT_LEVAGE: "levage",
  INSTALLATION_FRIGORIFIQUE: "froid",
  COMPACTEUR_PRESSE_DECHETS_MOTORISE: "compactage_dechets",
  EPI: "epi",
  EPI_ANTICHUTE: "epi",
  EPI_RESPIRATOIRE: "epi",
  EPI_GILET_SAUVETAGE: "epi",
  INSTALLATION_GAZ: "cuisson_hotte",
  DEFIBRILLATEUR: "secours",
  EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC: "eau_chaude_sanitaire",
  BUT_PANIER_SPORTIF: "etablissement_sportif",
  SCENE: "incendie",
  AUTRE: null,
};
