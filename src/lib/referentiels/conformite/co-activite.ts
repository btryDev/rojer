/**
 * Domaine « co-activité » — `R. 4515-1` et s.
 *
 * UNE SEULE OBLIGATION, ET ELLE EST UNIVERSELLE DANS LA CIBLE. Le protocole de
 * sécurité de chargement ou de déchargement est dû dès qu'une entreprise
 * extérieure vient livrer ou enlever des marchandises dans l'enceinte de
 * l'établissement. Autrement dit : dès qu'un camion livre. Tout commerce, toute
 * restauration, la plupart des bureaux.
 *
 * LE FONDEMENT N'EST PAS L'ARRÊTÉ DE 1996, ET C'EST UNE CORRECTION. Le brief
 * du lot 8 datait cette obligation de l'arrêté du 26 avril 1996. Cet arrêté
 * existe et il est à l'origine du dispositif, mais il a été pris « en
 * application de l'article R. 237-1 du code du travail » — une numérotation
 * d'avant la recodification de 2008. Son contenu vit désormais dans le Code, à
 * `R. 4515-1` et suivants, en vigueur au 1er mai 2008. Citer l'arrêté comme
 * fondateur aurait fait reposer l'obligation sur un texte dont la référence
 * interne ne résout plus.
 *
 * PAS DE PÉRIODICITÉ, MAIS UNE CONDITION DE PÉREMPTION ÉCRITE.
 * `R. 4515-9` prévoit qu'un protocole unique couvre les opérations répétitives
 * et « reste applicable aussi longtemps que les employeurs intéressés
 * considèrent que les conditions de déroulement des opérations n'ont subi
 * aucune modification significative ». C'est une condition, pas une durée : il
 * n'y a rien à revoir tous les ans, et rien qui expire à date fixe.
 * `periodicite: "autre"`.
 */

import type { Obligation } from "./types";

export const obligationsCoActivite: Obligation[] = [
  {
    id: "co-activite-etablissement-protocole-securite",
    domaine: "co_activite",
    libelle:
      "Protocole de sécurité pour les opérations de chargement et de déchargement",
    description:
      "Les opérations de chargement ou de déchargement réalisées par une entreprise extérieure de transport font l'objet d'un document écrit, dit « protocole de sécurité », qui remplace le plan de prévention. Il comprend les informations utiles à l'évaluation des risques générés par l'opération et les mesures de prévention à observer à chacune de ses phases : consignes de sécurité, lieu de livraison, modalités d'accès et de stationnement avec plan et consignes de circulation, matériels utilisés, moyens de secours, et identité du responsable désigné par l'entreprise d'accueil. Lorsque les opérations impliquant les mêmes entreprises sont répétitives, un seul protocole est établi avant la première opération et reste applicable tant que les conditions de déroulement n'ont pas subi de modification significative. Un exemplaire daté et signé est tenu à la disposition du comité social et économique et de l'inspection du travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4515-4 (les opérations de chargement ou de déchargement font l'objet d'un document écrit dit « protocole de sécurité », remplaçant le plan de prévention)",
        article: "R. 4515-4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529684",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4515-1 (champ d'application : opérations réalisées par des entreprises extérieures transportant des marchandises en provenance ou à destination d'un lieu extérieur à l'enceinte de l'entreprise d'accueil)",
        article: "R. 4515-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483935",
        versionConstatee: "2018-01-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4515-9 (opérations répétitives : un seul protocole, applicable tant que les conditions n'ont pas subi de modification significative)",
        article: "R. 4515-9",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529674",
        note: "« Les opérations de chargement ou de déchargement impliquant les mêmes entreprises et revêtant un caractère répétitif font l'objet d'un seul protocole de sécurité établi préalablement à la première opération. Ce protocole de sécurité reste applicable aussi longtemps que les employeurs intéressés considèrent que les conditions de déroulement des opérations n'ont subi aucune modification significative, dans l'un quelconque de leurs éléments constitutifs. » Relu le 2026-09-26 sur sa page propre, deux alinéas.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4515-8 (le protocole est établi préalablement à la réalisation de l'opération ; un protocole spécifique par opération non répétitive)",
        article: "R. 4515-8",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529676",
        note: "« Le protocole de sécurité est établi dans le cadre d'un échange entre les employeurs intéressés, préalablement à la réalisation de l'opération. Chacune des opérations ne revêtant pas le caractère répétitif défini à l'article R. 4515-3 donne lieu à un protocole de sécurité spécifique. » Relu le 2026-09-26 sur sa page propre, deux alinéas.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4515-11 (exemplaire daté et signé tenu à la disposition des comités sociaux et économiques et de l'inspection du travail)",
        article: "R. 4515-11",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036484027",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "autre",
    nature: "evenementielle",
    pieceAttendue: "protocole de sécurité",
    faitGenerateur:
      "Opérations de chargement ou de déchargement réalisées par des entreprises extérieures transportant des marchandises : préalablement à la réalisation de l'opération. Les opérations de chargement ou de déchargement impliquant les mêmes entreprises et revêtant un caractère répétitif font l'objet d'un seul protocole de sécurité établi préalablement à la première opération. Ce protocole de sécurité reste applicable aussi longtemps que les employeurs intéressés considèrent que les conditions de déroulement des opérations n'ont subi aucune modification significative",
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "LE BRIEF SE TROMPAIT DE TEXTE FONDATEUR, ET LA CORRECTION EST DOCUMENTÉE. Il annonçait « arrêté du 26/04/1996 ». Cet arrêté a bien créé le dispositif, mais il a été pris « en application de l'article R. 237-1 du code du travail » et son article 2 renvoie aux « articles R. 237-7 et suivants » — la numérotation d'avant la recodification de 2008. Sa version initiale, lue sur Légifrance le 2026-08-31 (JORFTEXT000000548018), porte encore ces renvois. Le dispositif vit aujourd'hui dans le Code, section 2 du chapitre V, `R. 4515-4` à `R. 4515-11`. C'est cette référence qui est encodée : elle est celle qu'un inspecteur cite, et la seule dont les renvois internes résolvent encore.\n\nVERBATIM DE L'ARTICLE FONDATEUR, relevé le 2026-08-31, version en vigueur depuis le 2008-05-01 : « Les opérations de chargement ou de déchargement, font l'objet d'un document écrit, dit « protocole de sécurité », remplaçant le plan de prévention. »\n\nPOURQUOI C'EST UNIVERSEL DANS LA CIBLE, ET POURQUOI IL N'Y A DONC AUCUNE CONDITION. `R. 4515-1` définit le champ : les opérations « réalisées par des entreprises extérieures transportant des marchandises, en provenance ou à destination d'un lieu extérieur à l'enceinte de l'entreprise utilisatrice ». Aucun seuil, aucune fréquence minimale, aucune quantité. Un restaurant qui reçoit son fournisseur deux fois par semaine y est. Un bureau qui reçoit ses fournitures aussi. Aucune `condition` ni `effectifMin` : le poser aurait fait disparaître l'obligation pour l'immense majorité de ceux qui la doivent.\n\nCE QUI SERAIT PLUS JUSTE ET QUI N'EXISTE PAS. Rigoureusement, l'obligation naît d'un FAIT — recevoir des livraisons —, pas du statut d'employeur. Le produit ne porte aucun attribut d'établissement qui le dise. Deux options : ne rien afficher, ou l'afficher à tous. C'est la règle du non-renseigné qui tranche — l'incertitude ne réduit jamais la couverture —, et le faux positif est ici presque théorique : un établissement qui ne reçoit jamais rien est un cas d'école. Aucune `Transmission` `attribut_absent` n'est déclarée pour autant : l'attribut manquant ne conditionne l'applicabilité que dans un cas si marginal que le nommer aurait suggéré un doute qui n'existe pas.\n\nCE PROTOCOLE N'EST PAS UN PLAN DE PRÉVENTION, ET LES DEUX NE SE RECOUVRENT PAS. Le produit a un module `PlanPrevention` (`R. 4512-6` et s., seuil de 400 heures par an ou travaux dangereux). `R. 4515-1` déroge expressément à ces articles pour les opérations de chargement, et `R. 4515-4` écrit que le protocole « remplace » le plan de prévention. Les deux s'excluent, ils ne se doublent pas. Aucune ligne du référentiel ne portait `R. 4512-*`, vérifié avant encodage.\n\nCE QUE L'OUTIL NE SAIT PAS SOLDER. Le texte attend un écrit structuré, daté et signé, à deux parties, tenu à disposition de l'inspection. Le produit n'offre qu'un dépôt de fichier — même configuration que `R. 4227-39` (registre des exercices) et `R. 4224-16` (organisation des secours). Aucune `Transmission` `modele_absent` n'est déclarée ici : `docs/registre-securite-ecart.md` recense les modèles manquants sous des noms précis, et en inventer un sans avoir vérifié cette nomenclature créerait une référence fantôme. C'est porté au rapport du lot comme un point à instruire, pas comme une décision prise.\n\nRÉALISATEUR `exploitant`, ET LE DOMAINE PORTE `aucun_tiers_attendu`. Le transporteur est une seconde partie au protocole, pas un prestataire de l'employeur d'accueil : `R. 4515-11` fait tenir un exemplaire aux chefs d'établissement « des entreprises d'accueil et de transport », donc à deux co-signataires. Il n'a pas à entrer à l'annuaire de vigilance.\n\nCriticité 4 : les opérations de chargement et de déchargement sont une source majeure d'accidents graves — écrasement, chute de plain-pied, départ intempestif du véhicule —, et l'absence de protocole est ce que l'inspection relève en premier après un accident de quai.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026), ET ELLE CORRIGE LA CARTO. `docs/carto-obligations-hors-equipement.md` range cette ligne (E14) en `PERM`. R. 4515-9 dit le contraire dès qu'on le lit en entier : le protocole unique n'est admis que « lorsque les opérations impliquant les mêmes entreprises sont répétitives », et il ne reste applicable que « tant que les conditions de déroulement n'ont pas subi de modification significative ». Une nouvelle entreprise de transport, un nouveau lieu de livraison, un changement de matériel : un nouveau protocole. Le fait déclencheur n'est observé par rien dans le produit. Une case « protocole en place » cochée une fois mentirait au premier transporteur suivant.\n\nLE MODÈLE MANQUANT EST NOMMÉ AUTREMENT, comme pour R. 4224-16. La table du § 6 de `docs/registre-securite-ecart.md` a été relue le 2026-08-31 : aucune de ses huit entrées ne couvre le protocole de sécurité, et pour cause — ce document ne relève pas du registre de sécurité incendie. `pieceAttendue: \"protocole de sécurité\"` porte le manque sans inventer de nom de modèle.\n\nRÉEXAMINÉE LE 2026-09-04 : LA NATURE EST CONFIRMÉE, ET LE CHAPITRE PORTE UN SECOND RÉGIME QUE LE RÉFÉRENTIEL N'ENCODE PAS. Relus : `R. 4515-3`, `R. 4515-8` et `R. 4515-9`, les trois articles entrés au corpus le 2026-09-02 quand le chapitre est passé à `integral` ; `R. 4515-9` contre-vérifié à la source ce jour, version en vigueur depuis le 2008-05-01 (décret n° 2008-244 du 7 mars 2008).\n\nCE QUI CONFIRME L'ÉVÉNEMENTIEL. `R. 4515-8`, seconde phrase : « Chacune des opérations ne revêtant pas le caractère répétitif défini à l'article R. 4515-3 donne lieu à un protocole de sécurité spécifique. » Un protocole par opération, établi avant elle : le fait déclencheur est l'opération, et le produit ne l'observe pas. La définition du champ `evenementielle` nomme d'ailleurs « l'arrivée d'un nouveau transporteur ». Rien à corriger ; cette ligne reste sans surface POUR CETTE RAISON, et non par défaut d'encodage.\n\nCE QUE `R. 4515-9` LU AVEC `R. 4515-3` RÉVÈLE. Verbatim de `R. 4515-9` : « Les opérations de chargement ou de déchargement impliquant les mêmes entreprises et revêtant un caractère répétitif font l'objet d'un seul protocole de sécurité ÉTABLI PRÉALABLEMENT À LA PREMIÈRE OPÉRATION. Ce protocole de sécurité reste applicable aussi longtemps que les employeurs intéressés considèrent que les conditions de déroulement des opérations n'ont subi aucune modification significative, dans l'un quelconque de leurs éléments constitutifs. » `R. 4515-3` définit le répétitif par quatre critères CUMULATIFS : mêmes produits ou substances, mêmes emplacements, même mode opératoire, mêmes types de véhicules et de matériels de manutention.\n\nUn écrit établi une fois, avant la première opération, et qui reste applicable jusqu'à modification, est un ÉTAT À CONSTITUER PUIS À MAINTENIR au sens du champ `nature` — la même forme que « un registre tenu ». Et c'est le régime DOMINANT dans la population cible : la tournée hebdomadaire du fournisseur d'un restaurant, l'enlèvement des déchets et la collecte de fonds — que `R. 4515-2` range nommément dans le champ — satisfont les quatre critères. Ce que le dirigeant doit avoir en place, c'est un protocole par transporteur habituel.\n\nCE N'EST DONC PAS UNE NATURE À CORRIGER, C'EST UNE OBLIGATION QUI MANQUE. Les deux régimes sont DISJOINTS — `R. 4515-8` vise ce qui n'est pas répétitif, `R. 4515-9` ce qui l'est — et ils ne portent pas la même nature. Tant qu'une seule ligne les couvre, la règle de résolution de l'ADR-026 § 3 place `evenementielle` avant `etat_permanent` et la ligne entière quitte les surfaces : la moitié qui aurait un écran est absorbée par celle qui n'en a pas. La note ci-dessus, qui oppose `R. 4515-9` à la carto, a donc raison contre `PERM` pour l'obligation telle qu'elle est encodée, et tort de croire que `R. 4515-9` ne dit rien de permanent.\n\nCE QUI EST PROPOSÉ ET NON FAIT. Une seconde obligation — `co-activite-etablissement-protocole-securite-repetitif`, `nature: \"etat_permanent\"`, `periodicite: \"autre\"`, porteur établissement, `pieceAttendue: \"protocole de sécurité\"`, fondée sur `R. 4515-9` et `R. 4515-3` —, la présente ligne étant alors resserrée sur les opérations non répétitives (`R. 4515-4`, `R. 4515-8`). Elle n'est PAS encodée ici : ajouter une obligation déplace `EMPREINTE_ATTENDUE` et impose d'incrémenter `REFERENTIEL_VERSION`, ce que le brief de ce lot a posé comme condition d'arrêt. La décision revient à la propriétaire. D'ici là, cette ligne figure au registre daté `SANS_SURFACE` de `src/lib/surfaces/obligations-sans-surface.ts` avec ce motif, où elle ne peut plus se perdre.",
  },
];
