// Corpus : code du travail — obligation générale d'information et de formation
// à la sécurité.
//
// Étendue « integral » : les 26 articles des deux chapitres Ier du titre IV
// (partie législative, L. 4141-1 à L. 4141-5 ; partie réglementaire,
// R. 4141-1 à R. 4141-20) sont énumérés ici, y compris ceux dont rien ne
// découle pour le produit. C'est le premier corpus du référentiel à porter une
// obligation qui ne dépend d'aucun équipement.
//
// POURQUOI CE TEXTE EN PREMIER. C'est l'obligation la plus universelle du Code
// du travail : elle s'impose dès le premier salarié, sans condition
// d'équipement, de secteur ni d'effectif. Elle est aussi celle qui répond à la
// question qui a ouvert le chantier — « et sur Camille qui est électricienne,
// il n'y a pas une formation obligatoire ? ou je suis censée le voir où ? ».
//
// CE QU'ON N'Y TROUVE PAS, ET C'EST LE POINT. Aucune périodicité chiffrée. La
// seule durée écrite de tout le chapitre est le délai d'un mois de
// `R. 4141-20`, et il court depuis l'affectation, pas depuis la formation
// précédente. `L. 4141-2` dit « répétée périodiquement dans des conditions
// déterminées par voie réglementaire ou par convention ou accord collectif de
// travail » — et le règlement ne les a pas déterminées. Toute périodicité
// annoncée par le produit sur ce chapitre serait donc inventée, ou reprise
// d'un accord de branche que l'outil ne lit pas.
//
// Lecture : `agent_verbatim`. Les verbatims ont été relevés article par
// article sur Légifrance le 2026-08-31 par l'agent qui encode, avec la date de
// version affichée par la page. Ils valent constat, pas garantie : aucun n'a
// été recoupé par un second lecteur.

import type { Corpus } from "./types";

const URL = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CODE_TRAVAIL_FORMATION_SECURITE: Corpus = {
  id: "code-travail-formation-securite",
  intitule:
    "Code du travail — obligation générale d'information et de formation à la sécurité",
  // Le corpus couvre DEUX chapitres — un par partie du Code —, et une seule
  // URL ne peut pas les désigner tous les deux. Celle-ci pointe le chapitre
  // législatif (L. 4141-1 à L. 4141-5) ; le chapitre réglementaire
  // (R. 4141-1 à R. 4141-20) est à `LEGISCTA000018488274`, cité dans `portee`.
  // La première rédaction n'annonçait que celle-ci en se déclarant `integral`
  // sur 26 articles : le lecteur qui l'ouvrait en trouvait cinq.
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178070/",
  etendue: "integral",
  portee:
    "Chapitre Ier du titre IV du livre Ier de la quatrième partie, dans ses deux versants — partie législative (https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178070/) et partie réglementaire (https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018488274/) : L. 4141-1 à L. 4141-5 (obligation d'information, obligation de formation, étendue, financement, passeport de prévention) et R. 4141-1 à R. 4141-20 (objet et organisation, conditions de circulation, conditions d'exécution du travail, conduite à tenir en cas d'accident ou de sinistre). ATTENTION : L. 4141-5 a été réécrit au 27 juin 2026 par la loi n° 2026-534 du 25 juin 2026, art. 70 — le passeport de prévention est le seul article du chapitre modifié depuis 2013.",
  articles: [
    // -------------------------------------------------------------------------
    // Partie législative — L. 4141-1 à L. 4141-5
    // -------------------------------------------------------------------------
    {
      ref: "L. 4141-1",
      intitule: "Obligation d'information des travailleurs sur les risques",
      url: URL("LEGIARTI000027326445"),
      versionEnVigueur: "2013-04-18",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur organise et dispense une information des travailleurs sur les risques pour leur santé et leur sécurité, et sur les mesures prises pour y remédier.",
      citationCle:
        "L'employeur organise et dispense une information des travailleurs sur les risques pour la santé et la sécurité et les mesures prises pour y remédier. Il organise et dispense également une information des travailleurs sur les risques que peuvent faire peser sur la santé publique ou l'environnement les produits ou procédés de fabrication utilisés ou mis en œuvre par l'établissement ainsi que sur les mesures prises pour y remédier.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-information"],
    },
    {
      ref: "L. 4141-2",
      intitule: "Obligation de formation pratique et appropriée à la sécurité",
      url: URL("LEGIARTI000006903166"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur organise une formation pratique et appropriée à la sécurité au bénéfice des embauchés, de ceux qui changent de poste ou de technique, des salariés temporaires et — à la demande du médecin du travail — de ceux qui reprennent après un arrêt d'au moins vingt et un jours.",
      citationCle:
        "L'employeur organise une formation pratique et appropriée à la sécurité au bénéfice : 1° Des travailleurs qu'il embauche ; 2° Des travailleurs qui changent de poste de travail ou de technique ; 3° Des salariés temporaires, à l'exception de ceux auxquels il est fait appel en vue de l'exécution de travaux urgents nécessités par des mesures de sécurité et déjà dotés de la qualification nécessaire à cette intervention ; 4° A la demande du médecin du travail, des travailleurs qui reprennent leur activité après un arrêt de travail d'une durée d'au moins vingt et un jours. Cette formation est répétée périodiquement dans des conditions déterminées par voie réglementaire ou par convention ou accord collectif de travail.",
      statut: "retenu",
      obligations: [
        "formation-securite-etablissement-organisation",
        "formation-securite-salarie-accueil",
      ],
      reserve:
        "La dernière phrase — « Cette formation est répétée périodiquement dans des conditions déterminées par voie réglementaire ou par convention ou accord collectif de travail » — n'est portée par aucune échéance du produit, et ne peut pas l'être. Le pouvoir réglementaire n'a fixé aucune durée dans les vingt articles R. 4141-*, et la seconde branche renvoie aux conventions et accords collectifs, que l'outil ne lit pas. La périodicité de l'obligation reste donc « autre » : un état à maintenir, pas un rendez-vous. Y écrire un an ou trois ans reviendrait à fabriquer une échéance qui se présenterait à un contrôle sans qu'aucun texte ne la porte.",
    },
    {
      ref: "L. 4141-3",
      intitule: "Étendue variable de l'obligation",
      url: URL("LEGIARTI000006903167"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'étendue de l'obligation varie selon la taille de l'établissement, la nature de l'activité, les risques constatés et le type d'emploi.",
      citationCle:
        "L'étendue de l'obligation d'information et de formation à la sécurité varie selon la taille de l'établissement, la nature de son activité, le caractère des risques qui y sont constatés et le type d'emploi des travailleurs.",
      statut: "sans_objet",
      motif:
        "Règle de modulation de l'étendue d'une obligation portée ailleurs (L. 4141-1 et L. 4141-2). Elle ne crée ni acte à réaliser, ni pièce à détenir, ni échéance : elle dit à quel point l'obligation existante s'étire. Rien à inscrire au calendrier.",
    },
    {
      ref: "L. 4141-4",
      intitule: "Financement à la charge de l'employeur",
      url: URL("LEGIARTI000037387747"),
      versionEnVigueur: "2019-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le financement des actions de formation à la sécurité est à la charge de l'employeur.",
      citationCle:
        "Le financement des actions de formation à la sécurité est à la charge de l'employeur.",
      statut: "sans_objet",
      motif:
        "Règle d'imputation de la charge financière. Elle ne produit ni acte daté, ni pièce, ni récurrence — et le produit ne traite aucune donnée comptable. Rien à inscrire au calendrier.",
    },
    {
      ref: "L. 4141-5",
      intitule: "Passeport de prévention",
      url: URL("LEGIARTI000054336916"),
      versionEnVigueur: "2026-06-27",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur (ou son tiers déclarant) renseigne dans le passeport de prévention les attestations, certificats, certifications et diplômes obtenus par ses salariés à l'issue des formations santé-sécurité qu'il a dispensées.",
      citationCle:
        "Il est créé un passeport de prévention afin de faciliter le respect par les employeurs de leur obligation de formation prévue à l'article L. 4141-2. Il comporte les attestations, certificats, certifications professionnelles et diplômes obtenus dans le cadre des formations relatives à la santé et à la sécurité au travail mentionnées au même article L. 4141-2.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "L'article met à la charge de l'employeur le renseignement du passeport de prévention (III, 1°) pour les formations qu'il dispense. C'est une obligation d'exploitant, non couverte par le référentiel. Il est aussi le seul endroit du chapitre où le droit affirme que la formation à la sécurité PRODUIT une pièce nominative — attestation, certificat, diplôme — ce qui est l'argument le plus fort en faveur du porteur salarié retenu pour `formation-securite-salarie-accueil`.",
      bloquePar:
        "Le passeport est un service national tiers : il est intégré au système d'information du compte personnel de formation et géré par la Caisse des dépôts et consignations (II). Rien de ce que l'outil détiendrait ne pourrait solder l'obligation, qui se remplit chez un tiers ; et le V renvoie les modalités de mise en œuvre au comité national de prévention et de santé au travail, à défaut à un décret en Conseil d'État. Encoder une échéance là-dessus aujourd'hui reviendrait à annoncer un rendez-vous dans un système auquel le produit n'est pas raccordé.",
    },

    // -------------------------------------------------------------------------
    // Partie réglementaire, section 1 — objet et organisation (R. 4141-1 à -10)
    // -------------------------------------------------------------------------
    {
      ref: "R. 4141-1",
      intitule: "Place de la formation dans la prévention",
      url: URL("LEGIARTI000018532882"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      citationCle:
        "La formation à la sécurité concourt à la prévention des risques professionnels. Elle constitue l'un des éléments du programme annuel de prévention des risques professionnels prévu au 2° de l'article L. 4612-16.",
      statut: "sans_objet",
      motif:
        "Article de rattachement : il situe la formation dans le programme annuel de prévention, sans créer d'acte propre. À noter pour la veille, sans conséquence ici : il renvoie à L. 4612-16, article abrogé avec le CHSCT — le renvoi est mort dans le texte lui-même, ce n'est pas une erreur du référentiel.",
    },
    {
      ref: "R. 4141-2",
      intitule: "Moment de l'information et de la formation",
      url: URL("LEGIARTI000019960813"),
      versionEnVigueur: "2008-12-20",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'information et la formation à la sécurité sont dispensées lors de l'embauche et chaque fois que nécessaire, d'une manière compréhensible pour chacun.",
      citationCle:
        "L'employeur informe les travailleurs sur les risques pour leur santé et leur sécurité d'une manière compréhensible pour chacun. Cette information ainsi que la formation à la sécurité sont dispensées lors de l'embauche et chaque fois que nécessaire.",
      statut: "retenu",
      obligations: [
        "formation-securite-etablissement-information",
        "formation-securite-salarie-accueil",
      ],
    },
    {
      ref: "R. 4141-3",
      intitule: "Objet et contenu de la formation à la sécurité",
      url: URL("LEGIARTI000018532878"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "La formation instruit le travailleur des précautions à prendre ; elle porte sur les conditions de circulation, les conditions d'exécution du travail et la conduite à tenir en cas d'accident ou de sinistre.",
      citationCle:
        "La formation à la sécurité a pour objet d'instruire le travailleur des précautions à prendre pour assurer sa propre sécurité et, le cas échéant, celle des autres personnes travaillant dans l'établissement. Elle porte sur : 1° Les conditions de circulation dans l'entreprise ; 2° Les conditions d'exécution du travail ; 3° La conduite à tenir en cas d'accident ou de sinistre.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-organisation"],
    },
    {
      ref: "R. 4141-3-1",
      intitule: "Contenu de l'information due aux travailleurs",
      url: URL("LEGIARTI000021723595"),
      versionEnVigueur: "2010-01-23",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'information porte notamment sur les modalités d'accès au document unique, les mesures de prévention qu'il retient, le rôle du service de santé au travail, le règlement intérieur le cas échéant, et les consignes de sécurité incendie.",
      citationCle:
        "L'employeur informe les travailleurs sur les risques pour leur santé et leur sécurité. Cette information porte sur : 1° Les modalités d'accès au document unique d'évaluation des risques, prévu à l'article R. 4121-1 ; 2° Les mesures de prévention des risques identifiés dans le document unique d'évaluation des risques ; 3° Le rôle du service de santé au travail et, le cas échéant, des représentants du personnel en matière de prévention des risques professionnels ; 4° Le cas échéant, les dispositions contenues dans le règlement intérieur, prévues aux alinéas 1° et 2° de l'article L. 1321-1 ; 5° Les consignes de sécurité incendie et instructions mentionnées à l'article R. 4227-37 ainsi que l'identité des personnes chargées de la mise en œuvre des mesures prévues à l'article R. 4227-38.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-information"],
    },
    {
      ref: "R. 4141-4",
      intitule: "Explication de l'utilité des mesures de prévention",
      url: URL("LEGIARTI000018532876"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      citationCle:
        "Lors de la formation à la sécurité, l'utilité des mesures de prévention prescrites par l'employeur est expliquée au travailleur, en fonction des risques à prévenir.",
      statut: "sans_objet",
      motif:
        "Prescription pédagogique interne à une formation portée ailleurs (R. 4141-3). Aucune pièce, aucune date, aucune récurrence propre.",
    },
    {
      ref: "R. 4141-5",
      intitule: "Adaptation de la formation et temps de travail",
      url: URL("LEGIARTI000019960820"),
      versionEnVigueur: "2008-12-20",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      citationCle:
        "La formation dispensée tient compte de la formation, de la qualification, de l'expérience professionnelles et de la langue, parlée ou lue, du travailleur appelé à en bénéficier. Le temps consacré à la formation et à l'information, mentionnées à l'article R. 4141-2, est considéré comme temps de travail. La formation et l'information en question se déroulent pendant l'horaire normal de travail.",
      statut: "sans_objet",
      motif:
        "Règles d'adaptation et de qualification du temps consacré. Elles conditionnent la manière dont une formation portée ailleurs se déroule ; elles ne créent ni acte daté, ni pièce, ni récurrence. Le décompte du temps de travail est par ailleurs hors périmètre du produit.",
    },
    {
      ref: "R. 4141-6",
      intitule:
        "Association du médecin du travail à l'élaboration des formations",
      url: URL("LEGIARTI000019960823"),
      versionEnVigueur: "2008-12-20",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur associe le médecin du travail à l'élaboration des actions de formation à la sécurité et à la détermination du contenu de l'information.",
      citationCle:
        "Le médecin du travail est associé par l'employeur à l'élaboration des actions de formation à la sécurité et à la détermination du contenu de l'information qui doit être dispensée en vertu de l'article R. 4141-3-1.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-organisation"],
      reserve:
        "L'association du médecin du travail est une condition de bonne exécution que le produit ne trace pas : aucun champ ne porte « le médecin du travail a été associé », et en inventer un sans que la propriétaire l'ait arbitré donnerait à l'outil une case à cocher dont personne ne pourrait vérifier la sincérité. L'obligation cite l'article et le rappelle en description ; elle ne le solde pas.",
    },
    {
      ref: "R. 4141-7",
      intitule: "Concours des organismes de prévention",
      url: URL("LEGIARTI000018532870"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      citationCle:
        "Les formations à la sécurité sont conduites avec le concours, le cas échéant, de l'organisme professionnel de santé, de sécurité et des conditions de travail prévu à l'article L. 4643-1, et celui des services de prévention des organismes de sécurité sociale.",
      statut: "sans_objet",
      motif:
        "Faculté de concours, explicitement conditionnelle — « le cas échéant ». Elle n'impose rien à l'employeur et ne produit aucune échéance.",
    },
    {
      ref: "R. 4141-8",
      intitule: "Formation après accident grave ou maladie professionnelle",
      url: URL("LEGIARTI000018532868"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Après un accident du travail ou une maladie professionnelle ou à caractère professionnel grave, ou présentant un caractère répété à un même poste de travail ou à des postes similaires, ou dans une même fonction ou des fonctions similaires, l'employeur analyse les conditions de circulation ou de travail et organise s'il y a lieu les formations à la sécurité prévues par le chapitre. [2026-09-26 : la première rédaction de ce résumé perdait « à caractère professionnel » et les postes et fonctions « similaires ».]",
      citationCle:
        "En cas d'accident du travail grave ou de maladie professionnelle ou à caractère professionnel grave, l'employeur procède, après avoir pris toute mesure pour satisfaire aux dispositions de l'article L. 4221-1, à l'analyse des conditions de circulation ou de travail. Il organise, s'il y a lieu, au bénéfice des travailleurs intéressés, les formations à la sécurité prévues par le présent chapitre. Il en est de même en cas d'accident du travail ou de maladie professionnelle ou à caractère professionnel présentant un caractère répété : 1° Soit à un même poste de travail ou à des postes de travail similaires ; 2° Soit dans une même fonction ou des fonctions similaires.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-apres-accident-grave"],
      historique:
        "Obligation manquante jusqu'au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : Obligation réelle et datable, mais déclenchée par un événement — un accident grave, ou la répétition d'accidents sur un même poste. Le référentiel ne la porte pas. — Son blocage : Il n'y a pas de déclencheur « événement » dans le modèle : l'ADR-022 nomme l'axe et s'arrête là, et `.claude/CLAUDE.md` explique pourquoi — un accident date une obligation, il ne la fait pas naître. Encoder celle-ci supposerait en plus que l'outil connaisse les accidents du travail, or le registre des accidents et la déclaration d'AT sont déclarés hors périmètre. — [2026-09-21 : la citation s'arrêtait avant le troisième alinéa, celui des accidents RÉPÉTÉS ; complétée. Le `prescrit` abrégeait « ou à des postes de travail similaires », « ou des fonctions similaires » et « ou à caractère professionnel ».]",
    },
    {
      ref: "R. 4141-9",
      intitule: "Formation à la reprise après arrêt d'au moins vingt et un jours",
      url: URL("LEGIARTI000018532866"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "À la demande du médecin du travail, le travailleur qui reprend après un arrêt d'au moins vingt et un jours bénéficie des formations à la sécurité, éventuellement définies par ce médecin.",
      citationCle:
        "Lorsqu'un travailleur reprend son activité après un arrêt de travail d'une durée d'au moins vingt et un jours, il bénéficie, à la demande du médecin du travail, des formations à la sécurité prévues par le présent chapitre. Lorsque des formations spécifiques sont organisées, elles sont définies par le médecin du travail.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-organisation"],
      reserve:
        "Le déclenchement effectif dépend de deux faits que l'outil ne détient pas : la durée de l'arrêt de travail, et la demande du médecin du travail. Le produit ne stocke aucun arrêt de travail — `docs/rgpd.md` § 2.3 borne ce qu'il détient d'une donnée de santé à l'existence, la date et l'échéance d'une pièce — et ne le fera pas pour porter cette ligne. L'obligation d'organisation cite l'article et le rappelle ; elle ne calcule aucune reprise.",
    },
    {
      ref: "R. 4141-10",
      intitule: "Articulation avec les formations particulières",
      url: URL("LEGIARTI000018532864"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      citationCle:
        "Les dispositions du présent chapitre s'appliquent sans préjudice des formations particulières prévues pour certains risques ou certaines activités ou opérations par les livres III à V.",
      statut: "sans_objet",
      motif:
        "Article d'articulation. Il n'institue rien : il réserve les formations particulières des livres III à V — dont l'habilitation électrique (R. 4544-*) et la formation à la conduite (R. 4323-55), portées ailleurs par ce référentiel.",
    },

    // -------------------------------------------------------------------------
    // Section 2 — conditions de circulation (R. 4141-11 et -12)
    // -------------------------------------------------------------------------
    {
      ref: "R. 4141-11",
      intitule: "Contenu de la formation aux conditions de circulation",
      url: URL("LEGIARTI000018532860"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Dispensée sur les lieux de travail, elle enseigne les règles de circulation des véhicules et engins, les chemins d'accès, les issues et dégagements de secours et les consignes d'évacuation.",
      citationCle:
        "La formation à la sécurité relative aux conditions de circulation des personnes est dispensée sur les lieux de travail. Elle a pour objet d'enseigner au travailleur, à partir des risques auxquels il est exposé : 1° Les règles de circulation des véhicules et engins de toute nature sur les lieux de travail et dans l'établissement ; 2° Les chemins d'accès aux lieux dans lesquels il est appelé à travailler ainsi qu'aux locaux sociaux ; 3° Les issues et dégagements de secours à utiliser en cas de sinistre ; 4° Les consignes d'évacuation, en cas notamment d'explosion, de dégagements accidentels de gaz ou liquides inflammables ou toxiques, si la nature des activités exercées le justifie.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-organisation"],
    },
    {
      ref: "R. 4141-12",
      intitule:
        "Formation après modification des conditions de circulation ou d'exploitation",
      url: URL("LEGIARTI000018532858"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "En cas de modification des conditions HABITUELLES de circulation sur les lieux de travail ou dans l'établissement ou de modification des conditions d'exploitation présentant NOTAMMENT des risques d'intoxication, d'incendie ou d'explosion, l'employeur analyse les nouvelles conditions de circulation et d'exploitation et organise s'il y a lieu la formation de R. 4141-11. [2026-09-26 : la première rédaction de ce résumé perdait « habituelles » et « notamment », et rattachait les risques aux deux modifications. Le texte, sans virgule, laisse ouverte la question de savoir si l'incise qualifie aussi la modification de circulation ; le résumé ne la tranche pas.]",
      citationCle:
        "En cas de modification des conditions habituelles de circulation sur les lieux de travail ou dans l'établissement ou de modification des conditions d'exploitation présentant notamment des risques d'intoxication, d'incendie ou d'explosion, l'employeur procède, après avoir pris toutes mesures pour satisfaire aux dispositions de l'article L. 4221-1 relatives à l'utilisation des lieux de travail, à l'analyse des nouvelles conditions de circulation et d'exploitation. L'employeur organise, s'il y a lieu, au bénéfice des travailleurs intéressés, une formation à la sécurité répondant aux dispositions de l'article R. 4141-11.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-modification-circulation-exploitation"],
      historique:
        "Obligation manquante jusqu'au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : Obligation réelle, déclenchée par une modification des conditions de circulation ou d'exploitation. Le référentiel ne la porte pas. — Son blocage : Même cause que R. 4141-8 : aucun déclencheur événementiel dans le modèle. S'y ajoute que le produit ne détient pas de description des conditions de circulation d'un établissement, donc rien qui puisse être constaté « modifié ». — [2026-09-21 : la citation omettait le second alinéa, qui porte la formation ; complétée. Le `prescrit` omet « notamment » — la liste des risques n'est pas limitative — et rattache cette incise aux conditions de circulation comme à celles d'exploitation, ce que la phrase ne permet pas d'affirmer.]",
    },

    // -------------------------------------------------------------------------
    // Section 3 — conditions d'exécution du travail (R. 4141-13 à -16)
    // -------------------------------------------------------------------------
    {
      ref: "R. 4141-13",
      intitule:
        "Contenu de la formation aux conditions d'exécution du travail",
      url: URL("LEGIARTI000018532854"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Elle enseigne les comportements et gestes les plus sûrs, les modes opératoires ayant une incidence sur la sécurité, et le fonctionnement des dispositifs de protection et de secours.",
      citationCle:
        "La formation à la sécurité relative aux conditions d'exécution du travail a pour objet d'enseigner au travailleur, à partir des risques auxquels il est exposé : 1° Les comportements et les gestes les plus sûrs en ayant recours, si possible, à des démonstrations ; 2° Les modes opératoires retenus s'ils ont une incidence sur sa sécurité ou celle des autres travailleurs ; 3° Le fonctionnement des dispositifs de protection et de secours et les motifs de leur emploi.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-organisation"],
    },
    {
      ref: "R. 4141-14",
      intitule: "Intégration à la formation professionnelle",
      url: URL("LEGIARTI000018532852"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      citationCle:
        "La formation à la sécurité relative aux conditions d'exécution du travail s'intègre à la formation ou aux instructions professionnelles que reçoit le travailleur. Elle est dispensée sur les lieux du travail ou, à défaut, dans les conditions équivalentes.",
      statut: "sans_objet",
      motif:
        "Modalité d'intégration et de lieu, pour une formation portée par R. 4141-13. Aucun acte propre, aucune récurrence.",
    },
    {
      ref: "R. 4141-15",
      intitule:
        "Tâches ouvrant droit à formation en cas de création ou modification de poste",
      url: URL("LEGIARTI000018532850"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Huit familles de tâches — dont l'utilisation de machines, la manipulation de produits chimiques, la manutention et la conduite d'appareils de levage — ouvrent droit à une formation sur les conditions d'exécution du travail en cas de création ou de modification de poste.",
      citationCle:
        "En cas de création ou de modification d'un poste de travail ou de technique exposant à des risques nouveaux et comprenant l'une des tâches ci-dessous énumérées, le travailleur bénéficie, s'il y a lieu, après analyse par l'employeur des nouvelles conditions de travail, d'une formation à la sécurité sur les conditions d'exécution du travail : 1° Utilisation de machines, portatives ou non ; 2° Manipulation ou utilisation de produits chimiques ; 3° Opérations de manutention ; 4° Travaux d'entretien des matériels et installations de l'établissement ; 5° Conduite de véhicules, d'appareils de levage ou d'engins de toute nature ; 6° Travaux mettant en contact avec des animaux dangereux ; 7° Opérations portant sur le montage, le démontage ou la transformation des échafaudages ; 8° Utilisation des techniques d'accès et de positionnement au moyen de cordes.",
      statut: "retenu",
      obligations: [
        "formation-securite-etablissement-organisation",
        "formation-securite-salarie-accueil",
      ],
    },
    {
      ref: "R. 4141-16",
      intitule: "Formation lors d'un changement de poste ou de technique",
      url: URL("LEGIARTI000018532848"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le travailleur changeant de poste ou de technique, exposé à des risques nouveaux ou affecté à l'une des tâches de R. 4141-15, bénéficie de cette formation, complétée par la formation à la circulation si le lieu de travail change.",
      citationCle:
        "En cas de changement de poste de travail ou de technique, le travailleur exposé à des risques nouveaux ou affecté à l'une des tâches définies à l'article R. 4141-15 bénéficie de la formation à la sécurité prévue par ce même article. Cette formation est complétée, s'il y a modification du lieu de travail, par une formation relative aux conditions de circulation des personnes.",
      statut: "retenu",
      obligations: ["formation-securite-salarie-accueil"],
    },

    // -------------------------------------------------------------------------
    // Section 4 — conduite à tenir en cas d'accident ou de sinistre (-17 à -20)
    // -------------------------------------------------------------------------
    {
      ref: "R. 4141-17",
      intitule:
        "Objet de la formation à la conduite à tenir en cas d'accident",
      url: URL("LEGIARTI000018532844"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Elle prépare le travailleur à la conduite à tenir lorsqu'une personne est victime d'un accident ou d'une intoxication sur les lieux du travail.",
      citationCle:
        "La formation à la sécurité sur les dispositions à prendre en cas d'accident ou de sinistre a pour objet de préparer le travailleur à la conduite à tenir lorsqu'une personne est victime d'un accident ou d'une intoxication sur les lieux du travail.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-organisation"],
    },
    {
      ref: "R. 4141-18",
      intitule:
        "Bénéficiaires de la formation à la conduite à tenir en cas d'accident",
      url: URL("LEGIARTI000018532842"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le travailleur affecté à l'une des tâches de R. 4141-15 bénéficie d'une formation à la conduite à tenir en cas d'accident ou de sinistre.",
      citationCle:
        "Le travailleur affecté à l'une des tâches énumérées à l'article R. 4141-15 bénéficie d'une formation à la conduite à tenir en cas d'accident ou de sinistre.",
      statut: "retenu",
      obligations: ["formation-securite-salarie-accueil"],
    },
    {
      ref: "R. 4141-19",
      intitule: "Formation à la conduite à tenir lors d'un changement de poste",
      url: URL("LEGIARTI000018532840"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      citationCle:
        "Lors d'un changement de poste de travail ou de technique, le travailleur exposé à des risques nouveaux ou affecté à l'une des tâches définies à l'article R. 4141-15 bénéficie d'une formation à la sécurité relative à la conduite à tenir en cas d'accident ou de sinistre.",
      statut: "retenu",
      obligations: ["formation-securite-salarie-accueil"],
    },
    {
      ref: "R. 4141-20",
      intitule:
        "Délai d'un mois pour la formation à la conduite à tenir en cas d'accident",
      url: URL("LEGIARTI000018532838"),
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Cette formation est dispensée dans le mois qui suit l'affectation du travailleur à son emploi.",
      citationCle:
        "La formation à la sécurité sur les dispositions à prendre en cas d'accident ou de sinistre est dispensée dans le mois qui suit l'affectation du travailleur à son emploi.",
      statut: "retenu",
      obligations: ["formation-securite-salarie-accueil"],
      reserve:
        "C'est la SEULE durée chiffrée de tout le chapitre, et ce n'est pas une périodicité : elle court depuis l'affectation du travailleur, pas depuis la formation précédente. Le modèle n'exprime pas un délai à compter d'un fait d'emploi — `Periodicite` décrit une récurrence, et `TitreSalarie.delivreLe` est la date de la formation reçue, pas celle de l'embauche. Le mois est donc rappelé en description de l'obligation ; il n'est pas calculé.",
    },
  ],
};
