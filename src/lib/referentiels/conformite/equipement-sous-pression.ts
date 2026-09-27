/**
 * Obligations réglementaires — Équipements sous pression (P3).
 *
 * Sources primaires :
 *   - Code de l'environnement, articles L. 557-1 et s. (surveillance des
 *     équipements sous pression).
 *   - Décret n° 2015-799 du 1er juillet 2015 relatif aux produits et
 *     équipements à risques.
 *   - Arrêté du 20 novembre 2017 relatif au suivi en service des
 *     équipements sous pression et des récipients à pression simples.
 *
 * Scope MVP : équipements courants en TPE/PME (compresseurs, réservoirs
 * d'air comprimé). Les chaudières à haute pression, cisternes et autres
 * équipements complexes sortent du périmètre V2 (cf. CLAUDE.md).
 */

import type { ConditionApplication, Obligation } from "./types";

/**
 * Garde-fou de périmètre (amendement 2026-08).
 *
 * Les cinq obligations issues de l'arrêté du 20 novembre 2017 ne visent que les
 * équipements effectivement soumis au suivi en service : l'arrêté fixe des
 * seuils de pression maximale admissible (PS) et de volume (produit PS × V) en
 * dessous desquels un récipient n'est pas concerné. Ces seuils ne sont **pas**
 * encodés ici : ils forment un tableau par catégorie de fluide et de récipient
 * qu'on ne recopie pas sans l'avoir relu article par article sur Légifrance
 * (CLAUDE.md — ne jamais inventer une référence ni un seuil).
 *
 * En attendant, la portée est portée par une réponse explicite du dirigeant.
 * Sans elle, un petit compresseur d'atelier héritait d'une requalification
 * décennale par organisme habilité. La forme `non_infirmee` garantit qu'aucun
 * équipement déjà déclaré ne perd ces obligations en silence : elles restent
 * affichées tant que la réponse « non » n'a pas été donnée.
 *
 * `esp-personnel-formation` n'est volontairement pas conditionnée : elle
 * découle du Code du travail (R. 4323-1 à R. 4323-5), qui s'applique à tout
 * équipement de travail indépendamment des seuils de l'arrêté.
 */
const CONDITION_SUIVI_EN_SERVICE: ConditionApplication[] = [
  {
    type: "equipement_propriete_non_infirmee",
    categorie: "EQUIPEMENT_SOUS_PRESSION",
    propriete: "estSoumisSuiviEnService",
  },
];

/**
 * Le couple qui scinde l'inspection périodique de l'article 15 en deux régimes
 * (2026-09-01). Les deux membres se lisent ensemble ou pas du tout.
 *
 * `GENERATEUR_VAPEUR` porte l'égalité — un opt-in : sans famille renseignée, la
 * ligne biennale n'apparaît pas. `HORS_GENERATEUR_VAPEUR` porte la différence,
 * et c'est elle qui rend la scission sûre : elle reste satisfaite quand la
 * famille est absente, de sorte qu'un équipement dont personne n'a saisi la
 * plaque garde le régime général au lieu de tomber hors des deux.
 *
 * Poser la première sans la seconde n'aurait pas fait un trou, mais un
 * DOUBLON : le générateur de vapeur aurait reçu les deux inspections
 * périodiques, la générale et la sienne, pour un seul acte.
 */
const GENERATEUR_VAPEUR: ConditionApplication = {
  type: "equipement_propriete_enum_egale",
  categorie: "EQUIPEMENT_SOUS_PRESSION",
  propriete: "familleEsp",
  valeur: "generateur_vapeur",
};

const HORS_GENERATEUR_VAPEUR: ConditionApplication = {
  type: "equipement_propriete_enum_differente",
  categorie: "EQUIPEMENT_SOUS_PRESSION",
  propriete: "familleEsp",
  valeur: "generateur_vapeur",
};

export const obligationsEquipementSousPression: Obligation[] = [
  {
    id: "esp-declaration-mise-en-service",
    domaine: "equipement_sous_pression",
    libelle: "Déclaration et contrôle de mise en service (équipement sous pression)",
    description:
      "Les équipements sous pression dépassant les seuils fixés par l'arrêté du 20 novembre 2017 font l'objet d'une déclaration et d'un contrôle de mise en service avant leur exploitation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 7 à 11",
        article: "Arrêté 2017-11-20 art. 7-11",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
        versionConstatee: "2018-01-01",
      },
      {
        source: "CODE_ENVIRONNEMENT",
        reference: "R. 557-14-1 et s. (suivi en service)",
        article: "C. env. R. 557-14-1",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074220/LEGISCTA000030833481/",
        versionConstatee: "2016-12-31",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["exploitant", "personne_competente", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    conditions: CONDITION_SUIVI_EN_SERVICE,
    notesInternes: "NATURE : PONCTUELLE (ADR-026). Déclaration et contrôle dus une fois, avant exploitation. Le contrôle après intervention notable est porté par `esp-intervention-reparation`, ligne distincte et événementielle.",
  },
  {
    id: "esp-inspection-periodique",
    domaine: "equipement_sous_pression",
    libelle: "Inspection périodique (équipement sous pression)",
    description:
      "Inspection périodique réalisée par une personne compétente. Intervalle maximal fixé par l'arrêté : 4 ans pour la généralité des équipements, la première inspection intervenant dans les 3 ans suivant la mise en service. Les générateurs de vapeur, que l'arrêté inspecte au plus tous les deux ans, relèvent d'une échéance distincte. Le rapport est conservé au dossier d'exploitation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 15",
        article: "Arrêté 2017-11-20 art. 15",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
      },
    ],
    periodicite: "quadriennale",
    premierDelai: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_competente", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    conditions: [...CONDITION_SUIVI_EN_SERVICE, HORS_GENERATEUR_VAPEUR],
    notesInternes:
      "LA LIGNE EST DÉSORMAIS LA LIGNE GÉNÉRALE D'UN COUPLE (2026-09-01) : elle cède le générateur de vapeur à `esp-inspection-periodique-generateur-vapeur`, que l'article 15 fixe à deux ans. La condition ajoutée est une DIFFÉRENCE, forme qui reste satisfaite quand `familleEsp` n'est pas renseignée — un équipement dont la plaque n'a jamais été saisie garde donc cette ligne-ci, et n'en perd aucune. Tout ce qui suit est antérieur à cette scission.\n\nPériodicité modélisée triennale (l'enum n'a pas de « quadriennale ») : proxy conservateur des 4 ans réglementaires. Corrigé à l'audit 2026-08 : l'ancienne version citait « art. 19 » (= requalification) et « 40 mois » comme intervalle général — or 40 mois figure bien à l'article 15 de l'arrêté de 2017, mais comme mesure TRANSITOIRE réservée aux équipements déclarés avant son entrée en vigueur ; l'intervalle général est de quatre ans (constaté 2026-08-26).\n\n⚠ LA JUSTIFICATION CI-DESSUS EST FAUSSE ET LE DÉPÔT LE SAIT. « L'enum n'a pas de quadriennale » : elle l'a. La valeur est corrigée en `quadriennale`, assortie d'un `premierDelai`, sur la branche `integration/2026-09-01-recadrage` (commits `99b5f74`, `96007b5`, `1d87493`, `0ed60fe` du 2026-09-01). Cette branche-ci n'a PAS ces commits : la valeur y est encore `triennale`, et le champ `premierDelai` n'y existe pas. Ce n'est pas à un lot de correction de refaire ce travail sur une seconde branche — il se récupérera au merge. La note est laissée en place pour que personne ne la reprenne pour argent comptant en attendant.\n\nCE QUE LE LOT B AJOUTE, LU EN PREMIÈRE MAIN LE 2026-09-01 SUR L'ARTICLE 15 ROUVERT, et qui ne figure dans aucun des relevés précédents.\n\n(1) LE PLAFOND DE PREMIER CYCLE EST CONDITIONNEL. Verbatim : « Toutefois, la première inspection périodique suivant la mise en service ou une modification notable d'un équipement est fixée au maximum à 3 ans, EXCEPTÉ POUR LES ÉQUIPEMENTS QUI ONT FAIT L'OBJET D'UN CONTRÔLE DE MISE EN SERVICE CONFORME À L'ARTICLE 11, QUE CE CONTRÔLE SOIT OU NON OBLIGATOIRE. » Le trois ans ne vaut donc PAS pour un équipement dont le contrôle de mise en service a été fait et conforme : celui-là est à quatre ans dès la première inspection. Un `premierDelai` de trois ans appliqué sans condition sur-applique d'un an à tous ces équipements — c'est visible par qui la subit, donc le bon sens d'erreur, mais c'est une sur-application, et elle n'est écrite nulle part. Le produit connaît le contrôle de mise en service : il en fait une obligation, `esp-declaration-mise-en-service`.\n\n(2) LE FAIT GÉNÉRATEUR DU PREMIER CYCLE EST PLUS LARGE QUE LA MISE EN SERVICE. Le texte dit « suivant la mise en service OU UNE MODIFICATION NOTABLE ». Une modification notable rouvre le premier cycle. Le produit ne date que la mise en service.\n\n(3) UNE OBLIGATION DE RÉDUCTION, JAMAIS PORTÉE : « Si l'état d'un équipement le justifie, l'exploitant réduit les périodes maximales mentionnées ci-dessus. » C'est le pendant exact de l'« adaptée à la fréquence de l'utilisation » de l'arrêté portes : un standard sans chiffre, qu'aucune périodicité ne peut encoder.\n\nLES DEUX ANS DES GÉNÉRATEURS DE VAPEUR ET DES APPAREILS À COUVERCLE AMOVIBLE, mesurés plutôt que supposés. Le blocage n'est PAS l'absence d'attribut, contrairement à ce qu'annonçait le commit `1d87493`. `familleEsp` existe, porte la valeur `generateur_vapeur`, est posée au formulaire d'équipement (`EquipementForm`), validée par `schema.ts` et sérialisée dans `caracteristiques` — la donnée est déjà en base chez qui l'a saisie. Ce qui manque est ailleurs, et à deux endroits. D'abord `ConditionApplication` n'a aucune forme d'ÉGALITÉ sur une valeur d'énumération : ses quatre formes portent sur un nombre ou sur un booléen, et `schema.ts` annote d'ailleurs ces champs « jamais lus par le moteur ». Ensuite, séparer proprement les deux régimes demanderait aussi la NÉGATION — sans elle, la ligne générale continuerait de tomber sur le générateur de vapeur et le dirigeant verrait deux inspections périodiques sur le même appareil. Quant à l'appareil à couvercle amovible à fermeture rapide, il n'est collecté NULLE PART : `couvercleAmovible` n'est qu'un paramètre de `verdictSuiviEnService`, pas un champ du schéma. La moitié de la famille est en base, l'autre demanderait une question de plus au formulaire.\n\nLE SENS DE L'ERREUR, qui est ce qui décide de l'urgence : sur cette branche, `triennale` sous-applique d'un an à un générateur de vapeur dû à deux ans — invisible, sur une ligne de criticité 5. Après le merge de `quadriennale`, la sous-application passera à DEUX ans. Le correctif rend donc ce cas-ci strictement pire, et c'est la raison pour laquelle il se tranche maintenant plutôt qu'après.\n\nPÉRIODICITÉ PORTÉE À QUATRE ANS LE 2026-09-01, sur décision de la propriétaire. Elle était `triennale`, et la note justifiait ainsi : « l'enum n'a pas de quadriennale, proxy conservateur des 4 ans réglementaires ». La raison avait cessé d'être vraie sans que la ligne bouge : `quadriennale` existe dans l'énumération (`types-communs.ts:33`) et `elec-travail-rapport-quadriennal` s'en sert. C'est le motif de la journée — une justification juste à l'écriture, laissée debout après que ce qu'elle décrivait a changé.\n\nCE N'EST PAS UN DESSERRAGE DE CONFORT, et la distinction compte. Le dépôt encode partout les plafonds comme « la date au-delà de laquelle l'exploitant est nécessairement en défaut » — c'est la doctrine des cinq ans de la VIP, des quatre ans du SIR, des trois ans de PE 4. Trois ans inventait une échéance PLUS TÔT que le droit : l'outil déclarait en retard un exploitant qui ne l'était pas. Quatre ans est la borne du texte.\n\nLE PREMIER CYCLE EST PORTÉ PAR `premierDelai`, ajouté le 2026-09-01. Sans lui, passer la récurrence à quatre ans repoussait la première inspection d'un an — une sous-application que personne ne peut voir, sur une ligne de criticité 5. Le relevé de l'article 15, au corpus depuis le 2026-08-27, portait déjà les deux valeurs et le diagnostic : « 4 ans pour tous les autres hors tuyauteries, 3 ans pour la PREMIÈRE inspection […]. Le référentiel encode `triennale` : or le 3 ans n'est ni le régime général ni récurrent, c'est le plafond du premier cycle. » Cette ligne a porté deux justifications successives, toutes deux fausses, pendant que la bonne dormait dans le corpus — ne reformulez pas ce relevé, citez-le.\n\nCE QUI RESTE NON ENCODÉ, et que la description dit : deux ans pour les générateurs de vapeur et les appareils à couvercle amovible à fermeture rapide, un an pour certains récipients mobiles. Le modèle ne porte pas l'attribut qui distinguerait ces familles — même blocage que le recyclage d'aération avant le 2026-09-01. Ces équipements (autoclaves, stérilisateurs) sont improbables dans la cible TPE/PME, ce qui explique l'ordre de priorité, pas l'absence. S'y ajoute le 40 mois transitoire de l'article 15, réservé aux équipements déclarés avant son entrée en vigueur : non encodé, et sans objet pour un parc déclaré aujourd'hui. Corrigé à l'audit 2026-08 : l'ancienne version citait « art. 19 » (= requalification) et « 40 mois » comme intervalle général — or 40 mois figure bien à l'article 15 de l'arrêté de 2017, mais comme mesure TRANSITOIRE réservée aux équipements déclarés avant son entrée en vigueur ; l'intervalle général est de quatre ans (constaté 2026-08-26).",
  },
  {
    id: "esp-inspection-periodique-generateur-vapeur",
    domaine: "equipement_sous_pression",
    libelle: "Inspection périodique biennale (générateur de vapeur)",
    description:
      "Un générateur de vapeur est inspecté au plus tous les deux ans par une personne compétente : l'arrêté du 20 novembre 2017 lui fixe une période maximale de deux ans, là où la généralité des équipements sous pression relève de quatre ans. C'est une échéance à ne pas dépasser, pas un rendez-vous à date fixe. Le rapport est conservé au dossier d'exploitation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 15, I",
        article: "Arrêté 2017-11-20 art. 15",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
        note: "« 2 ans pour les générateurs de vapeur, les appareils à couvercle amovible à fermeture rapide ». Verbatim relevé en première main le 2026-09-01, version en vigueur depuis le 01/01/2018. L'article énonce des « périodes maximales » : le deux ans est un plafond, et il est ici le seul barreau applicable à l'équipement visé.",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "biennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_competente", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    conditions: [...CONDITION_SUIVI_EN_SERVICE, GENERATEUR_VAPEUR],
    notesInternes:
      "CRÉÉE LE 2026-09-01 (lot B3). L'ARTICLE 15 A ÉTÉ ROUVERT À LA SOURCE CE JOUR pour cette ligne, version en vigueur depuis le 01/01/2018, et non repris sur la foi du relevé du matin : « 2 ans pour les générateurs de vapeur, les appareils à couvercle amovible à fermeture rapide ». Le relevé du lot B disait vrai ; il restait à le vérifier avant d'en faire une échéance.\n\nCE QUI DÉBLOQUAIT LE CAS N'ÉTAIT PAS UN ATTRIBUT MANQUANT. `familleEsp` porte la valeur `generateur_vapeur` depuis l'origine, collectée au formulaire d'équipement, validée par `schema.ts` et sérialisée dans `caracteristiques` : la donnée était déjà en base chez qui l'avait saisie. Ce qui manquait était dans le moteur — `ConditionApplication` n'avait aucune forme d'égalité sur une valeur d'énumération. Les deux formes ajoutées le même jour (`enum_egale`, `enum_differente`) l'ouvrent, et `schema.ts` ne dit plus que ces champs sont « jamais lus par le moteur ».\n\nPLAFOND, PAS RYTHME — ET `biennale` EST POURTANT LE BON BARREAU, pour la raison qui vaut déjà sur `esp-requalification-decennale`. L'article 15 écrit des « périodes maximales » : deux ans est la date au-delà de laquelle l'exploitant est nécessairement en défaut, pas un rendez-vous à date fixe. La doctrine du dépôt admet d'encoder un plafond comme une échéance À CONDITION qu'il soit UNIQUE. Il l'est ici : pour un générateur de vapeur, l'article ne donne que ce barreau-là. C'est ce qui distingue ce cas de l'échelle générale, où 1, 2 et 4 ans coexistent selon l'équipement. La description dit « au plus tous les deux ans » et jamais « tous les deux ans ».\n\nLE SENS DE L'ERREUR CORRIGÉE, qui est ce qui décidait de l'urgence : sans cette ligne, un générateur de vapeur recevait la seule ligne générale, `triennale` sur cette branche — une SOUS-application d'un an, sur une obligation de criticité 5, et invisible : le dirigeant qui suit la date affichée est en défaut sans qu'aucun écran ne le lui dise. Après le merge de `quadriennale` (branche `integration/2026-09-01-recadrage`), la sous-application serait passée à DEUX ans. Le correctif d'à côté rendait ce cas-ci strictement pire, et c'est pourquoi il se tranchait maintenant.\n\nCONDITION STRICTE ASSUMÉE, ET INSCRITE À LA LISTE BLANCHE DE `conformite.test.ts`. L'égalité est un opt-in : sans `familleEsp` renseignée, cette ligne n'apparaît pas. Sur une obligation de criticité 5 c'est en principe interdit, et le critère de la liste est écrit — aucun établissement ne peut perdre en silence une obligation qu'il avait déjà. Ce cas y entre pour la raison exacte de `levage-vgp-semestrielle-chariot-gerbeur` : l'obligation est NEUVE, donc personne ne peut la perdre, et la couverture par défaut reste assurée par `esp-inspection-periodique`, dont la condition `enum_differente` est satisfaite tant que la famille n'est pas saisie. Le silence laisse donc le régime général en place — jamais aucun des deux.\n\nCE QUE CETTE LIGNE NE PORTE PAS, et qui est une DÉCISION PRODUIT, pas un oubli. L'article 15 met au même rang que le générateur de vapeur « les appareils à couvercle amovible à fermeture rapide ». Ceux-là ne sont collectés NULLE PART : `couvercleAmovible` n'est qu'un paramètre interne de `verdictSuiviEnService`, pas un champ du schéma ni une question du formulaire. La moitié de la famille visée par les deux ans est donc encodée, l'autre non, et la combler suppose d'ajouter une question au formulaire d'équipement — ce qu'un lot n'a pas à trancher seul. Signalé, non pris. En attendant, un appareil à couvercle amovible à fermeture rapide reste sur la ligne générale, c'est-à-dire sous-appliqué de la même façon que l'était le générateur de vapeur.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). L'inspection revient ; seul son intervalle change.",
  },
  {
    id: "esp-requalification-decennale",
    domaine: "equipement_sous_pression",
    libelle: "Requalification périodique (équipement sous pression)",
    description:
      "L'échéance MAXIMALE de la requalification périodique est de dix ans pour les récipients, tuyauteries et générateurs de vapeur, comptée depuis la mise en service ou la dernière requalification : c'est la date à ne pas dépasser, pas un rendez-vous à date fixe. L'arrêté raccourcit cette échéance à deux, trois ou six ans pour des équipements que l'on ne rencontre pas dans un restaurant, un commerce ou un bureau — bouteilles de plongée, récipients mobiles non métalliques, et récipients ou tuyauteries contenant un fluide toxique ou corrosif (art. 18). La requalification est faite par un organisme habilité et comprend, dans cet ordre, la vérification des documents du dossier d'exploitation, une inspection, une épreuve hydraulique et la vérification des accessoires de sécurité (art. 19).",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 18 et 19",
        article: "Arrêté 2017-11-20 art. 18-19",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "decennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    conditions: CONDITION_SUIVI_EN_SERVICE,
    notesInternes:
      "PLAFOND, PAS RYTHME — ET `decennale` EST POURTANT LE BON BARREAU. Lot B, 2026-09-01 : article 18 rouvert sur Légifrance, les six tirets du I recopiés un par un. Le cadrage rangeait cette ligne parmi « quatre plafonds encodés comme des rythmes » ; la lecture confirme le défaut de LECTURE et infirme le défaut de VALEUR.\n\nCE QUE L'ÉCHELLE VISE, ET POURQUOI ELLE NE MORD PAS ICI. Deux ans : bouteilles pour appareils respiratoires de plongée subaquatique, récipients mobiles en matériaux autres que métalliques. Trois ans : récipients ou tuyauteries contenant fluor, fluorure de bore, fluorure d'hydrogène, trichlorure de bore, chlorure d'hydrogène, bromure d'hydrogène, dioxyde d'azote, phosgène ou sulfure d'hydrogène, lorsqu'ils ne peuvent être exempts d'impuretés corrosives. Six ans : récipients ou tuyauteries à fluide toxique au sens du CLP ou corrosif vis-à-vis des parois, récipients mobiles non métalliques ayant subi les essais de vieillissement, bouteilles de plongée à inspection au moins annuelle. Aucun de ces objets n'entre dans un restaurant, un commerce de détail ou un bureau. Le compresseur d'atelier est un récipient de gaz du GROUPE 2 (air) : il relève des « autres récipients », donc de dix ans. Et le générateur de vapeur est NOMMÉMENT à dix ans dans cet article — c'est à l'inspection périodique de l'article 15, et là seulement, qu'il relève de deux ans. Pour la cible du produit, le cas résiduel EST le cas.\n\nLE SENS DE L'ERREUR RÉSIDUELLE : aucun. `decennale` ne sur-applique ni ne sous-applique sur cette cible, puisqu'il n'existe pas d'autre barreau à lui opposer. Ce qui restait faux était la DESCRIPTION, qui annonçait « tous les dix ans » — un rythme — là où le texte écrit « l'échéance maximale ». Corrigé ci-dessus. La valeur, elle, est laissée telle quelle, et cette immobilité est un résultat, pas une omission.\n\nDEUX CHOSES QUE CETTE LIGNE NE PORTE PAS, nommées et délibérément non encodées.\n\n(1) LES EXTINCTEURS DE PLUS DE 30 BAR. « Pour les extincteurs soumis à une pression maximale admissible de plus de 30 bar, la requalification périodique est réalisée à l'occasion du premier rechargement effectué plus de six ans après la requalification précédente, sans que le délai entre deux requalifications périodiques ne puisse excéder dix ans. Les autres extincteurs ne sont pas soumis à requalification périodique. » Ce n'est pas une périodicité : c'est une échéance conditionnée à un ÉVÉNEMENT — le rechargement — sous un plafond de dix ans. Aucune erreur n'en résulte aujourd'hui : cette obligation est bornée à la catégorie `EQUIPEMENT_SOUS_PRESSION`, et `EXTINCTEUR` est une catégorie d'équipement distincte qu'elle n'atteint pas. Le manque est donc un silence, jamais une sur-application. À NE PAS CONFONDRE avec la révision décennale de `MS 38 § 4`, qui est une obligation ERP distincte, relevée par ailleurs : les encoder l'une pour l'autre créerait un doublon sur un fondement faux.\n\n(2) LE FAIT GÉNÉRATEUR DU II. « La requalification périodique d'un équipement sous pression fixe est renouvelée lorsque celui-ci fait l'objet à la fois d'une installation dans un autre établissement ET d'un changement d'exploitant. » Les deux conditions sont cumulatives. Le produit n'observe ni le déplacement d'un équipement entre établissements ni le changement d'exploitant : c'est le même trou que celui déjà nommé sur `esp-intervention-reparation` — une obligation événementielle sans fait observable. Un dirigeant qui rachète un compresseur avec le fonds et le réinstalle chez lui doit une requalification que le produit ne réclamera pas. Le déblocage n'est pas au référentiel : il suppose que le modèle sache qu'un équipement a changé de main.",
  },
  {
    id: "esp-dossier-suivi",
    domaine: "equipement_sous_pression",
    libelle: "Tenue du dossier de suivi (équipement sous pression)",
    description:
      "L'exploitant tient un dossier permettant de retrouver à tout moment l'historique de l'équipement : déclaration, contrôles, inspections, requalifications, interventions de réparation. Pour l'ensemble de ses équipements, il tient en outre à jour une liste des récipients fixes, des générateurs de vapeur et des tuyauteries soumis aux dispositions de l'arrêté, y compris les équipements ou installations au chômage ; elle indique pour chaque équipement le type, le régime de surveillance, les dates de réalisation de la dernière et de la prochaine inspection et de la dernière et de la prochaine requalification périodique, et il la tient à la disposition des agents chargés de la surveillance des appareils à pression (arrêté du 20 novembre 2017, art. 6 III).",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 6 (dossier d'exploitation)",
        article: "Arrêté 2017-11-20 art. 6",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "dossier d'exploitation",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    conditions: CONDITION_SUIVI_EN_SERVICE,
    notesInternes: "NATURE : ÉTAT PERMANENT, `pieceAttendue: \"dossier d'exploitation\"` (ADR-026). L'article 6 de l'arrêté du 20 novembre 2017 impose le dossier lui-même, pas un acte périodique.",
  },
  {
    id: "esp-intervention-reparation",
    domaine: "equipement_sous_pression",
    libelle: "Contrôle après intervention notable (équipement sous pression)",
    description:
      "Après toute intervention notable (modification, remplacement de pièce sous pression, réparation importante), l'équipement est soumis à un contrôle avant remise en service.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 26 à 28",
        article: "Arrêté 2017-11-20 art. 26-28",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
        versionConstatee: "2025-09-08",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "evenementielle",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    conditions: CONDITION_SUIVI_EN_SERVICE,
    notesInternes:
      "Événementiel — une occurrence par intervention notable. Le générateur MVP la traite en mise_en_service_uniquement ; à affiner étape 12 avec un déclenchement manuel.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). Aucun titre de mise en service ici : l'acte n'est dû qu'« après toute intervention notable ». La périodicité `mise_en_service_uniquement` est un tenant-lieu — elle produit une ligne unique, ce qui est le bon nombre, mais le nom de la valeur dit le contraire de ce que l'obligation fait.",
  },
  {
    id: "esp-personnel-formation",
    domaine: "equipement_sous_pression",
    libelle: "Formation et information des opérateurs (équipement sous pression)",
    description:
      "Les opérateurs qui utilisent ou surveillent un équipement sous pression sont informés des consignes de sécurité et formés au fonctionnement de l'équipement et aux actions en cas d'anomalie.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-1 à R. 4323-5 (information et formation à l'utilisation des équipements de travail)",
        article: "R. 4323-1",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489707/",
        versionConstatee: "2009-12-29",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait R. 4323-55 à 57, qui régissent l'autorisation de conduite des équipements mobiles et de levage, sans rapport avec les ESP.\n\nNATURE : ÉTAT PERMANENT (ADR-026). R. 4323-1 à R. 4323-5 imposent que les opérateurs SOIENT informés et formés — un état à maintenir. Aucun rythme, aucun fait déclencheur nommé dans ces articles.",
  },
];
