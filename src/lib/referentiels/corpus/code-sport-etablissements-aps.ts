// Corpus : code du sport — les établissements où sont pratiquées des activités
// physiques ou sportives (livre III, titre II, chapitre II, et ses voisins), et
// la qualification des éducateurs (livre II, titre Ier, chapitre II) que leur
// affichage renvoie.
//
// POURQUOI CE FICHIER EXISTE. Sous-lot E de la mise à jour du référentiel,
// décision de la propriétaire du 2026-10-17 (« salles de sport gardées,
// léger »). Le dépôt ne portait aucun article du code du sport.
//
// LECTURE : `api_legifrance`, le 2026-10-17, par le client PISTE en bac à sable
// (égalité avec la production non vérifiée), page propre de chaque article,
// texte LEGITEXT000006071318. Le MCP Légifrance n'était pas chargé dans la
// session. Chaque `citationCle` est recopiée de la réponse de l'API.
//
// CE QUI N'EST PAS LU. Les arrêtés de discipline auxquels R. 322-7 renvoie
// (garanties d'hygiène et de sécurité et normes techniques par activité) ; les
// normes de sécurité des buts que R. 322-22 et R. 322-25 citent sans les
// nommer ; les autres articles des chapitres cités. Aucun n'est cité comme lu.

import type { Corpus } from "./types";

const ART = (id: string) => `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;
const LU = { luLe: "2026-10-17", lecture: "api_legifrance" } as const;

const MOTIF_QUALIFICATION =
  "Qualification professionnelle de l'éducateur, hors des titres santé-sécurité de Rojer, décision de la propriétaire du 2026-10-17 (« c'est trop un cas particulier, Rojer n'est pas un outil de gestion de salle de sport ; nos titres salariés sont réservés aux obligations santé-sécurité de l'employeur envers son salarié »). Le titre « carte professionnelle d'éducateur sportif », proposé au plan du sous-lot E, n'est pas entré. ~~Ce que Rojer fait de la carte : il en fait afficher la copie (R. 322-5 1°, `sport-etablissement-affichages-r322-5`), sans en dater la validité.~~ [2026-10-17, seconde décision du jour : l'affichage de R. 322-5 n'est plus encodé non plus ; Rojer ne suit ni la carte ni sa copie affichée, et l'aide du type X le dit.]";

export const CODE_SPORT_ETABLISSEMENTS_APS: Corpus = {
  id: "code-sport-etablissements-aps",
  intitule:
    "Code du sport — établissements où sont pratiquées des activités physiques ou sportives (L. 321-7, L. 322-1, L. 322-2, R. 322-4 à R. 322-26, A. 322-1 à A. 322-3) et qualification des éducateurs (L. 212-1, L. 212-8, L. 212-11, R. 212-85 à R. 212-87, A. 212-176)",
  url: "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006071318/",
  etendue: "articles_cites",
  portee:
    "Les articles du code du sport que le sous-lot E (2026-10-17) cite ou a dû ouvrir pour les citer : l'assurance (L. 321-7), l'honorabilité de l'exploitant (L. 322-1, A. 322-1, A. 322-2), les garanties d'hygiène et de sécurité (L. 322-2, R. 322-4, R. 322-5, R. 322-7, A. 322-3), la section des buts et paniers (R. 322-19 à R. 322-26, R. 322-25-1), et la qualification des éducateurs que l'affichage de R. 322-5 1° renvoie (L. 212-1, L. 212-8, L. 212-11, R. 212-85, R. 212-86, R. 212-87, A. 212-176). Les autres articles de ces chapitres ne sont pas dépouillés ; les arrêtés de discipline de R. 322-7 et les normes des buts ne sont pas lus.",
  articles: [
    {
      ref: "C. sport L. 321-7",
      intitule: "Assurance de responsabilité civile de l'exploitant",
      url: ART("LEGIARTI000006547692"),
      versionEnVigueur: "2006-05-25",
      ...LU,
      prescrit:
        "L'exploitation d'un établissement où sont pratiquées des activités physiques ou sportives est subordonnée à un contrat d'assurance couvrant la responsabilité civile de l'exploitant, des enseignants, des préposés et des pratiquants admis.",
      citationCle:
        "l'exploitation d'un établissement mentionné à l'article L. 322-2 est subordonnée à la souscription par l'exploitant d'un contrat d'assurance couvrant sa responsabilité civile",
      statut: "non_couvert",
      motif:
        "~~retenu (`sport-etablissement-assurance-rc`)~~. Décision de la propriétaire du 2026-10-17 (seconde du jour, « on n'est pas un outil de gestion de salle de sport, on n'alourdit pas ») : lu, non encodé, annoncé en une phrase dans l'aide du type X (`AIDE_TYPE_ERP.X`, surface créée par le sous-lot D ; la phrase y entre au rebase de celui qui merge en second). Les assurances sont hors périmètre (CLAUDE.md, « Obligations d'exploitation non-SST »).",
      declareA:
        "Formulaire de l'établissement, aide du type d'ERP sous le choix du type (`src/lib/etablissements/aide-type-erp.ts`, `AIDE_TYPE_ERP.X`) : « l'assurance de responsabilité civile de l'exploitant »",
    },
    {
      ref: "C. sport L. 322-1",
      intitule: "Honorabilité de l'exploitant",
      url: ART("LEGIARTI000006547695"),
      versionEnVigueur: "2006-05-25",
      ...LU,
      prescrit:
        "Interdit d'exploiter un établissement d'activités physiques ou sportives à quiconque a fait l'objet d'une condamnation de l'article L. 212-9.",
      citationCle:
        "Nul ne peut exploiter soit directement, soit par l'intermédiaire d'un tiers, un établissement dans lequel sont pratiquées des activités physiques ou sportives s'il a fait l'objet d'une condamnation prévue à l'article L. 212-9.",
      statut: "sans_objet",
      motif:
        "Une incapacité d'exploiter, que l'autorité administrative contrôle (A. 322-1) : ni acte à refaire, ni pièce à tenir par l'exploitant. Rien à inscrire au calendrier. [2026-10-17, revue indépendante du sous-lot E : l'article est cité par `sport-etablissement-secours-r322-4` comme article de CHAMP — R. 322-4 vise « les établissements mentionnés à l'article L. 322-1 » —, pas pour l'incapacité qu'il pose ; le statut ne change pas.]",
    },
    {
      ref: "C. sport L. 322-2",
      intitule: "Garanties d'hygiène et de sécurité — le champ",
      url: ART("LEGIARTI000006547696"),
      versionEnVigueur: "2006-05-25",
      ...LU,
      prescrit:
        "Les établissements où sont pratiquées des activités physiques ou sportives présentent des garanties d'hygiène et de sécurité définies par voie réglementaire.",
      citationCle:
        "Les établissements où sont pratiquées une ou des activités physiques ou sportives doivent présenter pour chaque type d'activité et d'établissement des garanties d'hygiène et de sécurité définies par voie réglementaire.",
      statut: "sans_objet",
      motif:
        "Article de champ et d'habilitation : les garanties sont celles des articles réglementaires (R. 322-4, R. 322-5, A. 322-3) ~~, retenus chacun~~ [2026-10-17, seconde décision du jour : seul R. 322-4 est retenu ; R. 322-5 et A. 322-3 sont `non_couvert`]. Le produit lit ce champ sur le type d'ERP X ; un établissement sportif qui ne serait pas déclaré X ne reçoit rien — limite écrite dans les notes de la ligne des secours.",
    },
    {
      ref: "C. sport R. 322-4",
      intitule: "Trousse de secours, moyen d'alerte, tableau d'organisation des secours",
      url: ART("LEGIARTI000006548228"),
      versionEnVigueur: "2007-07-25",
      ...LU,
      prescrit:
        "L'établissement dispose d'une trousse de secours et d'un moyen de communication pour alerter les secours, et affiche un tableau d'organisation des secours avec les coordonnées des intervenants d'urgence.",
      citationCle:
        "Un tableau d'organisation des secours est affiché dans l'établissement et comporte les adresses et numéros de téléphone des personnes et organismes susceptibles d'intervenir en cas d'urgence.",
      statut: "retenu",
      obligations: ["sport-etablissement-secours-r322-4"],
    },
    {
      ref: "C. sport R. 322-5",
      intitule: "Affichages obligatoires — diplômes et cartes, textes, assurance, dispositifs de signalement",
      url: ART("LEGIARTI000051610070"),
      versionEnVigueur: "2025-05-19",
      ...LU,
      prescrit:
        "Affiche en un lieu visible de tous une copie des diplômes et cartes professionnelles des éducateurs, des textes de garanties d'hygiène et de sécurité, de l'attestation d'assurance, et une information sur les dispositifs de signalement des violences (contenu fixé par arrêté).",
      citationCle:
        "Dans tout établissement où est pratiquée une activité physique ou sportive doit être affichée, en un lieu visible de tous, une copie :",
      statut: "non_couvert",
      motif:
        "~~retenu (`sport-etablissement-affichages-r322-5`, `sport-etablissement-affiche-signal-sports`)~~. Décision de la propriétaire du 2026-10-17 (seconde du jour, « on n'est pas un outil de gestion de salle de sport, on n'alourdit pas ») : lu, non encodé, annoncé en une phrase dans l'aide du type X (`AIDE_TYPE_ERP.X`, surface créée par le sous-lot D ; la phrase y entre au rebase de celui qui merge en second). Les deux alinéas sont concernés : copies des diplômes, cartes professionnelles, textes de sécurité et attestation d'assurance (1° à 3°), et l'information sur les dispositifs de signalement des violences (dernier alinéa, arrêté du 20 mai 2025).",
      declareA:
        "Formulaire de l'établissement, aide du type d'ERP sous le choix du type (`src/lib/etablissements/aide-type-erp.ts`, `AIDE_TYPE_ERP.X`) : « les affichages propres aux établissements sportifs (diplômes et cartes des éducateurs, textes de sécurité, attestation d'assurance, affiche Signal-sports) »",
    },
    {
      ref: "C. sport R. 322-7",
      intitule: "Garanties et normes techniques fixées par arrêté, par discipline",
      url: ART("LEGIARTI000006548232"),
      versionEnVigueur: "2007-07-25",
      ...LU,
      prescrit:
        "Renvoie à des arrêtés ministériels, par discipline, la fixation des garanties d'hygiène et de sécurité et des normes techniques de L. 322-2.",
      citationCle:
        "Les garanties d'hygiène et de sécurité ainsi que les normes techniques mentionnées à l'article L. 322-2 sont fixées par arrêté du ministre chargé des sports et des ministres intéressés",
      statut: "sans_objet",
      motif:
        "Renvoi. Les arrêtés de discipline ne sont pas lus ; R. 322-5 2° fait seulement afficher ceux qui s'appliquent, et la ligne des affichages ne nomme aucun d'eux.",
    },
    {
      ref: "C. sport A. 322-1",
      intitule: "Contrôle de l'honorabilité de l'exploitant par l'autorité",
      url: ART("LEGIARTI000032674592"),
      versionEnVigueur: "2016-06-10",
      ...LU,
      prescrit:
        "L'autorité administrative s'assure, par le casier judiciaire et le FIJAIS, que l'exploitant n'a pas fait l'objet des condamnations de L. 212-9.",
      citationCle:
        "Il appartient à l'autorité administrative, en demandant la délivrance du bulletin n° 2 du casier judiciaire",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
    },
    {
      ref: "C. sport A. 322-2",
      intitule: "Opposition à l'ouverture ou fermeture faute d'informations",
      url: ART("LEGIARTI000032674581"),
      versionEnVigueur: "2016-06-10",
      ...LU,
      prescrit:
        "L'autorité peut s'opposer à l'ouverture ou fermer l'établissement dont l'exploitant refuse de transmettre les informations de contrôle de l'honorabilité.",
      citationCle:
        "L'autorité administrative peut s'opposer à l'ouverture ou prononcer la fermeture temporaire ou définitive d'un établissement",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
    },
    {
      ref: "C. sport A. 322-3",
      intitule: "Information du pratiquant sur les capacités requises",
      url: ART("LEGIARTI000032674572"),
      versionEnVigueur: "2016-06-10",
      ...LU,
      prescrit:
        "Le pratiquant est informé, par tout moyen, des capacités requises pour les activités organisées par l'établissement.",
      citationCle:
        "Le pratiquant est informé, par tout moyen, des capacités requises pour la pratique d'une activité physique ou sportive organisée par l'établissement.",
      statut: "non_couvert",
      motif:
        "~~retenu (`sport-etablissement-information-pratiquants`)~~. Décision de la propriétaire du 2026-10-17 (seconde du jour, « on n'est pas un outil de gestion de salle de sport, on n'alourdit pas ») : lu, non encodé, annoncé en une phrase dans l'aide du type X (`AIDE_TYPE_ERP.X`, surface créée par le sous-lot D ; la phrase y entre au rebase de celui qui merge en second).",
      declareA:
        "Formulaire de l'établissement, aide du type d'ERP sous le choix du type (`src/lib/etablissements/aide-type-erp.ts`, `AIDE_TYPE_ERP.X`) : « l'information des pratiquants »",
    },
    {
      ref: "C. sport R. 322-19",
      intitule: "Buts et paniers — champ de la section, seuil de 10 kg",
      url: ART("LEGIARTI000043849075"),
      versionEnVigueur: "2016-07-01",
      ...LU,
      prescrit:
        "La section vise les cages de buts de football, handball, hockey et les buts de basket-ball, en plein air ou en salle, à des fins d'activité sportive ou de jeu ; les buts de moins de 10 kg sont exclus.",
      citationCle:
        "Sont exclus du champ d'application de la présente section les buts légers dont le poids total est inférieur à 10 kg.",
      statut: "retenu",
      obligations: ["sport-etablissement-buts-plan-verification"],
    },
    {
      ref: "C. sport R. 322-20",
      intitule: "Interdiction de mettre sur le marché ou à disposition un équipement non conforme",
      url: ART("LEGIARTI000032432150"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Interdit d'importer, vendre, louer ou mettre à la disposition du public des buts qui ne répondent pas aux exigences de sécurité de la section.",
      citationCle:
        "Il est interdit d'importer, de détenir en vue de la vente, de mettre en vente, de vendre, de distribuer à titre gratuit ou onéreux, de donner en location ou de mettre à la disposition du public les équipements mentionnés à l'article R. 322-19",
      statut: "sans_objet",
      motif:
        "Interdiction permanente sans échéance, qui pèse sur l'exploitant par sa dernière branche (« mettre à la disposition du public ») : elle se tient par la conformité des buts acquis, que le plan de vérification de R. 322-25 surveille. Rien à dater de plus.",
    },
    {
      ref: "C. sport R. 322-21",
      intitule: "Dispositif de fixation ou de contrepoids",
      url: ART("LEGIARTI000032432142"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Dès la mise sur le marché, les buts sont munis d'un dispositif de fixation permanente ou de contrepoids empêchant chute, renversement ou basculement.",
      citationCle:
        "Dès leur mise sur le marché, les équipements non mobiles sont munis d'un dispositif d'installation permettant d'assurer leur fixation permanente.",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Exigence de conception, à la charge de qui met le but sur le marché ; l'exploitant la reçoit avec l'équipement. Son maintien relève du plan de vérification de R. 322-25.",
    },
    {
      ref: "C. sport R. 322-22",
      intitule: "Présomption de conformité aux normes ; dossier du responsable de la mise sur le marché",
      url: ART("LEGIARTI000032432134"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Les buts fabriqués selon les normes de sécurité publiées au Journal officiel sont réputés conformes ; le responsable de la première mise sur le marché tient un dossier technique à disposition des agents de contrôle.",
      citationCle:
        "Sont réputés satisfaire aux exigences de sécurité de la présente section les équipements fabriqués conformément aux normes de sécurité les concernant, dont les références sont publiées au Journal officiel de la République française.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "S'adresse au fabricant et au responsable de la première mise sur le marché. Les normes visées ne sont pas lues ni nommées.",
    },
    {
      ref: "C. sport R. 322-23",
      intitule: "Notice d'emploi, mention d'avertissement, identification du fabricant",
      url: ART("LEGIARTI000032432128"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Les buts sont accompagnés d'une notice (montage, installation, utilisation, entretien) et portent une mention d'avertissement et l'identification du responsable de la mise sur le marché.",
      citationCle:
        "Lors de leur mise sur le marché et jusqu'au stade de l'acheteur final, les cages de buts de football, de handball, de hockey et les buts de basket-ball sont accompagnés d'une notice d'emploi",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif: "S'adresse à qui met le but sur le marché, « jusqu'au stade de l'acheteur final ».",
    },
    {
      ref: "C. sport R. 322-24",
      intitule: "Interdiction de mettre à disposition des usagers un but non conforme",
      url: ART("LEGIARTI000032432121"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Interdit de mettre à la disposition des usagers des buts qui ne répondent pas aux exigences de sécurité de la section.",
      citationCle:
        "La mise à la disposition des usagers à des fins d'activité sportive ou de jeu, gratuitement ou à titre onéreux, des cages de buts de football, de handball, de hockey et des buts de basket-ball en plein air ou en salle couverte est interdite si ces équipements ne répondent pas aux exigences de sécurité",
      statut: "sans_objet",
      motif:
        "Interdiction permanente, sans échéance : même règle que la dernière phrase de R. 322-25 (« immédiatement rendu inaccessible »), que la description de la ligne des buts dit. Rien à dater.",
    },
    {
      ref: "C. sport R. 322-25",
      intitule: "Entretien, contrôle à la première installation, plan de vérification et registre",
      url: ART("LEGIARTI000032432112"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Les exploitants entretiennent régulièrement les buts, les contrôlent dès la première installation selon les normes, établissent un plan de vérification et d'entretien précisant la périodicité, tiennent un registre des essais et contrôles par site, sécurisent les buts non fixés après usage et rendent inaccessible un équipement non conforme.",
      citationCle:
        "Les exploitants ou les gestionnaires des équipements installés établissent un plan de vérification et d'entretien qui précise notamment la périodicité des vérifications.",
      statut: "retenu",
      obligations: ["sport-etablissement-buts-plan-verification"],
      reserve:
        "Retenu pour le plan de vérification et d'entretien et le registre, ligne d'établissement née de la catégorie `BUT_PANIER_SPORTIF`. Ce que l'article impose ENCORE et que le référentiel ne date pas : le contrôle dès la première installation « conformément aux prescriptions des normes les concernant » (normes non lues, non nommées) ; la sécurisation des buts non fixés après chaque utilisation ; l'inaccessibilité immédiate d'un équipement non conforme (dite dans la description). Le rythme des vérifications est délégué au plan : pas de défaut annuel.",
    },
    {
      ref: "C. sport R. 322-25-1",
      intitule: "Signalement au préfet d'un accident grave lié à un but",
      url: ART("LEGIARTI000032431056"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Les exploitants signalent sans délai au préfet de département les accidents graves (mortels ou avec lésions corporelles) dont la cause est liée à un but ou panier.",
      citationCle:
        "Les exploitants ou les gestionnaires sont tenus de signaler sans délai au préfet de département les accidents graves dont la cause est liée à un équipement mentionné à la présente section.",
      statut: "non_couvert",
      motif:
        "Obligation événementielle, née d'un accident : décision de c6 du 2026-10-17, en réserve, non encodée (« c'est un événement, et on reste sans zèle »). L'aide de la catégorie `BUT_PANIER_SPORTIF` dit que Rojer ne suit pas ce signalement.",
      declareA:
        "Formulaire d'équipement, aide de la catégorie « But ou panier de sport de 10 kg ou plus » (`src/lib/equipements/labels.ts`, `DESCRIPTION_CATEGORIE.BUT_PANIER_SPORTIF`) : « le signalement au préfet d'un accident grave lié à un but »",
    },
    {
      ref: "C. sport R. 322-26",
      intitule: "Sanctions pénales de la section",
      url: ART("LEGIARTI000032432092"),
      versionEnVigueur: "2016-04-21",
      ...LU,
      prescrit:
        "Punit de l'amende de cinquième classe les manquements aux articles R. 322-21 à R. 322-25-1, dont l'absence de plan de vérification et de registre et le défaut de signalement.",
      citationCle:
        "Pour les exploitants ou les gestionnaires des équipements mentionnés à l'article R. 322-19, ne pas présenter aux agents chargés du contrôle le plan de vérification et d'entretien ainsi que le registre des essais et contrôles effectués",
      statut: "sans_objet",
      motif: "Disposition pénale : elle sanctionne des obligations déjà portées ou en réserve, sans en créer.",
    },
    {
      ref: "C. sport L. 212-1",
      intitule: "Qualification requise pour encadrer contre rémunération",
      url: ART("LEGIARTI000037388193"),
      versionEnVigueur: "2019-01-01",
      ...LU,
      prescrit:
        "Seuls les titulaires d'un diplôme, titre ou certificat de qualification garantissant la sécurité des pratiquants peuvent enseigner, animer ou encadrer une activité physique ou sportive contre rémunération.",
      citationCle:
        "Seuls peuvent, contre rémunération, enseigner, animer ou encadrer une activité physique ou sportive ou entraîner ses pratiquants",
      statut: "sans_objet",
      motif: MOTIF_QUALIFICATION,
    },
    {
      ref: "C. sport L. 212-8",
      intitule: "Sanction de l'emploi d'un éducateur non qualifié",
      url: ART("LEGIARTI000006547574"),
      versionEnVigueur: "2006-05-25",
      ...LU,
      prescrit:
        "Punit d'un an d'emprisonnement et de 15 000 euros d'amende l'exercice sans qualification et, au 2°, l'emploi d'une personne qui exerce sans la qualification requise.",
      citationCle:
        "D'employer une personne qui exerce les fonctions mentionnées au premier alinéa de l'article L. 212-1 sans posséder la qualification requise",
      statut: "non_couvert",
      motif: `Le 2° est la seule obligation de l'EMPLOYEUR que la lecture du sous-lot E a trouvée sur la qualification des éducateurs, et c'est sur lui que le plan fondait un titre salarié. ${MOTIF_QUALIFICATION}`,
      declareA:
        "Formulaire de l'établissement, aide du type d'ERP sous le choix du type (`src/lib/etablissements/aide-type-erp.ts`, `AIDE_TYPE_ERP.X`) : « la qualification des éducateurs employés »",
    },
    {
      ref: "C. sport L. 212-11",
      intitule: "Déclaration d'activité de l'éducateur",
      url: ART("LEGIARTI000006547577"),
      versionEnVigueur: "2006-05-25",
      ...LU,
      prescrit:
        "Les personnes qui encadrent contre rémunération déclarent leur activité à l'autorité administrative.",
      citationCle:
        "Les personnes exerçant contre rémunération les activités mentionnées au premier alinéa de l'article L. 212-1 déclarent leur activité à l'autorité administrative.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif: "S'adresse à l'éducateur, pas à l'exploitant ni à l'employeur.",
    },
    {
      ref: "C. sport R. 212-85",
      intitule: "Déclaration au préfet, renouvelée tous les cinq ans",
      url: ART("LEGIARTI000035425260"),
      versionEnVigueur: "2017-08-12",
      ...LU,
      prescrit:
        "L'éducateur déclare son activité au préfet du département d'exercice principal ; la déclaration est renouvelée tous les cinq ans.",
      citationCle: "Cette déclaration est renouvelée tous les cinq ans.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif: `Les « cinq ans » sont le renouvellement de la déclaration de l'éducateur lui-même, pas une obligation de l'employeur (relevé au plan du sous-lot E). ${MOTIF_QUALIFICATION}`,
    },
    {
      ref: "C. sport R. 212-86",
      intitule: "Carte professionnelle d'éducateur sportif",
      url: ART("LEGIARTI000049518702"),
      versionEnVigueur: "2024-05-09",
      ...LU,
      prescrit:
        "Le préfet délivre la carte professionnelle d'éducateur sportif aux déclarants, sauf condamnation ou interdiction ; la carte porte notamment sa date de péremption.",
      citationCle:
        "Le préfet délivre une carte professionnelle d'éducateur sportif aux personnes mentionnées à l'article R. 212-85",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif: `S'adresse au préfet. ${MOTIF_QUALIFICATION}`,
    },
    {
      ref: "C. sport R. 212-87",
      intitule: "Déclaration et attestation du stagiaire",
      url: ART("LEGIARTI000049530778"),
      versionEnVigueur: "2024-06-11",
      ...LU,
      prescrit:
        "La personne en formation déclare sa situation au préfet, qui lui délivre une attestation de stagiaire.",
      citationCle: "Le préfet délivre une attestation de stagiaire.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif: "S'adresse au stagiaire et au préfet ; R. 322-5 1° fait afficher l'attestation.",
    },
    {
      ref: "C. sport A. 212-176",
      intitule: "Contenu de la déclaration de l'éducateur",
      url: ART("LEGIARTI000032674554"),
      versionEnVigueur: "2016-06-10",
      ...LU,
      prescrit:
        "Fixe le contenu de la déclaration de R. 212-85 et R. 212-87 et les pièces à y joindre.",
      citationCle:
        "La déclaration prévue aux articles R. 212-85 et R. 212-87, dont un exemplaire type figure à l'annexe II-12",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif: "S'adresse au déclarant.",
    },
  ],
};
