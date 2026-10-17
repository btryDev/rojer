import {
  CATEGORIES_EQUIPEMENT,
  type CategorieEquipement,
} from "@/lib/referentiels/types-communs";
import { nonPorte, porte } from "@/lib/perimetre/non-couverture";

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
  // 2026-10-07 : ~~« Alarme incendie / SSI »~~ — libellé demandé par le
  // préventeur (relecture du 2026-10-05). L'enum ne change pas.
  ALARME_INCENDIE: "SSI et équipement d'alarme incendie",
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
  // 2026-10-14, décision de la propriétaire : pas « chaudière » — GZ 15 vise
  // l'installation entière, dont une chaudière n'est qu'un appareil.
  INSTALLATION_GAZ: "Installation de gaz (chauffage, stockage…)",
  // 2026-10-15, décision de la propriétaire.
  DEFIBRILLATEUR: "Défibrillateur (DAE)",
  AUTRE: "Autre équipement",
};

/**
 * La formation au port des EPI (code du travail, art. R. 4323-106), dite dans
 * l'aide des QUATRE catégories d'EPI — décision de c6 du 2026-10-17, sous-lot B
 * du plan « mise à jour du référentiel ». Elle était annoncée sur la page « Ce
 * que Rojer ne couvre pas » (`manques-annonces.ts`) ; elle y est retirée,
 * DÉPLACÉE ici, pas dupliquée : là où le dirigeant déclare l'équipement, il lit
 * ce que Rojer ne suit pas pour lui (ligne de partage 6). Une seule rédaction ;
 * le `declareA` de l'article cite la phrase mot pour mot.
 */
export const PHRASE_FORMATION_EPI = `Rojer ne suit pas ${nonPorte("la formation au port des équipements de protection individuelle")} : le texte la renouvelle aussi souvent que nécessaire, sans fixer de durée (code du travail, art. R. 4323-106).`;

/**
 * Le plan schématique des chaudières et des générateurs d'air chaud
 * (art. CH 23 § 3 et CH 24 § 5 du règlement de sécurité), un état permanent
 * que Rojer annonce sans le suivre — décision de la propriétaire du 2026-10-17
 * (plan, § 11, Q3), dite au sous-lot B dans l'aide « Installation de gaz » et
 * dans l'entrée « Chaudière » des matériels non couverts. Une seule rédaction.
 */
export const PHRASE_PLAN_SCHEMATIQUE_CHAUFFAGE = `En établissement recevant du public des quatre premières catégories, Rojer ne suit pas non plus ${nonPorte("le plan schématique de l'installation, affiché en permanence et visiblement à proximité des chaudières et des générateurs d'air chaud à combustion")} (règlement de sécurité, art. CH 23 § 3 et CH 24 § 5).`;

export const DESCRIPTION_CATEGORIE: Partial<Record<CategorieEquipement, string>> = {
  INSTALLATION_ELECTRIQUE:
    "Tableau général, circuits terminaux, éventuel groupe électrogène de sécurité.",
  EXTINCTEUR:
    "Extincteurs portatifs (eau, CO₂, poudre) et mobiles.",
  RIA:
    "Robinets d'incendie armés : tuyau sur dévidoir, raccordé en permanence à l'eau, en coffret mural. Installation fixe (arrêté du 25 juin 1980, art. MS 14 à MS 17), vérifiée au moins une fois par an en ERP (MS 73 § 2).",
  BAES:
    "Blocs autonomes d'éclairage de sécurité qui s'allument en cas de coupure.",
  ALARME_INCENDIE:
    "Détection, alarme, centrale SSI.",
  DESENFUMAGE:
    "Dispositifs d'évacuation naturelle ou mécanique des fumées (DENFC, volets).",
  VMC:
    "Ventilation mécanique contrôlée. Locaux à pollution spécifique à déclarer.",
  CTA: "Centrale de traitement d'air avec filtration et conditionnement.",
  HOTTE_PRO:
    "Hotte au-dessus d'appareils de cuisson en cuisine professionnelle.",
  APPAREIL_CUISSON_ERP:
    "Fourneau, friteuse, grill, four… situés en cuisine d'un ERP (art. GC).",
  // 2026-10-17, sous-lot B du plan « mise à jour du référentiel ». La seconde
  // phrase est l'ADRESSE de AS 5 (consignes des ascenseurs d'évacuation,
  // décision du plan, § 3) : son `declareA` la cite mot pour mot. Les pancartes
  // d'arrêt de AS 11 y sont annoncées aussi ; AS 11 reste `obligation_manquante`
  // au corpus, pour le registre technique que le sous-lot C rattache à
  // `ascenseur-carnet-entretien`. Le titre Ier du livre II ne vise que les
  // quatre premières catégories : la phrase le dit.
  ASCENSEUR: `Ascenseur électrique ou hydraulique. Contrôle technique quinquennal. En établissement recevant du public des quatre premières catégories, Rojer ne suit pas ${nonPorte("les consignes établies et affichées à chaque niveau sur l'utilisation des ascenseurs destinés à l'évacuation des personnes en situation de handicap et de leurs locaux d'attente")} (règlement de sécurité, art. AS 5), ni ${nonPorte("les pancartes et la signalisation qui portent à la connaissance du public l'arrêt d'un appareil dont un défaut compromet la sécurité")} (art. AS 11).`,
  PORTE_AUTO: "Porte motorisée piétonne (entrée automatique).",
  // 2026-10-17, décision de c6 sur le sous-lot B : le rideau métallique motorisé
  // et la barrière levante se déclarent ici. L'arrêté du 21 décembre 1993 dit à
  // son article 1er que « les portes ou portails automatiques et
  // semi-automatiques sont des fermetures automatiques et semi-automatiques »,
  // et son annexe renvoie la définition de ces termes à la norme NF P 25-362
  // (« Fermetures pour baies libres et portails »), que le dépôt n'a PAS lue.
  // Lecture retenue : « fermeture », au sens courant de fermeture d'une baie ou
  // d'un passage — un rideau de devanture motorisé et une barrière levante en
  // sont. À confirmer avec le préventeur à la prochaine relecture. Le seul
  // « Portail motorisé de véhicule » laissait croire le rideau de devanture
  // dehors : la phrase s'élargit, sans dire du rideau plus que l'arrêté.
  PORTAIL_AUTO: "Portail motorisé de véhicule. Le rideau métallique motorisé d'une devanture et la barrière levante, autres fermetures automatiques ou semi-automatiques d'un passage, se déclarent aussi ici.",
  // La seconde phrase est l'ADRESSE de non-couverture des articles de l'arrêté
  // du 20 novembre 2017 passés `non_couvert` le 2026-10-07 (relecture
  // préventeur du 30/09, décision de la propriétaire du 07/10) : leur
  // `declareA` la cite mot pour mot. La changer, c'est changer l'annonce.
  EQUIPEMENT_SOUS_PRESSION:
    "Compresseurs, chaudières, réservoirs d'air comprimé. Rojer ne suit, pour ces équipements, que la requalification périodique des compresseurs (récipients d'air comprimé ou d'un autre gaz non dangereux) ; il ne suit ni la déclaration et le contrôle de mise en service, ni l'inspection périodique, ni le dossier d'exploitation, ni le contrôle après intervention.",
  // Même rôle que l'aide des équipements sous pression : la seconde phrase est
  // l'adresse de non-couverture des articles passés `non_couvert` le
  // 2026-10-07 (ICPE, R. 4412-11, R. 4412-17, arrêté du 1er juin 2015 art. 22).
  STOCKAGE_MATIERE_DANGEREUSE:
    // 2026-10-14 : `porte(…)` autour de la pièce attendue — le balayage de
    // `non-couverture-balayage.ts` lit désormais `src/lib/equipements` et
    // demande que toute pièce du référentiel nommée ici se déclare. Le texte
    // rendu est inchangé, caractère pour caractère : les `declareA` qui le
    // citent restent justes.
    `Liquides inflammables, gaz, produits chimiques en quantité significative. Rojer suit, pour ce stockage, ${porte("les fiches de données de sécurité")}, la formation du personnel et la signalisation des aires de stockage ; il ne suit ni le régime des installations classées (ICPE), ni la capacité de rétention, ni la vérification de l'état du stockage, ni la ventilation des locaux de stockage.`,
  EQUIPEMENT_LEVAGE:
    // ~~« transpalette électrique, monte-charge »~~ (2026-09-27, lot 2) :
    // l'arrêté du 1er mars 2004 exclut les monte-charges installés à demeure,
    // et un transpalette qui ne lève la charge que pour la déplacer ne la
    // change pas de niveau (art. 2 a) — voir `conformite/levage.ts`.
    "Palan, gerbeur, chariot élévateur, hayon élévateur.",
  // 2026-10-14, décision de la propriétaire : la seconde phrase vient de
  // l'arrêté du 30 septembre 1957 (annexe, art. 2, 3 et 4), en vigueur, relu
  // sur Légifrance par la propriétaire le 2026-10-14. Aucune obligation n'est
  // créée : l'aide dit ce que le texte demande et que Rojer ne suit pas
  // (`docs/chantiers-ouverts.md`, « Alarme de chambre froide », rayé).
  INSTALLATION_FRIGORIFIQUE: `Chambre froide, vitrine ou meuble réfrigéré, groupe froid. Contrôle d'étanchéité du fluide frigorigène. Pour une chambre froide, l'arrêté du 30 septembre 1957 demande aussi qu'une chambre froide ou climatisée puisse toujours s'ouvrir à la main de l'intérieur (annexe, art. 2), qu'une chambre froide à 0 °C ou moins de plus de 10 m³ ait un dispositif d'avertissement sonore (art. 3), et qu'une installation neuve de plus de 10 m³ ait un voyant lumineux à l'extérieur (art. 4) ; Rojer ne suit pas ${nonPorte("ces dispositifs de sécurité des chambres froides")}. En établissement recevant du public des quatre premières catégories, Rojer ne suit pas ${nonPorte("le document descriptif d'une climatisation ou d'une pompe à chaleur à fluide frigorigène inflammable qui n'est pas hermétiquement scellée, tenu à la disposition des autorités et des entreprises qui interviennent (art. CH 35 § 3 c)")}.`,
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
    `L'appareil respiratoire isolant autonome d'évacuation, l'équipement complet d'intervention en milieu hostile, et tout stock de cartouches filtrantes antigaz pour appareil respiratoire — y compris celles d'un demi-masque à cartouches. Vérification par une personne qualifiée tous les douze mois, en service comme en stock. Pas le masque de confort ni le masque jetable sans cartouche, qui ne se vérifient pas. ${PHRASE_FORMATION_EPI}`,
  EPI_GILET_SAUVETAGE:
    `Le gilet de sauvetage GONFLABLE — celui dont la cartouche et le déclencheur doivent fonctionner le jour venu. Vérification par une personne qualifiée tous les douze mois. Le gilet en mousse, qui ne se gonfle pas, n'en relève pas. ${PHRASE_FORMATION_EPI}`,
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
    `Ce qu'une personne porte pour ne pas chuter de hauteur : le harnais et sa longe, l'antichute mobile ou à rappel automatique, le connecteur, mais aussi les systèmes de retenue et de maintien au travail, qui empêchent la chute au lieu de l'arrêter. Une vérification par une personne qualifiée est due tous les douze mois — en service comme en stock. Le point d'ancrage scellé dans le bâtiment n'en fait pas partie : l'arrêté borne cette vérification aux coutures et aux modes de fixation de l'équipement porté. ${PHRASE_FORMATION_EPI}`,
  // LE HARNAIS A ÉTÉ RETIRÉ DE CETTE DESCRIPTION LE 2026-09-04, et c'est une
  // correction, pas un ajustement de style. Il en était le PREMIER exemple, et
  // cette catégorie ne porte aucune obligation : un dirigeant qui lisait le
  // sélecteur y déclarait son harnais sans faute de sa part, et le produit ne
  // lui réclamait jamais les douze mois. Une sur-application se voit ; une
  // sous-application de cette forme-là ne se voit par personne.
  //
  // La description renvoie donc explicitement vers les catégories vérifiables,
  // et n'énumère plus que ce qui reste vraiment ici.
  EPI: `Ce qu'une personne porte pour se protéger et qu'aucun texte ne soumet à vérification périodique : casque, gants, chaussures de sécurité, lunettes, protections auditives, masque de confort. Un harnais antichute, un appareil respiratoire ou un gilet de sauvetage gonflable ne se déclarent PAS ici — ils ont leur propre catégorie, parce qu'ils se vérifient tous les douze mois. Pas non plus les protections collectives — garde-corps, filet, capot de machine —, qui appartiennent à l'ouvrage ou à la machine qu'elles protègent. ${PHRASE_FORMATION_EPI}`,
  // 2026-10-14, décision de la propriétaire. Même rôle que l'aide des
  // équipements sous pression et du stockage : ce qui suit « Rojer ne suit
  // pas » est l'ADRESSE de non-couverture de GZ 13, GZ 14 et de l'arrêté du
  // 23 février 2018, art. 26 § 3 — leur `declareA` en cite la phrase mot pour
  // mot (`manques-annonces.test.ts`). Ces trois articles étaient annoncés
  // jusqu'ici sur la page « Ce que Rojer ne couvre pas », rubrique
  // « Installations de gaz » ; ils sont DÉPLACÉS ici, pas dupliqués.
  // L'entretien annuel de la chaudière (C. env., R. 224-41-4 et s.) est hors
  // cadre par décision du 2026-09-20 ; l'article a été relu sur Légifrance
  // par la propriétaire le 2026-10-14.
  // 2026-10-17, sous-lot B : la dernière phrase est l'adresse de CH 23 et
  // CH 24 (décision de la propriétaire, plan, § 11, Q3) ; elle est aussi dite
  // dans l'entrée « Chaudière » des matériels non couverts.
  INSTALLATION_GAZ: `Installation fixe de gaz combustible ou d'hydrocarbures liquéfiés : stockage, canalisations et appareils raccordés — chauffage, production d'eau chaude, cuisson. En établissement recevant du public des quatre premières catégories, Rojer suit ${porte("la vérification annuelle des installations de gaz")} (règlement de sécurité, art. GZ 15). Un appareil de cuisson au gaz déjà déclaré porte déjà cette vérification annuelle : déclarer aussi l'installation en ajoute une seconde ligne, une par équipement déclaré. Rojer ne suit pas ${nonPorte("la vérification d'une installation de gaz neuve ou modifiée avant sa mise en service")} (art. GZ 13), ni ${nonPorte("l'entretien des installations et appareils à gaz et de leurs conduits d'évacuation")} ni ${nonPorte("l'accès et la signalisation de l'organe de coupure de branchement du gaz")} (art. GZ 14), ni ${nonPorte("l'entretien des installations collectives de gaz des immeubles d'habitation")}, au moins tous les dix ans (arrêté du 23 février 2018, art. 26 § 3), ni ${nonPorte("l'entretien annuel de la chaudière")} (code de l'environnement, art. R. 224-41-4 et suivants). ${PHRASE_PLAN_SCHEMATIQUE_CHAUFFAGE}`,
  // 2026-10-15, décision de la propriétaire. La maintenance et la déclaration
  // à Géo'DAE sont portées par l'appareil (`dae-erp-maintenance`,
  // `dae-erp-declaration-geodae`), la détention par l'établissement
  // (`dae-erp-detention`). Le rythme annuel est le défaut de l'ADR-039 : il se
  // dit comme défaut. « La notice du fabricant si elle est plus serrée » est un
  // conseil d'usage, pas un rythme de texte — rien n'en est daté. La classe du
  // dispositif n'est pas citée : elle se lit dans le règlement (UE) 2017/745,
  // non lu (décision du 2026-10-15). ~~Le renvoi aux Prescriptions (2026-10-16,
  // décision de la propriétaire) est tenu par `matching/dae.test.ts`~~
  // [2026-10-16, rayé — option (a) de la propriétaire : la phrase « renforcez-le
  // dans Prescriptions » est retirée de l'aide. Une notice n'est pas un acte, et
  // une prescription de source « autre » arriverait au calendrier sans la
  // mention « pas une obligation légale ». Voir les notes de `dae-erp-maintenance`.]
  DEFIBRILLATEUR: `Défibrillateur automatisé externe, au mur ou en boîtier. Dans un établissement recevant du public des catégories 1 à 4, Rojer suit pour chaque appareil ${porte("la maintenance du défibrillateur automatisé externe et de ses accessoires")} (code de la construction et de l'habitation, art. R. 157-4) et sa déclaration ${porte("à la base de données nationale")} Géo'DAE (code de la santé publique, art. L. 5233-1). Le texte ne fixe aucun rythme de maintenance : Rojer retient par défaut une maintenance au moins une fois par an ; suivez la notice du fabricant si elle en demande une plus fréquente.`,
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

/**
 * L'aide de la question « Un groupe électrogène de sécurité est-il présent ? ».
 *
 * C39 (2026-09-27) : elle citait EL 20 — installations temporaires — et
 * annonçait une vérification annuelle, là où la ligne est mensuelle et fondée
 * sur EL 18 § 4 (`referencesLegales[0]`), article du livre II.
 *
 * C41 (2026-09-27) : la case à cocher devient une question à trois états
 * (`CHAMPS_TRI_ETAT`), et les deux lignes d'EL 18 § 4 — la quinzaine des
 * niveaux et l'essai mensuel — portent la même condition ~~`non_infirmee`~~
 * [2026-10-13 : `booleenne` à `true`]. Le
 * texte dit donc ce que fait chacune des trois réponses, avec les libellés
 * mêmes du `<select>` (`VALEURS_TRI_ETAT`) : ~~« Oui » et « Je ne sais pas
 * encore » gardent les deux, « Non » les retire~~ [2026-10-13, décision de la
 * propriétaire : « Oui » seul les fait naître ; « Non » et « Je ne sais pas
 * encore » n'en donnent aucune. L'ancienne fin, « En cas de doute, laissez
 * “Je ne sais pas encore” », est retirée : elle conseillait la réponse qui,
 * désormais, n'ajoute rien au calendrier]. Il ne dit rien de plus que
 * ce que le calendrier fait ; `labels.test.ts` tient l'accord avec le
 * référentiel et avec les libellés.
 *
 * [2026-10-13, seconde décision du jour : la réponse est EXIGÉE en ERP
 * (`QUESTIONS_EXIGEES_PAR_DECISION`) — le formulaire n'y offre plus « Je ne
 * sais pas encore » et le serveur refuse l'absence. ~~« Un groupe électrogène
 * de sécurité est un appareil : répondez « Oui » s'il y en a un »~~ et
 * ~~« Avec « Non » ou « Je ne sais pas encore », aucune des deux n'est
 * suivie »~~ sont remplacés : l'aide dit que la réponse est exigée.]
 */
export const AIDE_GROUPE_ELECTROGENE =
  "Pour un établissement recevant du public seulement, et la réponse y est exigée : « Je ne sais pas encore » n'est pas accepté. Avec « Oui », le calendrier suit la vérification des niveaux toutes les deux semaines et l'entretien avec essai chaque mois (art. EL 18 § 4 du règlement de sécurité — livre II, établissements des quatre premières catégories ; en 5ᵉ catégorie, échéances maintenues par sur-application assumée). Avec « Non », aucune des deux n'est suivie.";

/**
 * Les exemples du formulaire propres à une catégorie (contrôle visuel E4,
 * 2026-10-16). Sans entrée, le formulaire garde ses exemples génériques. Un
 * exemple n'affirme aucune règle : la péremption reste la date du fabricant.
 */
export const EXEMPLES_CATEGORIE: Partial<
  Record<CategorieEquipement, { libelle?: string; peremption?: string }>
> = {
  // ~~Les dates de l'étiquette du boîtier (arrêté du 29 octobre 2019, annexe 3 :~~
  // [2026-10-16, revue c6 : référence précisée, relue par l'API Légifrance —
  // bac à sable, égalité avec la production non vérifiée.] L'arrêté du 29
  // octobre 2019 (signalétique), art. 2, 3° (LEGIARTI000039364652), fait
  // apposer « sur le boîtier ou à proximité immédiate de l'appareil une
  // étiquette conforme au modèle de l'annexe 3 » ; l'annexe 3
  // (LEGIARTI000039364662) porte « Électrodes de défibrillation à remplacer
  // le : » et « Batterie à remplacer le : ». Ces dates sont celles du
  // fabricant ; aucun texte n'en fixe le rythme.
  DEFIBRILLATEUR: {
    libelle: "Ex : DAE accueil, DAE salle",
    peremption:
      "Facultatif. La date indiquée par le fabricant pour les électrodes ou la batterie — la plus proche des deux ; l'étiquette du défibrillateur, sur le boîtier ou juste à côté, les porte. Rojer ne vous enverra pas d'échéance à cette date, mais la fiche de l'équipement affichera « Périmé depuis » dès qu'elle sera passée.",
  },
};
