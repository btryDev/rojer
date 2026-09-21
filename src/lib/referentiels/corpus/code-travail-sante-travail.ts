// Corpus : code du travail — suivi individuel de l'état de santé du travailleur.
//
// Étendue « articles_cites » : la section 2 du chapitre IV court de R. 4624-10
// à R. 4624-45-9 — une quarantaine d'articles, dont le suivi post-exposition,
// la fiche d'entreprise et les contestations d'avis. ~~Neuf seulement sont lus
// ici, ceux sur lesquels s'appuient les six obligations encodées.~~ SEIZE au
// 2026-09-20 : le compte de neuf était périmé depuis plusieurs lots, et il a
// encore vieilli de deux ce jour-là. Le reste n'est pas dépouillé et ne se
// déclare pas lu. ⚠ LES EXAMENS DE REPRISE NE SONT PLUS « le reste » : le
// paragraphe 2 de la sous-section 3 est entré le 2026-09-20 par R. 4624-31,
// trouvé en ouvrant le texte modificateur de R. 4624-28-3. R. 4624-29,
// R. 4624-30, R. 4624-32 et R. 4624-33 restent dehors.
//
// CE QUE CE CORPUS A DE PARTICULIER, ET QUI DOIT SE LIRE AVANT DE L'ÉTENDRE.
// C'est le seul corpus du référentiel dont toutes les obligations salarié
// portent `pieceMedicale: true`. Le produit ne détient de ces visites que trois
// choses — qu'elles ont eu lieu, quand, et quand la suivante est due. Jamais
// l'avis d'aptitude, jamais une restriction, jamais un motif, jamais la pièce.
// C'est plus strict que le droit, et c'est un choix produit assumé, motivé dans
// `docs/rgpd.md` § 2.3.
//
// LES PÉRIODICITÉS SONT DES PLAFONDS, PAS DES RENDEZ-VOUS. Le texte écrit « qui
// ne peut excéder cinq ans » (R. 4624-16) et « qui ne peut être supérieure à
// quatre ans » (R. 4624-28) ; dans les deux cas le médecin du travail fixe le
// délai réel, plus court, en fonction de l'âge, de l'état de santé et des
// risques. Les cinq et quatre ans encodés sont donc la borne extérieure — la
// date au-delà de laquelle l'employeur est nécessairement en défaut — et non le
// rythme que le médecin a retenu. Ce n'est pas une périodicité inventée : les
// deux nombres sont écrits dans le Code. Mais un dirigeant qui lirait « échéance
// dans cinq ans » là où son médecin a fixé trois ans serait mal informé, et
// c'est pourquoi chaque obligation le dit dans sa `description`, et pourquoi
// `TitreSalarie.echeanceLe`, déclaré par l'employeur, prime sur tout calcul.
//
// ⚠ LES CINQ ET QUATRE ANS NE SONT PAS DES BORNES UNIVERSELLES, et la première
// rédaction de ce corpus l'a affirmé à tort. Deux articles y dérogent, tous
// deux relevés le 2026-08-31 à la relecture :
//
//  * `R. 4624-17` — pour le travailleur handicapé, celui qui déclare une
//    pension d'invalidité et le travailleur de nuit, la périodicité « n'excède
//    pas une durée de trois ans ». Annoncer cinq ans à ces salariés, c'est se
//    tromper de deux ans, et dans le sens permissif ;
//  * `R. 4451-82` — pour le travailleur exposé aux rayonnements ionisants
//    classé en catégorie A, la visite du suivi renforcé « est renouvelée chaque
//    année » et « la visite intermédiaire n'est pas requise ». Quatre ans au
//    lieu d'un, et une échéance intermédiaire que le droit exclut.
//
// Les deux sont désormais encodés, chacun par sa propre ligne de catalogue.
//
// ⚠ ET LE I N'EST PAS UNE LISTE FERMÉE — le `II` ajoute « tout poste pour
// lequel l'affectation sur celui-ci est conditionnée à un examen d'aptitude
// spécifique prévu par le présent code ». Il est en vigueur depuis le
// 28/04/2022 (décret n° 2022-679 du 26 avril 2022, art. 2), et NON depuis le
// 10/04/2026 comme l'affirmait ce commentaire : la date de 2026 est celle de la
// version courante de l'article, pas celle du paragraphe. Relevé à la source le
// 2026-09-01 sur la version antérieure de l'article (en vigueur du 28/04/2022
// au 10/04/2026), qui porte déjà ce II mot pour mot.
// Les « sept expositions » ci-dessous désignent donc les sept alinéas du I, et
// non l'assiette du suivi renforcé, qui est ouverte. Le paragraphe a été relevé
// à la source le 2026-08-31 ; il figurait déjà dans la `reserve` de l'article,
// et manquait à son `prescrit` — c'est-à-dire au champ qu'on lit pour savoir ce
// que l'article dit.
//
// ⚠ AUCUN des textes propres aux sept expositions du `R. 4624-23 I` n'a été
// ouvert par CE corpus. Une rédaction antérieure affirmait ici qu'« amiante (R. 4412-118) et
// plomb (R. 4412-160) renvoient aux articles R. 4624-22 à R. 4624-28 sans y
// déroger », en se protégeant sur les cinq autres. Les deux assertions étaient
// FAUSSES, et leur prudence de façade les rendait pires : elle donnait à croire
// que ces deux-là avaient été lus.
//
//  * `R. 4412-160` est ABROGÉ — par le décret n° 2026-253 du 8 avril 2026,
//    art. 3, 1°, avec effet au 10/04/2026. C'est le décret que ce fichier cite
//    lui-même dans sa `portee` à propos de `R. 4624-23` : l'article avait été vu
//    mourir et cité vivant dans le même commentaire ;
//  * `R. 4412-118` porte l'ORGANISATION DES VACATIONS en travaux amiante —
//    temps d'habillage, de décontamination, de pause, avec renvoi à
//    `L. 3121-16` et `L. 3121-17`. Rien sur le suivi individuel renforcé.
//
// Les deux ont été relevés à la source le 2026-08-31, après coup. La faute
// d'origine est nommée parce qu'elle se reproduit facilement : ces deux
// articles n'avaient été vus qu'en résumé de moteur de recherche, et « vérifié »
// avait été écrit sans que la page ait été ouverte.
//
// `L. 4622-1` A QUITTÉ CE CORPUS le 2026-09-01, et il faut dire pourquoi plutôt
// que de le laisser disparaître. Il y était entré en `obligation_manquante` :
// le socle de tout le suivi individuel, lu, et que le référentiel ne portait
// pas. Le lot 8 l'a encodé le 2026-08-31 —
// `sante-travail-etablissement-adhesion-spst` — dans un corpus neuf,
// `code-travail-service-prevention-sante`, qui dépouille les quatre articles du
// titre II ; il n'a pas retiré l'entrée d'origine. Le même article s'est donc
// trouvé porté DEUX FOIS, `obligation_manquante` ici et `retenu` là-bas, même
// url, même version, même verbatim, même `luLe`. Pendant trois jours le
// registre qui dit ce qui MANQUE au référentiel a déclaré manquante une
// obligation livrée.
//
// L'entrée est supprimée plutôt que requalifiée : l'article relève du titre II,
// pas de la section 2 du chapitre IV que ce corpus dépouille, et le laisser en
// `retenu` aurait maintenu le double compte de `couvertureParCorpus()` en
// échangeant seulement un mensonge contre une redondance. Il reste déclaré lu —
// `referencesDepouillees()` le tient de l'autre corpus, qui l'a ouvert.
//
// Ce que ce défaut a coûté à mesurer : rien ne l'a signalé. Le test d'unicité
// ne regardait qu'à l'intérieur d'un corpus, et la garde qui aurait dû crier
// exigeait au contraire `L. 4622-1` parmi les manquantes. Voir la garde de
// cohérence inter-corpus de `corpus.test.ts`, écrite avec cette correction.
//
// ─────────────────────────────────────────────────────────────────────────────
// DÉCRET N° 2026-253 DU 8 AVRIL 2026 — DÉPOUILLÉ ARTICLE PAR ARTICLE LE
// 2026-09-01. Il ne restait plus rien à en craindre pour ce corpus, mais il
// fallait l'ouvrir pour le savoir : il avait été rencontré deux fois par
// accident, jamais lu.
//
// Objet réel du décret : VLEP plomb, diisocyanates et émissions diesel
// (transposition de la directive (UE) 2024/869). Sept articles, treize articles
// de code touchés — R. 4412-149, R. 4412-152, R. 4412-160, R. 4624-23,
// R. 4721-6 à R. 4721-10, R. 4724-14, R. 4724-14-1, R. 4724-14-2 et R. 717-16
// du code rural. UN SEUL est cité par le référentiel : `R. 4624-23`.
//
// ⚠ CE QU'IL A FAIT À `R. 4624-23`, ET CE N'EST PAS UNE RÉÉCRITURE. Verbatim de
// l'art. 3 relevé le 2026-09-01 : « 1° L'article R. 4412-160 est abrogé ;
// 2° Au 2° du I de l'article R. 4624-23, les mots : "dans les conditions
// prévues à l'article R. 4412-160" sont supprimés. » Sept mots retirés d'un
// alinéa, rien d'autre. Légifrance affiche « Modifié par », non « Remplacé ».
// Les III et IV — dont le III qui fonde
// `sante-travail-etablissement-liste-postes-risques` — sont inchangés.
//
// ET C'EST UN ÉLARGISSEMENT, qui n'était consigné nulle part. Avant le
// 10/04/2026 le I 2° lisait « Au plomb dans les conditions prévues à l'article
// R. 4412-160 », et cet article — relevé à la source le 2026-09-01 dans sa
// dernière version, en vigueur du 01/01/2017 au 10/04/2026 — subordonnait le
// suivi renforcé à des SEUILS : « 1° Soit si l'exposition à une concentration
// de plomb dans l'air est supérieure à 0,05 mg/m³ […] ; 2° Soit si une
// plombémie supérieure à 200 µg/l de sang pour les hommes ou 100 µg/l de sang
// pour les femmes est mesurée chez un travailleur. » Le I 2° lit désormais
// « Au plomb ; » — sans seuil. L'assiette du suivi renforcé s'est donc ÉLARGIE
// pour le plomb. Sans effet sur ce que le produit calcule, puisqu'il ne dérive
// jamais qui relève du suivi renforcé et s'en remet à la liste que le III fait
// tenir à l'employeur ; écrit ici parce que c'est le seul effet de droit réel
// du décret sur ce corpus, et qu'il avait été pris pour autre chose.
// ─────────────────────────────────────────────────────────────────────────────
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-08-31, complétés
// le 2026-09-01 pour le décret n° 2026-253.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_SANTE_TRAVAIL: Corpus = {
  id: "code-travail-sante-travail",
  intitule:
    "Code du travail — suivi individuel de l'état de santé du travailleur",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018493140/",
  etendue: "articles_cites",
  portee:
    "Des extraits de la section 2 du chapitre IV : visite d'information et de prévention, sa périodicité et ses modalités adaptées (R. 4624-10, R. 4624-16 à R. 4624-18), suivi individuel renforcé — champ, liste des postes à risques particuliers, examen d'aptitude et périodicité (R. 4624-22 à R. 4624-24, R. 4624-27, R. 4624-28), et les trois articles de la surveillance post-exposition qui prolongent la sous-section jusqu'à R. 4624-28-3. S'y ajoute R. 4451-82, hors de cette section : il déroge à la périodicité du suivi renforcé pour les travailleurs exposés aux rayonnements ionisants classés en catégorie A, et il n'a de sens que lu avec R. 4624-28. Le préalable de tout ce corpus — `L. 4622-1`, l'organisation d'un service de prévention et de santé au travail — n'est PAS lu ici : il relève du titre II du livre VI, que dépouille `code-travail-service-prevention-sante`. ATTENTION : R. 4624-23 a été MODIFIÉ au 10 avril 2026 par le décret n° 2026-253 du 8 avril 2026, art. 3, 2° — modification et non réécriture : sept mots supprimés au 2° de son I, qui subordonnait le suivi renforcé du plomb aux seuils de R. 4412-160, abrogé le même jour. Les III et IV, seuls encodés, sont inchangés. Cette portée classait par ailleurs l'article en tête du référentiel par sa fraîcheur ; le rang n'y est plus écrit, la date en vigueur ci-dessus dit ce qu'il disait d'utile.",
  articles: [
    {
      ref: "R. 4624-10",
      intitule: "Visite d'information et de prévention initiale",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769085",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Tout travailleur bénéficie d'une visite d'information et de prévention dans un délai qui n'excède pas trois mois à compter de la prise effective du poste.",
      citationCle:
        "Tout travailleur bénéficie d'une visite d'information et de prévention, réalisée par l'un des professionnels de santé mentionnés au premier alinéa de l'article L. 4624-1 dans un délai qui n'excède pas trois mois à compter de la prise effective du poste de travail.",
      statut: "retenu",
      obligations: ["sante-travail-salarie-vip"],
      reserve:
        "Le délai de trois mois court depuis la prise effective du poste, pas depuis la visite précédente : ce n'est pas une périodicité, et le modèle ne l'exprime pas. `Periodicite` décrit une récurrence, et `TitreSalarie.delivreLe` porte la date de la visite reçue, pas celle de l'embauche. Le délai est rappelé dans la description de l'obligation ; il n'est pas calculé.",
    },
    {
      ref: "R. 4624-16",
      intitule: "Périodicité du renouvellement de la visite d'information",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769063",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le renouvellement de la visite d'information et de prévention intervient selon une périodicité qui ne peut excéder cinq ans, fixée par le médecin du travail au regard des conditions de travail, de l'âge, de l'état de santé et des risques.",
      citationCle:
        "Le travailleur bénéficie d'un renouvellement de la visite d'information et de prévention initiale, réalisée par un professionnel de santé mentionné au premier alinéa de l'article L. 4624-1, selon une périodicité qui ne peut excéder cinq ans. Ce délai, qui prend en compte les conditions de travail, l'âge et l'état de santé du salarié, ainsi que les risques auxquels il est exposé, est fixé par le médecin du travail dans le cadre du protocole mentionné à l'article L. 4624-1.",
      statut: "retenu",
      obligations: ["sante-travail-salarie-vip"],
    },
    {
      ref: "R. 4624-17",
      intitule:
        "Modalités de suivi adaptées — périodicité qui n'excède pas trois ans",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769059",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le travailleur dont l'état de santé, l'âge, les conditions de travail ou les risques le nécessitent — notamment le travailleur handicapé, celui qui déclare être titulaire d'une pension d'invalidité et le travailleur de nuit — bénéficie de modalités de suivi adaptées, selon une périodicité qui n'excède pas trois ans.",
      citationCle:
        "Tout travailleur dont l'état de santé, l'âge, les conditions de travail ou les risques professionnels auxquels il est exposé le nécessitent, notamment les travailleurs handicapés, les travailleurs qui déclarent être titulaires d'une pension d'invalidité et les travailleurs de nuit mentionnés à l'article L. 3122-5, bénéficie, à l'issue de la visite d'information et de prévention, de modalités de suivi adaptées déterminées dans le cadre du protocole écrit prévu au troisième alinéa de l'article L. 4624-1, selon une périodicité qui n'excède pas une durée de trois ans.",
      statut: "retenu",
      obligations: ["sante-travail-salarie-vip-adaptee"],
      reserve:
        "Le produit ne DÉCLENCHE pas cette modalité : rien dans le modèle ne dit qu'un salarié est handicapé, titulaire d'une pension d'invalidité ou travailleur de nuit, et il ne faut surtout pas le déduire — ce serait une donnée sensible dérivée, exactement ce que `docs/rgpd.md` interdit. Le questionnaire DUERP pose bien une question sur le travail de nuit (`q-travail-nuit`), mais elle porte sur l'ORGANISATION de l'établissement, pas sur des personnes nommées. L'employeur déclare le titre pour qui il sait concerné ; l'outil fournit la ligne de catalogue et le rythme.",
    },
    {
      ref: "R. 4624-18",
      intitule:
        "Visite préalable à l'affectation — travailleurs de nuit et mineurs",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769047",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le travailleur de nuit et le travailleur de moins de dix-huit ans bénéficient d'une visite d'information et de prévention PRÉALABLEMENT à leur affectation sur le poste, et non dans les trois mois qui suivent.",
      citationCle:
        "Tout travailleur de nuit mentionné à l'article L. 3122-5 et tout travailleur âgé de moins de dix-huit ans bénéficie d'une visite d'information et de prévention réalisée par un professionnel de santé mentionné au premier alinéa de l'article L. 4624-1 préalablement à son affectation sur le poste.",
      statut: "retenu",
      obligations: ["sante-travail-salarie-vip-adaptee"],
      reserve:
        "L'article renverse le calendrier d'entrée de R. 4624-10 : la visite est due AVANT l'affectation, quand le régime général l'admet dans les trois mois qui suivent. Ce renversement n'est pas calculé — le modèle ne porte pas la date d'affectation, et `Periodicite` décrit une récurrence, pas un délai à compter d'un fait d'emploi. Il est écrit dans la description de l'obligation. À noter aussi : le travailleur de moins de dix-huit ans n'est PAS dans la liste de R. 4624-17, donc il relève du rythme général de cinq ans tout en ayant cette visite d'entrée anticipée. Les deux articles ne se recouvrent qu'en partie.",
    },
    {
      ref: "R. 4451-82",
      intitule:
        "Rayonnements ionisants — dérogation à la périodicité du suivi renforcé (catégorie A)",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037024438",
      versionEnVigueur: "2018-07-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Pour un travailleur classé en catégorie A, la visite médicale du suivi individuel renforcé est renouvelée chaque année, et la visite intermédiaire n'est pas requise.",
      citationCle:
        "Le suivi individuel renforcé des travailleurs classés au sens de l'article R. 4451-57 ou des travailleurs faisant l'objet d'un suivi individuel de l'exposition au radon prévu à l'article R. 4451-65 est assuré dans les conditions prévues aux articles R. 4624-22 à R. 4624-28. Pour un travailleur classé en catégorie A, la visite médicale mentionnée à l'article R. 4624-28 est renouvelée chaque année. La visite intermédiaire mentionnée au même article n'est pas requise.",
      statut: "retenu",
      obligations: ["sante-travail-salarie-sir-categorie-a"],
      reserve:
        "L'article déroge DEUX FOIS à R. 4624-28 : la périodicité passe de quatre ans à un an, et la visite intermédiaire biennale disparaît. Le second point compte autant que le premier — déclarer une visite intermédiaire à un travailleur de catégorie A inscrirait au calendrier une échéance que le droit exclut expressément. La classification en catégorie A (R. 4451-57) n'est pas dérivée : l'employeur déclare le titre.",
    },
    {
      ref: "R. 4624-22",
      intitule: "Champ du suivi individuel renforcé",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769092",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Tout travailleur affecté à un poste présentant des risques particuliers au sens de R. 4624-23 bénéficie d'un suivi individuel renforcé de son état de santé.",
      citationCle:
        "Tout travailleur affecté à un poste présentant des risques particuliers pour sa santé ou sa sécurité ou pour celles de ses collègues ou des tiers évoluant dans l'environnement immédiat de travail défini à l'article R. 4624-23 bénéficie d'un suivi individuel renforcé de son état de santé selon des modalités définies par la présente sous-section.",
      statut: "retenu",
      obligations: ["sante-travail-salarie-sir"],
    },
    {
      ref: "R. 4624-23",
      intitule: "Postes présentant des risques particuliers",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483826",
      versionEnVigueur: "2026-04-10",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le I fixe une liste de sept expositions ouvrant un suivi individuel renforcé. Le II ÉLARGIT cette assiette sans énumérer : « Présente également des risques particuliers tout poste pour lequel l'affectation sur celui-ci est conditionnée à un examen d'aptitude spécifique prévu par le présent code. » Le III met à la charge de l'employeur une liste complémentaire de postes, motivée par écrit, transmise au service de prévention et de santé au travail et mise à jour tous les ans. Le IV fait consulter le Conseil d'orientation des conditions de travail tous les trois ans sur la mise à jour de la liste du I — il ne s'adresse pas à l'employeur.",
      citationCle:
        "S'il le juge nécessaire, l'employeur complète la liste des postes entrant dans les catégories mentionnées au I. par des postes présentant des risques particuliers […] après avis du ou des médecins concernés et du comité social et économique s'il existe, en cohérence avec l'évaluation des risques prévue à l'article L. 4121-3 et, le cas échéant, la fiche d'entreprise prévue à l'article R. 4624-46. Cette liste est transmise au service de prévention et de santé au travail, tenue à disposition du directeur régional des entreprises, de la concurrence, de la consommation, du travail et de l'emploi et des services de prévention des organismes de sécurité sociale et mise à jour tous les ans. L'employeur motive par écrit l'inscription de tout poste sur cette liste.",
      statut: "retenu",
      obligations: ["sante-travail-etablissement-liste-postes-risques"],
      reserve:
        "Le I — amiante, plomb, agents CMR, agents biologiques des groupes 3 et 4, rayonnements ionisants, risque hyperbare, chute de hauteur au montage d'échafaudages — n'est pas encodé comme déclencheur, et ne peut pas l'être : rien dans le modèle ne dit à quoi un salarié est exposé, et le déduire serait le cinquième déclencheur (activité réellement exercée), non implémenté. Le II — tout poste dont l'affectation est conditionnée à un examen d'aptitude spécifique prévu par le Code — reste également hors du calcul. Le IV, qui fait consulter le Conseil d'orientation des conditions de travail tous les trois ans sur la mise à jour de la liste du I, ne concerne pas l'employeur.\n\nAMENDEMENT 2026-08-31, SOIR — LE II EST DÉSORMAIS DANS `prescrit`, ET IL N'Y ÉTAIT PAS. La description disait « le I fixe la liste […] ; le III met à la charge de l'employeur », en sautant un paragraphe sur quatre de l'article qu'elle prétend décrire. La réserve ci-dessus le mentionnait — donc l'article avait bien été lu en entier — mais un lecteur qui s'arrête à `prescrit`, c'est-à-dire au champ fait pour ça, en repartait avec une liste fermée. Verbatim du II relevé une seconde fois à la source ce jour, version en vigueur au 10/04/2026, identique au premier relevé.\n\nPOURQUOI CE N'EST PAS UNE `obligation_manquante`, et c'est l'arbitrage que ce paragraphe demandait. Le II ne crée aucune obligation d'employeur : il dit ce qui compte comme poste à risques particuliers, donc il élargit l'ASSIETTE d'une liste que le III fait déjà tenir — et cette obligation-là est encodée (`sante-travail-etablissement-liste-postes-risques`). Le classer manquant ferait croire à un acte non porté alors que l'acte est porté et que c'est son périmètre qui bouge. Le comportement du produit ne change pas non plus : il ne dérive jamais qui relève du suivi renforcé, il demande à l'employeur de tenir la liste — le II lui donne une raison de plus d'y inscrire un poste, pas un geste de plus à faire.\n\nCE QUE LE II CHANGE MALGRÉ TOUT, et qui est la vraie raison de l'écrire : le déclencheur du I n'est PAS une liste fermée. Toute règle du Code qui subordonne une affectation à un examen d'aptitude spécifique verse le poste au suivi renforcé, sans figurer aux sept alinéas. Une lecture qui s'arrêterait au I conclurait à tort qu'un poste hors des sept est hors du suivi.",
    },
    {
      ref: "R. 4624-24",
      intitule: "Examen médical d'aptitude préalable à l'affectation",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769104",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le suivi individuel renforcé comprend un examen médical d'aptitude, qui se substitue à la visite d'information et de prévention et qui est effectué par le médecin du travail préalablement à l'affectation sur le poste.",
      citationCle:
        "Le suivi individuel renforcé comprend un examen médical d'aptitude, qui se substitue à la visite d'information et de prévention prévue à l'article R. 4624-10. Il est effectué par le médecin du travail préalablement à l'affectation sur le poste.",
      statut: "retenu",
      obligations: ["sante-travail-salarie-sir"],
      reserve:
        "Les cinq finalités énumérées par l'article — vérifier l'aptitude au poste, rechercher une affection dangereuse pour les autres, proposer des adaptations, informer et sensibiliser le travailleur — décrivent le contenu médical de l'examen. Rien n'en est encodé, et rien ne doit l'être : c'est exactement ce que `docs/rgpd.md` § 2.3 exclut du produit. Le référentiel retient de cet article qu'un examen est dû avant l'affectation, et qu'il se substitue à la VIP.",
    },
    {
      ref: "R. 4624-27",
      intitule:
        "Dispense d'examen d'aptitude — visite dans les deux ans précédant l'embauche",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769096",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'examen d'aptitude préalable n'est pas requis lorsque le travailleur en a bénéficié dans les deux ans précédant son embauche, sous trois conditions cumulatives : emploi identique présentant des risques d'exposition équivalents, dernier avis d'aptitude en possession du médecin du travail, et aucune mesure de L. 4624-3 ni avis d'inaptitude de L. 4624-4 dans les deux ans.",
      citationCle:
        "Lorsque le travailleur a bénéficié d'une visite médicale d'aptitude dans les deux ans précédant son embauche, l'organisation d'un nouvel examen médical d'aptitude n'est pas requise dès lors que l'ensemble des conditions suivantes sont réunies",
      statut: "retenu",
      obligations: ["sante-travail-salarie-sir"],
      reserve:
        "La dispense n'est pas calculée, et c'est un FAUX POSITIF assumé : l'obligation fait naître l'examen préalable sans jamais dire que le droit en dispense sous condition. Les trois conditions supposent des faits que l'outil ne détient pas — la nature de l'emploi précédent, ce que le médecin du travail a en sa possession, et l'historique des avis d'aptitude, qui est précisément ce que `docs/rgpd.md` § 2.3 lui interdit de connaître. La dispense est rappelée dans la description de l'obligation ; elle ne s'applique jamais toute seule.\n\nCet article a été trouvé par un balayage des renvois d'intervalle : le corpus écrivait « R. 4624-22 à R. 4624-28 » en n'ayant ouvert que 22, 23, 24 et 28. Un intervalle cité n'est pas un intervalle lu.",
    },
    {
      ref: "R. 4624-28-1",
      intitule:
        "Visite de fin de carrière — catégories de travailleurs concernées",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043927893",
      versionEnVigueur: "2022-03-31",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "La visite médicale de L. 4624-2-1 est organisée pour les travailleurs bénéficiant ou ayant bénéficié d'un suivi individuel renforcé, et pour ceux qui ont été exposés aux risques du I de R. 4624-23 avant la mise en œuvre de ce dispositif.",
      citationCle:
        "La visite médicale prévue à l'article L. 4624-2-1 est organisée pour les catégories de travailleurs suivantes : 1° Les travailleurs bénéficiant ou ayant bénéficié d'un suivi individuel renforcé de leur état de santé prévu à l'article L. 4624-2 ; 2° Les travailleurs ayant été exposés à un ou plusieurs des risques mentionnés au I de l'article R. 4624-23 antérieurement à la mise en œuvre du dispositif de suivi individuel renforcé.",
      statut: "sans_objet",
      motif:
        "L'article désigne les bénéficiaires d'une visite que le service de prévention et de santé au travail organise ; il ne met aucun acte à la charge de l'employeur, dont l'obligation est portée par R. 4624-28-2. Il se lit comme la définition du champ de cette obligation-là, et non comme une obligation propre.",
    },
    {
      ref: "R. 4624-28-2",
      intitule:
        "Information du service de santé au travail à la cessation d'exposition ou au départ",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043927913",
      versionEnVigueur: "2022-04-28",
      // Relevé sur la page de l'article le 2026-09-21. LE DÉCRET N'EST PAS OUVERT :
      // la règle de `types.ts` demanderait de le faire.
      modifiePar: { texte: "Décret n° 2022-679 du 26 avril 2022 - art. 2" },
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur informe son service de prévention et de santé au travail, dès qu'il en a connaissance, de la cessation d'exposition d'un travailleur à des risques particuliers, de son départ ou de sa mise à la retraite ; il en avise le travailleur sans délai. [Relu le 2026-09-21 : la condition de champ est écrite dans l'article — des risques « justifiant un suivi individuel renforcé ». Trois alinéas : le premier seul pèse sur l'employeur ; le deuxième ouvre au travailleur une demande directe, du mois précédant la cessation de l'exposition ou son départ jusqu'à six mois après ; le troisième charge le service de vérifier les conditions et d'organiser la visite.]",
      citationCle:
        "Pour l'organisation de la visite prévue à l'article L. 4624-2-1, l'employeur informe son service de prévention et de santé au travail, dès qu'il en a connaissance, de la cessation de l'exposition d'un des travailleurs de l'entreprise à des risques particuliers pour sa santé ou sa sécurité justifiant un suivi individuel renforcé, de son départ ou de sa mise à la retraite. Il avise sans délai le travailleur concerné de la transmission de cette information.",
      statut: "retenu",
      obligations: ["sante-travail-etablissement-fin-exposition-suivi-renforce"],
      historique:
        "Obligation manquante jusqu'au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : Obligation d'employeur pleine et entière, et le référentiel ne la porte pas : informer le service de santé au travail à la cessation d'exposition, au départ ou à la mise à la retraite d'un salarié en suivi individuel renforcé, puis en aviser sans délai l'intéressé. Elle prolonge exactement les obligations que ce lot encode — elle vise les mêmes salariés, ceux du SIR — et elle intervient au moment où l'outil cesse de les suivre. — Son blocage : Obligation ÉVÉNEMENTIELLE : son fait générateur est un départ, une mise à la retraite ou une fin d'exposition. Le modèle n'a pas de déclencheur « événement » (ADR-022, axe nommé sans mécanisme), et le produit ne détient aucune date de sortie — `Salarie` porte un drapeau `actif`, pas un motif ni une date de départ. Le second alinéa ouvre en outre au travailleur un délai de six mois après la cessation d'exposition pour demander la visite lui-même, délai que rien ne pourrait décompter ici.",
    },
    {
      ref: "R. 4624-28-3",
      intitule:
        "État des lieux des expositions et surveillance post-exposition — établi par le médecin du travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043927915",
      versionEnVigueur: "2022-03-31",
      modifiePar: {
        texte: "Décret n° 2022-372 du 16 mars 2022, art. 3",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045365883",
      },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Charge LE MÉDECIN DU TRAVAIL d'établir un état des lieux des expositions du travailleur aux facteurs de risques professionnels de L. 4161-1, sur la base du dossier médical en santé au travail, des déclarations du travailleur et de celles de ses employeurs successifs. À l'issue de la visite, il remet le document au travailleur et le verse au dossier médical ; lorsque le document fait état d'une exposition, il met en place la surveillance post-exposition ou post-professionnelle, transmet le document au médecin traitant si nécessaire et avec l'accord du travailleur, et informe le travailleur des démarches lorsqu'il remplit les conditions du dispositif.",
      citationCle:
        "Le médecin du travail établit un état des lieux des expositions du travailleur aux facteurs de risques professionnels mentionnés à l'article L. 4161-1. […] À l'issue de la visite, le médecin du travail remet au travailleur le document […] et le verse au dossier médical en santé au travail.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "TOUTES LES OBLIGATIONS DE CET ARTICLE PÈSENT SUR LE MÉDECIN DU TRAVAIL : établir, remettre, verser au dossier, mettre en place la surveillance, transmettre, informer. L'employeur n'y apparaît qu'au pluriel et comme SOURCE — « des déclarations du travailleur et de celles de ses employeurs successifs » —, jamais comme destinataire d'une prescription. Il n'y a rien à inscrire au dossier d'un établissement.\n\nÀ NE PAS CONFONDRE AVEC SON VOISIN, et c'est la raison d'être de cette entrée. `R. 4624-28-2`, l'entrée juste au-dessus, fait peser sur L'EMPLOYEUR l'information du service de prévention et de santé au travail à la cessation d'exposition, au départ ou à la mise à la retraite — celui-là est `obligation_manquante`, bloqué par l'absence de déclencheur événementiel. Les deux articles traitent du même moment de la vie d'un salarié et se lisent l'un après l'autre ; leurs destinataires sont opposés. Sans cette entrée, le prochain lecteur rouvre les deux.\n\nPOURQUOI `hors_perimetre` ICI ET `sans_objet` DEUX ENTRÉES PLUS HAUT, alors que les deux motifs disent « aucun acte à la charge de l'employeur ». La contre-lecture du lot a relevé la divergence et proposé de basculer `R. 4624-28-1` ; elle n'a pas lieu d'être, et la raison mérite d'être écrite une fois pour que la question ne se rouvre pas. `R. 4624-28-1` énumère les catégories de travailleurs concernées par la visite de fin de carrière : c'est LA DÉFINITION DU CHAMP de l'obligation que `R. 4624-28-2` met, elle, à la charge de l'employeur. Une définition qui sert une obligation portée par le corpus est exactement ce que `types.ts` range en `sans_objet` — « définition, renvoi ». Le présent article ne définit rien : il PRESCRIT six actes, tous au médecin du travail. Aucune obligation d'exploitant n'en découle, ce qui est la lettre de `hors_perimetre`. Les deux statuts sont justes, pour deux raisons différentes ; c'est le motif commun — « pas d'acte pour l'employeur » — qui trompe, parce qu'il est vrai des deux sans être discriminant.\n\nPOURQUOI CE MOTIF D'EXCLUSION PLUTÔT QU'UN AUTRE. `sans_destinataire_exploitant` porte le libellé « ne s'adresse pas à l'exploitant », qui est exactement le cas. Son motif n'énumère que l'administration, la commission de sécurité, le maire et le préfet ; le médecin du travail n'y figure pas, et l'énumération gagnerait à être élargie — la liste `EXCLUSIONS` étant fermée à dessein, c'est une discussion à avoir là-bas, pas un écart à prendre ici.\n\nPOURQUOI IL ÉTAIT `non_depouille`. Son entrée ne portait qu'une référence — ni intitulé, ni URL, ni date : il avait été relevé depuis le sommaire de la sous-section sans jamais être ouvert. C'était le seul trou de dépouillement situé dans un domaine que le produit sert, le suivi individuel renforcé, et c'est ce qui l'a fait rouvrir le 2026-09-20.",
    },
    {
      // ENTRÉE OUVERTE LE 2026-09-20 PAR LE TEXTE MODIFICATEUR DU VOISIN, et
      // c'est la règle de `types.ts` qui la fait exister : « quand un article
      // que vous ouvrez porte un texte modificateur récent, ouvrez ce texte EN
      // ENTIER et listez ce qu'il touche d'autre ». `R. 4624-28-3` est modifié
      // par le décret n° 2022-372 du 16 mars 2022 ; ce décret s'intitule
      // « relatif à la surveillance post-exposition, AUX VISITES DE PRÉREPRISE
      // ET DE REPRISE des travailleurs […] » et touche aussi R. 4624-29 et
      // R. 4624-31, qu'aucun corpus ne portait. La première rédaction du lot
      // avait rempli `modifiePar` sans ouvrir le décret — exactement la faute
      // que le champ existe pour empêcher, et que `types.ts` raconte à propos
      // du décret n° 2025-482. Relevée par la contre-lecture, réparée ici.
      ref: "R. 4624-31",
      intitule:
        "Visite de reprise — l'employeur saisit le service dès qu'il connaît la date de fin de l'arrêt",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045676892",
      versionEnVigueur: "2026-06-15",
      modifiePar: {
        texte: "Décret n° 2026-503 du 12 juin 2026, art. 2",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054248175",
      },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Ouvre droit à un examen de reprise par le médecin du travail après un congé de maternité, une absence pour maladie professionnelle, une absence d'au moins trente jours pour accident du travail, ou d'au moins soixante jours pour maladie ou accident non professionnel. MET UN ACTE À LA CHARGE DE L'EMPLOYEUR : dès qu'il connaît la date de fin de l'arrêt, il saisit le service de prévention et de santé au travail, qui organise l'examen le jour de la reprise effective et au plus tard dans les huit jours qui suivent. Par exception, et sauf demande du médecin du travail du travail, de l'employeur ou du travailleur, la visite n'est pas requise si une visite de préreprise a eu lieu dans les trente jours précédant la reprise et que le médecin y a conclu qu'aucune mesure d'aménagement n'était nécessaire. [Relu le 2026-09-21 : la dérogation exige « l'ensemble des conditions », cumulatives ; et l'article 5 du décret n° 2026-503 applique la rédaction nouvelle aux arrêts de travail délivrés à compter du lendemain de sa publication (JORF du 14 juin 2026). Le délai de huit jours s'attache à l'organisation de l'examen par le SERVICE ; le seul terme de la saisine par l'employeur est « dès que ».]",
      citationCle:
        "Dès que l'employeur a connaissance de la date de la fin de l'arrêt de travail, il saisit le service de prévention et de santé au travail qui organise l'examen de reprise le jour de la reprise effective du travail par le travailleur, et au plus tard dans un délai de huit jours qui suivent cette reprise.",
      statut: "retenu",
      obligations: ["sante-travail-etablissement-examen-de-reprise"],
      historique:
        "Obligation manquante jusqu'au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : OBLIGATION D'EMPLOYEUR PLEINE ET ENTIÈRE, DANS UN DOMAINE QUE LE PRODUIT SERT, et le référentiel ne la porte pas. Saisir le service de santé au travail dès la connaissance de la date de fin d'arrêt, pour un examen à tenir le jour de la reprise et au plus tard huit jours après : un acte, un destinataire, un délai chiffré.\n\nCE QU'ELLE APPREND SUR LA FRAÎCHEUR DU CORPUS. Sa version en vigueur date du 15 juin 2026 et vient du décret n° 2026-503 du 12 juin 2026 — un texte de trois mois que le dépôt n'avait jamais croisé, trouvé uniquement parce qu'on a ouvert le texte modificateur d'un article voisin. Le corpus est déclaré `articles_cites` et son en-tête dit ne pas lire le reste de la section, donc ce n'était pas un trou caché ; c'était un trou non cherché. — Son blocage : Le déclencheur événementiel, absent du modèle — même blocage que `R. 4624-28-2` deux entrées plus haut, et que `R. 4141-8`, `R. 4141-12` et `L. 8222-5` ailleurs. Le fait générateur est la fin d'un arrêt de travail, que le produit n'a aucun moyen de connaître : il ne détient ni arrêt, ni absence, ni date de reprise, et `docs/rgpd.md` § 2.3 explique pourquoi il ne détiendra pas la pièce médicale. L'ADR-022 nomme l'axe « événement » et s'arrête là.\n\nÀ NE PAS RÉSOUDRE PAR UNE ÉCHÉANCE PÉRIODIQUE : il n'y a pas de rythme ici, et en poser un réclamerait un examen de reprise à des salariés qui ne se sont jamais arrêtés.",
    },
    {
      ref: "R. 4624-28",
      intitule: "Périodicité du suivi individuel renforcé",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769094",
      versionEnVigueur: "2017-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le renouvellement est effectué par le médecin du travail selon une périodicité qu'il détermine et qui ne peut être supérieure à quatre ans ; une visite intermédiaire est effectuée par un professionnel de santé au plus tard deux ans après la visite avec le médecin du travail.",
      citationCle:
        "Tout travailleur affecté à un poste présentant des risques particuliers […] bénéficie, à l'issue de l'examen médical d'embauche, d'un renouvellement de cette visite, effectuée par le médecin du travail selon une périodicité qu'il détermine et qui ne peut être supérieure à quatre ans. Une visite intermédiaire est effectuée par un professionnel de santé mentionné au premier alinéa de l'article L. 4624-1 au plus tard deux ans après la visite avec le médecin du travail.",
      statut: "retenu",
      obligations: [
        "sante-travail-salarie-sir",
        "sante-travail-salarie-sir-visite-intermediaire",
      ],
    },
    // -------------------------------------------------------------------------
    // Section 3 « Documents et rapports » — la fiche d'entreprise (lot 8)
    //
    // L'en-tête de ce corpus annonçait la fiche d'entreprise parmi les articles
    // NON lus de la quarantaine que compte le chapitre IV. Elle l'est désormais,
    // et les deux articles qui la portent entrent ici plutôt que dans un corpus
    // séparé : c'est le même chapitre, le même service, le même dossier.
    // -------------------------------------------------------------------------
    {
      ref: "R. 4624-46",
      intitule: "Établissement et mise à jour de la fiche d'entreprise",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045677119",
      versionEnVigueur: "2022-04-28",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le médecin du travail ou, dans les services interentreprises, l'équipe pluridisciplinaire établit et met à jour, pour chaque entreprise ou établissement, une fiche portant les risques professionnels et les effectifs de salariés qui y sont exposés.",
      citationCle:
        "Pour chaque entreprise ou établissement, le médecin du travail ou, dans les services de prévention et de santé au travail interentreprises, l'équipe pluridisciplinaire établit et met à jour une fiche d'entreprise ou d'établissement sur laquelle figurent, notamment, les risques professionnels et les effectifs de salariés qui y sont exposés.",
      statut: "retenu",
      obligations: ["sante-travail-etablissement-fiche-entreprise"],
      reserve:
        "« ÉTABLIT ET MET À JOUR », SANS AUCUN RYTHME. C'était le piège de cet article : on lit couramment que la fiche se met à jour tous les quatre ans, ou à chaque changement notable. Ni l'un ni l'autre n'est écrit. L'obligation porte `periodicite: \"autre\"`. Les articles R. 4624-48 à R. 4624-50 — transmission à l'employeur, présentation au CSE, accès de l'inspection, modèle fixé par arrêté — n'ont PAS été ouverts sur Légifrance : ils sont connus par le sommaire de la sous-section, ce qui ne vaut pas lecture.",
    },
    {
      ref: "R. 4624-47",
      intitule: "Délai d'établissement pour les entreprises adhérentes",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018493214/",
      versionEnVigueur: "2022-04-28",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Pour les entreprises adhérentes à un service de prévention et de santé au travail interentreprises, la fiche d'entreprise est établie dans l'année qui suit l'adhésion.",
      citationCle:
        "Pour les entreprises adhérentes à un service de prévention et de santé au travail interentreprises, la fiche d'entreprise est établie dans l'année qui suit l'adhésion de l'entreprise ou de l'établissement à ce service.",
      statut: "retenu",
      obligations: ["sante-travail-etablissement-fiche-entreprise"],
      reserve:
        "UNE ANNÉE EST UN DÉLAI, PAS UNE PÉRIODICITÉ : c'est un point de départ unique, pas un rythme de renouvellement. Le produit ne porte pas la date d'adhésion au service, donc ce délai n'engendre aucune ligne de calendrier ; il est rappelé dans la description de l'obligation. Aucune transmission `attribut_absent` n'est déclarée : l'attribut manquant ne conditionne pas l'applicabilité, seulement la date d'exigibilité.",
    },
  ],
};
