// Le catalogue des fiches d'un registre de sécurité incendie.
//
// Ce module est une **table**, pas une logique : il énumère les fiches qu'un
// registre peut contenir, dans l'ordre du document, avec leur partie et leur
// déclencheur. C'est `composition.ts` qui décide lesquelles sont dues pour un
// établissement donné.
//
// La structure en 5 parties reprend celle des registres du commerce. Voir
// l'ADR-021 pour ce qui, là-dedans, est opposable et ce qui est convention.
//
// Module **pur** : ni Prisma, ni React.

import type { TypologieApplication } from "@/lib/referentiels/types-communs";

/** Les cinq parties, dans l'ordre du document. */
export const PARTIES_REGISTRE = [
  { id: "1", titre: "Organisation" },
  { id: "1.1", titre: "Exercices périodiques de sécurité incendie" },
  { id: "2.1", titre: "Matériel d'intervention" },
  { id: "2.2", titre: "Installations ou dispositifs" },
  { id: "3.1", titre: "Vérifications des moyens d'extinction et de protection" },
  { id: "3.2", titre: "Vérifications des installations ou dispositifs" },
  { id: "3.3", titre: "Vérifications des constructions" },
  { id: "3.4", titre: "Contrôles administratifs" },
  { id: "4", titre: "Événements" },
  { id: "5", titre: "Annexes" },
] as const;

export type PartieRegistre = (typeof PARTIES_REGISTRE)[number]["id"];

/**
 * Ce qui fait qu'une fiche est due — deux moteurs distincts, et c'est la
 * décision centrale de l'ADR-021 :
 *
 * - `typologies` : la fiche dépend du régime de l'établissement et de ses
 *   seuils. Une fiche « Équipe professionnelle de sécurité incendie » n'a
 *   aucun sens dans un bureau de huit personnes.
 * - `categoriesEquipement` : la fiche dépend de la **présence** d'un
 *   équipement de la catégorie visée, indépendamment du régime. Un ERP sans
 *   colonne sèche n'a pas de fiche colonne sèche. C'est le même déclencheur
 *   que le calendrier.
 *
 * Les deux champs absents = fiche due dans tous les cas. Les deux présents =
 * lus en ET.
 *
 * On réutilise `TypologieApplication` du référentiel plutôt qu'un vocabulaire
 * propre : c'est le même problème (« à qui cette ligne s'applique-t-elle ? »),
 * déjà résolu, déjà testé, et il sait exprimer ce qu'une union de régimes ne
 * saurait pas — la restriction par catégorie d'ERP, l'exclusion par `false`,
 * et le champ de R. 4227-34 par `personnesPresentesMin` + `champR422734`.
 * Comme dans le référentiel, le seuil chiffré reste ici et la logique reste
 * dans le moteur.
 */
export type SectionRegistre = {
  id: string;
  partie: PartieRegistre;
  /** Le titre porté par la fiche, tel qu'il s'imprime en en-tête. */
  titre: string;
  /**
   * Un tableau se lit en **OU** : la fiche est due dès qu'une des typologies
   * matche. C'est le cas d'une fiche à deux fondements indépendants — les
   * exercices sont dus côté travail par le champ de R. 4227-34, et côté ERP
   * par le 5° de R. 143-44, sans que l'un implique l'autre. Une typologie
   * unique ne saurait pas l'exprimer : le moteur lit les régimes en OU mais
   * les seuils en ET, si bien que `{ travail: true, erp: true,
   * personnesPresentesMin: 51 }` imposerait le seuil aussi aux ERP.
   */
  typologies?: TypologieApplication | readonly TypologieApplication[];
  /**
   * ⚠ Typé `readonly string[]` et non `CategorieEquipement[]` : le registre
   * attend sept catégories qui n'existent pas encore dans l'enum (marquées
   * « à créer » ci-dessous). Ce relâchement est **provisoire et assumé**, le
   * temps du lot d'inventaire. Une fois les catégories ajoutées, resserrer le
   * type — le compilateur signalera alors toute fiche orpheline, ce qui est
   * précisément le garde-fou voulu.
   */
  categoriesEquipement?: readonly string[];
  /**
   * Ce que la fiche attend, en une phrase — sert d'état vide à l'écran comme
   * au PDF. Une fiche due mais non renseignée doit dire ce qu'on attend d'elle,
   * pas rester blanche.
   */
  attendu: string;
};

/**
 * Catalogue des fiches, dans l'ordre du document.

 */
export const SECTIONS_REGISTRE: readonly SectionRegistre[] = [
  // -- Partie 1 — Organisation ---------------------------------------------
  {
    id: "renseignements-generaux",
    partie: "1",
    titre: "Renseignements généraux",
    attendu: "Raison sociale, adresse, nature de l'activité, siège social.",
  },
  {
    id: "renseignements-erp",
    partie: "1",
    titre: "Établissement recevant du public",
    typologies: { erp: true },
    attendu:
      "Type et catégorie, effectif du public admis, date d'autorisation d'ouverture, certificat de conformité.",
  },
  {
    id: "telephones-utiles",
    partie: "1",
    titre: "Téléphones utiles",
    attendu:
      "Numéros à composer en urgence : secours, sécurité civile, centres spécialisés.",
  },
  // Le registre imprimé fait deux feuilles de ce qu'on appelait une seule
  // fiche : les numéros qu'on compose dans l'urgence d'un côté, les services
  // et intervenants qu'on rappelle ensuite de l'autre — ces derniers avec
  // leur adresse, parce qu'on y envoie quelqu'un. Les fondre en une seule
  // liste de numéros perdait la moitié des lignes et toute la colonne
  // « adresse » que le titre annonçait pourtant.
  {
    id: "services-adresses-utiles",
    partie: "1",
    titre: "Services, intervenants et adresses utiles",
    attendu:
      "Mairie, préfecture, médecin, inspection du travail, installateurs et organismes chargés des vérifications — adresse et téléphone.",
  },
  // Le service de sécurité incendie au sens des articles MS 45 à MS 52 (poste
  // de sécurité, agents qualifiés SSIAP, chef d'équipe) relève du **Livre II**
  // du règlement de sécurité — « Dispositions applicables aux établissements
  // des quatre premières catégories ». Or PE 1 § 1 dispose que « les
  // dispositions du livre II ne sont pas applicables sauf celles relevant
  // d'articles expressément mentionnés dans la suite du présent livre », et
  // aucun article des règles PE ne renvoie au chapitre MS sur ce point.
  //
  // Ces deux fiches sont donc réservées aux 1ʳᵉ à 4ᵉ catégories. En 5ᵉ, c'est
  // la fiche allégée ci-dessous qui s'applique : R. 143-44 2° impose l'état
  // nominatif des personnes du service de sécurité à **tous** les ERP, mais
  // sans imposer d'en constituer un au sens de MS 46.
  //
  // Résidu de vérification assumé : PE 1 à PE 4 ont été relus (aucun renvoi
  // MS). Les chapitres suivants du Livre III (PE 5 et s., et les dispositions
  // particulières par type) n'ont pas été relus article par article. Un renvoi
  // exprès qui y subsisterait rétablirait la fiche pour le type concerné.
  {
    id: "service-securite-encadrement",
    partie: "1",
    titre: "Service de sécurité — personnel d'encadrement",
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    attendu:
      "Direction, chef du service de sécurité incendie et adjoint : nom, téléphone.",
  },
  {
    id: "service-securite-equipe",
    partie: "1",
    titre: "Service de sécurité — équipe professionnelle",
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    attendu:
      "Chefs d'équipe et agents : nom, certificat d'aptitude, date et organisme de délivrance.",
  },
  {
    id: "service-securite-personnes-designees",
    partie: "1",
    titre: "Personnes désignées pour la sécurité incendie",
    typologies: { erp: { categories: ["N5"] } },
    attendu:
      "Nom, fonction et téléphone des personnes désignées par l'exploitant pour mettre en œuvre les moyens de secours et diriger l'évacuation.",
  },
  {
    id: "service-securite-evacuation",
    partie: "1",
    titre: "Équipes locales d'évacuation",
    typologies: { travail: true, personnesPresentesMin: 51, champR422734: true },
    attendu: "Guides-files et serre-files : nom et secteur.",
  },
  {
    id: "service-securite-surveillance",
    partie: "1",
    titre: "Personnel de surveillance",
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    attendu: "État nominatif des agents de surveillance.",
  },

  // -- Partie 1.1 — Exercices ----------------------------------------------
  {
    // Deux fondements indépendants, d'où le OU : côté travail, R. 4227-39 par
    // le champ de R. 4227-34 (seuil de personnes présentes ou matières
    // R. 4227-22) ; côté ERP, le 5° de R. 143-44 — « Les dates des exercices
    // de sécurité incendie » — créé par le décret 2025-1100 et en vigueur
    // depuis le 1ᵉʳ juillet 2026, sans condition de catégorie. Sans la
    // seconde branche, un ERP de 5ᵉ catégorie de vingt personnes échappait
    // silencieusement à la fiche.
    id: "exercices-themes",
    partie: "1.1",
    titre: "Thèmes des exercices périodiques de sécurité",
    typologies: [
      { travail: true, personnesPresentesMin: 51, champR422734: true },
      { erp: true },
    ],
    attendu:
      "Date, nombre de participants et thèmes abordés à chaque exercice.",
  },
  {
    id: "exercices-comptes-rendus",
    partie: "1.1",
    titre: "Comptes-rendus des exercices périodiques de sécurité",
    typologies: [
      { travail: true, personnesPresentesMin: 51, champR422734: true },
      { erp: true },
    ],
    attendu:
      "Date, heure, nombre de participants, compte-rendu succinct et visas.",
  },

  // -- Partie 2.1 — Matériel d'intervention --------------------------------
  {
    id: "inv-extinction-automatique",
    partie: "2.1",
    titre: "Extincteurs automatiques",
    categoriesEquipement: ["EXTINCTION_AUTOMATIQUE"], // à créer
    attendu:
      "Produit extincteur, marque, nombre de postes, mode de fonctionnement, locaux surveillés.",
  },
  {
    id: "inv-extincteurs",
    partie: "2.1",
    titre: "Extincteurs mobiles",
    categoriesEquipement: ["EXTINCTEUR"],
    attendu:
      "Numéro, portatif ou sur roues, nature du produit, capacité, date de mise en service, marque, emplacement.",
  },
  {
    id: "inv-ria",
    partie: "2.1",
    titre: "Robinets d'incendie armés et prolongateurs",
    categoriesEquipement: ["RIA"],
    attendu:
      "Numéro, diamètre nominal, longueur et nature du tuyau, type de lance, emplacement.",
  },
  {
    id: "inv-materiels-divers",
    partie: "2.1",
    titre: "Matériels divers",
    categoriesEquipement: ["ARI"], // à créer
    attendu:
      "Appareils respiratoires isolants, motopompes et accessoires, brancards.",
  },
  {
    id: "inv-ressources-eau",
    partie: "2.1",
    titre: "Ressources en eau utilisables en cas d'incendie",
    categoriesEquipement: ["RESSOURCE_EAU"], // à créer
    attendu:
      "Poteaux et bouches d'incendie normalisés, réserves : numéro, diamètres, emplacement.",
  },
  {
    id: "inv-colonnes-seches",
    partie: "2.1",
    titre: "Colonnes sèches",
    categoriesEquipement: ["COLONNE_SECHE"], // à créer
    attendu: "Numéro, diamètre, emplacement.",
  },
  {
    id: "inv-colonnes-humides",
    partie: "2.1",
    titre: "Colonnes humides",
    categoriesEquipement: ["COLONNE_HUMIDE"], // à créer
    attendu: "Numéro, diamètre, emplacement.",
  },

  // -- Partie 2.2 — Installations ou dispositifs ---------------------------
  {
    id: "inv-detection",
    partie: "2.2",
    titre: "Détection automatique",
    categoriesEquipement: ["ALARME_INCENDIE"],
    attendu: "Type, marque, zones, nombre de détecteurs, locaux surveillés.",
  },
  {
    id: "inv-alarme",
    partie: "2.2",
    titre: "Dispositifs d'alarme",
    categoriesEquipement: ["ALARME_INCENDIE"],
    attendu: "Type, marque, boîtiers de commande, diffuseurs.",
  },
  {
    id: "inv-eclairage-securite",
    partie: "2.2",
    titre: "Éclairage de sécurité",
    categoriesEquipement: ["BAES"],
    attendu: "Type, marque, emplacement.",
  },
  {
    id: "inv-portes-coupe-feu",
    partie: "2.2",
    titre: "Portes coupe-feu",
    categoriesEquipement: ["PORTE_COUPE_FEU"], // à créer
    attendu:
      "Numéro, type (pivotante, coulissante, autre), date d'installation, marque, emplacement.",
  },
  {
    id: "inv-volets-clapets",
    partie: "2.2",
    titre: "Volets et clapets coupe-feu",
    categoriesEquipement: ["CLAPET_COUPE_FEU"], // à créer
    attendu: "Numéro, marque, date d'installation, emplacement.",
  },
  {
    id: "inv-exutoires",
    partie: "2.2",
    titre: "Exutoires de fumées",
    categoriesEquipement: ["DESENFUMAGE"],
    attendu:
      "Numéro, marque, mode de déclenchement, emplacement de l'exutoire et de la commande manuelle.",
  },
  {
    id: "inv-installations-electriques",
    partie: "2.2",
    titre: "Installations électriques",
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    attendu:
      "Désignation, marque, type, puissance, diélectrique, emplacement, observations.",
  },

  // -- Partie 3.1 — Vérifications des moyens d'extinction ------------------
  // ~~« Vérificateur agréé »~~ sur les dix-huit fiches de vérification — rayé
  // le 2026-09-26 : ni R. 4226-16 ni R. 4227-39 ne disent « agréé », et le
  // mot promettait au lecteur un agrément que la fiche ne vérifie pas.
  // Chaque fiche de vérification est le miroir d'une fiche d'inventaire : même
  // déclencheur, même famille. C'est ce qui permet au PDF de classer les
  // rapports archivés par catégorie d'équipement sans donnée nouvelle.
  {
    id: "verif-extinction-automatique",
    partie: "3.1",
    titre: "Extincteurs automatiques",
    categoriesEquipement: ["EXTINCTION_AUTOMATIQUE"], // à créer
    attendu: "Vérificateur, date, type d'installation, observations, visa.",
  },
  {
    id: "verif-extincteurs",
    partie: "3.1",
    titre: "Extincteurs mobiles",
    categoriesEquipement: ["EXTINCTEUR"],
    attendu: "Vérificateur, date, nombre d'appareils vérifiés, observations, visa.",
  },
  {
    id: "verif-ria",
    partie: "3.1",
    titre: "Robinets d'incendie armés et prolongateurs",
    categoriesEquipement: ["RIA"],
    attendu: "Vérificateur, date, nombre de postes vérifiés, observations, visa.",
  },
  {
    id: "verif-ari",
    partie: "3.1",
    titre: "Appareils respiratoires isolants",
    categoriesEquipement: ["ARI"], // à créer
    attendu: "Vérificateur, désignation, date de vérification, observations, visa.",
  },
  {
    id: "verif-ressources-eau",
    partie: "3.1",
    titre: "Ressources en eau utilisables en cas d'incendie",
    categoriesEquipement: ["RESSOURCE_EAU"], // à créer
    attendu: "Vérificateur, date, numéro d'appareil, observations, visa.",
  },
  {
    id: "verif-colonnes-seches",
    partie: "3.1",
    titre: "Colonnes sèches",
    categoriesEquipement: ["COLONNE_SECHE"], // à créer
    attendu: "Vérificateur, date d'épreuve, état apparent et des accessoires, visa.",
  },
  {
    id: "verif-colonnes-humides",
    partie: "3.1",
    titre: "Colonnes humides",
    categoriesEquipement: ["COLONNE_HUMIDE"], // à créer
    attendu: "Vérificateur, date d'épreuve, dispositif d'alimentation, état, visa.",
  },

  // -- Partie 3.2 — Vérifications des installations ou dispositifs ---------
  {
    id: "verif-detection",
    partie: "3.2",
    titre: "Détection automatique",
    categoriesEquipement: ["ALARME_INCENDIE"],
    attendu: "Vérificateur, date, zones et détecteurs, renvoi au rapport, visa.",
  },
  {
    id: "verif-alarme",
    partie: "3.2",
    titre: "Dispositifs d'alarme",
    categoriesEquipement: ["ALARME_INCENDIE"],
    attendu: "Vérificateur, date, observations, visa.",
  },
  {
    id: "verif-eclairage-securite",
    partie: "3.2",
    titre: "Éclairage de sécurité",
    categoriesEquipement: ["BAES"],
    attendu: "Vérificateur, type d'installation, date, observations, visa.",
  },
  {
    id: "verif-portes-coupe-feu",
    partie: "3.2",
    titre: "Portes coupe-feu",
    categoriesEquipement: ["PORTE_COUPE_FEU"], // à créer
    attendu: "Vérificateur, date, nombre de portes vérifiées, renvoi au rapport, visa.",
  },
  {
    id: "verif-volets-clapets",
    partie: "3.2",
    titre: "Volets et clapets coupe-feu",
    categoriesEquipement: ["CLAPET_COUPE_FEU"], // à créer
    attendu: "Vérificateur, date, désignation, nombre vérifié, renvoi au rapport, visa.",
  },
  {
    id: "verif-exutoires",
    partie: "3.2",
    titre: "Exutoires de fumées",
    categoriesEquipement: ["DESENFUMAGE"],
    attendu: "Vérificateur, date, nature des vérifications, observations, visa.",
  },
  {
    id: "verif-installations-electriques",
    partie: "3.2",
    titre: "Installations électriques",
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    attendu: "Vérificateur, date, nature des vérifications, observations, visa.",
  },
  {
    id: "verif-ascenseurs",
    partie: "3.2",
    titre: "Ascenseurs, montes-charges et appareils de levage",
    categoriesEquipement: ["ASCENSEUR", "EQUIPEMENT_LEVAGE"],
    attendu: "Vérificateur, date, type de vérification, type et emplacement, visa.",
  },
  {
    id: "verif-chauffage-gaz-ventilation",
    partie: "3.2",
    titre: "Chauffage - Gaz - Ventilation - Désenfumage",
    categoriesEquipement: ["VMC", "CTA", "HOTTE_PRO", "APPAREIL_CUISSON_ERP"],
    attendu: "Vérificateur, date, observations, visa.",
  },
  {
    id: "verif-paratonnerres",
    partie: "3.2",
    titre: "Paratonnerres",
    categoriesEquipement: ["PARATONNERRE"], // à créer
    attendu: "Vérificateur, date, type et emplacement, observations, visa.",
  },

  // -- Partie 3.3 — Vérifications des constructions ------------------------
  {
    id: "verif-dispositions-constructives",
    partie: "3.3",
    titre: "Dispositions constructives",
    typologies: { erp: true },
    attendu: "Vérificateur, date, observations, visa.",
  },
  {
    id: "verif-depoussierage",
    partie: "3.3",
    titre: "Dépoussiérage - Nettoyage",
    typologies: { erp: true },
    attendu:
      "Date, société de nettoyage, éléments traités (murs, plafonds, sièges, tentures, filtres), observations, visa.",
  },
  {
    id: "verif-essais-feu",
    partie: "3.3",
    titre: "Essais de réaction et de résistance au feu",
    typologies: { erp: true },
    attendu:
      "Date, matériaux vérifiés, laboratoire agréé, classement, numéro de procès-verbal, visa.",
  },

  // -- Partie 3.4 — Contrôles administratifs -------------------------------
  {
    id: "controle-commission",
    partie: "3.4",
    titre: "Contrôle des commissions de sécurité",
    typologies: { erp: true },
    attendu: "Date, représentant, observations, visa.",
  },
  {
    id: "controle-administration",
    partie: "3.4",
    titre: "Contrôle de l'administration",
    attendu: "Date, représentant, observations, visa.",
  },
  {
    id: "controle-autres",
    partie: "3.4",
    titre: "Autres contrôles",
    attendu: "Date, autorité représentée, observations, visa.",
  },

  // -- Partie 4 — Événements -----------------------------------------------
  {
    id: "evenements",
    partie: "4",
    titre: "Comptes rendus d'incendie ou de début d'incendie",
    attendu:
      "Date, heure, circonstances, matériels utilisés. Y figurent aussi les travaux et les modifications importantes.",
  },

  // -- Partie 5 — Annexes --------------------------------------------------
  {
    id: "annexes",
    partie: "5",
    titre: "Annexes",
    attendu:
      "Plans d'évacuation, procès-verbaux, notices et pièces jointes libres.",
  },
] as const;
