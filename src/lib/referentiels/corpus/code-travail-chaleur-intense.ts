// Corpus : code du travail, quatrième partie, livre IV, titre VI, chapitre III —
// « Prévention des risques liés aux épisodes de chaleur intense »,
// articles R. 4463-1 à R. 4463-8.
//
// POURQUOI CE FICHIER EXISTE. C'est l'incident fondateur raconté en tête de
// `types.ts` : le décret n° 2025-482 du 27 mai 2025 était entré dans le dépôt
// par la porte de `R. 4225-2`, et la porte s'était refermée derrière lui. Son
// objet principal est CE chapitre, qui vise tout employeur et nomme
// l'exposition « en intérieur ». Instruit le 2026-09-01
// (`docs/revues/lot-d3-recoupement-droit.md` § 1 : « 2 obligations
// d'établissement à encoder »), jamais encodé — jusqu'au 2026-09-20.
//
// LECTURE. Les huit articles, sur la page PROPRE de chacun, le 2026-09-20. La
// page de SECTION les rend tronqués : `R. 4463-4` y perd son second alinéa,
// `R. 4463-6` aussi (« portées à la connaissance des travailleurs et
// communiquées au service de prévention et de santé au travail »), `R. 4463-5`
// et `-7` y sont paraphrasés. C'est le piège n° 8 du journal des vérifications.
// `agent_verbatim` : lu à travers l'outil de récupération, non recoupé à l'œil.
//
// `R. 4463-3` EST RETENU COMME CONTENU de l'obligation de `R. 4463-2`, pas
// comme ligne propre : il dit sur quoi « se fonde, notamment » la réduction du
// risque. Son 5° (« l'augmentation, autant qu'il est nécessaire, de l'eau
// potable fraîche ») n'est PAS `R. 4225-2`, que le référentiel porte déjà : l'un
// est la mise à disposition permanente, l'autre son augmentation en épisode.
// Ce n'est pas une `reserve` — le champ compte ce qu'un article impose ENCORE
// et que rien ne porte, et il n'y a rien de tel ici (contre-lecture du
// 2026-09-20).
//
// CE QUI N'EST PAS LU : l'arrêté d'application qui définit l'épisode
// (`R. 4463-1`). Aucun seuil de température n'est donc écrit nulle part.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_CHALEUR_INTENSE: Corpus = {
  id: "code-travail-chaleur-intense",
  intitule:
    "Code du travail — prévention des risques liés aux épisodes de chaleur intense (R. 4463-1 à R. 4463-8)",
  // L'adresse est celle du DÉCRET qui crée le chapitre (relevée le 2026-09-01) :
  // l'identifiant de la page du chapitre n'a pas été relevé, et on n'en fabrique
  // pas. Chaque article porte l'adresse de sa page propre.
  url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074",
  etendue: "integral",
  portee:
    "Les huit articles du chapitre, tous créés par l'article 3 du décret n° 2025-482 du 27 mai 2025 et en vigueur depuis le 2 juin 2025. L'article 8 du même décret (ouvert le 2026-09-20) donne aux employeurs un mois pour s'y conformer, délai qui, pour ce chapitre, « court à compter de la publication de l'arrêté prévu à l'article R. 4463-1 » — arrêté non lu ici ; le délai est échu de longue date. Deux fondent une obligation d'établissement (R. 4463-2 et R. 4463-6), un troisième en donne le contenu (R. 4463-3). ~~Quatre imposent quelque chose que le référentiel ne porte pas~~ [2026-09-21 : R. 4463-4, R. 4463-5 et R. 4463-7 sont encodés, en obligations événementielles que la page « Quand ça arrive » présente]. Reste R. 4463-8, qui vise le plan de prévention. L'arrêté qui définit l'épisode n'est pas dépouillé.",
  articles: [
    {
      ref: "R. 4463-1",
      intitule: "Définition de l'épisode de chaleur intense",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676923",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Renvoie la définition de l'épisode de chaleur intense à un arrêté, par référence au dispositif de Météo-France qui signale le niveau de danger de la chaleur.",
      citationCle:
        "Pour l'application du présent chapitre, l'épisode de chaleur intense est défini, dans des conditions déterminées par arrêté des ministres chargés du travail, de l'environnement et de l'agriculture, par référence à un dispositif développé par Météo-France pour signaler le niveau de danger de la chaleur.",
      statut: "sans_objet",
      motif: "Définition par renvoi. AUCUNE température au code : le seuil vit dans l'arrêté d'application (arrêté du 27 mai 2025, selon l'instruction du 2026-09-01), qui n'a PAS été ouvert dans ce lot — ne rien en affirmer, et ne jamais écrire de chiffre à l'écran. Conséquence pour le produit : un « épisode » est un fait météorologique daté qu'il n'observe pas.",
    },
    {
      ref: "R. 4463-2",
      intitule: "Évaluation du risque et définition des mesures de prévention",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676927",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Tout employeur évalue le risque lié aux épisodes de chaleur intense, en intérieur comme en extérieur, et, si l'évaluation identifie un risque, définit les mesures ou actions de prévention du III de L. 4121-3-1.",
      citationCle:
        "L'employeur évalue les risques liés à l'exposition des travailleurs à des épisodes de chaleur intense, en intérieur ou en extérieur. Lorsque l'évaluation identifie un risque d'atteinte à la santé ou à la sécurité des travailleurs, l'employeur définit les mesures ou les actions de prévention prévues au III de l'article L. 4121-3-1.",
      statut: "retenu",
      obligations: ["prevention-etablissement-evaluation-chaleur-intense"],
    },
    {
      ref: "R. 4463-3",
      intitule: "Les huit fondements de la réduction du risque",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676931",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "Énumère, « notamment », huit leviers de réduction du risque : procédés de travail, aménagement des postes, organisation et horaires avec périodes de repos, moyens techniques contre le rayonnement solaire et l'accumulation de chaleur, augmentation de l'eau potable fraîche, équipements de travail, équipements de protection individuelle, information et formation.",
      citationCle:
        "La réduction des risques liés à l'exposition aux épisodes de chaleur intense prévue au second alinéa de l'article R. 4463-2 se fonde, notamment, sur :",
      statut: "retenu",
      obligations: ["prevention-etablissement-evaluation-chaleur-intense"],
    },
    {
      ref: "R. 4463-4",
      intitule: "Eau potable fraîche en cas d'épisode",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676933",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "En cas d'épisode de chaleur intense, l'employeur fournit une quantité suffisante d'eau potable fraîche et prévoit un moyen de la maintenir au frais toute la journée, à proximité des postes de travail, notamment extérieurs.",
      citationCle:
        "En cas d'épisode de chaleur intense, une quantité d'eau potable fraîche suffisante est fournie par l'employeur. L'employeur prévoit un moyen pour maintenir au frais, tout au long de la journée de travail, l'eau destinée à la boisson, à proximité des postes de travail, notamment pour les postes de travail extérieurs.",
      statut: "retenu",
      obligations: ["prevention-etablissement-chaleur-eau-fraiche"],
      historique:
        "Obligation manquante du 2026-09-20 au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : Obligation réelle, qui touche la cible, et DÉCLENCHÉE PAR UN ÉPISODE : le produit n'observe pas la vigilance météorologique et ne peut donc pas la dater. Il pourrait la DIRE — « quand un épisode survient, fournissez… » — le jour où une surface sert l'événementiel d'établissement (lot 6a du plan du 2026-09-20). Le second alinéa, tronqué par la page de section, n'est apparu que sur la page propre de l'article.",
    },
    {
      ref: "R. 4463-5",
      intitule: "Travailleur particulièrement vulnérable",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676935",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "Informé qu'un travailleur est particulièrement vulnérable à la chaleur intense — âge, état de santé notamment —, l'employeur adapte les mesures de prévention en liaison avec le service de prévention et de santé au travail.",
      citationCle:
        "Lorsqu'il est informé de ce qu'un travailleur est, pour des raisons tenant notamment à son âge ou à son état de santé, particulièrement vulnérable aux risques liés à l'exposition aux épisodes de chaleur intense, l'employeur adapte, en liaison avec le service de prévention et de santé au travail, les mesures de prévention prévues au présent chapitre en vue d'assurer la protection de sa santé.",
      statut: "retenu",
      obligations: ["prevention-etablissement-chaleur-travailleur-vulnerable"],
      historique:
        "Obligation manquante du 2026-09-20 au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : Déclenchée par une INFORMATION reçue sur une personne, et qui touche à son état de santé : le produit ne la stockera pas (frontière médicale, `docs/rgpd.md`) — il peut au plus rappeler la règle. Même blocage que R. 4463-4 : aucune surface ne sert l'événementiel d'établissement.",
    },
    {
      ref: "R. 4463-6",
      intitule: "Modalités de signalement et de secours",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676937",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      luLe: "2026-09-20",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur définit les modalités de signalement d'un indice physiologique préoccupant, d'un malaise ou d'une détresse, et celles destinées à porter secours, en particulier aux travailleurs isolés ou éloignés ; il les fait connaître aux travailleurs et les communique au service de prévention et de santé au travail.",
      citationCle:
        "L'employeur définit les modalités de signalement de toute apparition d'indice physiologique préoccupant, de situation de malaise ou de détresse, ainsi que celles destinées à porter secours, dans les meilleurs délais, à tout travailleur et, plus particulièrement, aux travailleurs isolés ou éloignés. Elles sont portées à la connaissance des travailleurs et communiquées au service de prévention et de santé au travail.",
      statut: "retenu",
      obligations: ["secours-etablissement-signalement-chaleur-intense"],
    },
    {
      ref: "R. 4463-7",
      intitule: "Mise en œuvre lors de la survenue d'un épisode",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676939",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "Quand l'épisode survient, l'employeur met en œuvre les mesures définies en application de R. 4463-3, et les adapte si la chaleur s'intensifie.",
      citationCle:
        "Lors de la survenue des épisodes de chaleur intense, l'employeur met en œuvre les mesures ou les actions de prévention définies en application de l'article R. 4463-3, en les adaptant en cas d'intensification de la chaleur.",
      statut: "retenu",
      obligations: ["prevention-etablissement-chaleur-mise-en-oeuvre"],
      historique:
        "Obligation manquante du 2026-09-20 au 2026-09-21 (cause `evenement`), encodée avec la page « Quand ça arrive ». Son motif d'alors : Le pendant événementiel de R. 4463-2 : définir est un état permanent, mettre en œuvre se déclenche sur l'épisode. Même blocage que R. 4463-4. ~~« survenance »~~ : la première écriture de cette citation portait ce mot, que le texte n'a pas — il dit « survenue », confirmé le 2026-09-20 sur la page de l'article ET dans l'article 3 du décret. L'outil de lecture avait normalisé le mot ; l'instruction du 2026-09-01, elle, l'avait juste.",
    },
    {
      ref: "R. 4463-8",
      intitule: "Plan de prévention, PGC et PPSPS",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676941",
      versionEnVigueur: "2025-06-02",
      modifiePar: { texte: "Décret n° 2025-482 du 27 mai 2025 - art. 3 (création)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051676074" },
      // Relu le 2026-09-26 sur sa page propre ; `lecture` inchangée, comme
      // les sept autres articles du chapitre.
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "Le plan de prévention (R. 4512-6), le plan général de coordination et le plan particulier de sécurité et de protection de la santé tiennent compte, le cas échéant, du risque lié aux épisodes de chaleur intense.",
      citationCle:
        "Le plan de prévention prévu à l'article R. 4512-6, le plan général de coordination prévu à l'article L. 4532-8, et le plan particulier de sécurité et de protection de la santé prévu à l'article L. 4532-9 tiennent compte, le cas échéant, des risques liés à l'exposition aux épisodes de chaleur intense.",
      statut: "obligation_manquante",
      cause: "module",
      toucheLaCible: true,
      motif: "Le module `PlanPrevention` porte le plan de R. 4512-6 et ses lignes de risques d'interférence, ~~mais RIEN n'y nomme la chaleur — vérifié le 2026-09-20 : aucune occurrence de « chaleur » dans `src/lib/plan-prevention`~~ [2026-09-26 : faux depuis ce jour, voir la fin de ce motif]. L'instruction du 2026-09-01 le croyait « déjà servi ». « Le cas échéant » laisse l'appréciation à l'employeur : ce qui manque est une invite à y penser, pas une échéance — le formulaire du plan est un répéteur libre, sans liste de risques proposée~~, donc il n'y a aujourd'hui nulle part où la loger~~ [2026-09-26 : le chapeau de la section d'analyse la loge]. PGC et PPSPS sont des pièces de chantier du BTP, hors cible. [2026-09-26 — annoncé à qui utilise le plan de prévention : l'article est cité entier, « le cas échéant » compris, dans le chapeau de la section « Analyse conjointe des risques d'interférence » du formulaire et dans la carte « Ce que d'autres articles demandent au plan » de la fiche. Cité entier, PGC et PPSPS compris : le couper aurait laissé un sujet singulier devant « tiennent ». Relu sur sa page propre le 2026-09-26 (structure en aveugle, recopie, question fermée sur « tiennent compte, le cas échéant ») : verbatim identique à celui du 2026-09-20. Aucune liste de risques n'est proposée, rien n'est encodé : statut inchangé.]",
    },
  ],
};
