// Corpus : arrêté du 19 mars 1993 — la liste des équipements de protection
// individuelle soumis à vérification générale périodique.
//
// ⚠ DEUX ARRÊTÉS DU 19 MARS 1993, ET CE DÉPÔT LES PORTE TOUS LES DEUX.
//
// Celui-ci n'est PAS `arrete-1993-03-19-travaux-dangereux`. Même jour, même
// signataires, objets sans rapport :
//   - « Arrêté du 19 mars 1993 fixant la liste des TRAVAUX DANGEREUX pour
//     lesquels il est établi par écrit un plan de prévention » — dépouillé le
//     2026-09-03, corpus `arrete-1993-03-19-travaux-dangereux`, texte
//     LEGITEXT000006081091 ;
//   - « Arrêté du 19 mars 1993 fixant la liste des ÉQUIPEMENTS DE PROTECTION
//     INDIVIDUELLE qui doivent faire l'objet des vérifications générales
//     périodiques prévues à l'article R. 233-42-2 du code du travail » — le
//     présent corpus, texte JORFTEXT000000179220.
// Les refs d'articles portent donc « (EPI) » pour que les deux ne se
// confondent jamais : `ref` est la clé de rapprochement de tout le dépôt, et
// `corpus.test.ts` interdit qu'un même `ref` reçoive deux statuts. Deux
// « Arrêté 1993-03-19 art. 1er » se seraient contredits en silence.
//
// ── POURQUOI CE FICHIER EXISTE, ET CE QU'IL TRANCHE ────────────────────────
//
// `R. 4323-99` renvoie à des arrêtés le soin de désigner les EPI soumis à
// vérification générale périodique et d'en fixer la périodicité. Il ne chiffre
// rien. Ce texte-ci est celui qui porte le fond, et il répond aux deux
// questions du lot en une phrase :
//
//   DOUZE MOIS, et cinq familles nommées. Rien d'autre.
//
// C'est le résultat que la catégorie `EPI` attendait. `types-communs.ts`
// disait, le jour où elle est entrée : « il ne faut PAS attacher d'obligation
// avant d'avoir lu R. 4323-95 à R. 4323-99 et l'arrêté qui fixe la liste des
// EPI soumis à vérification : le faire réclamerait un rendez-vous annuel à qui
// a déclaré des gants. » La lecture confirme le danger et donne la ligne de
// partage : la liste de l'article 1er est NOMINATIVE et FERMÉE. Un casque, des
// gants, des chaussures de sécurité, des lunettes, un masque à poussière, des
// protections auditives n'y figurent pas — ils relèvent du maintien en état de
// conformité de `R. 4322-1` et de l'entretien de `R. 4323-95`, qui sont des
// ÉTATS et non des rendez-vous.
//
// ── LA FORMULE DE LA PÉRIODICITÉ N'EST PAS « TOUS LES ANS » ────────────────
//
// L'article 1er écrit « doivent avoir fait l'objet, DEPUIS MOINS DE DOUZE MOIS
// AU MOMENT DE LEUR UTILISATION ». L'échéance se mesure à l'instant de
// l'usage, pas à la date de la dernière visite : un équipement non vérifié
// depuis plus de douze mois ne peut pas être utilisé. C'est le même patron que
// l'arrêté du 5 mars 1993 pour les machines, et il vaut aussi « EN SERVICE OU
// EN STOCK » — un stock de cartouches filtrantes qu'on n'a jamais sorti du
// placard est dans le champ.
//
// ── UN TEXTE VOISIN, OUVERT ET ÉCARTÉ ──────────────────────────────────────
//
// L'arrêté du 22 octobre 2009 « portant constitution des éléments attestant du
// maintien en état de conformité des équipements de protection individuelle
// d'occasion faisant l'objet d'une location ou d'une mise à disposition
// réitérée » (JORFTEXT000021232496, en vigueur, ouvert le 2026-09-04) est le
// seul autre texte que la recherche ait rattaché à `R. 4323-99`. Il est écarté
// pour deux raisons cumulatives : il ne fixe NI liste NI périodicité — il
// décrit le contenu d'une fiche de gestion, en renvoyant pour le reste à la
// notice du fabricant — et son destinataire n'est pas l'employeur mais « le
// responsable de la location ou de la mise à disposition réitérée » d'EPI
// d'occasion, c'est-à-dire le loueur. Aucun des trois secteurs cibles ne loue
// d'EPI. Il n'est pas porté au corpus : sa lecture est ici, en une ligne, plutôt
// qu'à moitié dans un fichier — seuls ses articles 1er et 3 ont été relevés en
// texte, les autres en résumé, et un demi-verbatim ne vaut pas un relevé.
//
// ── CE QUI RESTE OUVERT ────────────────────────────────────────────────────
//
// L'énumération des arrêtés pris sur `R. 4323-99` N'EST PAS GARANTIE
// EXHAUSTIVE. L'article vise « les ministres chargés du travail OU de
// l'agriculture » ; un jumeau agricole existe peut-être, comme il existe pour
// `R. 4323-23` (arrêté du 24 juin 1993), et il n'a pas été trouvé. Les panneaux
// « textes d'application » de Légifrance sont chargés en JavaScript et l'outil
// de lecture ne les rend pas ; la recherche plein texte n'a rendu que les deux
// textes ci-dessus. Dit ici plutôt que passé sous silence.
//
// ⚠ LE TEXTE RENVOIE À UNE NUMÉROTATION ABROGÉE, ET ELLE EST RECOPIÉE TELLE
// QUELLE. L'arrêté cite « l'article R. 233-42-2 du code du travail » (la
// vérification générale périodique, aujourd'hui `R. 4323-99`), « l'article
// R. 233-1-1 » (le maintien en état de conformité, aujourd'hui `R. 4322-1`) et
// « le paragraphe 1.4 de l'annexe II à l'article R. 233-151 » (la notice
// d'instructions du fabricant, recodifiée dans le livre III titre Ier). Cette
// numérotation est abrogée depuis le 1er mai 2008 par le décret n° 2008-244 du
// 7 mars 2008. Les verbatims ci-dessous ne sont PAS mis à jour : on recopie ce
// que le texte écrit, et la correspondance est donnée dans les `prescrit`.
//
// Lecture : `premiere_main`, Légifrance le 2026-09-04, sur les pages d'article
// (`loda/article_lc`) une par une, la page consolidée du texte ayant rendu
// l'article 1er en résumé et non en verbatim à la première tentative.

import type { Corpus } from "./types";

export const ARRETE_1993_03_19_EPI: Corpus = {
  id: "arrete-1993-03-19-epi",
  intitule:
    "Arrêté du 19 mars 1993 fixant la liste des équipements de protection individuelle qui doivent faire l'objet des vérifications générales périodiques prévues à l'article R. 233-42-2 du code du travail",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000179220",
  etendue: "integral",
  portee:
    "LA BRANCHE UNIQUE CONNUE de l'habilitation de R. 4323-99, et le seul texte du dépôt qui dise quels équipements de protection individuelle se vérifient. Il procède par liste NOMINATIVE et FERMÉE de cinq familles, à douze mois : appareils de protection respiratoire autonomes destinés à l'évacuation ; appareils de protection respiratoire et équipements complets destinés à des interventions accidentelles en milieu hostile ; gilets de sauvetage gonflables ; systèmes de protection individuelle contre les chutes de hauteur ; stocks de cartouches filtrantes antigaz pour appareils de protection respiratoire. TOUT CE QUI N'Y FIGURE PAS N'EST SOUMIS À AUCUNE VÉRIFICATION GÉNÉRALE PÉRIODIQUE — casques, gants, chaussures de sécurité, lunettes, protections auditives, masques à usage unique : ceux-là relèvent du maintien en état de conformité de R. 4322-1 et de l'entretien de R. 4323-95, qui sont des états permanents et non des rendez-vous. Quatre articles, tous en vigueur depuis le 1er décembre 1993 ; texte en vigueur au 2026-09-04, jamais modifié depuis sa publication (dernière mise à jour des données affichée par Légifrance : 1993-12-01). Aucune version future programmée. Intégral : les quatre articles du sommaire Légifrance sont ici, y compris la clause d'exécution. L'article 1er est `obligation_manquante` — la seule famille qui touche les secteurs cibles est celle des systèmes de protection contre les chutes de hauteur, et la porter suppose une décision de modèle qui n'appartient pas à un lot de dépouillement : la catégorie `CategorieEquipement.EPI` est une FAMILLE et non un régime, et la viser entière réclamerait ce rendez-vous à qui a déclaré des gants.",
  articles: [
    {
      ref: "Arrêté 1993-03-19 (EPI) art. 1er",
      intitule:
        "Les cinq familles d'EPI soumises à vérification générale périodique, et les douze mois",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006930405",
      versionEnVigueur: "1993-12-01",
      // Page de l'article : mention de création, aucune ligne « Modifié par ».
      // La page consolidée du texte (JORFTEXT000000179220) affiche « Dernière
      // mise à jour des données de ce texte : 01 décembre 1993 » et l'état
      // « en vigueur » au 2026-09-04 : aucun texte modificateur à signaler,
      // sur l'arrêté entier.
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "L'ARTICLE QUI PORTE TOUTE LA LIGNE DE PARTAGE DU LOT, et il tient en une phrase et cinq tirets. Il fait trois choses. (1) IL RÉSERVE L'AUTRE RÉGIME, en tête : « sans préjudice de la vérification à chaque utilisation du maintien en état de conformité […] faite en application de l'article R. 233-1-1 » — soit R. 4322-1 aujourd'hui. La vérification périodique ne remplace donc rien : elle s'ajoute à un contrôle qui, lui, est dû à CHAQUE UTILISATION et vaut pour tous les équipements sans exception. (2) IL POSE LE RYTHME, et la formule n'est pas « tous les ans » : « doivent avoir fait l'objet, DEPUIS MOINS DE DOUZE MOIS AU MOMENT DE LEUR UTILISATION, de la vérification générale périodique ». L'échéance se mesure à l'instant de l'usage ; un équipement non vérifié depuis plus de douze mois ne peut pas être utilisé. Elle vaut « EN SERVICE OU EN STOCK ». (3) IL ÉNUMÈRE, nominativement et limitativement, cinq familles et cinq seulement. Le vérificateur est à R. 4323-100 (personne qualifiée, appartenant ou non à l'établissement), le contenu de la vérification à l'article 2 ci-dessous, la consignation à R. 4323-101 et -102.",
      citationCle:
        "Sans préjudice de la vérification à chaque utilisation du maintien en état de conformité des équipements de protection individuelle faite en application de l'article R. 233-1-1 du code du travail, les équipements de protection individuelle suivants, en service ou en stock, doivent avoir fait l'objet, depuis moins de douze mois au moment de leur utilisation, de la vérification générale périodique prévue à l'article R. 233-42-2 du code du travail : - appareils de protection respiratoire autonomes destinés à l'évacuation ; - appareils de protection respiratoire et équipements complets destinés à des interventions accidentelles en milieu hostile ; - gilets de sauvetage gonflables ; - systèmes de protection individuelle contre les chutes de hauteur ; - stocks de cartouches filtrantes antigaz pour appareils de protection respiratoire.",
      statut: "retenu",
      obligations: ["epi-verification-generale-periodique"],
      reserve:
        "UNE SEULE EXIGENCE DE L'ARTICLE QUE L'OBLIGATION NE PORTE PAS : « EN SERVICE OU EN STOCK ». L'article soumet au même régime l'équipement rangé et l'équipement utilisé, et compte les douze mois « au moment de leur utilisation » — un harnais qui dort au placard n'a donc rien à subir tant qu'on n'y touche pas, mais il ne peut pas être mis en service sans vérification récente. Le produit ne distingue pas le stock du service : un équipement déclaré porte son échéance.\n\nL'ÉCART SUR-APPLIQUE, ET C'EST LE SENS QU'ON A CHOISI. Il réclame une vérification annuelle d'un équipement qu'on n'utilise pas ; l'écart inverse aurait dispensé du contrôle un équipement dont la défaillance se découvre le jour où l'on en a besoin. Il est de surcroît VISIBLE par celui qui le subit, qui voit l'échéance et peut la traiter.\n\nLA PÉREMPTION A QUITTÉ CETTE RÉSERVE LE 2026-09-04. Le 3° de l'article 2 fait constater l'élimination des équipements arrivés à la date fixée par le fabricant ; aucun champ ne la stockait. `Equipement.datePeremption` existe désormais, la fiche l'affiche et signale « Périmé depuis » quand elle est passée. Elle n'ouvre aucune échéance — c'est une fin de vie, pas un rythme, et la conséquence est portée par la vérification elle-même. Inscrite aux exclusions de l'ADR-010.",

    },
    {
      ref: "Arrêté 1993-03-19 (EPI) art. 2",
      intitule: "Contenu de la vérification générale périodique",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006930406",
      versionEnVigueur: "1993-12-01",
      // Page de l'article : mention de création, aucune ligne « Modifié par ».
      // Même constat que pour l'article 1er, sur l'arrêté entier.
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Fixe le CONTENU de la vérification de l'article 1er, en trois objets numérotés. Le 1° est le bon état des équipements en service et en stock, « conformément aux instructions de révision incluses dans la notice d'instructions » du fabricant — la vérification est donc indexée sur la notice, et non sur un protocole que l'arrêté écrirait. Il détaille ensuite, famille par famille, ce sur quoi elle porte « en particulier » : source d'oxygène et étanchéité pour les appareils autonomes d'évacuation ; source d'oxygène, étanchéité et efficacité de la protection pour les appareils et équipements complets d'intervention en milieu hostile ; source de gaz, étanchéité et fonctionnement du percuteur pour les gilets de sauvetage gonflables ; ÉTAT GÉNÉRAL DES COUTURES ET DES MODES DE FIXATION pour les systèmes de protection individuelle contre les chutes de hauteur. Le 2° est le respect des instructions de stockage de la notice. Le 3° impose de prendre les mesures nécessaires pour que les équipements soient ÉLIMINÉS EN TEMPS UTILE à l'expiration de leur durée de vie ou de leur date de péremption, définie par le fabricant. C'est l'équivalent, pour ce texte, de ce que l'article 3 de l'arrêté du 5 mars 1993 est aux machines.",
      citationCle:
        "La vérification périodique prévue à l'article 1er a pour objet : 1° De s'assurer du bon état des équipements de protection individuelle en service et en stock, conformément aux instructions de révision incluses dans la notice d'instructions prévue par le paragraphe 1.4 de l'annexe II à l'article R. 233-151 du code du travail. Cette vérification concerne en particulier : - la source d'oxygène et l'étanchéité des appareils de protection respiratoire autonomes destinés à l'évacuation ; - la source d'oxygène, l'étanchéité et l'efficacité de la protection des appareils de protection respiratoire et équipements complets destinés à des interventions accidentelles en milieu hostile ; - la source de gaz et l'étanchéité des gilets de sauvetage gonflables ainsi que le fonctionnement du percuteur ; - l'état général des coutures et des modes de fixation des systèmes de protection individuelle contre les chutes de hauteur : 2° De s'assurer du respect des instructions de stockage incluses dans la notice d'instructions. 3° De prendre les mesures nécessaires pour qu'à l'expiration de la durée de vie ou de la date de péremption des équipements de protection individuelle, définie par le fabricant, ceux-ci soient éliminés en temps utile.",
      statut: "sans_objet",
      motif:
        "Article de CONTENU, pas d'assujettissement : il dit sur quoi porte la vérification, jamais qui la doit ni quand. Il ne crée aucune échéance propre et ne peut fonder aucune obligation à lui seul — même partage que l'article 3 de l'arrêté du 5 mars 1993, classé sans objet pour le même motif, et que l'article 9 de l'arrêté du 1er mars 2004 en levage, où le lot A a dû défaire un fondement posé sur l'article de définition. L'assujettissement est à l'article 1er. ⚠ UNE NUANCE À NE PAS PERDRE SI CET ARTICLE SERT UN JOUR DE DESCRIPTION : le 3° ne demande pas une vérification de plus, il demande l'ÉLIMINATION en temps utile des équipements périmés — la date de péremption vient du FABRICANT, pas de l'arrêté, et le produit n'a aucun moyen de la connaître. Une échéance calculée sur une durée de vie supposée serait inventée.",
    },
    {
      ref: "Arrêté 1993-03-19 (EPI) art. 3",
      intitule: "Date d'application",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006930407",
      versionEnVigueur: "1993-12-01",
      // Page de l'article : mention de création, aucune ligne « Modifié par ».
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Une phrase : l'arrêté est applicable à compter du 1er décembre 1993. Aucune prescription à un employeur.",
      citationCle:
        "Le présent arrêté est applicable à compter du 1er décembre 1993.",
      statut: "sans_objet",
      motif:
        "Clause de date d'entrée en vigueur, épuisée depuis le 1er décembre 1993. Relevée ici, et non omise, parce que le corpus est déclaré `integral` — un article que le produit n'utilise pas se compte quand même, sans quoi « intégral » ne voudrait rien dire.",
    },
    {
      ref: "Arrêté 1993-03-19 (EPI) art. 4",
      intitule: "Clause d'exécution",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006930408",
      versionEnVigueur: "1993-12-01",
      // Page de l'article : mention de création, aucune ligne « Modifié par ».
      // NOTER, parce que c'est un écart avec le corpus voisin : l'article 5 de
      // l'arrêté du 5 mars 1993 porte « directeur général du travail », le
      // décret n° 2006-1033 du 22 août 2006 ayant substitué ce titre à
      // « directeur des relations du travail » dans les dispositions
      // réglementaires. La version consolidée du présent article, elle, porte
      // toujours l'ancien titre au 2026-09-04. C'est ce que Légifrance
      // affiche ; on recopie, on ne corrige pas.
      modifiePar: null,
      luLe: "2026-09-04",
      lecture: "premiere_main",
      prescrit:
        "Charge le directeur des relations du travail et le directeur des exploitations, de la politique sociale et de l'emploi de l'exécution de l'arrêté, et ordonne sa publication au Journal officiel. Aucune prescription à un employeur.",
      citationCle:
        "Le directeur des relations du travail au ministère du travail, de l'emploi et de la formation professionnelle et le directeur des exploitations, de la politique sociale et de l'emploi au ministère de l'agriculture et du développement rural sont chargés, chacun en ce qui le concerne, de l'exécution du présent arrêté, qui sera publié au Journal officiel de la République française.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "Clause d'exécution : elle s'adresse à deux directeurs d'administration centrale, pas à un exploitant.",
    },
  ],
};
