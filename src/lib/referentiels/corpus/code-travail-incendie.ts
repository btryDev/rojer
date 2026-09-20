// Corpus : articles cités par le référentiel, dépouillés le 26 août 2026.
//
// Étendue « articles_cites » : cette liste ne contient QUE les articles que le
// référentiel cite. Elle ne dit rien de ce que le texte contient par ailleurs,
// et ne peut donc jamais se déclarer complète. C'est un remboursement de dette,
// pas une preuve d'exhaustivité.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_INCENDIE: Corpus = {
  id: "code-travail-incendie",
  intitule: "Code du travail — prévention des incendies, lieux de travail",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489127/",
  etendue: "articles_cites",
  portee:
    "Articles R. 4227-* et R. 4226-19 du Code du travail, plus le chapitre unique L. 4711-1 à L. 4711-5 et D. 4711-2 à D. 4711-3 (pièces de vérification : mentions, datation, conservation). S'appliquent à tout employeur, indépendamment du classement ERP — c'est le fondement réel de la plupart des échéances portées pour la 5e catégorie.",
  articles: [
    {
      ref: "R. 4227-28",
      intitule: "Mesures pour combattre tout commencement d'incendie",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532081/",
      prescrit:
        "Tout employeur : prendre les mesures nécessaires pour qu'un début d'incendie puisse être combattu rapidement et efficacement. Obligation de résultat sur l'état des moyens, sans aucune périodicité ni seuil d'effectif.",
      citationCle:
        "L'employeur prend les mesures nécessaires pour que tout commencement d'incendie puisse être rapidement et efficacement combattu dans l'intérêt du sauvetage des travailleurs.",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-travail-moyens-lutte"],
    },
    {
      ref: "R. 4227-29",
      intitule: "Extincteurs — premier secours contre l'incendie",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489127/",
      prescrit:
        "Tout employeur : doter les lieux de travail d'extincteurs en nombre suffisant et les maintenir en bon état de fonctionnement — au moins un extincteur portatif à eau pulvérisée de 6 litres minimum pour 200 m² de plancher, au moins un appareil par niveau, et des appareils appropriés aux risques particuliers. « Maintenus en bon état » est un état à tenir : l'article ne fixe AUCUNE périodicité de vérification.",
      citationCle:
        "Le premier secours contre l'incendie est assuré par des extincteurs en nombre suffisant et maintenus en bon état de fonctionnement. Il existe au moins un extincteur portatif à eau pulvérisée d'une capacité minimale de 6 litres pour 200 mètres carrés de plancher. Il existe au moins un appareil par niveau. Lorsque les locaux présentent des risques d'incendie particuliers, notamment des risques électriques, ils sont dotés d'extincteurs dont le nombre et le type sont appropriés aux risques.",
      versionEnVigueur: "2008-05-01",
      // Page de l'article (LEGIARTI000018532079, retrouvée depuis la section) :
      // « Créé par Décret n°2008-244 du 7 mars 2008 - art. (V) ». Jamais modifié.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-travail-moyens-lutte"],
    },
    {
      ref: "R. 4227-14",
      intitule: "Éclairage de sécurité des lieux de travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022764985/",
      prescrit:
        "Tout établissement dispose d'un éclairage de sécurité permettant l'évacuation en cas d'interruption accidentelle de l'éclairage normal. L'article POSE l'obligation et renvoie à un arrêté ministériel pour la conception, la mise en œuvre, l'exploitation, la maintenance et les dispenses : c'est l'arrêté du 14 décembre 2011, pas cet article, qui porte les périodicités.",
      citationCle:
        "Les établissements disposent d'un éclairage de sécurité permettant d'assurer l'évacuation des personnes en cas d'interruption accidentelle de l'éclairage normal. La conception, la mise en œuvre et les conditions d'exploitation et de maintenance de cet éclairage ainsi que les locaux qui peuvent en être dispensés en raison de leur faible superficie ou de leur faible fréquentation sont définis par un arrêté des ministres chargés du travail et de l'agriculture.",
      versionEnVigueur: "2011-07-01",
      modifiePar: { texte: "Décret n° 2010-1018 du 30 août 2010 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "incendie-travail-eclairage-securite-autonomie-semestrielle",
        "incendie-travail-eclairage-securite-essai-mensuel",
      ],
    },
    {
      ref: "R. 4226-19",
      intitule: "Registre des vérifications d'installations électriques",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765064/",
      prescrit:
        "Consigner sur un registre les résultats des vérifications de R. 4226-14 et R. 4226-16 et les justifications des travaux correctifs, et y annexer les rapports d'un organisme accrédité. Support de consignation des seules vérifications ÉLECTRIQUES : l'article ne dit rien de l'éclairage de sécurité et ne porte aucune périodicité.",
      citationCle:
        "Les résultats des vérifications prévues aux articles R. 4226-14 et R. 4226-16 ainsi que les justifications des travaux et modifications effectués pour porter remède aux défectuosités constatées sont consignés sur un registre. Lorsque les vérifications sont effectuées par un organisme accrédité, les rapports établis à la suite de ces vérifications sont annexés à ce registre.",
      versionEnVigueur: "2011-07-01",
      // Page de l'article : « Création Décret n°2010-1016 du 30 août 2010 - art. 1 ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      // LU DEUX FOIS LE MÊME JOUR, par deux lots qui s'ignoraient — le relevé
      // incendie et le relevé électricité. Les deux `citationCle` sont
      // identiques au mot près, et les deux `prescrit` concluent la même
      // chose : l'article ne vise que les vérifications électriques et ne dit
      // rien de l'éclairage de sécurité. Cette corroboration indépendante clôt
      // une question ouverte quatre fois en onze jours.
      statut: "retenu",
      obligations: [
        "incendie-travail-eclairage-securite-autonomie-semestrielle",
        "incendie-travail-eclairage-securite-essai-mensuel",
      ],
      historique:
        "« RÉFÉRENCE À TORT » : LA CONCLUSION ÉTAIT FAUSSE, la lecture juste. Rectifié le 2026-09-01 par le lot A ; voir la réserve du même article dans `code-travail-electricite`, qui porte le raisonnement complet.\n\nCe qui reste : R. 4226-19 se borne, comme FONDEMENT, aux vérifications électriques de R. 4226-14 et R. 4226-16, et son chemin le confirme — Chapitre VI « Installations électriques », Section 5. Il ne fonde ni l'essai mensuel ni l'autonomie semestrielle de l'éclairage de sécurité.\n\nCe qui était faux : les deux obligations ne le citent pas en fondement — c'est l'article 11 de l'arrêté du 14 décembre 2011 qui l'est — et cet article 11 désigne nommément ce registre-ci : « Le résultat des opérations précédentes doit être mentionné sur le registre prévu à l'article R. 4226-19 du code du travail. » La référence est un support de consignation, sa `note` le disait déjà, et elle reste.",
    },
    {
      ref: "R. 4227-39",
      intitule: "Essais et visites périodiques du matériel, exercices semestriels",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769386/",
      prescrit:
        "La consigne de sécurité incendie prévoit des essais et visites périodiques du matériel ET des exercices d'apprentissage ; les deux ont lieu au moins tous les six mois, et leur date comme leurs observations sont consignées sur un registre tenu à la disposition de l'inspection du travail. « Au moins tous les six mois » est un plancher de fréquence, pas un rendez-vous fixe. Le champ est celui de R. 4227-34, par le double renvoi 39 → 37 → 34.",
      citationCle:
        "La consigne de sécurité incendie prévoit des essais et visites périodiques du matériel et des exercices au cours desquels les travailleurs apprennent à reconnaître les caractéristiques du signal sonore d'alarme générale, à localiser et à utiliser les espaces d'attente sécurisés ou les espaces équivalents à se servir des moyens de premier secours et à exécuter les diverses manœuvres nécessaires. Ces exercices et essais périodiques ont lieu au moins tous les six mois. Leur date et les observations auxquelles ils peuvent avoir donné lieu sont consignées sur un registre tenu à la disposition de l'inspection du travail.",
      versionEnVigueur: "2011-11-10",
      modifiePar: { texte: "Décret n° 2011-1461 du 7 novembre 2011 - art. 8" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "incendie-registre-securite",
        "incendie-travail-exercice-semestriel",
      ],
      historique:
        "RELEVÉ DE LA SECTION C DU CADRAGE INFIRMÉ LE 2026-09-01 (lot C), ET C'EST LA SEULE DES DIX QUI L'AIT ÉTÉ. Le cadrage annonçait « Essais et visites périodiques DU MATÉRIEL, semestriels — R. 4227-39 (le référentiel n'a que l'exercice) ». Le référentiel a les deux, et depuis longtemps : `incendie-travail-exercice-semestriel` s'intitule « Essais du matériel ET exercices d'évacuation semestriels » — libellé élargi bien avant cette passe, au commit `2d341ac` —, sa `description` reprend la phrase entière du texte, et sa `pieceAttendue` est le « registre des exercices et essais ». Cette entrée de corpus ne portait d'ailleurs aucune réserve, ce qui était juste.\n\nCE QUI A TROMPÉ LE RELEVÉ EST L'IDENTIFIANT, qui ne dit que l'exercice. Il ne se renomme pas : `Verification.obligationId` est stocké en base sous contrainte d'unicité, et le changer orphelinerait les lignes de calendrier existantes — même raison que pour `elec-erp-groupe-electrogene-annuel`, dont la périodicité est mensuelle.\n\nET SCINDER SERAIT FAUX. Le texte cadence les deux actes d'une seule phrase — « Ces exercices ET ESSAIS périodiques ont lieu au moins tous les six mois » —, sur une seule consigne et avec un seul registre. Deux lignes produiraient deux rendez-vous là où le texte en donne un, ce qui est exactement la décomposition que l'ADR-022 écarte.",
    },
    {
      ref: "R. 4227-34",
      intitule: "Établissements équipés d'un système d'alarme sonore",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532067/",
      prescrit:
        "Équiper d'un système d'alarme sonore les établissements où plus de cinquante personnes peuvent être occupées ou réunies habituellement, ainsi que ceux, quelle que soit leur importance, où sont manipulées et mises en œuvre les matières inflammables de R. 4227-22. C'est l'article de champ auquel R. 4227-37 puis R. 4227-39 renvoient.",
      citationCle:
        "Les établissements dans lesquels peuvent se trouver occupées ou réunies habituellement plus de cinquante personnes, ainsi que ceux, quelle que soit leur importance, où sont manipulées et mises en œuvre des matières inflammables mentionnées à l'article R. 4227-22 sont équipés d'un système d'alarme sonore.",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-travail-exercice-semestriel"],
    },
    {
      ref: "R. 4227-37",
      intitule: "Consigne de sécurité incendie établie et affichée",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769379/",
      prescrit:
        "Dans les seuls établissements du champ de R. 4227-34 : établir et afficher de manière très apparente une consigne de sécurité incendie, dans chaque local de plus de cinq personnes et dans les locaux de R. 4227-24, sinon dans chaque local ou dégagement desservant un groupe de locaux. Dans les AUTRES établissements, de simples instructions d'évacuation. Aucun équipement n'y est nommé et aucune périodicité n'y figure.",
      citationCle:
        "Dans les établissements mentionnés à l'article R. 4227-34, une consigne de sécurité incendie est établie et affichée de manière très apparente : 1° Dans chaque local pour les locaux dont l'effectif est supérieur à cinq personnes et pour les locaux mentionnés à l'article R. 4227-24 ; 2° Dans chaque local ou dans chaque dégagement desservant un groupe de locaux dans les autres cas. Dans les autres établissements, des instructions sont établies, permettant d'assurer l'évacuation des personnes présentes dans les locaux dans les conditions prévues au 1° de l'article R. 4216-2.",
      versionEnVigueur: "2011-11-10",
      versionFuture: "2027-01-01",
      modifiePar: { texte: "Décret n° 2011-1461 du 7 novembre 2011 - art. 6" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-travail-consigne-affichee"],
    },
    {
      ref: "R. 4227-38",
      intitule: "Contenu de la consigne de sécurité incendie",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769384/",
      prescrit:
        "Fixe en huit points ce que la consigne de R. 4227-37 doit indiquer : matériel d'extinction et de secours, personnes chargées de le mettre en action, personnes chargées de diriger l'évacuation local par local, mesures liées à la présence de personnes handicapées et espaces d'attente sécurisés, moyens d'alerte, personnes chargées d'aviser les sapeurs-pompiers, adresse et numéro du service de secours de premier appel, et le devoir d'alarme de toute personne apercevant un début d'incendie. Ne crée aucune obligation autonome et ne porte aucune périodicité : il donne le contenu de l'écrit que R. 4227-37 fait établir, et son champ est donc celui de R. 4227-37, lui-même celui de R. 4227-34.",
      citationCle:
        "La consigne de sécurité incendie indique : 1° Le matériel d'extinction et de secours qui se trouve dans le local ou à ses abords ; 2° Les personnes chargées de mettre ce matériel en action ; 3° Pour chaque local, les personnes chargées de diriger l'évacuation des travailleurs et éventuellement du public ; 4° Les mesures spécifiques liées à la présence de personnes handicapées, et notamment le nombre et la localisation des espaces d'attentes sécurisés ou des espaces équivalents ; 5° Les moyens d'alerte ; 6° Les personnes chargées d'aviser les sapeurs-pompiers dès le début d'un incendie ; 7° L'adresse et le numéro d'appel téléphonique du service de secours de premier appel, en caractères apparents ; 8° Le devoir, pour toute personne apercevant un début d'incendie, de donner l'alarme et de mettre en œuvre les moyens de premier secours, sans attendre l'arrivée des travailleurs spécialement désignés.",
      versionEnVigueur: "2011-11-10",
      modifiePar: { texte: "Décret n° 2011-1461 du 7 novembre 2011 - art. 7" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-travail-consigne-affichee"],
    },
    {
      ref: "L. 4711-5",
      intitule: "Faculté de réunir les registres en un registre unique",
      versionEnVigueur: "2008-05-01",
      prescrit:
        "Rien. L'article AUTORISE, il n'impose pas : il permet de regrouper en un seul registre des informations dont d'autres textes prévoient qu'elles figurent dans des registres distincts.",
      citationCle:
        "Lorsqu'il est prévu que les informations énumérées aux articles L. 4711-1 et L. 4711-2 figurent dans des registres distincts, l'employeur est autorisé à réunir ces informations dans un registre unique dès lors que cette mesure est de nature à faciliter la conservation et la consultation de ces informations.",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
      reserve:
        "Relu le 2026-08-31 : cet article ne fonde PAS l'obligation, contrairement à ce que son rattachement laissait croire. Le verbe est « est autorisé à » — une faculté. Il était pourtant la seule référence Code du travail portant la branche `travail: true` de `incendie-registre-securite`, c'est-à-dire que l'obligation s'appliquait à tout employeur sans qu'aucun texte cité ne l'établisse. L. 4711-1, L. 4711-2, D. 4711-2 et D. 4711-3 sont entrés au corpus le même jour pour porter réellement cette branche. L. 4711-5 reste rattaché parce que l'obligation le cite encore, désormais pour ce qu'il est : la forme permise, pas le fondement.",
    },
    {
      ref: "L. 4711-1",
      intitule:
        "Mentions obligatoires des attestations, consignes, résultats et rapports de vérification",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178110/",
      versionEnVigueur: "2008-05-01",
      prescrit:
        "Tout employeur : les pièces des vérifications et contrôles de santé-sécurité qui lui incombent portent des mentions obligatoires fixées par voie réglementaire (D. 4711-2). Aucune condition d'effectif, d'équipement ni de classement ERP.",
      citationCle:
        "Les attestations, consignes, résultats et rapports relatifs aux vérifications et contrôles mis à la charge de l'employeur au titre de la santé et de la sécurité au travail comportent des mentions obligatoires déterminées par voie réglementaire.",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
    },
    {
      ref: "L. 4711-2",
      intitule:
        "Conservation des observations et mises en demeure de l'inspection du travail",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178110/",
      versionEnVigueur: "2008-05-01",
      prescrit:
        "Tout employeur conserve les observations et mises en demeure notifiées par l'inspection du travail en matière de santé, de sécurité, de médecine du travail et de prévention des risques.",
      citationCle:
        "Les observations et mises en demeure notifiées par l'inspection du travail en matière de santé et de sécurité, de médecine du travail et de prévention des risques sont conservées par l'employeur.",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
    },
    {
      ref: "D. 4711-2",
      intitule: "Ce que les pièces de vérification doivent porter",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018493740/",
      versionEnVigueur: "2008-05-01",
      prescrit:
        "Les pièces visées à L. 4711-1 sont datées et mentionnent l'identité de la personne ou de l'organisme chargé du contrôle ainsi que celle de la personne qui l'a réalisé.",
      citationCle:
        "Les attestations, consignes, résultats et rapports relatifs aux vérifications et contrôles mis à la charge de l'employeur au titre de la santé et de la sécurité au travail sont datés. Ils mentionnent l'identité de la personne ou de l'organisme chargé du contrôle ou de la vérification ainsi que celle de la personne qui a réalisé le contrôle ou la vérification.",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
    },
    {
      ref: "D. 4711-3",
      intitule: "Durée de conservation des pièces de vérification",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020398142/",
      versionEnVigueur: "2009-03-16",
      prescrit:
        "Sauf dispositions particulières, tout employeur conserve les documents des vérifications et contrôles des cinq dernières années et, en tout état de cause, ceux des deux derniers contrôles — ainsi que les observations et mises en demeure de l'inspection du travail, et, pendant la même durée, les copies des déclarations d'accidents du travail faites à la caisse primaire d'assurance maladie. La réserve « sauf dispositions particulières » compte : cinq ans est un plancher supplétif, qu'un texte spécial peut allonger.",
      citationCle:
        "Sauf dispositions particulières, l'employeur conserve les documents concernant les observations et mises en demeure de l'inspection du travail ainsi que ceux concernant les vérifications et contrôles mis à la charge des employeurs au titre de la santé et de la sécurité au travail des cinq dernières années et, en tout état de cause, ceux des deux derniers contrôles ou vérifications. Il conserve, pendant la même durée, les copies des déclarations d'accidents du travail déclarés à la caisse primaire d'assurance maladie.",
      modifiePar: { texte: "Décret n° 2009-289 du 13 mars 2009 - art. 4" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-registre-securite"],
      reserve:
        "La durée de conservation — cinq ans, et en tout état de cause les deux derniers contrôles — n'est portée par aucun champ du référentiel. `incendie-registre-securite` est en `periodicite: autre`, ce qui dit « état à maintenir » et ne dit rien d'une rétention. Le produit conserve les rapports déposés sans jamais annoncer la durée que le texte exige.\n\nCORRECTION 2026-09-01, lot « traçabilité ». L'entrée était datée 2008-05-01 : faux, l'article a été modifié par le décret n° 2009-289 du 13 mars 2009 et sa version en vigueur court depuis le 16/03/2009 (LEGIARTI000020398142). Sa citation amputait en outre les trois premiers mots — « Sauf dispositions particulières, » — et son second alinéa entier. Les deux manques ont des conséquences : la réserve fait de cinq ans un plancher supplétif et non un chiffre absolu, et le second alinéa étend la même durée aux copies des déclarations d'accidents du travail, pièces que le produit ne connaît pas du tout. Relu à la source ce jour, alinéa par alinéa.",
    },
  ],
};
