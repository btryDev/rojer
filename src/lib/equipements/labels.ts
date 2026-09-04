import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Libellés FR des catégories d'équipement, affichables tel quel en UI.
 * L'ordre de la table conditionne aussi l'ordre d'affichage dans la vue
 * synthétique (regroupée par catégorie).
 */
export const LABEL_CATEGORIE_EQUIPEMENT: Record<CategorieEquipement, string> = {
  INSTALLATION_ELECTRIQUE: "Installation électrique",
  EXTINCTEUR: "Extincteurs",
  RIA: "Robinets d'incendie armés (RIA)",
  BAES: "Éclairage de sécurité (BAES)",
  ALARME_INCENDIE: "Alarme incendie / SSI",
  DESENFUMAGE: "Désenfumage",
  VMC: "Ventilation (VMC)",
  CTA: "Centrale de traitement d'air (CTA)",
  HOTTE_PRO: "Hotte professionnelle",
  APPAREIL_CUISSON_ERP: "Appareil de cuisson ERP",
  ASCENSEUR: "Ascenseur",
  PORTE_AUTO: "Porte automatique",
  PORTAIL_AUTO: "Portail automatique",
  EQUIPEMENT_SOUS_PRESSION: "Équipement sous pression",
  STOCKAGE_MATIERE_DANGEREUSE: "Stockage de matières dangereuses",
  EQUIPEMENT_LEVAGE: "Équipement de levage",
  INSTALLATION_FRIGORIFIQUE: "Installation frigorifique",
  // Le mot « motorisé » n'est pas une précision de confort : il est la moitié
  // du champ d'application. Le proviso du I de l'article 1er de l'arrêté du
  // 5 mars 1993 exclut les équipements mus par la force humaine employée
  // directement, et la vérification qui s'attache à cette catégorie est
  // TRIMESTRIELLE. Sans lui, le commerçant qui possède une presse à levier la
  // déclare et se voit réclamer quatre rendez-vous par an qu'il ne doit pas.
  COMPACTEUR_PRESSE_DECHETS_MOTORISE:
    "Compacteur à déchets ou presse à cartons (motorisé)",
  EPI: "Équipement de protection individuelle",
  AUTRE: "Autre équipement",
};

export const DESCRIPTION_CATEGORIE: Partial<Record<CategorieEquipement, string>> = {
  INSTALLATION_ELECTRIQUE:
    "Tableau général, circuits terminaux, éventuel groupe électrogène de sécurité.",
  EXTINCTEUR:
    "Extincteurs portatifs (eau, CO₂, poudre) et mobiles. Vérification annuelle obligatoire.",
  RIA:
    "Robinets d'incendie armés : tuyau sur dévidoir, raccordé en permanence à l'eau, en coffret mural. Installation fixe (arrêté du 25 juin 1980, art. MS 14 à MS 17), vérifiée au moins une fois par an en ERP (MS 73 § 2).",
  BAES:
    "Blocs autonomes d'éclairage de sécurité qui s'allument en cas de coupure.",
  ALARME_INCENDIE:
    "Détection, alarme, centrale SSI. Obligatoire selon effectif et typologie.",
  DESENFUMAGE:
    "Dispositifs d'évacuation naturelle ou mécanique des fumées (DENFC, volets).",
  VMC:
    "Ventilation mécanique contrôlée. Locaux à pollution spécifique à déclarer.",
  CTA: "Centrale de traitement d'air avec filtration et conditionnement.",
  HOTTE_PRO:
    "Hotte au-dessus d'appareils de cuisson en cuisine professionnelle.",
  APPAREIL_CUISSON_ERP:
    "Fourneau, friteuse, grill, four… situés en cuisine d'un ERP (art. GC).",
  ASCENSEUR: "Ascenseur électrique ou hydraulique. Contrôle technique quinquennal.",
  PORTE_AUTO: "Porte motorisée piétonne (entrée automatique).",
  PORTAIL_AUTO: "Portail motorisé de véhicule.",
  EQUIPEMENT_SOUS_PRESSION:
    "Compresseurs, chaudières, réservoirs d'air comprimé.",
  STOCKAGE_MATIERE_DANGEREUSE:
    "Liquides inflammables, gaz, produits chimiques en quantité significative.",
  EQUIPEMENT_LEVAGE:
    "Palan, transpalette électrique, monte-charge, hayon élévateur.",
  INSTALLATION_FRIGORIFIQUE:
    "Chambre froide, vitrine ou meuble réfrigéré, groupe froid. Contrôle d'étanchéité du fluide frigorigène.",
  // L'aide dit ce que la catégorie couvre ET ce qu'elle ne couvre pas. Les
  // trois exclusions ne sont pas décoratives : ce sont les trois confusions
  // que le dépouillement de l'arrêté a relevées — la benne du collecteur, le
  // local à poubelles, et la presse actionnée au bras.
  COMPACTEUR_PRESSE_DECHETS_MOTORISE:
    "La machine du local à déchets ou du quai de livraison dans laquelle on charge à la main cartons, films plastiques ou déchets pour les tasser ou les mettre en balles : compacteur-presse à cartons, presse à balles, compacteur à déchets. Ni le local à poubelles lui-même, ni la benne du camion de collecte, ni une presse actionnée à la seule force du bras.",
  // On nomme des objets, pas la notion : « EPI » ne se reconnaît pas dans un
  // sélecteur, un harnais si. Les trois exemples cités sont ceux de la
  // question déjà posée sur la fiche établissement, pour que le dirigeant
  // retrouve d'un écran à l'autre le mot qu'il a lu.
  EPI: "Ce qu'une personne porte pour se protéger : harnais antichute et sa longe, casque, gants, chaussures de sécurité, protections auditives, masque. Pas les protections collectives — garde-corps, filet, capot de machine —, qui appartiennent à l'ouvrage ou à la machine qu'elles protègent.",
  AUTRE: "Autre équipement soumis à vérification périodique.",
};
