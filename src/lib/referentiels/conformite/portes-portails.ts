/**
 * Obligations réglementaires — Portes et portails automatiques (P2).
 *
 * Sources primaires :
 *   - Code du travail, art. R. 4224-12 et R. 4224-13 (portes et portails,
 *     automatiques) et R. 4224-17 (maintenance et dossier). R. 4224-15,
 *     cité auparavant, traite de la formation de secouriste.
 *   - Arrêté du 21 décembre 1993 modifié, portant application du décret
 *     90-568 du 27 juin 1990, relatif aux portes et portails
 *     automatiques et semi-automatiques sur les lieux de travail.
 *
 * Portée : portes et portails motorisés utilisés pour le passage de
 * personnes ou de véhicules sur les lieux de travail.
 */

import type { Obligation } from "./types";

export const obligationsPortesPortails: Obligation[] = [
  {
    id: "porte-auto-verification-initiale",
    domaine: "porte_portail",
    libelle: "Examen de sécurité à la mise en service (porte automatique)",
    description:
      "À la mise en service ou après modification, un examen de sécurité est réalisé pour vérifier la conformité aux prescriptions de l'arrêté du 21 décembre 1993 : détection d'obstacle, vitesse, dispositifs d'arrêt d'urgence, signalisation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 à 4 (installations neuves)",
        article: "Arrêté 1993-12-21 art. 2",
        url:
          "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006082855",
        versionConstatee: "1994-07-13",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4224-13",
        article: "R. 4224-13",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532209/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "evenementielle",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["PORTE_AUTO", "PORTAIL_AUTO"],
    notesInternes:
      "NATURE : ÉVÉNEMENTIELLE (ADR-026). La description porte les deux titres — « À la mise en service OU APRÈS MODIFICATION » —, et c'est le second qui oblige à refaire l'acte. Le produit ne connaît que la date de mise en service.\n\nAUCUN TEXTE PORTEUR TROUVÉ — DÉCISION EN ATTENTE, CRITICITÉ 5. Le lot A du 2026-09-01 avait mandat de recaler le fondement de cette ligne. Il ne l'a pas trouvé, et il ne retire pas la ligne : ce serait une décision de la propriétaire, pas la sienne. Voici ce qui a été cherché, pour que le prochain ne le refasse pas.\n\n(1) L'ARRÊTÉ DU 21 DÉCEMBRE 1993, LES ONZE ARTICLES. Le relevé du même jour en avait ouvert cinq (2, 3, 4, 8, 9) ; les six autres ont été ouverts ici. Art. 1er : définitions. Art. 2 : caractéristiques des installations NOUVELLES pour véhicules. Art. 3 : présomption de conformité aux normes. Art. 4 : mêmes exigences pour les portes de piétons. Art. 5, 6, 7 : installations EXISTANTES, modification, mise en conformité — des états à atteindre, aucun acte de contrôle. Art. 8 : dossier de maintenance, dû par le MAÎTRE D'OUVRAGE. Art. 9 : entretien et vérification au minimum semestriels. Art. 10 et 11 : entrée en vigueur, exécution. Nulle part un examen daté par la mise en service.\n\n(2) LE CODE DU TRAVAIL, SECTION 2 « PORTES ET PORTAILS ». R. 4224-9 à R. 4224-11 : caractéristiques (transparence, matériaux de sécurité, anti-déraillement). R. 4224-12 : « Les portes et portails sont entretenus et contrôlés régulièrement » — récurrent, sans première fois. R. 4224-13 : obligation de résultat (« fonctionnent sans risque d'accident ») et renvoi à l'arrêté. Aucun ne date un acte par la mise en service.\n\n(3) R. 4224-17, l'article général du bâti technique : « entretenus et vérifiés suivant une périodicité appropriée » — un rythme, pas une première fois.\n\n(4) LE DÉCRET N° 92-332 DU 31 MARS 1992, cité au cadrage comme piste. Il s'adresse aux MAÎTRES D'OUVRAGE lors de la construction ou de la transformation des lieux de travail, et c'est lui qui a créé les R. 235-* recodifiés en R. 4211-* — dont le dossier de maintenance que `porte-auto-dossier-maintenance` porte déjà. Il n'institue aucun examen à la charge de l'exploitant.\n\nCE QUE CELA LAISSE. L'obligation décrit un « examen de sécurité par organisme agréé à la mise en service », et rien dans le droit lu ne l'impose. Ce que les textes imposent est un ÉTAT de l'installation, dû dès l'origine — c'est l'objet de `porte-auto-portail-piete-coulissant` et de `porte-auto-maintien-en-etat` — et une vérification RÉCURRENTE au minimum semestrielle, portée par `porte-auto-verification-semestrielle`. Les deux questions à trancher, dans cet ordre : la ligne fait-elle double emploi avec ces trois-là, et si oui, le premier contrôle semestriel suffit-il à couvrir la mise en service ? Le retrait d'une ligne de criticité 5 appelle en outre la vérification prévue par l'ADR-012 : combien de `Verification` la portent, avec quelles preuves.",
  },
  {
    id: "porte-auto-verification-semestrielle",
    domaine: "porte_portail",
    libelle: "Vérification semestrielle du bon fonctionnement (porte automatique)",
    description:
      "Les portes et portails automatiques ou semi-automatiques sont entretenus et vérifiés périodiquement, et à la suite de toute défaillance. La périodicité des visites est « au minimum semestrielle et adaptée à la fréquence de l'utilisation et à la nature de la porte ou du portail » : six mois est le délai à ne pas dépasser, pas le rythme à tenir — une porte très sollicitée se vérifie plus souvent. La vérification porte sur les éléments de guidage, les articulations, les fixations, les systèmes d'équilibrage et tous les équipements concourant à la sécurité de fonctionnement. Toutes les interventions sont consignées dans un livret d'entretien, joint au dossier de l'article R. 4224-17.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 9",
        article: "Arrêté 1993-12-21 art. 9",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679563",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["PORTE_AUTO", "PORTAIL_AUTO"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : la périodicité semestrielle est à l'article 9, pas à l'article 3.\n\nLE SEMESTRE EST UN PLAFOND, ET `semestrielle` RESTE LA BONNE VALEUR — lot B, article 9 rouvert sur Légifrance le 2026-09-01 (version en vigueur depuis le 2008-05-01). « La périodicité des visites est AU MINIMUM semestrielle et ADAPTÉE à la fréquence de l'utilisation et à la nature de la porte ou du portail. » « Au minimum semestrielle » qualifie la FRÉQUENCE : au moins deux visites par an, donc six mois au plus entre deux. C'est exactement la doctrine du dépôt — la date au-delà de laquelle l'exploitant est nécessairement en défaut — et le barreau le plus strict que le texte chiffre. Aucune valeur de l'énumération ne serait meilleure, et il n'y a rien à corriger sur `periodicite`.\n\nCE QUI RESTE FAUX EST LA DESCRIPTION, ET ELLE EST CORRIGÉE ICI. L'ancienne rédaction annonçait « un contrôle semestriel » — un rythme — et énumérait « cellules, barres palpeuses, limiteurs d'effort, détecteurs », vocabulaire qui n'est pas celui du texte et qui OMET les cinq points que l'article nomme : éléments de guidage, articulations, fixations, systèmes d'équilibrage, et tous les équipements concourant à la sécurité de fonctionnement. Elle disait aussi « dossier de maintenance » là où l'article dit « livret d'entretien ». La description porte désormais le verbatim du plafond et l'adaptation à l'usage.\n\nLA SOUS-APPLICATION QUI SUBSISTE, NOMMÉE ET SANS CORRECTIF AU RÉFÉRENTIEL. « Adaptée à la fréquence de l'utilisation » impose davantage que deux visites par an à une porte de magasin très sollicitée, et le texte ne chiffre rien. Le produit affichera donc une échéance PLUS TARDIVE que le droit pour ces portes-là : une sous-application, donc invisible par qui la subit. Elle n'a pas de correctif au référentiel — il n'y a pas de second barreau à encoder, seulement un standard. La description le dit maintenant en toutes lettres, ce qui est le seul endroit où un dirigeant peut le lire.\n\nSECOND DÉCLENCHEUR NON ENCODÉ, inchangé : « et à la suite de toute défaillance ». C'est une obligation événementielle superposée à l'échéance récurrente, du même genre que `esp-intervention-reparation` — le produit n'observe pas la défaillance. Une obligation `evenementielle` distincte serait le geste juste ; elle appelle une décision produit, pas un lot de correction.\n\nCE QUE CETTE CORRECTION N'A POUR GARDE, dit plutôt que taché : rien. La description a été remise à l'ancienne valeur, fausse, et les 1907 tests sont restés verts — `empreinteReferentiel` exclut délibérément `description` (cf. `conformite.test.ts`), et aucun test ne lit le texte d'une description. La trace de ce lot est dans le diff, pas dans une garde.",
  },
  {
    id: "porte-auto-dossier-maintenance",
    domaine: "porte_portail",
    libelle: "Tenue du dossier de maintenance (porte automatique)",
    description:
      "Un dossier de maintenance est constitué et tenu à jour : notice d'instructions, preuves de conformité, résultats des vérifications, interventions correctives. Il est conservé pendant toute la durée d'exploitation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 8 et 9 (livret d'entretien)",
        article: "Arrêté 1993-12-21 art. 9",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679563",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4224-17",
        article: "R. 4224-17",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532197/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "dossier de maintenance",
    usageEcran: { groupe: "installations", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["PORTE_AUTO", "PORTAIL_AUTO"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait R. 4224-15, qui traite de la formation de secouriste. Le dossier d'entretien est celui de R. 4224-17.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"dossier de maintenance\"` (ADR-026). Le dossier est constitué, tenu à jour et conservé pendant toute la durée d'exploitation : c'est lui l'obligation.",
  },
  {
    id: "porte-auto-maintien-en-etat",
    domaine: "porte_portail",
    libelle: "Maintien en état et réparation sans délai (porte automatique)",
    description:
      "Les portes et portails automatiques doivent être maintenus en bon état de fonctionnement. Toute défectuosité susceptible d'affecter la santé et la sécurité des travailleurs est éliminée le plus rapidement possible. Lorsque la chute d'une porte peut présenter un danger, la périodicité des contrôles et les interventions sont consignées dans le dossier prévu à l'article R. 4224-17.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4224-12 et R. 4224-13",
        article: "R. 4224-13",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532209/",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4224-17",
        article: "R. 4224-17",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532197/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "installations", sous: null },
    realisateurs: ["exploitant"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["PORTE_AUTO", "PORTAIL_AUTO"],
    notesInternes:
      "Obligation de moyens permanente, sans échéance fixe. Corrigé à l'audit 2026-08 : R. 4224-15 (secouriste) remplacé par R. 4224-12/13 (portes et portails) et R. 4224-17 (maintenance).\n\nNATURE : ÉTAT PERMANENT (ADR-026). « Maintenus en bon état de fonctionnement », et toute défectuosité « éliminée le plus rapidement possible » : un état, pas une échéance. Le dossier où se consignent les interventions est porté par `porte-auto-dossier-maintenance`, ligne distincte.",
  },
  {
    id: "porte-auto-portail-piete-coulissant",
    // ADR-042 (2026-10-17) : niveau audit — au référentiel, hors du quotidien.
    niveau: "audit",
    domaine: "porte_portail",
    libelle: "Sécurité positive et détection d'obstacle (portail motorisé de véhicules)",
    description:
      "Les installations de portes ou portails automatiques et semi-automatiques destinées au passage de véhicules comportent un dispositif à sécurité positive interrompant immédiatement tout mouvement d'ouverture ou de fermeture lorsque celui-ci peut causer un dommage à une personne, ainsi que des détections de présence et de contact. C'est une exigence d'installation, non une échéance : leur bon fonctionnement est contrôlé lors de la vérification au minimum semestrielle de l'article 9.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 et 5 (passages de véhicules)",
        article: "Arrêté 1993-12-21 art. 2",
        url:
          "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006082855",
        versionConstatee: "1994-07-13",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["PORTAIL_AUTO"],
    notesInternes:
      "NIVEAU AUDIT DEPUIS LE 2026-10-17 (ADR-042). Décision de la propriétaire du même jour, après la relecture du préventeur, sur les propositions de passage au niveau audit qui lui avaient été soumises (`relecture-jc-2026-10/propositions-audit.json`, hors dépôt) : « toutes les suggestions sont acceptées ». Motif soumis au préventeur : « Une exigence d'installation, posée par l'installateur et contrôlée à chaque vérification semestrielle du portail, qui reste suivie. » L'OBLIGATION EST LÉGALE ET LE RESTE : les articles 2 et 5 de l'arrêté du 21 décembre 1993 restent cités et lus au corpus. Elle sort du quotidien — ni calendrier, ni « Ce qui doit être en place », ni rappel — et reste nommée, avec sa référence, sur la page « Ce que Rojer ne couvre pas », rubrique « Niveau audit », au dossier qu'elle peut concerner. Effet en base : les lignes déjà posées sont archivées si elles portent une trace, supprimées sinon. RÉACTIVER : retirer `niveau`, monter la version.\n\nDÉFAUT CONSTATÉ LE 2026-08-26, non corrigé ici parce qu'il appelle une décision. Cette obligation porte une périodicité semestrielle alors que ses deux références — les articles 2 et 5 de l'arrêté du 21 décembre 1993 — n'en fixent AUCUNE : ce sont des prescriptions techniques d'installation. La périodicité vient de l'article 9, qui n'est pas cité. Or l'ajouter fait échouer le test anti-doublon : l'obligation partagerait catégorie, périodicité et article fondateur avec `porte-auto-verification-semestrielle`, qui couvre déjà PORTAIL_AUTO au même rythme. Les deux font double emploi, et la référence manquante est ce qui le masquait. Trancher suppose de choisir : fusionner, ou restreindre celle-ci à ce que les articles 2 et 5 prescrivent vraiment — des caractéristiques d'installation, sans échéance. Troisième défaut : l'identifiant dit « piete » alors que l'article 2 vise le passage de VÉHICULES.\n\nRÉSOLU LE 2026-08-26, en suivant le texte plutôt qu'en fusionnant les deux obligations. Les articles 2 et 5 sont des PRESCRIPTIONS TECHNIQUES D'INSTALLATION : ils exigent un dispositif à sécurité positive et des détections de présence et de contact, sans fixer aucune périodicité. `periodicite` passe à `mise_en_service_uniquement` — l'exigence est due à l'installation et après modification, le contrôle périodique de son bon fonctionnement relevant de l'article 9. Le doublon d'échéance avec `porte-auto-verification-semestrielle` disparaît sans qu'aucune exigence ne soit perdue.\n\nDeux corrections de rédaction : le libellé restreignait aux portails COULISSANTS alors que l'article 2 vise toute installation destinée au passage de véhicules, sans distinguer coulissant, battant ou basculant. Et « dispositif d'arrêt d'urgence » n'est pas le vocabulaire du texte, qui dit « dispositif à sécurité positive ».\n\nL'identifiant conserve « piete » alors que l'article vise le passage de VÉHICULES : il est stocké en base sous contrainte d'unicité.\n\nNATURE : ÉTAT PERMANENT, ALORS QUE LA PÉRIODICITÉ EST `mise_en_service_uniquement` (ADR-026). La description ci-dessus l'écrit déjà : « C'est une exigence d'installation, non une échéance. » Le dispositif à sécurité positive doit ÊTRE là et le rester ; il n'y a pas d'acte à faire à la mise en service. La périodicité `mise_en_service_uniquement` a été retenue faute de mieux — ~~elle produit une ligne datable, ce que `autre` n'aurait pas fait — et le prix est une ligne qui se solde une fois pour une exigence qui ne cesse jamais. Signalé, non corrigé : changer la périodicité déplacerait des lignes chez tous les utilisateurs équipés d'un portail, et cela se décide pour soi-même.~~ [2026-10-17, ADR-042 : au niveau audit, la ligne n'en produit plus aucune ; la question de la périodicité ne se pose plus tant que le marqueur reste.]"
  },
  // Livre II du règlement de sécurité ERP — sous-lot C du plan « mise à jour
  // du référentiel » (2026-10-17).
  {
    id: "porte-auto-erp-contrat-entretien",
    domaine: "porte_portail",
    libelle:
      "Contrat d'entretien des portes automatiques (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « toutes les portes automatiques doivent faire l'objet d'un contrat d'entretien » (CO 48 § 3 e), rédaction en vigueur depuis le 1er juillet 2019). Le texte n'en fixe ni la durée ni le rythme des interventions. Ce contrat s'ajoute, dans un lieu de travail, aux vérifications semestrielles et au dossier de maintenance que le Code du travail impose pour la même porte. Rojer sert cette ligne dès qu'une porte automatique est déclarée ; il ne la sert pas pour un portail automatique, que l'article ne vise pas.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. CO 48 § 3 e) (contrat d'entretien de toutes les portes automatiques) — livre II, établissements des quatre premières catégories",
        article: "CO 48 § 3 e) — contrat d'entretien des portes automatiques",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038485458",
        note: "« § 3. Les portes automatiques sont autorisées dans les conditions suivantes : […] e) Toutes les portes automatiques doivent faire l'objet d'un contrat d'entretien. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000038485458, en vigueur depuis le 2019-07-01. Le reste de l'article (tambours, tourniquets, conditions d'autorisation, examen « grand vent », vitrages) est de la construction.",
        versionConstatee: "2019-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "contrat d'entretien des portes automatiques",
    usageEcran: { groupe: "installations", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    siEquipementDeclare: ["PORTE_AUTO"],
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme ; CO 48 § 3 e) ne fixe ni durée ni rythme du contrat, et ne cite aucune norme pour lui (la NF S 61-937 du § 3 b) porte sur l'énergie mécanique intrinsèque des portes, une règle de construction).\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C du plan « mise à jour du référentiel », ligne 6 ; découpage validé par c6 le même jour). CO 48 § 3 e) relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable).\n\n" +
      "PORTEUR ÉTABLISSEMENT SUR `PORTE_AUTO` DÉCLARÉE : « toutes les portes automatiques » font l'objet d'UN contrat, qui couvre le parc ; une ligne par porte ferait autant de cases pour une seule pièce. `PORTAIL_AUTO` n'est pas dans la condition : CO 48 est au chapitre des dégagements (portes), un portail de véhicules n'en est pas un.\n\n" +
      "SANS RECOUVREMENT avec les quatre lignes du Code du travail (`porte-auto-verification-initiale`, `-verification-semestrielle`, `-dossier-maintenance`, `-maintien-en-etat`) : elles portent les vérifications, le dossier et le maintien en état ; celle-ci porte le contrat, que seul le règlement ERP exige.\n\n" +
      "PAS DE RYTHME, PAS DE DÉFAUT ANNUEL : ce qui est imposé est d'AVOIR un contrat (notes-cadre, ligne de partage 9). GN 10 n'est pas cité : de l'entretien, que GN 10 § 1 maintient.\n\n" +
      "BORNE N1–N4 écrite en littéral : `CATEGORIES_LIVRE_2` vit dans `incendie.ts`, et un fichier de données n'importe pas de valeur.\n\n" +
      "TIERS : le réalisateur est l'exploitant (il tient le contrat) ; le domaine `porte_portail` appelle déjà un prestataire par sa vérification semestrielle (`appelleUnTiers`).",
  },
];
