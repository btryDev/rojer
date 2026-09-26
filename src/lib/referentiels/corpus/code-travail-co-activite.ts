// Corpus : code du travail — opérations de chargement et de déchargement.
//
// Étendue « integral » depuis le 2026-09-02 : ONZE articles sur onze,
// R. 4515-1 à R. 4515-11.
//
// LE DÉNOMINATEUR ÉTAIT FAUX, ET C'EST LA CORRECTION DE CE PASSAGE. L'en-tête
// annonçait « huit des neuf articles du chapitre V ». Le chapitre en compte
// ONZE en vigueur, relevés sur la page de section de Légifrance le
// 2026-09-02 : la section 1 « Champ d'application » en porte trois — R. 4515-1
// à R. 4515-3 — et non un seul. Le corpus en listait neuf, donc il lui en
// manquait deux, `R. 4515-2` et `R. 4515-3`, qui sont les DÉFINITIONS de
// l'opération de chargement et du caractère répétitif. Or c'est R. 4515-3 qui
// dit ce que « répétitif » veut dire dans R. 4515-9, l'article dont le corpus
// avait déjà écrit qu'il aurait pu faire inventer une périodicité. La
// condition qui gouverne était donc hors du corpus qui la commentait.
//
// Un compte faux dans une portée n'est pas une coquille : il annonce une
// couverture. « Huit sur neuf » se lit « il en manque un » ; il en manquait
// trois. Les trois sont lus depuis le 2026-09-02, et le chapitre se déclare
// intégral.
//
// LE FONDEMENT N'EST PAS L'ARRÊTÉ DE 1996, ET C'EST LA CORRECTION PRINCIPALE
// DE CE CORPUS. Le brief du lot 8 datait le protocole de sécurité de l'arrêté
// du 26 avril 1996. Cet arrêté existe — sa version initiale a été lue le
// 2026-08-31 (JORFTEXT000000548018) — et il est bien à l'origine du dispositif.
// Mais il a été pris « en application de l'article R. 237-1 du code du travail »
// et renvoie aux « articles R. 237-7 et suivants » : une numérotation d'avant la
// recodification de 2008, qui ne résout plus. Le dispositif vit aujourd'hui aux
// articles R. 4515-1 à R. 4515-11, en vigueur au 1er mai 2008. C'est cette
// référence qui fonde l'obligation ; l'arrêté n'est pas cité.
//
// CE QUE LE CHAPITRE N'ÉCRIT PAS : aucune périodicité, nulle part. `R. 4515-9`
// prévoit qu'un protocole unique couvre les opérations répétitives et « reste
// applicable aussi longtemps que les employeurs intéressés considèrent que les
// conditions de déroulement des opérations n'ont subi aucune modification
// significative ». C'est une CONDITION de péremption, appréciée par les
// parties, pas une durée. L'obligation porte `periodicite: "autre"`.
//
// CE CHAPITRE EXCLUT LE PLAN DE PRÉVENTION, IL NE S'Y AJOUTE PAS. `R. 4515-1`
// déroge expressément aux articles R. 4512-2 à R. 4512-11, et `R. 4515-4` écrit
// que le protocole « remplace » le plan de prévention. Le module
// `PlanPrevention` du produit sert l'autre versant de la co-activité ; les deux
// ne se recouvrent pas.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_CO_ACTIVITE: Corpus = {
  id: "code-travail-co-activite",
  intitule:
    "Code du travail — protocole de sécurité des opérations de chargement et de déchargement",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018491658/",
  etendue: "integral",
  portee:
    "Le chapitre V du titre Ier du livre V EN ENTIER, onze articles sur onze : ce qu'impose la venue d'une entreprise extérieure de transport dans l'enceinte d'un établissement. Section 1, champ d'application et définitions — dérogation au plan de prévention (R. 4515-1), définition de l'opération de chargement ou de déchargement (R. 4515-2), définition du caractère répétitif (R. 4515-3). Section 2, protocole de sécurité — obligation de l'écrit (R. 4515-4), contenu pour chacune des deux parties (R. 4515-5 à R. 4515-7), échange préalable et protocole spécifique par opération non répétitive (R. 4515-8), protocole unique des opérations répétitives (R. 4515-9), dérogation quand le prestataire n'est pas identifiable (R. 4515-10), tenue d'un exemplaire daté et signé à disposition (R. 4515-11).",
  articles: [
    {
      ref: "R. 4515-1",
      intitule: "Champ d'application et dérogations",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483935",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le chapitre s'applique aux opérations de chargement ou de déchargement réalisées par des entreprises extérieures transportant des marchandises en provenance ou à destination d'un lieu extérieur à l'enceinte de l'entreprise d'accueil, et déroge à l'inspection commune préalable comme au plan de prévention.",
      citationCle:
        "Les dispositions du présent chapitre s'appliquent aux opérations de chargement ou de déchargement réalisées par des entreprises extérieures transportant des marchandises, en provenance ou à destination d'un lieu extérieur à l'enceinte de l'entreprise utilisatrice, dite « entreprise d'accueil ».",
      statut: "retenu",
      obligations: ["co-activite-etablissement-protocole-securite"],
      reserve:
        "Aucun seuil, aucune fréquence minimale, aucune quantité : le champ est celui de toute livraison par un transporteur extérieur. Le produit ne porte aucun attribut d'établissement disant s'il en reçoit ; l'obligation s'applique donc à tout établissement de travail, conformément à la règle du non-renseigné.",
    },
    {
      ref: "R. 4515-2",
      intitule: "Définition de l'opération de chargement ou de déchargement",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529690",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'opération de chargement ou de déchargement est l'activité concourant à la mise en place ou à l'enlèvement, sur ou dans un engin de transport routier, de produits, fonds et valeurs, matériels, engins, déchets, objets et matériaux de quelque nature que ce soit.",
      citationCle:
        "On entend par opération de chargement ou de déchargement, l'activité concourant à la mise en place ou à l'enlèvement sur ou dans un engin de transport routier, de produits, fonds et valeurs, matériels ou engins, déchets, objets et matériaux de quelque nature que ce soit.",
      statut: "sans_objet",
      motif:
        "Article de définition, sans prescription propre. Entré au corpus le 2026-09-02 avec la correction du dénominateur : il manquait, et son absence n'était pas neutre. C'est LUI qui ferme la question du champ que la réserve de R. 4515-1 laissait ouverte — « de quelque nature que ce soit », sur un engin de TRANSPORT ROUTIER. L'enlèvement des déchets et la collecte de fonds y sont nommément, ce qui met dans le champ deux opérations qu'un restaurant ou un commerce de détail subit toutes les semaines sans les appeler des livraisons.",
    },
    {
      ref: "R. 4515-3",
      intitule: "Définition du caractère répétitif",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529688",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Sont répétitives les opérations qui portent sur des produits ou substances de même nature, sont accomplies sur les mêmes emplacements, selon le même mode opératoire, et mettent en œuvre les mêmes types de véhicules et de matériels de manutention.",
      citationCle:
        "On entend par opérations de chargement ou de déchargement à caractère répétitif, celles qui portent sur des produits ou substances de même nature, sont accomplies sur les mêmes emplacements, selon le même mode opératoire, et mettent en œuvre les mêmes types de véhicules et de matériels de manutention.",
      statut: "sans_objet",
      motif:
        "Article de définition, et LA CONDITION QUI GOUVERNE R. 4515-9 — que ce corpus commentait déjà longuement sans l'avoir ouverte. Les quatre critères sont CUMULATIFS : même nature de produits, mêmes emplacements, même mode opératoire, mêmes types de véhicules et de matériels. Le protocole unique tombe donc dès qu'un seul change, ce qui est la traduction concrète de la « modification significative » de R. 4515-9 et confirme la nature événementielle retenue par l'obligation. Aucune prescription propre, aucune échéance.",
    },
    {
      ref: "R. 4515-4",
      intitule: "Obligation d'un protocole de sécurité écrit",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529684",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Les opérations de chargement ou de déchargement font l'objet d'un document écrit dit « protocole de sécurité », qui remplace le plan de prévention.",
      citationCle:
        "Les opérations de chargement ou de déchargement, font l'objet d'un document écrit, dit « protocole de sécurité », remplaçant le plan de prévention.",
      statut: "retenu",
      obligations: ["co-activite-etablissement-protocole-securite"],
    },
    {
      ref: "R. 4515-5",
      intitule: "Objet du protocole de sécurité",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018491668/",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le protocole comprend les informations utiles à l'évaluation des risques générés par l'opération et les mesures de prévention à observer à chacune de ses phases.",
      statut: "sans_objet",
      motif:
        "Article de contenu : il dit ce que le protocole doit comporter, pas un acte distinct à porter au calendrier. Son contenu est repris dans la description de l'obligation fondée sur R. 4515-4 ; en faire une obligation à part aurait dédoublé la même ligne.",
    },
    {
      ref: "R. 4515-6",
      intitule: "Contenu du protocole pour l'entreprise d'accueil",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018491668/",
      versionEnVigueur: "2009-03-16",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Pour l'entreprise d'accueil, le protocole comprend notamment les consignes de sécurité, le lieu de livraison, les modalités d'accès et de stationnement avec plan et consignes de circulation, les matériels et engins utilisés, les moyens de secours, et l'identité du responsable désigné.",
      statut: "sans_objet",
      motif:
        "Article de contenu, comme R. 4515-5 : il énumère les cinq rubriques que le protocole doit porter côté entreprise d'accueil. Aucun acte distinct, aucune échéance. Ses rubriques sont reprises dans la description de l'obligation, où elles disent au dirigeant ce qu'il doit y écrire.",
    },
    {
      ref: "R. 4515-7",
      intitule: "Contenu du protocole pour le transporteur",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018491668/",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Pour le transporteur, le protocole décrit notamment les caractéristiques du véhicule, la nature et le conditionnement de la marchandise, et les précautions résultant des substances transportées.",
      statut: "sans_objet",
      motif:
        "Article de contenu portant sur la SECONDE partie au protocole. Il ne crée aucune obligation pour l'employeur d'accueil, qui est le sujet du référentiel : c'est au transporteur de fournir ces éléments. Aucune ligne ne s'y appuie.",
    },
    {
      ref: "R. 4515-8",
      intitule: "Échange préalable et protocole spécifique par opération",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529676",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le protocole est établi dans le cadre d'un échange entre les employeurs, préalablement à la réalisation de l'opération ; chaque opération non répétitive donne lieu à un protocole spécifique.",
      citationCle:
        "Le protocole de sécurité est établi dans le cadre d'un échange entre les employeurs intéressés, préalablement à la réalisation de l'opération. Chacune des opérations ne revêtant pas le caractère répétitif défini à l'article R. 4515-3 donne lieu à un protocole de sécurité spécifique.",
      statut: "retenu",
      obligations: ["co-activite-etablissement-protocole-securite"],
      historique:
        "Consigné `sans_objet` du 2026-09-02 au 2026-09-26. Retenu ce jour : c'est de cet article, et non de R. 4515-4, que la ligne « Quand ça arrive » du protocole tient le moment où il est dû — « préalablement à la réalisation de l'opération ». Le fait générateur l'employait sans le citer ; le garde-fou du fait générateur (`fait-dans-le-texte.test.ts`) l'a trouvé. Article relu le 2026-09-26 sur sa page propre : identique à la `citationCle` ci-dessus. Le motif d'alors : " + "Ouvert le 2026-09-02, il était le seul article non lu du chapitre. Il ne crée pas d'obligation seconde : il dit COMMENT s'établit celle de R. 4515-4 — par un échange, avant l'opération — et à quelle maille. Sa seconde phrase est celle qui compte pour le produit, et elle est la contrepartie exacte de R. 4515-9 : hors opérations répétitives au sens de R. 4515-3, un protocole par opération. Un exploitant qui reçoit un transporteur occasionnel ne peut pas s'abriter derrière le protocole signé avec son fournisseur habituel. Rien à porter au calendrier pour autant, la nature événementielle de l'obligation le dit déjà.",
    },
    {
      ref: "R. 4515-9",
      intitule: "Protocole unique pour les opérations répétitives",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529674",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Les opérations répétitives impliquant les mêmes entreprises font l'objet d'un seul protocole établi avant la première opération, applicable tant que les conditions de déroulement n'ont subi aucune modification significative.",
      citationCle:
        "Les opérations de chargement ou de déchargement impliquant les mêmes entreprises et revêtant un caractère répétitif font l'objet d'un seul protocole de sécurité établi préalablement à la première opération. Ce protocole de sécurité reste applicable aussi longtemps que les employeurs intéressés considèrent que les conditions de déroulement des opérations n'ont subi aucune modification significative, dans l'un quelconque de leurs éléments constitutifs.",
      statut: "retenu",
      obligations: ["co-activite-etablissement-protocole-securite"],
      reserve:
        "C'EST L'ARTICLE QUI AURAIT PU FAIRE INVENTER UNE PÉRIODICITÉ, et il n'en écrit aucune. « Aussi longtemps que les employeurs intéressés considèrent que les conditions n'ont subi aucune modification significative » est une condition appréciée par les parties, pas une durée de validité. Encoder une revue annuelle ici aurait fabriqué une échéance à partir d'une prudence, pas d'un texte.\n\nCE QUI RESTE DEHORS, et qui vivait jusqu'au 2026-09-21 dans le registre `SANS_SURFACE` : cet article porte un SECOND régime, disjoint de celui de `R. 4515-8` — un protocole UNIQUE pour les opérations répétitives au sens de `R. 4515-3`, établi avant la première et applicable jusqu'à modification significative. C'est un état permanent, et il n'est encodé nulle part : `co-activite-etablissement-protocole-securite` couvre les deux d'une seule ligne événementielle. Depuis l'ADR-037 cette ligne A une surface (« Quand ça arrive »), et son fait générateur dit le cas répétitif en incise ; l'obligation distincte manque toujours. L'ajouter déplace l'empreinte, et la décision revient à la propriétaire ; la proposition est dans les `notesInternes` de l'obligation.",
    },
    {
      ref: "R. 4515-10",
      intitule: "Dérogation quand le prestataire n'est pas identifiable",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018491668/",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Lorsque le prestataire ne peut pas être identifié préalablement, ou que l'échange préalable n'a pas réuni toutes les informations, l'employeur d'accueil fournit et recueille par tout moyen approprié les éléments du protocole.",
      statut: "sans_objet",
      motif:
        "Article de modalité : il règle COMMENT procéder quand l'échange préalable de R. 4515-8 est impossible. L'obligation reste celle de R. 4515-4 — avoir un protocole —, et la dérogation n'en crée pas une seconde.",
    },
    {
      ref: "R. 4515-11",
      intitule: "Tenue d'un exemplaire à disposition",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036484027",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Les chefs d'établissement des entreprises d'accueil et de transport tiennent un exemplaire de chaque protocole, daté et signé, à la disposition des comités sociaux et économiques et de l'inspection du travail.",
      citationCle:
        "Les chefs d'établissement des entreprises d'accueil et de transport tiennent un exemplaire de chaque protocole de sécurité, daté et signé, à la disposition : 1° Des comités sociaux et économiques des entreprises intéressées ; 2° De l'inspection du travail.",
      statut: "retenu",
      obligations: ["co-activite-etablissement-protocole-securite"],
      reserve:
        "C'est cet article qui établit que le transporteur est un CO-SIGNATAIRE et non un prestataire de l'entreprise d'accueil — les deux chefs d'établissement tiennent chacun un exemplaire. Il justifie le marqueur `aucun_tiers_attendu` porté par le domaine `co_activite` dans `DOMAINES_PRESTATAIRE_ATTENDUS`. Le produit n'offre par ailleurs qu'un dépôt de fichier là où le texte attend un écrit daté et signé à deux parties : même écart que R. 4227-39 et R. 4224-16, porté au rapport du lot 8 sans qu'aucune transmission `modele_absent` ne soit déclarée — la nomenclature de `docs/registre-securite-ecart.md` n'a pas été vérifiée.",
    },
  ],
};
