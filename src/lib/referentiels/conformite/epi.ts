/**
 * Domaine « protection individuelle » — `R. 4323-91` à `R. 4323-106`, arrêté du
 * 19 mars 1993.
 *
 * DEUX OBLIGATIONS, ET ELLES NE SE RESSEMBLENT PAS. L'une est un écrit que
 * l'employeur produit une fois et tient à jour, due dès qu'un travailleur porte
 * un équipement de protection — gants compris. L'autre est un contrôle d'objet
 * par une personne qualifiée, dû tous les douze mois, et seulement sur les
 * familles que l'arrêté nomme. Les confondre aurait fait l'un des deux défauts
 * que ce référentiel refuse : réclamer la vérification à qui ne la doit pas, ou
 * perdre l'écrit que tout le monde doit.
 *
 * CE QUE LE DÉPOUILLEMENT A ÉTABLI, ET QUI RENVERSE UNE IDÉE REÇUE. « La
 * vérification annuelle des EPI » ne vise pas les EPI. L'arrêté du 19 mars 1993
 * procède par liste NOMINATIVE ET FERMÉE de cinq familles ; casque, gants,
 * chaussures, lunettes et protections auditives n'y sont pas. Ce qui leur est dû
 * relève de `R. 4323-95` — entretiens, réparations et remplacements
 * « nécessaires » —, c'est-à-dire d'un ÉTAT maintenu, sans rendez-vous et sans
 * pièce. Le corpus le porte ; le calendrier n'a rien à en tirer.
 *
 * AUCUNE FAMILLE N'EST ÉCARTÉE POUR RARETÉ. Un premier jet n'ouvrait que
 * l'antichute — la seule courante en restauration, commerce et bureau — et
 * déclarait les quatre autres hors couverture. C'était lire le texte à travers
 * une clientèle supposée. La règle vaut pour qui la déclare ; le produit
 * l'applique, il ne l'interprète pas.
 *
 * `R. 4323-106` N'EST PAS ICI, ET C'EST LE POINT À NE PAS FRANCHIR. La formation
 * au port existe, elle est due, et son renouvellement est prescrit — « aussi
 * souvent que nécessaire pour que l'équipement soit utilisé conformément à la
 * consigne d'utilisation ». C'est un RÉSULTAT, pas une durée. Lui donner trois
 * ans par analogie avec une formation voisine, ou un an par analogie avec la
 * vérification ci-dessous, fabriquerait une échéance que personne ne peut
 * opposer. L'entrée de corpus reste `obligation_manquante`, avec ses termes.
 */

import type { Obligation } from "./types";

export const obligationsEpi: Obligation[] = [
  {
    id: "epi-etablissement-consigne-utilisation",
    domaine: "epi",
    libelle: "Consigne d'utilisation des équipements de protection individuelle",
    description:
      "Dès qu'un travailleur doit porter un équipement de protection individuelle — y compris des gants ou des chaussures de sécurité —, l'employeur rédige une consigne d'utilisation. Elle reprend, de manière compréhensible, les risques contre lesquels l'équipement protège et ses conditions d'utilisation. Elle se tient à la disposition des membres du CSE, avec la documentation réglementaire applicable.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-105 (consigne d'utilisation des équipements de protection individuelle)",
        article: "R. 4323-105",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483581",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-104 (contenu de l'information dont la consigne est la reprise écrite)",
        article: "R. 4323-104",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531284",
        note: "Cité en contexte : la consigne « reprend de manière compréhensible les informations mentionnées aux 1° et 2° » de cet article — les risques contre lesquels l'équipement protège, et ses conditions d'utilisation. R. 4323-104 lui-même n'impose qu'une information « appropriée », sans forme ni rythme : ce n'est pas lui qui fonde l'écrit.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    porteur: "etablissement",
    notesInternes:
      "VERBATIM RELEVÉ SUR LÉGIFRANCE LE 2026-09-04, version en vigueur depuis le 2008-05-01 : « L'employeur élabore une consigne d'utilisation reprenant de manière compréhensible les informations mentionnées aux 1° et 2° de l'article R. 4323-104. Il tient cette consigne à la disposition des membres du comité social et économique, ainsi qu'une documentation relative à la réglementation applicable à la mise à disposition et à l'utilisation des équipements de protection individuelle concernant les travailleurs de l'établissement. »\n\nLE SEUL ÉCRIT DE TOUTE LA SECTION 9. Le dépouillement du 2026-09-04 a lu les seize articles de `R. 4323-91` à `R. 4323-106` : aucun autre n'impose de document. C'est ce qui rend cette ligne encodable seule, sans attendre la scission de la catégorie — elle ne se porte pas par équipement.\n\nPORTEUR ÉTABLISSEMENT, ET C'EST UNE LECTURE, PAS UN REPLI. La consigne décrit les équipements d'un lieu et les risques qu'on y court, pas la formation d'une personne : `R. 4323-106`, lui, vise « les travailleurs devant utiliser un équipement » et serait porté par le salarié (ADR-023). Deux articles voisins, deux porteurs, et les confondre aurait rangé un document d'établissement sous une ligne nominative.\n\nAUCUNE ASSIETTE À CALCULER, à la différence de la vérification périodique. La consigne est due dès qu'un travailleur doit utiliser UN équipement de protection individuelle, quel qu'il soit — l'article ne renvoie à aucune liste et n'exclut rien. Une boîte de gants suffit. La question `epiPresents` de la fiche établissement collecte déjà la réponse qui la déclenche.\n\nÉTAT PERMANENT (ADR-026), `periodicite: \"autre\"`. Le texte n'écrit aucune durée : la consigne s'élabore et se tient, elle ne se renouvelle pas à date. Ce n'est pas pour autant une obligation qui se solde une fois — elle suit le parc et les risques —, mais l'outil ne fabrique pas d'échéance pour l'imposer. Même partage que `information-etablissement-affichages-obligatoires`.\n\nLA SECONDE PIÈCE EST DANS LA DESCRIPTION, PAS DANS UNE LIGNE À PART. L'article impose DEUX choses : la consigne, et « une documentation relative à la réglementation applicable » tenue à disposition du CSE. La seconde est une étagère documentaire, pas un acte daté : lui donner sa propre obligation aurait produit une ligne que rien ne permet de constater faite. Elle est nommée dans la description pour que le dirigeant sache qu'elle existe, et le corpus porte la réserve.\n\n`pieceAttendue: null` : ce qui est dû est l'écrit lui-même, tenu à disposition — pas une pièce que l'inspection se ferait remettre. Même arbitrage que pour les affichages de `D. 4711-1`.\n\nCriticité 3 : le manquement est formel au regard de l'inspection, mais la consigne a une fonction réelle — un harnais mal porté ne retient pas.",
  },

  {
    id: "epi-verification-generale-periodique",
    domaine: "epi",
    libelle:
      "Vérification générale périodique des équipements de protection individuelle",
    description:
      "Les harnais et systèmes d'arrêt de chute, les appareils de protection respiratoire et leurs cartouches filtrantes, les gilets de sauvetage gonflables doivent avoir été vérifiés depuis moins de douze mois au moment où on les utilise — en service comme en stock. La vérification est faite par une personne qualifiée, qui peut appartenir à l'établissement.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 19 mars 1993, art. 1er (liste des EPI soumis à vérification et périodicité de douze mois)",
        article: "Arrêté 1993-03-19 (EPI) art. 1er",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006930405",
        note: "C'est LUI qui nomme les équipements et pose les douze mois ; le Code ne chiffre rien. Liste nominative et fermée de cinq familles : appareils de protection respiratoire autonomes destinés à l'évacuation ; appareils de protection respiratoire et équipements complets destinés à des interventions accidentelles en milieu hostile ; gilets de sauvetage gonflables ; systèmes de protection individuelle contre les chutes de hauteur ; stocks de cartouches filtrantes antigaz pour appareils de protection respiratoire.",
        versionConstatee: "1993-12-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-99 (article habilitant)",
        article: "R. 4323-99",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531296",
        note: "L'article qui renvoie à des arrêtés le soin de désigner les EPI soumis à vérification générale périodique et d'en fixer la périodicité, la nature et le contenu. Il n'écrit lui-même aucun rythme, mais il donne l'OBJET de la vérification, et il est double : déceler toute défectuosité susceptible d'être à l'origine de situations dangereuses, ET tout défaut d'accessibilité contraire aux conditions déterminées en application de R. 4323-97. Jumeau exact de R. 4323-23 pour les équipements de travail.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 19 mars 1993, art. 2 (contenu de la vérification)",
        article: "Arrêté 1993-03-19 (EPI) art. 2",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006930406",
        note: "Article de CONTENU, cité en contexte et non en fondement : il dit sur quoi porte la vérification, jamais qui la doit ni quand. Il l'indexe sur la NOTICE DU FABRICANT, et son 3° demande l'élimination des équipements arrivés à péremption — une date que le produit ne connaît pas.",
        versionConstatee: "1993-12-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-100 (qualification du vérificateur)",
        article: "R. 4323-100",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531294",
        note: "« Les vérifications générales périodiques sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement, dont la liste est tenue à la disposition de l'inspecteur du travail. » C'est cet article qui fonde `personne_qualifiee`, et le fait qu'aucun organisme accrédité ne soit exigé. Il restreint lui-même sa portée aux « équipements de protection individuelle soumis à vérification ».",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-101 à R. 4323-103 (consignation et conservation)",
        article: "R. 4323-101",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531292",
        note: "Le résultat est consigné sur le registre de sécurité de L. 4711-5, et les rapports y sont annexés. Traçabilité sans périodicité propre : elle suit celle de la vérification.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: [
      "EPI_ANTICHUTE",
      "EPI_RESPIRATOIRE",
      "EPI_GILET_SAUVETAGE",
    ],
    notesInternes:
      "Créée le 2026-09-04 avec le dépouillement de l'arrêté du 19 mars 1993 (corpus `arrete-1993-03-19-epi`), dont l'article 1er était `obligation_manquante` depuis sa lecture le jour même — bloqué par une seule chose : la catégorie `EPI` mélangeait les deux côtés de la liste.\n\nUNE LIGNE POUR CINQ ENTRÉES, RANGÉES EN TROIS CATÉGORIES. Les cinq familles de l'article 1er portent le même acte, la même périodicité, le même réalisateur et le même contenu (art. 2). Les deux entrées respiratoires et les cartouches qui les alimentent tiennent en une catégorie parce que leur détenteur est le même et que rien ne les distingue au regard du texte — le précédent est `COMPACTEUR_PRESSE_DECHETS_MOTORISE`, qui réunit deux entrées de l'arrêté du 5 mars 1993.\n\nPOURQUOI DES CATÉGORIES ET NON UNE PROPRIÉTÉ D'ÉQUIPEMENT. L'arrêté n'écrit AUCUN critère technique : ni « antichute », ni « respiratoire », ni un seuil de hauteur. Il écrit des NOMS D'OBJETS. Il n'y a rien à dériver d'un attribut, et une case « soumis à vérification » aurait fait déclarer au dirigeant la conclusion juridique que l'outil doit calculer pour lui.\n\nPOURQUOI PAS UNE OBLIGATION SUR `EPI`. La catégorie couvre « harnais antichute et sa longe, casque, gants, chaussures de sécurité, protections auditives, masque ». Y poser cette ligne aurait réclamé une vérification annuelle par personne qualifiée — criticité 5, coût de tiers réel — au commerçant qui a déclaré une boîte de gants. C'est la sur-application que `epi-famille.test.ts` interdisait, et cette garde s'ouvre d'elle-même maintenant que l'article de corpus est `retenu`.\n\nCE QUE LA PÉRIODICITÉ ENCODE, ET CE QU'ELLE PERD. Le texte n'écrit pas « tous les ans » mais « avoir fait l'objet, DEPUIS MOINS DE DOUZE MOIS AU MOMENT DE LEUR UTILISATION » : l'échéance se mesure à l'instant de l'usage. `periodicite: \"annuelle\"` rend le rythme, pas cette conséquence — le produit ne sait pas interdire l'usage d'un équipement. Le sens de l'écart est le bon : le calendrier réclame la vérification à la date, ce qui maintient la condition d'usage satisfaite. Même partage que la trimestrielle du compacteur.\n\n« EN SERVICE OU EN STOCK » N'EST PAS ENCODÉ, ET IL FAUT LE SAVOIR. L'arrêté soumet les équipements en stock au même régime que ceux en service : un harnais neuf rangé au placard depuis treize mois ne peut pas être utilisé sans vérification. Le produit ne distingue pas le stock du service — un équipement déclaré est un équipement, et il porte son échéance. C'est le sens qui sur-applique légèrement, et l'écart est VISIBLE par celui qui le subit : il voit une échéance sur un équipement qu'il n'utilise pas, et peut la traiter. L'inverse aurait dispensé du contrôle un équipement dont la défaillance se découvre le jour où l'on en a besoin.\n\nRÉALISATEUR : `personne_qualifiee` SEUL. R. 4323-100 dit « des personnes qualifiées, APPARTENANT OU NON À L'ÉTABLISSEMENT » : aucun organisme accrédité n'est exigé, à la différence du régime des équipements sous pression. Ajouter `organisme_agree` aurait fait croire à une exigence que le texte ne porte pas.\n\nPAS DE `pieceAttendue`. Le rapport est la TRACE de l'acte, pas l'obligation : ce qui est dû est la vérification, et sa consignation relève de R. 4323-101 à -103, cités en contexte. Même partage que sur les VGP de levage et de compactage.\n\nLA PÉREMPTION N'EST PAS PORTÉE. Le 3° de l'article 2 demande d'éliminer les équipements arrivés à péremption, date que le fabricant fixe et que le produit ne connaît pas — aucun champ ne la stocke. Ce n'est pas un oubli : c'est une donnée qui manque au modèle, et l'inventer serait pire que l'absence. La réserve est au corpus.\n\n⚠ L'ÉNUMÉRATION DES ARRÊTÉS PRIS SUR R. 4323-99 N'EST PAS GARANTIE EXHAUSTIVE. Un seul a été établi et lu à la source. L'article vise « les ministres chargés du travail OU de l'agriculture », et un jumeau agricole existe pour R. 4323-23 (arrêté du 24 juin 1993). Cette obligation encode ce qui a été lu ; un arrêté non trouvé pourrait AJOUTER des familles, il ne peut pas rendre faux les douze mois de celles-ci. La réserve est portée par le corpus, pas ici.",
  },
];
