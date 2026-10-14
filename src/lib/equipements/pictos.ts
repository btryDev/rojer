import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Pictos isométriques des catégories d'équipement, découpés depuis la
 * planche source par scripts/decouper-planche-pictos.py.
 *
 * INSTALLATION_ELECTRIQUE, RIA, INSTALLATION_GAZ (2026-10-14) et AUTRE n'ont
 * pas encore de picto dessiné (les écrans du board passent par
 * `MarqueCategorie`, qui a le sien) :
 * le composant <PictoEquipement> affiche alors un fallback lucide.
 */
export const PICTO_CATEGORIE_EQUIPEMENT: Partial<
  Record<CategorieEquipement, string>
> = {
  EXTINCTEUR: "/pictos/equipements/extincteur.png",
  BAES: "/pictos/equipements/baes.png",
  ALARME_INCENDIE: "/pictos/equipements/alarme-incendie.png",
  DESENFUMAGE: "/pictos/equipements/desenfumage.png",
  VMC: "/pictos/equipements/vmc.png",
  CTA: "/pictos/equipements/cta.png",
  HOTTE_PRO: "/pictos/equipements/hotte-pro.png",
  APPAREIL_CUISSON_ERP: "/pictos/equipements/appareil-cuisson-erp.png",
  ASCENSEUR: "/pictos/equipements/ascenseur.png",
  PORTE_AUTO: "/pictos/equipements/porte-auto.png",
  PORTAIL_AUTO: "/pictos/equipements/portail-auto.png",
  EQUIPEMENT_SOUS_PRESSION: "/pictos/equipements/equipement-sous-pression.png",
  STOCKAGE_MATIERE_DANGEREUSE:
    "/pictos/equipements/stockage-matiere-dangereuse.png",
  EQUIPEMENT_LEVAGE: "/pictos/equipements/equipement-levage.png",
};
