/**
 * Obligations réglementaires — Aération et ventilation (P1).
 *
 * Sources primaires :
 *   - Code du travail, articles R. 4222-1 à R. 4222-26 (aération des lieux de
 *     travail), notamment R. 4222-20 — maintien en bon état et contrôle
 *     régulier. R. 4222-21 n'y figure plus : il n'impose qu'une consigne
 *     d'utilisation écrite, aucun contrôle (relevé du 2026-09-01).
 *   - Arrêté du 8 octobre 1987 relatif au contrôle périodique des installations
 *     d'aération et d'assainissement des locaux de travail.
 *   - Arrêté du 25 juin 1980 modifié (règlement ERP) — article CH 58
 *     (installations de chauffage-ventilation), article PS 32 (parcs de
 *     stationnement couverts), article GC 20 (grandes cuisines).
 *   - Arrêté du 23 février 2018 (installations de gaz des bâtiments
 *     d'habitation), qui a abrogé le 5 mars 2018 l'arrêté du 25 avril 1985
 *     sur l'entretien des VMC-Gaz collectives.
 *
 * Audit des sources 2026-08-25 : toutes les URLs ont été ouvertes sur
 * Légifrance ; les contrôles semestriels de l'arrêté de 1987 ne visent que
 * les installations avec recyclage (art. 4).
 *
 * Les seuils (capacité de parking, typologie) sont textuellement issus du
 * règlement ERP — pas d'interprétation interne.
 */

import type { Obligation } from "./types";

export const obligationsAeration: Obligation[] = [
  // ---------------------------------------------------------------------------
  // Porteur : l'établissement (ADR-022)
  // ---------------------------------------------------------------------------
  {
    id: "aeration-controle-installations-r4222-20",
    domaine: "aeration",
    libelle:
      "Contrôle périodique de l'ensemble des installations d'aération et d'assainissement",
    description:
      "L'employeur maintient en bon état de fonctionnement, et fait contrôler régulièrement, l'ensemble des installations d'aération et d'assainissement de ses locaux de travail — ce que le texte désigne par « les installations mentionnées au présent chapitre ». Le rythme est fixé par l'arrêté du 8 octobre 1987 : au minimum une fois par an en local à pollution non spécifique — le cas des bureaux, commerces et salles de restaurant. L'obligation porte sur l'ensemble, pas sur tel ou tel appareil : elle est due même si aucune installation n'est déclarée dans l'outil.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4222-20",
        article: "R. 4222-20",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532294/",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4222-22",
        article: "R. 4222-22",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532289/",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 8 octobre 1987, art. 3",
        article: "Arrêté 1987-10-08 art. 3",
        url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006072614/",
        // Entrée en vigueur, pas date de lecture : l'article 6 de l'arrêté
        // le rend applicable six mois après sa publication.
        versionConstatee: "1988-04-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    // Réalisateurs repris de `aeration-travail-entretien-annuel`, que cette
    // ligne absorbe (ADR-022) : ne pas restreindre ce que l'utilisateur
    // pouvait déclarer.
    realisateurs: ["personne_qualifiee", "personne_competente"],
    // 4, la criticité du fragment absorbé : c'est le même acte sur le même
    // texte, il ne change pas de rang en changeant de porteur.
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    porteur: "etablissement",
    equipementsEnContexte: ["VMC", "CTA", "HOTTE_PRO"],
    notesInternes:
      "Porteur établissement (ADR-022). Verbatim relevé en première main le 2026-08-26, article relu le 2026-08-27 : « L'employeur maintient l'ensemble des installations mentionnées au présent chapitre en bon état de fonctionnement et en assure régulièrement le contrôle. » Le « présent chapitre » est le chapitre II « Aération, assainissement » (R. 4222-1 à R. 4222-26) — relevé sur le chemin hiérarchique affiché par Légifrance, et il borne la portée matérielle : ce sont les installations de ventilation et d'assainissement, pas toutes les installations techniques. Le champ personnel, lui, est bien « tout employeur ».\n\nLe rythme ne vient pas de l'article, qui dit « régulièrement » sans chiffre. Il vient de la chaîne R. 4222-22 → arrêté du 8 octobre 1987, dont l'article 3 impose « au minimum une fois par an » en local à pollution non spécifique. Les trois secteurs cibles y sont. L'article 4 (pollution spécifique) impose le même rythme annuel, et un contrôle semestriel supplémentaire aux seules installations avec recyclage. Ce dernier cas N'EST PORTÉ PAR AUCUNE OBLIGATION : une première rédaction de cette note le disait couvert par un `aeration-travail-recyclage-semestriel` qui N'EXISTE PAS — identifiant inventé, corrigé le 2026-08-27. Le semestriel de recyclage est décrit dans `aeration-travail-locaux-pollution-specifique` mais n'y est pas planifié, faute d'une propriété d'équipement « recyclage » que le formulaire ne pose pas : ses propres notes le disent. C'est un manque réel, et il n'est pas de mon fait — il précède ce chantier.\n\nCe qu'elle absorbe, et ce qu'elle n'absorbe pas. Cette note affirmait d'abord qu'aucune des obligations citant R. 4222-20 n'était retirée ; c'est devenu faux le jour même. `aeration-travail-entretien-annuel` A ÉTÉ RETIRÉE : elle décrivait le même acte, au même rythme annuel, sur le même arrêté du 8 octobre 1987 art. 3, et n'en projetait le tout que sur `VMC` et `CTA`. Aucun fondement propre, donc un fragment — et le garder aurait fait deux lignes annuelles pour un seul contrôle.\n\nCe qui RESTE, et pourquoi ce ne sont pas des fragments : `aeration-travail-mise-en-service` est un acte distinct — le contrôle initial, une seule fois, dans le mois qui suit la mise en service. `aeration-travail-locaux-pollution-specifique` et `stockage-dangereux-ventilation-locaux` relèvent de l'ARTICLE 4 du même arrêté, celui des locaux à pollution spécifique : autre régime. Réserve à ne pas perdre de vue : la première d'entre elles est conditionnée à `estLocalPollutionSpecifique` en propriété booléenne, donc en opt-in strict — elle ne se déclenche que si l'utilisateur a répondu « oui » explicitement, et ne rattrape donc rien par défaut.\n\nAutrement dit : un employeur qui a déclaré sa VMC voit désormais UNE ligne annuelle et non deux, plus son contrôle initial ; un employeur qui n'a rien déclaré, qui ne voyait rien, voit cette ligne.\nVEILLE DU 2026-09-10 — CE QU'AUCUNE SOURCE NE DIT, et c'est le résultat le plus utile de la passe. Trois questions posées aux sources primaires, deux sans réponse. (1) À PARTIR DE QUELLE DATE se compte l'intervalle annuel : NON TROUVÉ. R. 4222-20 ne porte aucun chiffre, l'article 3 de l'arrêté dit « au minimum une fois par an » sans ancrage, et le focus juridique INRS « Contrôle des installations de ventilation » le reprend sans le préciser. (2) CE QU'IL ADVIENT SI UNE PARTIE SEULEMENT de l'installation a été contrôlée dans l'année : NON TROUVÉ, aucune des trois sources ne traite le cas. (3) LA GRANULARITÉ DE LA PREUVE : trouvée, et elle vaut d'être connue — INRS ED 6008 (mars 2023), p. 5 : « Les exigences du Code du travail […] imposent au chef d'établissement la constitution et la tenue à jour d'un DOSSIER D'INSTALLATION POUR CHAQUE INSTALLATION de ventilation. » L'obligation est une, adressée à l'employeur sur l'ensemble ; la TRACE, elle, est plurielle et tenue par installation, et l'article 2 b) de l'arrêté y fait porter « les dates et les résultats des contrôles périodiques ».\n\nCE QUE ÇA ENGAGE POUR LE PRODUIT, écrit ici pour que la déduction ne se reprenne pas pour une lecture : la règle « une ligne unique repart de la date la PLUS ANCIENNE de celles qu'elle absorbe » est une DÉDUCTION, pas une phrase de texte. Elle suit de « au minimum une fois par an » appliqué à « tous les éléments de l'installation » — un élément contrôlé il y a plus d'un an rend l'obligation non satisfaite, quoi qu'aient dit les autres. Elle n'est écrite nulle part et ne doit jamais être présentée comme telle.\n\nVerbatims de R. 4222-20 et des articles 2 et 3 de l'arrêté RECONFIRMÉS à la source le 2026-09-10, identiques à ceux déjà portés au corpus. Les champs `luLe` et `lecture` n'ont pas été touchés : la lecture d'origine était de première main, celle-ci passe par un agent, et remplacer la première par la seconde ferait perdre un degré de confiance au lieu d'en gagner un.",
  },
  // ---------------------------------------------------------------------------
  // Travail (Code du travail + arrêté du 8 octobre 1987)
  // ---------------------------------------------------------------------------
  {
    id: "aeration-travail-mise-en-service",
    domaine: "aeration",
    libelle: "Contrôle initial des installations d'aération à la mise en service",
    description:
      "Pour toute installation nouvelle ou ayant fait l'objet de modifications notables, l'employeur fait procéder aux mesures qui établissent le dossier de valeurs de référence — débit global minimal d'air neuf, pressions ou vitesses aux points caractéristiques, caractéristiques des filtres — au plus tard un mois après la première mise en service. Ce dossier est joint à la notice d'instruction et tenu à jour.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 8 octobre 1987, art. 2 a) (dossier de valeurs de référence, un mois après la première mise en service)",
        article: "Arrêté 1987-10-08 art. 2",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000863044/",
        note: "« Ce dossier doit être établi, au plus tard, un mois après la première mise en service des installations. » C'est le SEUL texte de la chaîne qui date un acte par la mise en service ; il vise les installations nouvelles et celles ayant fait l'objet de modifications notables.",
        versionConstatee: "1988-04-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 8 octobre 1987, art. 3-1 (contenu du dossier de valeurs de référence, locaux à pollution non spécifique)",
        article: "Arrêté 1987-10-08 art. 3",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000863044/",
        note: "Cité pour le contenu — ce que les mesures initiales doivent porter. Son 2, en revanche, porte l'annuelle, et c'est `aeration-controle-installations-r4222-20` qui l'encode.",
        versionConstatee: "1988-04-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4222-20",
        article: "R. 4222-20",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532294/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["VMC", "CTA"],
    notesInternes:
      "NATURE : PONCTUELLE (ADR-026). « Au plus tard un mois après la mise en service » : un seul titre, un seul acte, daté par un fait que le produit connaît. À distinguer des deux mises en service électriques, dont l'article vise aussi les modifications ultérieures.\n\nFONDEMENT RECALÉ LE 2026-09-01 (lot A). Deux défauts, tous deux relevés au corpus le même jour et corrigés ici.\n\n(1) R. 4222-21 était cité pour un contrôle : il n'en impose aucun. Son seul objet est une consigne d'utilisation écrite, soumise à l'avis du médecin du travail et du CSE. Ni « vérification », ni « contrôle », ni « mise en service » n'y figurent. La référence est retirée ; l'article passe `obligation_manquante` au corpus, la consigne n'étant portée nulle part.\n\n(2) L'ancre `article` pointait l'article 3 de l'arrêté du 8 octobre 1987 alors que le délai d'un mois est à l'article 2 a) — et il court non sur un contrôle mais sur l'établissement du DOSSIER DE VALEURS DE RÉFÉRENCE. La description a été recalée sur ce que le texte dit ; l'article 2 est entré au corpus à cette occasion.",
  },
  // `aeration-travail-entretien-annuel` a été RETIRÉ le 2026-08-27 (ADR-022).
  //
  // Même cas que les deux fragments de PE 4 § 2 : son article fondateur était
  // R. 4222-20, son rythme venait de l'arrêté du 8 octobre 1987 art. 3, et il
  // ne projetait le tout que sur `VMC` et `CTA`. Aucun fondement propre. Un
  // employeur dont la ventilation n'était déclarée sous aucune de ces deux
  // catégories ne recevait rien, alors que l'article vise l'ensemble des
  // installations du chapitre II — c'est exactement le faux négatif que
  // `aeration-controle-installations-r4222-20` supprime.
  //
  // À ne pas confondre avec les deux lignes voisines, qui restent :
  // `aeration-travail-mise-en-service` est un acte distinct (contrôle initial,
  // une seule fois), et `aeration-travail-locaux-pollution-specifique` relève
  // de l'ARTICLE 4 du même arrêté — les locaux à pollution spécifique, un
  // autre régime, avec son contrôle semestriel propre en cas de recyclage.
  //
  // L'id ne doit jamais être réemployé : il est dans `OBLIGATIONS_RETIREES`.
  {
    id: "aeration-travail-locaux-pollution-specifique",
    domaine: "aeration",
    libelle: "Contrôle annuel des installations en locaux à pollution spécifique",
    description:
      "Dans les locaux à pollution spécifique (poussières, gaz, vapeurs, aérosols), l'employeur fait contrôler au moins une fois par an le débit global d'air extrait, les pressions ou vitesses aux points caractéristiques et l'état des éléments de l'installation (captage, gaines, ventilateurs, épuration). Lorsque l'installation recycle l'air, un contrôle semestriel supplémentaire porte sur la concentration en poussières dans les gaines de recyclage et sur les systèmes de surveillance.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 8 octobre 1987, art. 4",
        article: "Arrêté 1987-10-08 art. 4",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006678611",
        versionConstatee: "1988-04-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["VMC", "CTA", "HOTTE_PRO"],
    conditions: [
      {
        type: "equipement_propriete_booleenne",
        categorie: "VMC",
        propriete: "estLocalPollutionSpecifique",
        valeur: true,
      },
      {
        type: "equipement_propriete_booleenne",
        categorie: "CTA",
        propriete: "estLocalPollutionSpecifique",
        valeur: true,
      },
      {
        type: "equipement_propriete_booleenne",
        categorie: "HOTTE_PRO",
        propriete: "estLocalPollutionSpecifique",
        valeur: true,
      },
    ],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version imposait un contrôle SEMESTRIEL à tout local à pollution spécifique en citant « art. 3 § II ». L'art. 3 vise les locaux à pollution NON spécifique ; l'art. 4 (pollution spécifique) prévoit un contrôle annuel, le semestriel ne concernant que les installations avec recyclage de l'air. Le formulaire n'avait pas de propriété « recyclage » : le contrôle semestriel était mentionné dans la description mais pas planifié.\n\nRÉSOLU LE 2026-09-01 : `aSystemeDeRecyclage` existe, et `aeration-travail-recyclage-semestriel` porte le contrôle du b). La description ci-dessus garde sa dernière phrase — elle dit au dirigeant que le semestriel existe même s'il n'a pas encore répondu à la question.",
  },

  {
    id: "aeration-travail-recyclage-semestriel",
    domaine: "aeration",
    libelle:
      "Contrôle semestriel des gaines de recyclage (locaux à pollution spécifique)",
    description:
      "Lorsque l'installation d'un local à pollution spécifique recycle l'air, l'employeur fait contrôler au moins tous les six mois la concentration en poussières ou en autres polluants dans les gaines de recyclage, ainsi que le bon fonctionnement de tous les systèmes de surveillance. Ce contrôle s'ajoute au contrôle annuel : il ne le remplace pas, et il ne porte pas sur les mêmes objets.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 8 octobre 1987, art. 4 b) (contrôle semestriel en cas de recyclage)",
        article: "Arrêté 1987-10-08 art. 4",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006678611",
        versionConstatee: "1988-04-01",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["VMC", "CTA", "HOTTE_PRO"],
    conditions: [
      {
        type: "equipement_propriete_booleenne",
        categorie: "VMC",
        propriete: "estLocalPollutionSpecifique",
        valeur: true,
      },
      {
        type: "equipement_propriete_booleenne",
        categorie: "VMC",
        propriete: "aSystemeDeRecyclage",
        valeur: true,
      },
      {
        type: "equipement_propriete_booleenne",
        categorie: "CTA",
        propriete: "estLocalPollutionSpecifique",
        valeur: true,
      },
      {
        type: "equipement_propriete_booleenne",
        categorie: "CTA",
        propriete: "aSystemeDeRecyclage",
        valeur: true,
      },
      {
        type: "equipement_propriete_booleenne",
        categorie: "HOTTE_PRO",
        propriete: "estLocalPollutionSpecifique",
        valeur: true,
      },
      {
        type: "equipement_propriete_booleenne",
        categorie: "HOTTE_PRO",
        propriete: "aSystemeDeRecyclage",
        valeur: true,
      },
    ],
    notesInternes:
      "LE TEXTE ÉTAIT LU DEPUIS LE 2026-08-27, ET LA LIGNE MANQUAIT QUAND MÊME. Le corpus portait le verbatim et le constat : « RYTHME NON PORTÉ. Le b) impose au minimum tous les six mois lorsqu'il existe un système de recyclage le contrôle de la concentration en poussières ou autres polluants dans les gaines de recyclage, et de tous les systèmes de surveillance. Non encodé : la présence d'un système de recyclage est un attribut d'équipement que le modèle n'a pas. » Le manque n'était donc pas un défaut de dépouillement mais de MODÈLE, et il a tenu jusqu'à ce qu'un guide professionnel extérieur le remette sous les yeux — le dépôt savait, et son savoir ne remontait à personne.\n\nLE SENS DE L'ERREUR EST CELUI QUI COMPTE. Le produit annonçait douze mois là où le texte en impose six, c'est-à-dire dans le sens qui met un exploitant en défaut sans qu'il le sache. C'est le seul endroit du référentiel, à la comparaison du 2026-09-01, où nous étions moins-disants sur un texte que nous avions lu.\n\nDEUX CONDITIONS ET NON UNE, cumulées par catégorie (`every` dans `matchEquipements`). L'article 4 régit les locaux à pollution SPÉCIFIQUE ; son b) y ajoute le semestriel quand l'air est recyclé. Exiger le seul recyclage ferait naître la ligne dans un local à pollution non spécifique, que l'article 3 régit autrement.\n\nCASE À COCHER ET NON TROIS ÉTATS, contrairement aux treize propriétés d'opt-out. Le recyclage est un opt-in : l'obligation naît d'une réponse positive, elle ne s'éteint pas d'une réponse négative. Un trois-états afficherait un semestriel à tout propriétaire de VMC tant qu'il n'a pas répondu non — un faux positif de masse sur une ligne qui revient deux fois par an. C'est le même raisonnement que pour `estLocalPollutionSpecifique`, son voisin immédiat, sur le même article.\n\nCE QUE ÇA NE RÈGLE PAS : un dirigeant qui a un recyclage et ne coche pas la case ne voit toujours rien. La description de l'obligation annuelle mentionne le semestriel pour cette raison — elle est lue par quelqu'un qui n'a pas encore répondu à la question.",
  },

  // ---------------------------------------------------------------------------
  // ERP (arrêté du 25 juin 1980)
  // ---------------------------------------------------------------------------
  {
    id: "aeration-erp-chauffage-ventilation-annuelle",
    domaine: "aeration",
    libelle: "Vérification annuelle des installations techniques de chauffage-ventilation (ERP)",
    description:
      "Les installations de chauffage, de ventilation et de conditionnement d'air des ERP sont vérifiées annuellement par un technicien compétent, pour s'assurer du bon état des matériels et du respect des prescriptions.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. CH 58 § 2 (vérifications périodiques annuelles), son § 1 renvoyant le régime à la section II du chapitre Ier",
        article: "CH 58",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020304588/",
        note: "« § 2. Les vérifications périodiques doivent avoir lieu tous les ans et concernent : - les installations de production de chaleur ou de froid visées aux sections II, V et VI du présent chapitre ; - le stockage des combustibles visé à la section III ; - les installations de traitement d'air et de ventilation visées à la section VII ; - les appareils de production-émission de chaleur à combustion et les systèmes thermodynamiques visés à la section VIII. » C'est le § 2 qui porte le rythme ; le § 1 ne fait que renvoyer le régime à GE 6 et suivants — donc à un organisme agréé ou un technicien compétent.",
        versionConstatee: "2025-09-10",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. CH 57 (entretien, ramonage annuel des conduits de fumée)",
        article: "CH 57",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020304588/",
        note: "« Les installations doivent être entretenues régulièrement et maintenues en bon état de fonctionnement. En particulier, les conduits de fumée, les cheminées et tous les appareils doivent être ramonés et nettoyés une fois par an. » ARTICLE D'ENTRETIEN, non de vérification : le ramonage qu'il impose n'est PAS l'acte que cette obligation planifie, et il n'a pas de ligne à lui. Voir les notes internes — une scission est proposée, elle n'est pas faite.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["VMC", "CTA"],
    notesInternes:
      "FONDEMENT PRÉCISÉ LE 2026-09-01 (lot A) : la `reference` désignait le § 1 de CH 58 — le renvoi de régime — alors que le rythme annuel est au § 2. Même motif que `elec-erp-cat1-4-annuelle` sur EL 19, et la clé `article` était juste dans les deux cas ; c'est la citation lue par un humain qui pointait à côté.\n\nSCISSION PROPOSÉE, NON FAITE — DÉCISION DE DÉCOUPAGE. Cette ligne confond DEUX ACTES sous un seul libellé, et le corpus l'établit article par article. L'argument, pour que la décision se prenne sur pièces :\n\n(1) DEUX OBJETS. CH 57 impose le RAMONAGE et le nettoyage annuels des conduits de fumée, des cheminées et de tous les appareils. CH 58 § 2 impose une VÉRIFICATION TECHNIQUE annuelle dont l'objet est autre : production de chaleur ou de froid, stockage des combustibles, traitement d'air et ventilation, appareils de production-émission. Ramoner un conduit et vérifier une centrale de traitement d'air ne sont pas le même geste.\n\n(2) DEUX RÉALISATEURS. CH 58 § 1 renvoie le régime à la section II du chapitre Ier, donc à un organisme agréé ou un technicien compétent au sens de GE 6. CH 57 n'appelle personne en particulier : un ramoneur suffit, et il n'est pas un technicien compétent au sens de GE 6.\n\n(3) CE QUE LA CONFUSION COÛTE, et c'est le point qui décide. Un exploitant qui coche cette ligne après une visite de maintenance de sa CTA aura l'air d'avoir ramoné. Le défaut est du côté où l'erreur est invisible pour celui qui la subit : il produira un dossier qui atteste un acte qui n'a pas eu lieu, et c'est précisément ce qu'un dossier de conformité existe pour empêcher.\n\n(4) CE QUE LA SCISSION COÛTE. Une obligation de plus (117), une réconciliation, et un id neuf pour le ramonage. Les lignes déjà cochées resteraient sur celle-ci — donc sur la vérification technique —, et l'exploitant verrait apparaître une échéance « à planifier » pour un ramonage qu'il a peut-être fait. C'est le comportement connu de la réconciliation, sans `absorbePar` possible ici : il n'y a pas d'absorbant, il y a un dédoublement.\n\nLe lot A ne crée pas d'obligation : la scission appartient à la propriétaire. En attendant, la `note` de CH 57 dit ce que cette ligne ne couvre pas.",
  },
  {
    id: "aeration-erp-filtres-visite-periodique",
    domaine: "aeration",
    libelle:
      "Visite périodique des filtres de l'installation de ventilation (ERP des 4 premières catégories)",
    description:
      "L'utilisateur ou son représentant contrôle périodiquement le chargement en poussières des filtres de l'installation de ventilation de confort, et les nettoie ou les remplace dès que la perte de charge maximale fixée par l'installateur est dépassée. Le règlement plafonne cette périodicité à un an, et la ramène à trois mois en l'absence d'un système de mesure et d'alarme fonctionnant en permanence — le cas ordinaire. Les visites, mesures, nettoyages et changements se notent sur le livret d'entretien de l'installation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. CH 39 § 3 (visite périodique par l'utilisateur, périodicité ramenée à trois mois en l'absence de système de mesure et d'alarme permanent)",
        article: "CH 39",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020304645",
        note: "« § 3. Une visite périodique doit être effectuée par l'utilisateur ou son représentant. Cette périodicité ne doit pas être supérieure à un an. En l'absence d'un système de mesure et d'alarme fonctionnant en permanence, cette périodicité est ramenée à trois mois. De plus, les caractéristiques locales ou fonctionnelles de certaines installations peuvent justifier une périodicité plus courte, qui sera portée sur le livret d'entretien. » Article ouvert à la source le 2026-09-04, page d'article. Le § 1 impose en outre un LIVRET D'ENTRETIEN de l'installation de filtration, qui n'est porté par aucune obligation — voir la réserve du corpus.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "trimestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: {
      erp: { categories: ["N1", "N2", "N3", "N4"] },
    },
    categoriesEquipement: ["VMC", "CTA"],
    notesInternes:
      "CRÉÉE LE 2026-09-04. `CH 39` n'apparaissait nulle part dans `src/` : le corpus portait `CH 57` et `CH 58` — l'entretien et la vérification technique annuels de tout le chapitre — et ignorait le seul article du chapitre qui impose un rythme à l'UTILISATEUR lui-même.\n\nTRIMESTRIELLE ET NON ANNUELLE, ET C'EST LE POINT DE CETTE LIGNE. Le § 3 écrit deux nombres : un plafond d'un an, et « trois mois » en l'absence d'un système de mesure et d'alarme fonctionnant en permanence. Le produit ne détient aucun attribut disant qu'une installation en est pourvue. La règle du dépôt tranche seule : **un allègement ne se donne pas sur une absence supposée** — c'est mot pour mot ce que `locauxSommeilPublic` écrit pour le sens `false`, et ce que la sur-application saisonnière du compactage a déjà arbitré. Encoder l'annuelle aurait multiplié le délai par quatre chez tout le monde, y compris chez les trois quarts d'exploitants qui n'ont aucune mesure permanente, et personne n'aurait pu s'en apercevoir.\n\nCE QUE LA SUR-APPLICATION COÛTE ICI, ET POURQUOI ELLE EST ACCEPTABLE : trois visites de plus par an, faites par l'exploitant ou son représentant, sans tiers ni devis — le § 3 dit « l'utilisateur ou son représentant ». Un dirigeant équipé d'un système de mesure permanent verra quatre rendez-vous là où il en doit un, et il peut reporter les occurrences. L'inverse était muet.\n\nPÉRIMÈTRE : N1 À N4. `CH 39` est au Livre II, écarté en 5ᵉ catégorie par `PE 1 § 1` sans renvoi du Livre III. Comme `incendie-erp-alarme-verification-hebdomadaire`, c'est une ligne NEUVE : elle n'hérite d'aucune sur-application ancienne, et rien n'oblige à lui en donner une. Elle est l'une des deux premières lignes du référentiel à ne s'adresser qu'aux quatre premières catégories par LECTURE du champ.\n\nDEUX CATÉGORIES D'ÉQUIPEMENT, ET LA SECONDE EST DISCUTABLE. `CTA` est l'objet même de l'article — une centrale de traitement d'air EST une installation de filtration. `VMC` l'est moins : une ventilation simple flux n'a pas toujours de filtre, une double flux en a toujours. Les deux sont retenues, pour le même motif que la périodicité et dans le même sens : un exploitant de VMC double flux qui ne verrait rien ne saurait pas qu'il doit quelque chose, tandis qu'un exploitant de VMC simple flux voit une visite trimestrielle sans objet et peut la reporter. C'est aussi le couple que porte déjà `aeration-erp-chauffage-ventilation-annuelle`, fondée sur `CH 58 § 2`, dont l'assiette inclut « les installations de traitement d'air et de ventilation visées à la section VII » — la même section que `CH 39`.\n\nPAS DE DOUBLON AVEC `aeration-erp-chauffage-ventilation-annuelle`, ET LA DIFFÉRENCE EST DE FOND, PAS DE RYTHME. Celle-ci est une VÉRIFICATION TECHNIQUE annuelle par un technicien compétent au sens de GE 6, portant sur l'installation entière (`CH 58 § 2`). Celle-là est une VISITE de l'utilisateur portant sur le seul chargement en poussières des filtres (`CH 39 § 3`). Deux articles, deux actes, deux réalisateurs, deux preuves. Le test anti-doublon compare l'article fondateur : `CH 39` n'en fonde aucune autre.\n\nCriticité 3 : un filtre colmaté dégrade le débit d'air et finit par charger le conduit de graisses ou de poussières — un risque réel, mais indirect, et le nettoyage est une opération d'exploitation. La vérification technique annuelle, qui porte sur la sécurité de l'installation, reste à 4.\n\nCE QUI N'EST PAS ENCODÉ : le LIVRET D'ENTRETIEN de l'installation de filtration (§ 1, § 2 et § 4). C'est un écrit permanent, `pieceAttendue` naturelle, que rien ne bloque au modèle. Il fera une seconde ligne le jour où on aura décidé s'il est un écrit à part ou s'il rejoint le dossier de maintenance de `R. 4224-17` et le livret de `GC 18 h)`. La réserve du corpus le porte.",
  },
  {
    id: "aeration-erp-ps-surveillance-qualite-air-inf-250",
    domaine: "aeration",
    libelle: "Contrôle biennal de la surveillance de la qualité de l'air — parcs couverts ≤ 250 véhicules (ERP)",
    description:
      "Dans les parcs de stationnement couverts des ERP de capacité inférieure ou égale à 250 véhicules, les dispositifs de surveillance de la qualité de l'air (CO, NO₂) sont contrôlés tous les deux ans.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PS 32 (rédaction arrêté du 9 mai 2006)",
        article: "PS 32",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000024812448/",
        versionConstatee: "2006-07-09",
      },
    ],
    periodicite: "biennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 3,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["VMC"],
    conditions: [
      {
        type: "equipement_propriete_numerique",
        categorie: "VMC",
        propriete: "nbVehiculesParkingCouvert",
        operateur: "<=",
        valeur: 250,
      },
    ],
    notesInternes:
      "Condition sur propriété d'équipement — à alimenter par le formulaire de déclaration (étape 4).",
  },
  {
    id: "aeration-erp-ps-surveillance-qualite-air-sup-250",
    domaine: "aeration",
    libelle: "Contrôle annuel de la surveillance de la qualité de l'air — parcs couverts > 250 véhicules (ERP)",
    description:
      "Dans les parcs de stationnement couverts des ERP de capacité supérieure à 250 véhicules, les dispositifs de surveillance de la qualité de l'air sont contrôlés annuellement.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PS 32 (rédaction arrêté du 9 mai 2006)",
        article: "PS 32",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000024812448/",
        versionConstatee: "2006-07-09",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["VMC"],
    conditions: [
      {
        type: "equipement_propriete_numerique",
        categorie: "VMC",
        propriete: "nbVehiculesParkingCouvert",
        operateur: ">",
        valeur: 250,
      },
    ],
  },
  // Note (amendement 2026-08) : l'obligation « aeration-hotte-pro-annuelle »
  // (ramonage annuel des circuits d'extraction, art. GC 20) vivait ici ET dans
  // `cuisson-hotte.ts` sous l'id `cuisson-erp-circuits-extraction-nettoyage` —
  // même article, même périodicité, même catégorie d'équipement. Les deux
  // entrées ont été fusionnées dans `cuisson-hotte.ts`, dont le domaine
  // (`cuisson_hotte`) correspond au chapitre « Grandes cuisines » du règlement
  // ERP d'où l'obligation est issue. L'id `aeration-hotte-pro-annuelle` est
  // retiré et ne doit jamais être réutilisé.

  // ---------------------------------------------------------------------------
  // Habitation — VMC-Gaz (arrêté du 23 février 2018, ex-arrêté du 25 avril 1985)
  // ---------------------------------------------------------------------------
  {
    id: "aeration-habitation-vmc-gaz-quinquennale",
    domaine: "aeration",
    libelle:
      "Contrôle quinquennal du réglage et de la sécurité collective des VMC-Gaz (habitation)",
    description:
      "Au moins une fois tous les cinq ans, l'installation collective de VMC-gaz fait l'objet du contrôle et du réglage global de l'ensemble de l'installation — notamment le réglage général du réseau aéraulique, le réglage ou le remplacement des bouches d'air et d'extraction et le relevé des pressions — ainsi que de la vérification du bon fonctionnement de l'ensemble du dispositif de sécurité collective, appareil raccordé par appareil raccordé. Ces opérations donnent lieu à un certificat remis au propriétaire ou au syndic.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 23 février 2018, art. 26 § 5° (opérations quinquennales sur les VMC-gaz)",
        article: "Arrêté 23-02-2018 art. 26",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036667631",
        note: "« Les opérations à une fréquence au moins égale à une fois tous les cinq ans portent sur : - le contrôle et le réglage global de l'ensemble de l'installation et notamment le réglage général du réseau aéraulique, le réglage ou le remplacement des bouches d'air et d'extraction et le relevé des pressions, etc. ; - la vérification du bon fonctionnement de l'ensemble du dispositif de sécurité collective ; cette vérification porte également sur chaque appareil raccordé. » Verbatim relevé en première main le 2026-08-26.",
        versionConstatee: "2023-01-01",
      },
    ],
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { habitation: true },
    categoriesEquipement: ["VMC"],
    conditions: [
      {
        type: "equipement_propriete_non_infirmee",
        categorie: "VMC",
        propriete: "estVmcGaz",
      },
    ],
    notesInternes:
      "Créée le 2026-08-26. L'article 26 § 5° fixe DEUX périodicités minimales — annuelle et quinquennale — et le référentiel ne portait que la première. Le contrôle quinquennal ne produisait donc aucune échéance, alors qu'il est le seul à vérifier le dispositif de sécurité collective DANS SON ENSEMBLE et appareil par appareil : c'est lui qui garantit que la combustion est bien coupée sur chaque logement si l'extraction s'arrête. Le contrôle annuel ne teste que le système de DÉTECTION du défaut.\n\nQuatrième occurrence du même motif après PE 4 § 2, PE 27 § 5 et EL 18 § 4 : un article qui porte plusieurs rythmes n'entrait dans le modèle que par son premier. Même forme `non_infirmee` et même criticité que l'obligation annuelle, dont elle partage la condition de déclenchement.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 23 février 2018 qui fonde cette ligne ne parle jamais de familles : son critère est l'installation COLLECTIVE de VMC-gaz. Or la famille ne recoupe pas ce critère — la 2ᵉ famille contient à la fois des habitations individuelles et des habitations collectives d'au plus trois étages sur rez-de-chaussée (art. 3 de l'arrêté du 31 janvier 1986, relu ce jour, `corpus/arrete-1986-habitation.ts`). Écarter la 1ʳᵉ famille au motif qu'elle ne comporte que des habitations individuelles serait un raisonnement, pas une lecture : aucun texte ne l'écrit, et la condition `estVmcGaz` portée par un équipement VMC déclaré trie déjà par la présence de l'installation. La typologie reste inchangée.",
  },
  {
    id: "aeration-habitation-vmc-gaz-annuelle",
    domaine: "aeration",
    libelle: "Entretien et vérification annuelle des installations collectives de VMC-Gaz (habitation)",
    description:
      "Le propriétaire ou syndic d'un immeuble d'habitation équipé d'une ventilation mécanique contrôlée desservant des appareils à gaz fait procéder chaque année au nettoyage des pales des ventilateurs, à la vérification et au remplacement éventuel des pièces d'usure, à la vérification du maintien des caractéristiques de fonctionnement de l'installation, de son état de propreté, du fonctionnement des alarmes et de l'absence de dispositifs motorisés raccordés, ainsi qu'au contrôle du bon fonctionnement du système de détection de défaut du dispositif de sécurité collective. Ces opérations donnent lieu à un certificat remis au propriétaire ou au syndic, attestant de leur réalisation effective.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 23 février 2018, art. 26 § 5° (opérations annuelles sur les VMC-gaz)",
        article: "Arrêté 23-02-2018 art. 26",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036667631",
        note: "« Les installations collectives de ventilation mécanique contrôlée - gaz, auxquelles sont raccordés des appareils à gaz font l'objet d'opérations périodiques d'entretien et de vérification […] avec l'établissement d'un certificat remis au propriétaire ou au syndic et attestant de leur réalisation effective : Les opérations à une fréquence au moins égale à une fois par an portent sur : - le nettoyage des pales des ventilateurs ; - la vérification et, le cas échéant, le remplacement des pièces d'usure ; - la vérification du maintien des caractéristiques de fonctionnement de la ventilation mécanique contrôlée-gaz, de son état de propreté, du fonctionnement des alarmes éventuelles et de l'absence de dispositifs motorisés raccordés à la ventilation mécanique contrôlée - gaz ; - le bon fonctionnement du système de détection de défaut du dispositif de sécurité collective. » Verbatim relevé en première main le 2026-08-26. L'abrogation de l'arrêté du 25 avril 1985 est confirmée par l'article 32 du même arrêté.",
        versionConstatee: "2023-01-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { habitation: true },
    categoriesEquipement: ["VMC"],
    conditions: [
      {
        type: "equipement_propriete_non_infirmee",
        categorie: "VMC",
        propriete: "estVmcGaz",
      },
    ],
    notesInternes:
      "Hors périmètre principal TPE/PME mais retenu car une TPE peut gérer un immeuble d'habitation (cf. flag estHabitation, ADR-004). L'arrêté du 25 avril 1985 ne vise QUE les VMC desservant des appareils à gaz (VMC-Gaz) : la condition `estVmcGaz` évite d'appliquer la règle à toute VMC d'habitation. Forme `non_infirmee` obligatoire ici (criticité 5) — les VMC déjà déclarées gardent l'obligation tant que le dirigeant n'a pas répondu « non » à la question du raccordement gaz.\n\nCORRIGÉ LE 2026-08-26 après lecture du texte au verbatim. La description exigeait un « contrat écrit » que l'article 26 § 5° ne demande pas : il impose un CERTIFICAT remis au propriétaire ou au syndic, attestant de la réalisation effective. Le contrat d'entretien écrit figure bien dans l'arrêté, mais au § 3°, et il porte sur les installations de GAZ situées entre l'organe de coupure générale et les compteurs — pas sur la VMC-gaz. Deux obligations distinctes avaient été confondues. La référence ne citait par ailleurs aucun article, ce qui la rendait impossible à relier au dépouillement.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 23 février 2018 qui fonde cette ligne ne parle jamais de familles : son critère est l'installation COLLECTIVE de VMC-gaz. Or la famille ne recoupe pas ce critère — la 2ᵉ famille contient à la fois des habitations individuelles et des habitations collectives d'au plus trois étages sur rez-de-chaussée (art. 3 de l'arrêté du 31 janvier 1986, relu ce jour, `corpus/arrete-1986-habitation.ts`). Écarter la 1ʳᵉ famille au motif qu'elle ne comporte que des habitations individuelles serait un raisonnement, pas une lecture : aucun texte ne l'écrit, et la condition `estVmcGaz` portée par un équipement VMC déclaré trie déjà par la présence de l'installation. La typologie reste inchangée.",
  },
];
