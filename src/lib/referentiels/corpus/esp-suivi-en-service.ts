// Corpus : suivi en service des équipements sous pression — code de l'environnement et arrêté du 20 novembre 2017.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const ESP_SUIVI_EN_SERVICE: Corpus = {
  id: "esp-suivi-en-service",
  intitule:
    "Suivi en service des équipements sous pression — Code de l'environnement et arrêté du 20 novembre 2017",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
  etendue: "articles_cites",
  portee:
    "Déclaration et contrôle de mise en service, inspection périodique, requalification, interventions. ATTENTION : les articles 4, 26 et 28 ont été modifiés par l'arrêté du 5 septembre 2025, en vigueur depuis le 8 septembre 2025.",
  articles: [
    {
      ref: "C. env. R. 557-14-1",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033741441",
      versionEnVigueur: "2016-12-31",
      // Page de l'article : « Création Décret n°2016-1925 du 28 décembre 2016 - art. 1 ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["esp-declaration-mise-en-service"],      prescrit:
        "Article de CHAMP, non de prescription : il dit à quels équipements s'applique la section « suivi en service » du code de l'environnement — récipients sous pression de gaz des groupes 1 et 2, équipements contenant de la vapeur d'eau ou de l'eau surchauffée, générateurs de vapeur, tuyauteries, avec leurs seuils ; puis les équipements sous pression nucléaires (hors enceintes de confinement et gaines de combustible), les accessoires sous pression et les accessoires de sécurité. Le IV pose la convention de vocabulaire reprise par tout l'arrêté du 20 novembre 2017. Le V renvoie à un arrêté distinct le suivi des équipements de véhicules (R. 321-6 à R. 321-19 du code de la route). Aucune échéance ne s'en déduit : les seuils opérationnels sont à l'article 7 de l'arrêté.",
      citationCle:
        "I. - Les dispositions de la présente section s'appliquent au suivi en service des équipements sous pression […] IV. - Les équipements sous pression, les récipients à pression simples et les équipements sous pression nucléaires mentionnés aux I, II et III sont appelés « équipements » dans la suite de la présente section.",
    },
    {
      ref: "Arrêté 2017-11-20 art. 6",
      versionEnVigueur: "2018-01-01",
      // Page de l'article (LEGIARTI000036131075) : aucune ligne « Modifié par ».
      // Version d'origine de l'arrêté du 20 novembre 2017, en vigueur au 01/01/2018.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["esp-dossier-suivi"],      prescrit:
        "Impose à l'exploitant de constituer, pour tout équipement fixe relevant de L. 557-30 du code de l'environnement, un DOSSIER D'EXPLOITATION : documentation de fabrication (notice, plans, schémas), identification des accessoires de sécurité, preuve de dépôt de la déclaration de mise en service, registre daté de toutes les opérations et interventions, attestations conservées au moins au-delà de l'intervalle maximal entre deux requalifications, et le plan d'inspection quand il en existe un. Il impose en outre la transmission du dossier au nouvel exploitant en cas de changement, et la tenue à jour d'une LISTE des récipients fixes, générateurs de vapeur et tuyauteries soumis — y compris les équipements au chômage — portant pour chacun le type, le régime de surveillance et les dates de la dernière et de la prochaine inspection ainsi que de la dernière et de la prochaine requalification. Aucune périodicité propre : c'est une obligation permanente de tenue, pas une échéance.",
      citationCle:
        "L'exploitant établit pour tout équipement fixe entrant dans le champ d'application de l'article L. 557-30 du code de l'environnement un dossier d'exploitation qui comporte les informations nécessaires à la sécurité de son exploitation, à son entretien, à son contrôle et aux éventuelles interventions : […] L'exploitant tient à jour une liste des récipients fixes, des générateurs de vapeur et des tuyauteries soumis aux dispositions du présent arrêté, y compris les équipements ou installations au chômage. Cette liste indique, pour chaque équipement, le type, le régime de surveillance, les dates de réalisation de la dernière et de la prochaine inspection et de la dernière et de la prochaine requalification périodique.",
    },
    {
      ref: "Arrêté 2017-11-20 art. 7-11",
      versionEnVigueur: "2018-01-01",
      // Les cinq articles 7, 8, 9, 10 et 11 relus un à un sur leur propre page
      // (LEGIARTI000036131081, ...083, ...085, ...087, ...089) : aucun ne porte de
      // ligne « Modifié par ». Tous en version d'origine, en vigueur au 01/01/2018.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["esp-declaration-mise-en-service"],      prescrit:
        "Intervalle lu article par article. L'ART. 7 fixe le CHAMP par seuils — récipients de gaz PS > 4 bar et PS.V > 10 000 bar.l ; tuyauteries PS > 4 bar selon DN et PS.DN par groupe de gaz ; générateurs de vapeur PS > 32 bar OU V > 2 400 l OU PS.V > 6 000 bar ; appareils à couvercle amovible à fermeture rapide fixes — et définit l'objet du contrôle de mise en service. L'ART. 8 pose l'échéance de la déclaration : avant la première mise en service. L'ART. 9 en fixe la forme : téléservice LUNE, liste des pièces, preuve de dépôt. L'ART. 10 énumère les trois faits générateurs du CONTRÔLE de mise en service : première mise en service, nouvelle évaluation de conformité après intervention importante au sens de l'art. 27, remise en service après réinstallation hors de l'établissement précédent. L'ART. 11 dit qui contrôle : organisme habilité pour les générateurs de vapeur et les appareils à couvercle amovible à fermeture rapide, personne compétente pour les autres. Aucun de ces cinq articles ne porte de récurrence : déclaration et contrôle sont des actes de mise en service.",
      citationCle:
        "Sont soumis à la déclaration et au contrôle de mise en service : 1. Les récipients sous pression de gaz dont la pression maximale admissible PS est supérieure à 4 bar et dont le produit pression maximale admissible par le volume est supérieur à 10 000 bar.l ; […] 4. Les appareils à couvercle amovible à fermeture rapide fixes. […] (art. 8) La déclaration de mise en service est requise avant la première mise en service de l'équipement. […] (art. 10) Le contrôle de mise en service est requis avant : - la première mise en service de l'équipement ou après une évaluation de conformité liée à une intervention importante définie à l'article 27 du présent arrêté ; - la remise en service en cas de nouvelle installation en dehors de l'établissement dans lequel l'équipement était précédemment utilisé.",
    },
    {
      ref: "Arrêté 2017-11-20 art. 15",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-09-27",
      lecture: "api_legifrance",
      // `null` posé à l'intégration du 2026-09-02, et sur un raisonnement
      // qu'il faut pouvoir contredire plutôt que sur un silence : la version
      // en vigueur relevée est le 1er janvier 2018, c'est-à-dire l'entrée en
      // vigueur de l'arrêté lui-même. Un article encore dans sa version
      // d'origine n'a, par construction, pas de texte modificateur. Le seul
      // texte modificateur connu de cet arrêté — celui du 5 septembre 2025,
      // signalé le 2026-09-02 — porte sur son ARTICLE 4, pas sur le 15.
      //
      // À contredire si la relecture montre autre chose : ce champ dit
      // « regardé », et ce qui a été regardé ici est la date de version, pas
      // l'historique complet de l'arrêté.
      modifiePar: null,
      statut: "retenu",
      obligations: [
        "esp-inspection-periodique",
        "esp-inspection-periodique-generateur-vapeur",
      ],
      prescrit:
        "STRUCTURE MAL RENDUE, relevée le 2026-08-27, RELUE EN PREMIÈRE MAIN LE 2026-09-01. L'article porte plusieurs régimes, tous en « période maximale » et non en échéance fixe : 1 an (bouteilles de plongée, récipients mobiles non métalliques), porté à 4 ans au plus pour ceux ayant subi l'essai de vieillissement de l'annexe 1 ; 2 ans (générateurs de vapeur, appareils à couvercle amovible à fermeture rapide) ; 4 ans au maximum pour tous les autres hors tuyauteries, avec une PREMIÈRE inspection à 3 ans au maximum. S'y ajoutent l'obligation faite à l'exploitant de réduire ces périodes si l'état de l'équipement le justifie (I, dernier alinéa), une vérification extérieure avant chaque remplissage des récipients mobiles (II) et un programme de contrôle propre aux tuyauteries, établi par l'exploitant dans l'année qui suit leur mise en service (III). Le référentiel encode `triennale` : or le 3 ans n'est ni le régime général ni récurrent, c'est le plafond du premier cycle.\n\nLE PLAFOND DE PREMIER CYCLE EST CONDITIONNEL, ET CELA N'AVAIT PAS ÉTÉ RELEVÉ — lecture en première main du 2026-09-01, lot B. Le texte écrit : « Toutefois, la première inspection périodique suivant la mise en service ou une modification notable d'un équipement est fixée au maximum à 3 ans, EXCEPTÉ POUR LES ÉQUIPEMENTS QUI ONT FAIT L'OBJET D'UN CONTRÔLE DE MISE EN SERVICE CONFORME À L'ARTICLE 11, QUE CE CONTRÔLE SOIT OU NON OBLIGATOIRE. » Le 3 ans ne vaut donc PAS pour un équipement dont le contrôle de mise en service a été fait et conforme — celui-là relève des 4 ans dès la première inspection. Un premier délai de 3 ans appliqué sans distinction sur-applique d'un an à tous ces équipements. Le fait générateur est aussi plus large que la seule mise en service : « la mise en service OU UNE MODIFICATION NOTABLE » rouvre le premier cycle. Le 40 mois est bien transitoire et réservé aux équipements déclarés avant l'entrée en vigueur de l'arrêté.\n\nCE QUE LE MODÈLE NE SAIT PAS DISTINGUER, nommé et non corrigé (2026-09-01, lot B) : le 2 ans des générateurs de vapeur et des appareils à couvercle amovible à fermeture rapide. `familleEsp` porte déjà la valeur `generateur_vapeur`, collectée au formulaire d'équipement et sérialisée dans `caracteristiques` — mais `schema.ts` l'annote « jamais lus par le moteur », et `ConditionApplication` n'a aucune forme d'égalité sur une valeur d'énumération (ses quatre formes portent sur un nombre ou sur un booléen). L'appareil à couvercle amovible à fermeture rapide, lui, n'est collecté nulle part : `couvercleAmovible` n'est qu'un paramètre de `verdictSuiviEnService`, pas un champ du schéma. La moitié de la famille est donc déjà en base, l'autre moitié demanderait une question de plus au formulaire.",
      historique:
        "C51 (2026-09-27), relu par l'API Légifrance (pnpm legifrance:verifier) : citationCle recopiée du texte de l'API — avant « […] - 2 ans … présent arrêté. Si l'état », après « […] 2 ans … présent arrêté, Si l'état » ; tiret ajouté et virgule du texte officiel (« arrêté, Si ») corrigée en point ; la coquille est celle de Légifrance, recopiée telle quelle.",
      citationCle:
        "I. - L'inspection périodique a lieu aussi souvent que nécessaire. Les périodes maximales sont comptées selon le cas à partir de la date de la mise en service ou, de la précédente inspection périodique ou requalification périodique. […] 2 ans pour les générateurs de vapeur, les appareils à couvercle amovible à fermeture rapide ; […] Pour les autres équipements, hormis les tuyauteries, la période maximale entre les inspections périodiques est fixée au maximum à 4 ans. Toutefois, la première inspection périodique suivant la mise en service ou une modification notable d'un équipement est fixée au maximum à 3 ans, excepté pour les équipements qui ont fait l'objet d'un contrôle de mise en service conforme à l'article 11, que ce contrôle soit ou non obligatoire. Le délai maximal de 3 ans est porté à 40 mois pour les équipements dont la déclaration de mise en service a été réalisée avant l'entrée en vigueur du présent arrêté, Si l'état d'un équipement le justifie, l'exploitant réduit les périodes maximales mentionnées ci-dessus.",
    },
    {
      ref: "Arrêté 2017-11-20 art. 18-19",
      versionEnVigueur: "2018-01-01",
      // Articles 18 et 19 relus chacun sur sa page (LEGIARTI000036131133 et ...135) :
      // aucune ligne « Modifié par ». Version d'origine, en vigueur au 01/01/2018.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["esp-requalification-decennale"],      prescrit:
        "PLAFOND, PAS RYTHME — même défaut de structure que l'article 15 relevé le 2026-08-27. L'article 18 écrit « L'échéance MAXIMALE des requalifications périodiques est fixée à partir de la date de mise en service ou de la dernière requalification périodique », puis échelonne : 2 ans (bouteilles de plongée, récipients mobiles non métalliques), 3 ans (fluides listés non exempts d'impuretés corrosives), 6 ans (fluides toxiques ou corrosifs ; récipients mobiles non métalliques ayant subi les essais de vieillissement ; bouteilles de plongée à inspection au moins annuelle), 10 ans pour les AUTRES récipients, tuyauteries et générateurs de vapeur. Régime propre aux extincteurs de plus de 30 bar : requalification au premier rechargement effectué plus de six ans après la précédente, sans jamais excéder dix ans ; les autres extincteurs ne sont pas soumis. Le II ajoute un fait générateur : renouvellement de la requalification quand l'équipement fixe change à la fois d'établissement ET d'exploitant. L'article 19 en fixe le CONTENU dans un ordre imposé : vérification des documents de l'article 6, inspection, épreuve hydraulique, vérification des accessoires — avec dispense d'épreuve hydraulique pour les néo-soumis, les tuyauteries et leurs accessoires, et les récipients à fluide autre que vapeur ou eau surchauffée dont PS <= 4 bar. Le référentiel encode `decennale` : le dix ans est le cas résiduel, et c'est un maximum, pas une échéance fixe.\n\nL'ÉCHELLE EST RÉELLE ET NE MORD PAS SUR LA CIBLE — relecture en première main du 2026-09-01, lot B, les six tirets du I recopiés mot pour mot. Les barreaux 2, 3 et 6 ans ne visent, sans exception, que des objets hors du périmètre d'un restaurant, d'un commerce de détail ou d'un bureau : bouteilles pour appareils respiratoires de plongée subaquatique et récipients mobiles en matériaux autres que métalliques (2 ans) ; récipients ou tuyauteries contenant fluor, fluorure de bore, fluorure d'hydrogène, trichlorure de bore, chlorure d'hydrogène, bromure d'hydrogène, dioxyde d'azote, phosgène ou sulfure d'hydrogène lorsqu'ils ne peuvent être exempts d'impuretés corrosives (3 ans) ; récipients ou tuyauteries à fluide toxique au sens du CLP ou corrosif vis-à-vis des parois, récipients mobiles non métalliques ayant subi les essais de vieillissement, bouteilles de plongée à inspection au moins annuelle (6 ans). Le compresseur d'atelier est un récipient de gaz du groupe 2 (air) : il tombe dans « les autres récipients », donc dix ans. Le générateur de vapeur est NOMMÉMENT à dix ans ici — c'est à l'inspection périodique de l'article 15, et là seulement, qu'il relève de deux ans. Pour la cible du produit, le cas résiduel EST le cas, et `decennale` est le bon barreau. Ce qui reste faux est la lecture, pas la valeur : c'est un plafond, pas un rythme.\n\nDEUX CHOSES QUE LE RÉFÉRENTIEL NE PORTE PAS, nommées et non encodées (2026-09-01, lot B).\n\n(1) LE RÉGIME DES EXTINCTEURS DE PLUS DE 30 BAR. « Pour les extincteurs soumis à une pression maximale admissible de plus de 30 bar, la requalification périodique est réalisée à l'occasion du premier rechargement effectué plus de six ans après la requalification précédente, sans que le délai entre deux requalifications périodiques ne puisse excéder dix ans. Les autres extincteurs ne sont pas soumis à requalification périodique. » Ce n'est pas une périodicité mais une échéance conditionnée à un événement — le rechargement — que le produit n'observe pas, sous un plafond de dix ans. Il ne produit aujourd'hui AUCUNE erreur : `esp-requalification-decennale` est bornée à la catégorie `EQUIPEMENT_SOUS_PRESSION`, et `EXTINCTEUR` est une catégorie d'équipement distincte que cette obligation n'atteint pas. Le manque est donc un silence, pas une sur-application. À ne pas confondre avec la révision décennale de `MS 38 § 4`, qui est une obligation ERP distincte, relevée à part.\n\n(2) LE FAIT GÉNÉRATEUR DU II. « La requalification périodique d'un équipement sous pression fixe est renouvelée lorsque celui-ci fait l'objet à la fois d'une installation dans un autre établissement et d'un changement d'exploitant. » Les deux conditions sont cumulatives. Le produit ne modélise ni le déménagement d'un équipement entre établissements ni le changement d'exploitant : c'est le même trou que celui déjà nommé sur `esp-intervention-reparation`, une obligation événementielle sans fait observable.",
      citationCle:
        "I. - L'échéance maximale des requalifications périodiques est fixée à partir de la date de mise en service ou de la dernière requalification périodique : - deux ans pour les bouteilles pour appareils respiratoires utilisées pour la plongée subaquatique ainsi que pour les récipients mobiles en matériaux autres que métalliques ; - trois ans pour les récipients ou tuyauteries contenant les fluides suivants lorsque ceux-ci ne peuvent être exempts d'impuretés corrosives : fluor, fluorure de bore, fluorure d'hydrogène, trichlorure de bore, chlorure d'hydrogène, bromure d'hydrogène, dioxyde d'azote, chlorure de carbonyle (ou phosgène), sulfure d'hydrogène ; - six ans pour les récipients ou tuyauteries contenant un fluide toxique […] ou un fluide corrosif vis-à-vis des parois de l'équipement sous pression ; […] - dix ans pour les autres récipients ou tuyauteries ainsi que pour les générateurs de vapeur. Pour les extincteurs soumis à une pression maximale admissible de plus de 30 bar, la requalification périodique est réalisée à l'occasion du premier rechargement effectué plus de six ans après la requalification précédente, sans que le délai entre deux requalifications périodiques ne puisse excéder dix ans. Les autres extincteurs ne sont pas soumis à requalification périodique. II. - La requalification périodique d'un équipement sous pression fixe est renouvelée lorsque celui-ci fait l'objet à la fois d'une installation dans un autre établissement et d'un changement d'exploitant.",
    },
    {
      ref: "Arrêté 2017-11-20 art. 26-28",
      versionEnVigueur: "2025-09-08",
      // Les articles 26 et 28 portent cette ligne, en vigueur au 08/09/2025.
      // L'article 27 de l'intervalle est resté dans sa version d'origine.
      modifiePar: { texte: "Arrêté du 5 septembre 2025 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["esp-intervention-reparation"],      prescrit:
        "Intervalle lu article par article. L'ART. 26 (version du 8 septembre 2025, arrêté du 5 septembre 2025) pose la typologie : une intervention en cours d'exploitation est une réparation ou une modification, et elle est importante, notable ou non notable ; les critères de classement ne sont PAS dans l'arrêté mais dans un guide professionnel approuvé par décision ministérielle publiée au Bulletin officiel. L'ART. 27 définit l'intervention IMPORTANTE — celle qui modifie la destination, le type original ou les performances au-delà des limites du fabricant — et la soumet à une nouvelle évaluation de conformité (R. 557-9-5 ou R. 557-10-5 du code de l'environnement). L'ART. 28 (également modifié au 8 septembre 2025) définit l'intervention NOTABLE : celle qui ne relève pas de l'article 27 et qui est susceptible d'avoir une incidence sur la conformité aux exigences essentielles de sécurité. Aucune périodicité : le fait générateur est l'intervention. Le classement dépend d'un guide professionnel que le référentiel ne porte pas et ne peut pas porter.",
      citationCle:
        "(art. 26) Au cours de son exploitation, un équipement peut faire l'objet d'interventions. Il peut s'agir de réparations ou de modifications. Une intervention peut être importante, notable ou non notable. Les critères permettant de classer les interventions sont précisés dans un guide professionnel approuvé par décision du ministre chargé de la sécurité industrielle […] (art. 27) I. - Une intervention est considérée comme importante lorsqu'elle conduit à modifier la destination d'un équipement, son type original ou ses performances, de sorte qu'elles ne s'inscrivent plus dans les limites prévues par le fabricant. […] (art. 28) Une intervention est considérée comme notable lorsqu'elle ne relève pas de l'article 27 et qu'elle est susceptible d'avoir une incidence sur la conformité de l'équipement aux exigences essentielles de sécurité qui lui sont applicables.",
    },
  ],
};
