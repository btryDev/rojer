import {
  CATEGORIES_EQUIPEMENT,
  type CategorieEquipement,
} from "@/lib/referentiels/types-communs";

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
  EPI_ANTICHUTE: "Harnais antichute et systèmes d'arrêt de chute",
  EPI_RESPIRATOIRE: "Appareil de protection respiratoire",
  EPI_GILET_SAUVETAGE: "Gilet de sauvetage gonflable",
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
  // « pour appareils de protection respiratoire », sans autre qualification :
  // le texte ne réserve PAS les cartouches aux deux familles ci-dessus. Une
  // première rédaction écrivait « qui les alimentent », ce qui excluait un
  // stock de cartouches antigaz servant un demi-masque à cartouches — produit
  // d'entretien, chlore, peinture —, pourtant dans le champ par la lettre.
  // L'exclusion du masque JETABLE reste juste : sans cartouche, il n'y a rien
  // à vérifier.
  EPI_RESPIRATOIRE:
    "L'appareil respiratoire isolant autonome d'évacuation, l'équipement complet d'intervention en milieu hostile, et tout stock de cartouches filtrantes antigaz pour appareil respiratoire — y compris celles d'un demi-masque à cartouches. Vérification par une personne qualifiée tous les douze mois, en service comme en stock. Pas le masque de confort ni le masque jetable sans cartouche, qui ne se vérifient pas.",
  EPI_GILET_SAUVETAGE:
    "Le gilet de sauvetage GONFLABLE — celui dont la cartouche et le déclencheur doivent fonctionner le jour venu. Vérification par une personne qualifiée tous les douze mois. Le gilet en mousse, qui ne se gonfle pas, n'en relève pas.",
  // « SYSTÈMES de protection individuelle contre les chutes de hauteur », dit
  // l'arrêté — un genre plus large que l'arrêt de chute. La retenue et le
  // maintien au travail, qui EMPÊCHENT la chute au lieu de l'arrêter, en sont.
  // Une première rédaction n'énumérait que l'arrêt, et rétrécissait l'assiette.
  //
  // L'exclusion du point d'ancrage tient, et elle est fondée par l'arrêté
  // lui-même : son article 2 borne la vérification de cette famille à « l'état
  // général des coutures et des modes de fixation » — des pièces textiles
  // portées, pas un ancrage de bâtiment. Mais on ne dit plus qu'il « se déclare
  // ailleurs » : aucune catégorie ne l'accueille aujourd'hui, et l'annoncer
  // enverrait le dirigeant chercher une case qui n'existe pas.
  EPI_ANTICHUTE:
    "Ce qu'une personne porte pour ne pas chuter de hauteur : le harnais et sa longe, l'antichute mobile ou à rappel automatique, le connecteur, mais aussi les systèmes de retenue et de maintien au travail, qui empêchent la chute au lieu de l'arrêter. Une vérification par une personne qualifiée est due tous les douze mois — en service comme en stock. Le point d'ancrage scellé dans le bâtiment n'en fait pas partie : l'arrêté borne cette vérification aux coutures et aux modes de fixation de l'équipement porté.",
  // LE HARNAIS A ÉTÉ RETIRÉ DE CETTE DESCRIPTION LE 2026-09-04, et c'est une
  // correction, pas un ajustement de style. Il en était le PREMIER exemple, et
  // cette catégorie ne porte aucune obligation : un dirigeant qui lisait le
  // sélecteur y déclarait son harnais sans faute de sa part, et le produit ne
  // lui réclamait jamais les douze mois. Une sur-application se voit ; une
  // sous-application de cette forme-là ne se voit par personne.
  //
  // La description renvoie donc explicitement vers les catégories vérifiables,
  // et n'énumère plus que ce qui reste vraiment ici.
  EPI: "Ce qu'une personne porte pour se protéger et qu'aucun texte ne soumet à vérification périodique : casque, gants, chaussures de sécurité, lunettes, protections auditives, masque de confort. Un harnais antichute, un appareil respiratoire ou un gilet de sauvetage gonflable ne se déclarent PAS ici — ils ont leur propre catégorie, parce qu'ils se vérifient tous les douze mois. Pas non plus les protections collectives — garde-corps, filet, capot de machine —, qui appartiennent à l'ouvrage ou à la machine qu'elles protègent.",
  AUTRE: "Autre équipement soumis à vérification périodique.",
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ORDRE DES CATÉGORIES SE LIT ICI, PAS EN BASE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT (relevé le 2026-09-04). Quatre requêtes triaient par
 * `orderBy: { categorie: "asc" }`. Sur une colonne d'énumération, PostgreSQL ne
 * trie pas par ordre alphabétique : il trie **dans l'ordre de l'enum**. Et cet
 * ordre-là n'est pas celui de `CATEGORIES_EQUIPEMENT` — la migration du
 * 2026-08-25 a ajouté `RIA` avec un `ADD VALUE` sans `BEFORE 'AUTRE'`, donc en
 * DERNIER. Les robinets d'incendie armés se rangeaient après « Autre
 * équipement » dans le parc, dans le registre de sécurité et dans le serveur
 * MCP, quand le code les place en troisième position.
 *
 * PERSONNE NE POUVAIT LE VOIR EN LISANT LE CODE : `orderBy: { categorie: "asc" }`
 * se lit comme un tri par catégorie, et il en est un — dans un ordre qui vit
 * ailleurs.
 *
 * TROIS COMMENTAIRES DE MIGRATION AFFIRMENT LE CONTRAIRE, ET ILS ONT TORT —
 * `20260821090000_categorie_installation_frigorifique`,
 * `20260902120000_categorie_compacteur_presse_dechets` et
 * `20260904120000_categorie_epi` écrivent que « l'ordre de l'enum gouverne
 * l'ordre d'affichage du sélecteur ». Le sélecteur parcourt
 * `CATEGORIES_EQUIPEMENT` (`EquipementForm`), pas l'enum. La croyance était
 * plausible et elle a coûté cher : elle envoyait chercher le symptôme dans un
 * formulaire où il n'était pas, pendant qu'il était dans trois listes.
 *
 * Ces trois fichiers ne sont pas corrigés, et c'est délibéré : une migration
 * appliquée porte son empreinte en base, la retoucher ferait échouer le
 * déploiement suivant. L'histoire ne se réécrit pas — la correction vit ici,
 * à l'endroit qui gouverne.
 *
 * POURQUOI CE N'EST PAS UNE MIGRATION QUI RÉPARE ÇA. Remettre `RIA` à sa place
 * dans l'enum PostgreSQL réalignerait deux copies une fois, et laisserait la
 * prochaine valeur ajoutée les désaligner de nouveau — en silence, puisque rien
 * ne les compare. L'ordre n'a qu'une source, et c'est la liste TypeScript ; la
 * base n'a plus à l'exprimer. Le tri se fait donc APRÈS la lecture, sur
 * `ordreCategorie`, et l'ordre de l'enum en base devient sans effet.
 */
export function ordreCategorie(c: CategorieEquipement): number {
  return CATEGORIES_EQUIPEMENT.indexOf(c);
}

/**
 * Trie une liste d'équipements par catégorie, en conservant l'ordre déjà
 * obtenu à l'intérieur d'une même catégorie.
 *
 * `Array.prototype.sort` est stable depuis ES2019 : le second critère reste
 * donc celui que la requête a demandé — date de création, libellé —, il n'a pas
 * à être répété ici.
 */
export function trierParCategorie<T extends { categorie: CategorieEquipement }>(
  liste: T[],
): T[] {
  return [...liste].sort((a, b) => ordreCategorie(a.categorie) - ordreCategorie(b.categorie));
}
