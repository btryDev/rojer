// Corpus : arrêté du 1er mars 2004 — vérification des appareils et accessoires de levage.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const ARRETE_2004_03_01_LEVAGE: Corpus = {
  id: "arrete-2004-03-01-levage",
  intitule:
    "Arrêté du 1er mars 2004 — vérification des appareils et accessoires de levage",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000439029",
  etendue: "articles_cites",
  portee:
    "Fixe le contenu et la périodicité des vérifications de levage. Dernier modificateur : arrêté du 29 décembre 2010. Aucune version future programmée au 2026-08-26.",
  articles: [
    {
      ref: "Arrêté 2004-03-01 annexe",
      versionEnVigueur: "2011-01-09",
      modifiePar: { texte: "Arrêté du 29 décembre 2010 - art. 7" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["levage-vgp-semestrielle-chariot-gerbeur"],      prescrit:
        "Liste de qualification, sans prescription : elle énumère les équipements « notamment visés » par la définition d'appareil de levage de l'article 2 a) — dont « chariots automoteurs élévateurs à conducteur porté ou non, gerbeurs », c'est par elle que le gerbeur rejoint les « chariots élévateurs » de l'article 20-II —, puis ceux qui NE SONT PAS concernés par l'arrêté : appareils intégrés à des lignes automatisées en zone inaccessible, ascenseurs et monte-charges ainsi que les élévateurs de personnes n'excédant pas 0,15 m/s installés à demeure, appareils à usage médical, aéronefs, engins de fêtes foraines, mâts de pompes à béton, convoyeurs et transporteurs, basculeurs, transpalettes levant la charge juste de la hauteur nécessaire pour la déplacer, engins à benne basculante, équilibreurs à charge fixée à demeure, camions à plateau inclinable. L'exclusion des ascenseurs installés à demeure est ce qui sépare ce corpus de celui du CCH.",
      citationCle:
        "Sont notamment visés par la définition des appareils de levage figurant au a de l'article 2 du présent arrêté les équipements de travail suivants : […] - chariots automoteurs élévateurs à conducteur porté ou non, gerbeurs ; […] Ne sont pas concernés par le présent arrêté : […] - les ascenseurs et les monte-charges ainsi que les élévateurs de personnes n'excédant pas une vitesse de 0,15 m/ s, installés à demeure ; […] - les transpalettes levant la charge juste de la hauteur nécessaire pour la déplacer en la décollant du sol ; […]",
    },
    {
      ref: "Arrêté 2004-03-01 art. 14",
      intitule:
        "Vérification à la mise en service — aptitude non vérifiée en amont",
      versionEnVigueur: "2005-03-31",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680458",
      statut: "retenu",
      obligations: [
        "levage-epreuve-initiale-fonctionnement",
        // Rebranchée le 2026-09-01 (lot A) : elle citait l'article 5, qui
        // définit l'examen d'adéquation sans l'imposer. Le a) du I ci-dessous
        // est ce qui l'exige.
        "levage-examen-adequation-mise-en-service",
      ],
      citationCle:
        "« d) De l'épreuve dynamique prévue par l'article 11. Cette épreuve n'est pas exigée pour les appareils de levage mus par la force humaine employée directement sauf s'ils sont conçus pour lever des personnes. »",
      prescrit:
        "Exige, avant mise en service des appareils neufs ou d'occasion dont l'aptitude à l'emploi n'a PAS été vérifiée dans leurs configurations d'utilisation : examen d'adéquation, examen de montage si installé à demeure, épreuve statique et épreuve dynamique. Les articles 6, 10 et 11 DÉFINISSENT ces épreuves ; seul l'article 14 les EXIGE. L'exception du d) était encodée à l'envers dans le référentiel avant le 2026-08-26.",
    },
    {
      ref: "Arrêté 2004-03-01 art. 19",
      versionEnVigueur: "2008-05-01",
      modifiePar: { texte: "Décret n° 2008-244 du 7 mars 2008 - art. 9 (V)" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["levage-remise-en-service-apres-reparation"],      prescrit:
        "Fixe le CONTENU de la vérification de remise en service prise en application de R. 4323-28 : examen d'adéquation (art. 5-I), le cas échéant examen de montage et d'installation (art. 5-II), examen de l'état de conservation (art. 9), épreuve statique (art. 10) et épreuve dynamique (art. 11). Il ne dit pas QUAND : les cas déclencheurs sont à l'article 20-I. Aucune récurrence — le fait générateur est l'opération, jamais le calendrier.",
      citationCle:
        "I.-En application de l'article R. 4323-28 du code du travail, la vérification lors de la remise en service des appareils de levage visés au a de l'article 2 comprend : a) L'examen d'adéquation prévu à l'article 5-I ; b) Le cas échéant, l'examen de montage et d'installation prévu à l'article 5-II ; c) L'examen de l'état de conservation prévu à l'article 9 ; d) L'épreuve statique prévue à l'article 10 ; e) L'épreuve dynamique prévue à l'article 11.",
    },
    {
      ref: "Arrêté 2004-03-01 art. 20",
      versionEnVigueur: "2005-03-31",
      // Page de l'article (LEGIARTI000006680466) : aucune ligne « Modifié par ».
      // Version d'origine, en vigueur depuis le 31/03/2005.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["levage-vgp-semestrielle-chariot-gerbeur"],      prescrit:
        "Sept paragraphes romains. Le I énumère les cinq cas qui déclenchent la vérification de remise en service de l'article 19 : changement de site, changement de configuration ou de conditions d'utilisation sur un même site, démontage suivi de remontage, remplacement ou réparation ou transformation importante d'un organe essentiel, accident provoqué par la défaillance d'un organe essentiel. Le II dispense de cette vérification, en cas de simple changement de site, les appareils ne nécessitant pas de support particulier — liste où figurent notamment les chariots élévateurs, les hayons élévateurs, les grues auxiliaires de chargement sur véhicules, les monte-meubles et les PEMP — à condition qu'ils aient subi une VGP depuis moins de six mois. Le III fait de même pour les appareils mus par la force humaine. Ce sont ces listes du II et du III que l'article 23 a) reprend pour ramener la VGP à six mois : dans le référentiel, l'article 20 n'est donc pas cité pour la remise en service mais comme la liste des appareils à VGP semestrielle.",
      citationCle:
        "I. - La vérification lors de la remise en service des appareils de levage, prévue à l'article 19, doit être effectuée dans les cas suivants : […] II. - En cas de changement de site d'utilisation, les appareils de levage ne nécessitant pas l'installation de support particulier sont dispensés de la vérification de remise en service définie à l'article 19 du présent arrêté, sous réserve qu'ils aient fait l'objet, dans la même configuration d'emploi : […]",
    },
    {
      ref: "Arrêté 2004-03-01 art. 22",
      intitule:
        "Vérification générale périodique — assujettissement et contenu",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680468",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: ["levage-examen-etat-conservation"],
      prescrit:
        "L'article qui EXIGE la vérification générale périodique, là où l'article 23 la cadence et les articles 6 et 9 en définissent les actes. Le I soumet les appareils de levage du a de l'article 2, utilisés dans un établissement de L. 4221-1, à une vérification générale selon la périodicité de l'article 23. Le II en donne le contenu, en deux actes seulement : l'examen de l'état de conservation de l'article 9 et les essais des b et c de l'article 6. Entré au corpus le 2026-09-01 : le référentiel le mentionnait en queue d'une citation littérale (« art. 9 […] et art. 22 ») sans clé `article`, donc sans qu'aucun contrôle puisse le rapprocher d'un texte lu.",
      citationCle:
        "I.-Les appareils de levage visés au a de l'article 2 du présent arrêté, utilisés dans un établissement visé à l'article L. 4221-1 du code du travail, doivent, conformément aux articles R4323-23 à R4323-27, R4535-7 et R4721-11 dudit code, faire l'objet d'une vérification générale effectuée selon la périodicité définie à l'article 23 ci-après. II.-Cette vérification comporte l'examen de l'état de conservation prévu à l'article 9 et les essais prévus aux b et c de l'article 6.",
      reserve:
        "LES ESSAIS DES b) ET c) DE L'ARTICLE 6 NE SONT PORTÉS NULLE PART. Le II fait de la VGP DEUX actes, pas un : l'examen de l'état de conservation — encodé — et les essais de fonctionnement et d'efficacité des dispositifs de l'article 6 b) et c), que le référentiel n'a pas. Relevé le 2026-09-01 ; le lot A ne crée pas d'obligation.",
    },
    {
      ref: "Arrêté 2004-03-01 art. 23",
      versionEnVigueur: "2005-03-31",
      // Page de l'article (LEGIARTI000006680469) : aucune ligne « Modifié par ».
      // Version d'origine, en vigueur depuis le 31/03/2005.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680469",
      obligations: [
        "levage-vgp-annuelle-charges",
        "levage-vgp-semestrielle-chariot-gerbeur",
        "levage-vgp-semestrielle-personnes",
        // Ajoutée le 2026-09-01 (lot A) : `levage-examen-etat-conservation`
        // citait l'article 9, qui définit l'examen ; le rythme lui vient d'ici.
        "levage-examen-etat-conservation",
        // Ajoutée le 2026-09-01 : l'article la portait, la liste l'oubliait.
        // Le b) est explicite — « Trois mois pour les appareils de levage, mus
        // par la force humaine employée directement, utilisés pour déplacer en
        // élévation un poste de travail. » — et c'est mot pour mot le champ de
        // l'obligation. Article rouvert à la source ce jour avant l'ajout.
        "levage-vgp-trimestrielle-force-humaine",
      ],      prescrit:
        "Fixe la PÉRIODICITÉ de la vérification générale périodique des appareils soumis à l'article 22 : douze mois en principe. Deux dérogations, en échéance fixe et non en plafond : six mois pour les appareils listés aux II et III de l'article 20 et pour ceux, mus par une énergie autre que la force humaine directe, servant au transport de personnes ou à déplacer en élévation un poste de travail ; trois mois pour les appareils mus par la force humaine employée directement servant à déplacer en élévation un poste de travail. L'article écrit « doit avoir lieu tous les douze mois » et « cette périodicité est de » — c'est bien un rythme, pas un maximum, à la différence de l'arrêté ESP du 20 novembre 2017.",
      citationCle:
        "La vérification générale périodique des appareils de levage soumis à l'article 22 doit avoir lieu tous les douze mois. Toutefois, cette périodicité est de : a) Six mois pour les appareils de levage ci-après : - appareils de levage listés aux II et III de l'article 20 ; - appareils de levage, mus par une énergie autre que la force humaine employée directement, utilisés pour le transport des personnes ou pour déplacer en élévation un poste de travail ; b) Trois mois pour les appareils de levage, mus par la force humaine employée directement, utilisés pour déplacer en élévation un poste de travail.",
    },
    {
      ref: "Arrêté 2004-03-01 art. 24",
      versionEnVigueur: "2008-05-01",
      // La page porte DEUX lignes ; la seconde, antérieure, est
      // « Modifié par Ordonnance n° 2007-329 du 12 mars 2007 - art. 12 (V) ».
      modifiePar: { texte: "Décret n° 2008-244 du 7 mars 2008 - art. 9 (V)" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["levage-vgp-accessoires-annuelle"],      prescrit:
        "Soumet les ACCESSOIRES de levage (art. 2 b) utilisés dans un établissement des articles L. 4111-1 à L. 4111-3 à une vérification périodique tous les douze mois, portant sur le bon état de conservation. Le texte détaille les détériorations à déceler — déformation, hernie, étranglement, toron cassé, nombre de fils cassés supérieur à l'admissible, linguet détérioré — et renvoie, pour toute autre limite, à la notice du fabricant. Échéance fixe, pas un plafond.",
      citationCle:
        "Les accessoires de levage visés au b de l'article 2 du présent arrêté, utilisés dans un établissement visé aux articles L4111-1 à L4111-3 du code du travail, doivent, conformément aux articles R4323-23 à R4323-27, R4535-7 et R4721-11 dudit code, être soumis tous les douze mois à une vérification périodique comportant un examen ayant pour objet de vérifier le bon état de conservation de l'accessoire de levage et notamment de déceler toute détérioration, telle que déformation, hernie, étranglement, toron cassé, nombre de fils cassés supérieur à celui admissible, linguet détérioré, ou autre limite d'emploi précisée par la notice d'instructions du fabricant, susceptible d'être à l'origine de situations dangereuses.",
    },
    {
      ref: "Arrêté 2004-03-01 art. 5",
      versionEnVigueur: "2005-03-31",
      // Page de l'article (LEGIARTI000006680446) : aucune ligne « Modifié par ».
      // Version d'origine, en vigueur depuis le 31/03/2005.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["levage-examen-adequation-mise-en-service"],      prescrit:
        "Article de DÉFINITION, non de prescription. Il dit ce qu'est un « examen d'adéquation » (I) et un « examen de montage et d'installation » (II) ; il n'impose ni l'un ni l'autre à personne et ne porte aucune échéance. Ce sont les articles 14 (mise en service), 19 (remise en service) et 22-23 (VGP) qui les EXIGENT en renvoyant à lui.",
      historique:
        "CORRIGÉ LE 2026-09-01 (lot A). L'article était le FONDEMENT de `levage-examen-adequation-mise-en-service` — même défaut « définir n'est pas prescrire » que celui relevé le 2026-08-26 sur `levage-epreuve-initiale-fonctionnement`, où les articles 6, 10 et 11 avaient été mis pour l'article 14. Le fondement est désormais l'article 14-I a). L'article reste cité par cette obligation, mais en contexte : c'est lui qui dit ce que l'examen contient.",
      citationCle:
        "I. - On entend par « examen d'adéquation d'un appareil de levage » l'examen qui consiste à vérifier qu'il est approprié aux travaux que l'utilisateur prévoit d'effectuer ainsi qu'aux risques auxquels les travailleurs sont exposés et que les opérations prévues sont compatibles avec les conditions d'utilisation de l'appareil définies par le fabricant. II. - On entend par « examen de montage et d'installation d'un appareil de levage » l'examen qui consiste à s'assurer qu'il est monté et installé de façon sûre, conformément à la notice d'instructions du fabricant.",
    },
    {
      ref: "Arrêté 2004-03-01 art. 9",
      versionEnVigueur: "2005-03-31",
      // Page de l'article (LEGIARTI000006680450) : aucune ligne « Modifié par ».
      // Version d'origine, en vigueur depuis le 31/03/2005.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["levage-examen-etat-conservation"],
      historique:
        "CORRIGÉ LE 2026-09-01 (lot A). L'article était le FONDEMENT de `levage-examen-etat-conservation`, alors qu'il définit sans exiger ni cadencer. Le fondement est désormais l'article 22-II (qui l'exige) complété de l'article 23 (qui le cadence à douze mois) ; l'article 9 reste cité, en contexte, pour le contenu de l'examen.",
      prescrit:
        "Article de DÉFINITION : dit en quoi consiste l'« examen de l'état de conservation » et énumère les huit familles d'éléments essentiels à contrôler (calage et freinage, freins, contrôle de descente, poulies, limiteurs de charge et de moment, limiteurs de mouvement, crochets et préhension, câbles et chaînes), puis précise la méthode — examen visuel détaillé complété au besoin d'essais de fonctionnement. Il n'impose pas l'examen et ne porte aucune périodicité : c'est l'article 22 qui soumet les appareils à la VGP et l'article 23 qui en fixe le rythme.",
      citationCle:
        "On entend par « examen de l'état de conservation d'un appareil de levage » l'examen qui a pour objet de vérifier le bon état de conservation de l'appareil de levage et de ses supports, et de déceler toute détérioration susceptible d'être à l'origine de situations dangereuses intéressant notamment les éléments essentiels suivants : a) Dispositifs de calage, amarrage et freinage, destinés à immobiliser dans la position de repos les appareils de levage mobiles ; […] h) Câbles et chaînes de charge. Cet examen comprend un examen visuel détaillé, complété en tant que de besoin d'essais de fonctionnement.",
    },
  ],
};
