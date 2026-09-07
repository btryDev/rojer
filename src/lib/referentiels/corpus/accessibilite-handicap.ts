// Corpus : la nomenclature des handicaps, et les textes d'accessibilité qui
// n'en portent pas.
//
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI DEUX CORPUS DANS UN SEUL FICHIER
// ─────────────────────────────────────────────────────────────────────────────
//
// L'énumération `HandicapAccessible` du modèle sert UN champ :
// `RegistreAccessibilite.handicapsAccueillis`, « les types de handicaps pour
// lesquels l'établissement est adapté ». Le § 9 de `docs/chantiers-ouverts.md`
// la range parmi les listes qui « transcrivent une nomenclature écrite dans un
// texte », et lui donne pour source « le droit de l'accessibilité ».
//
// **Le droit de l'accessibilité n'écrit aucune nomenclature de handicaps.**
// C'est le résultat principal du relevé du 2026-09-03, et il a fallu ouvrir
// toute la chaîne pour l'établir — `L. 161-1` et `L. 164-1` du code de la
// construction et de l'habitation, `R. 164-6` qui institue le registre, et
// l'arrêté du 19 avril 2017 qui en fixe le contenu. Les quatre parlent des
// « personnes handicapées » sans jamais les répartir. L'arrêté, en
// particulier, énumère NEUF pièces et pas une famille de handicap.
//
// Le second corpus est donc là pour porter une ABSENCE, et c'est son seul
// office : sans son verbatim, « l'arrêté ne dit rien des familles » resterait
// une affirmation. Avec lui, c'est une propriété que
// `handicap-accessible.test.ts` vérifie sur le texte.
//
// La nomenclature, elle, existe — ailleurs. `L. 114` du code de l'action
// sociale et des familles, écrit par l'article 2 de la **loi n° 2005-102 du
// 11 février 2005**, celle-là même que le brief nommait. Elle énumère cinq
// familles de fonctions altérées, puis deux situations qu'elle met sur le même
// plan. C'est la seule énumération de droit, et c'est à elle que le modèle est
// tenu.
//
// ─────────────────────────────────────────────────────────────────────────────
// « LES QUATRE FAMILLES DE HANDICAP » N'EST DANS AUCUN DE CES TEXTES
// ─────────────────────────────────────────────────────────────────────────────
//
// La formule circule partout — moteur, visuel, auditif, mental. Elle n'est ni
// dans `L. 114`, ni dans le CCH, ni dans l'arrêté du 19 avril 2017. Elle vient
// des supports de communication de l'accessibilité, et notamment du « document
// d'aide à l'accueil des personnes handicapées à destination du personnel en
// contact avec le public élaboré par le ministre en charge de la
// construction » — que l'arrêté impose de mettre AU registre (art. 1er, I, 8°)
// sans en reprendre le contenu. Un document ministériel d'aide n'est pas une
// nomenclature de droit : l'arrêté l'annexe, il ne l'édicte pas.
//
// Le modèle ne l'a d'ailleurs pas prise : il porte six valeurs, pas quatre.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-03. `L. 114` a
// été lu DEUX FOIS, indépendamment, parce que le parseur du test s'appuie sur
// sa ponctuation : la première lecture rendait « d'une ou plusieurs fonctions
// **:** physiques », la seconde, interrogée sur ce point précis, a répondu
// qu'il n'y a pas de deux-points. C'est la seconde qui est ici.

import type { Corpus } from "./types";

/**
 * Le registre est composé par le module `Accessibilite`, pas par une
 * `Obligation` du référentiel : aucun article de ces deux corpus ne peut donc
 * être `retenu`, faute d'obligation à nommer. Même situation que le chapitre
 * du plan de prévention (`code-travail-plan-prevention.ts`).
 */
const PORTE_PAR_LE_MODULE =
  "Porté par le module `Accessibilite` (`src/lib/accessibilite/`), qui compose le registre et publie sa page consultable, et par `documents-obligatoires.ts` qui l'inscrit aux pièces dues. Il n'y a pas d'`Obligation` du référentiel à nommer : le registre est un document permanent, pas une échéance récurrente.";

export const CASF_DEFINITION_HANDICAP: Corpus = {
  id: "casf-definition-handicap",
  intitule:
    "Code de l'action sociale et des familles — définition légale du handicap",
  url: "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074069",
  etendue: "articles_cites",
  portee:
    "Un seul article, et c'est le seul du droit français qui énumère les familles de handicap : L. 114, écrit par l'article 2 de la loi n° 2005-102 du 11 février 2005. Il ne fonde aucune échéance — c'est une définition, valable « au sens de la présente loi » — mais c'est de lui que le modèle tient le vocabulaire dans lequel un exploitant déclare pour quels handicaps son établissement est adapté.",
  articles: [
    {
      ref: "L. 114",
      intitule: "Définition du handicap",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006796446",
      versionEnVigueur: "2005-02-12",
      modifiePar: {
        texte:
          "Loi n° 2005-102 du 11 février 2005 pour l'égalité des droits et des chances, la participation et la citoyenneté des personnes handicapées, art. 2",
      },
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Définit le handicap. L'énumération se lit en deux temps : cinq familles de FONCTIONS dont l'altération constitue un handicap — physiques, sensorielles, mentales, cognitives, psychiques —, puis deux situations que l'article met sur le même plan qu'elles, le polyhandicap et le trouble de santé invalidant.",
      citationCle:
        "Constitue un handicap, au sens de la présente loi, toute limitation d'activité ou restriction de participation à la vie en société subie dans son environnement par une personne en raison d'une altération substantielle, durable ou définitive d'une ou plusieurs fonctions physiques, sensorielles, mentales, cognitives ou psychiques, d'un polyhandicap ou d'un trouble de santé invalidant.",
      statut: "sans_objet",
      motif:
        "Article de DÉFINITION : il n'impose rien à un exploitant et ne produit aucune échéance. Il est dépouillé parce qu'il porte la nomenclature à laquelle `HandicapAccessible` est tenue — voir `src/lib/referentiels/handicap-accessible.test.ts`, qui dérive de ce verbatim la liste attendue. Sa portée déclarée est « au sens de la présente loi », c'est-à-dire de la loi du 11 février 2005 ; le code de la construction et de l'habitation, qui régit le registre d'accessibilité, ne renvoie pas expressément à cette définition et n'en écrit aucune autre. C'est donc la seule qui existe, et non une définition rendue applicable au registre par un renvoi — la nuance est dans le motif pour qu'on ne la redécouvre pas.",
    },
  ],
};

/**
 * L'article du code qui INSTITUE le registre public d'accessibilité.
 *
 * POURQUOI IL ARRIVE APRÈS LES AUTRES, ET CE QUE ÇA DIT. L'en-tête de ce
 * fichier annonce depuis le 2026-09-03 avoir ouvert « `R. 164-6` qui institue
 * le registre » — et l'article n'était nulle part au corpus. Le relevé avait
 * bien eu lieu, sa TRACE n'avait pas été écrite : seul l'arrêté d'application
 * l'avait été. Le produit citait donc au dirigeant, sur l'écran du registre ET
 * dans le ZIP remis à l'inspecteur, l'article fondateur de tout le module, sans
 * qu'aucune entrée n'en porte le verbatim ni la date de lecture.
 *
 * PERSONNE NE POUVAIT LE VOIR. La garde `citations-ecran` n'admettait que les
 * numérotations à QUATRE chiffres ; le code de la construction numérote sur
 * trois. `R. 164-6` lui était invisible, comme tout ce que le CCH fonde. Le
 * compteur affichait zéro parce qu'il ne regardait pas.
 *
 * Relu à la source le 2026-09-04 : le verbatim que l'écran affiche entre
 * guillemets est le premier alinéa, mot pour mot. L'article en compte six, et
 * les cinq autres sont ici — c'est le sixième qui renvoie à l'arrêté du
 * 19 avril 2017, déjà dépouillé ci-dessous.
 */
export const CCH_REGISTRE_ACCESSIBILITE: Corpus = {
  id: "cch-registre-accessibilite",
  intitule:
    "Code de la construction et de l'habitation — le registre public d'accessibilité",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819305",
  etendue: "articles_cites",
  portee:
    "L'article unique qui institue le registre public d'accessibilité et en fixe le contenu minimal, renvoyant à un arrêté pour le détail. Les deux articles qu'il cite — `R. 143-2` pour la définition de l'ERP, `L. 164-1` pour l'obligation légale dont il est pris — ne sont pas relevés ici : ils ne sont pas cités par le produit pour eux-mêmes, ils apparaissent dans le verbatim de celui-ci.",
  articles: [
    {
      ref: "CCH R. 164-6",
      intitule: "Registre public d'accessibilité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819305",
      versionEnVigueur: "2021-07-01",
      modifiePar: { texte: "Décret n° 2021-872 du 30 juin 2021" },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Tout exploitant d'ERP élabore un registre public d'accessibilité précisant les dispositions prises pour que chacun bénéficie des prestations de l'établissement. Trois contenus imposés par le code : une information complète sur les prestations, la liste des pièces administratives et techniques relatives à l'accessibilité, et la description des actions de formation des personnels chargés de l'accueil des personnes handicapées avec leurs justificatifs. Deux modalités : mise à disposition de l'ensemble du public, et mise à jour régulière. État permanent — l'article ne fixe aucune périodicité, et « régulière » n'en est pas une.",
      citationCle:
        "L'exploitant de tout établissement recevant du public au sens de l'article R. 143-2 élabore le registre public d'accessibilité prévu à l'article L. 164-1. Celui-ci précise les dispositions prises pour permettre à tous, notamment aux personnes handicapées, quel que soit leur handicap, de bénéficier des prestations en vue desquelles cet établissement a été conçu. Le registre contient : 1° Une information complète sur les prestations fournies dans l'établissement ; 2° La liste des pièces administratives et techniques relatives à l'accessibilité de l'établissement aux personnes handicapées ; 3° La description des actions de formation des personnels chargés de l'accueil des personnes handicapées et leurs justificatifs. Les modalités du registre portent sur sa mise à disposition de l'ensemble du public et sur sa mise à jour régulière. Pour les points d'arrêt des services de transport collectif relevant du régime des établissements recevant du public et qui sont soumis aux dispositions de l'article L. 164-1, le registre public d'accessibilité peut porter sur l'ensemble d'une ligne ou d'un réseau. Un arrêté du ministre chargé de la construction et, le cas échéant, du ministre chargé des transports, précise le contenu et les modalités du registre public d'accessibilité, selon la catégorie et le type de l'établissement, en distinguant, d'une part, les catégories 1 à 4, d'autre part, la catégorie 5.",
      statut: "sans_objet",
      motif:
        PORTE_PAR_LE_MODULE +
        "\n\nCE QUE LA RELECTURE A CONFIRMÉ, ET QUI N'EST PAS ANODIN. L'article ne nomme aucune famille de handicap : « à tous, notamment aux personnes handicapées, quel que soit leur handicap ». Il dit donc la même chose que l'arrêté et que le reste de la chaîne — et c'est ce qui fonde le refus, écrit en tête de fichier, de tirer une nomenclature du droit de l'accessibilité. Quatre textes lus, aucune famille.\n\nSon alinéa 3° impose la description des actions de formation des personnels d'accueil POUR TOUT ERP, là où l'arrêté ne réclame l'attestation annuelle signée qu'en 1ʳᵉ à 4ᵉ catégorie. Le code exige la description, l'arrêté ajoute la forme. La différence n'est pas exploitée aujourd'hui ; elle est relevée pour qu'on ne la redécouvre pas.",
    },
  ],
};

export const ARRETE_2017_04_19_REGISTRE_ACCESSIBILITE: Corpus = {
  id: "arrete-2017-04-19-registre-accessibilite",
  intitule:
    "Arrêté du 19 avril 2017 fixant le contenu et les modalités de diffusion et de mise à jour du registre public d'accessibilité",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000034454237/",
  etendue: "articles_cites",
  portee:
    "Les quatre articles de fond de l'arrêté (le cinquième est l'article d'exécution, non relevé) : le contenu du registre pour tout ERP y compris de 5ᵉ catégorie et l'attestation annuelle de formation en 1ʳᵉ à 4ᵉ catégorie (art. 1er), le cas des points d'arrêt de transport collectif (art. 2), les modalités de consultation (art. 3) et le délai de six mois (art. 4). C'est le texte que le produit cite au dirigeant sur l'écran du registre : son verbatim est ici pour qu'on puisse vérifier ce qu'il dit ET ce qu'il ne dit pas.",
  articles: [
    {
      ref: "Arrêté 2017-04-19 art. 1er",
      intitule: "Contenu du registre public d'accessibilité",
      versionEnVigueur: "2017-04-23",
      modifiePar: null,
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Énumère NEUF pièces que le registre contient, pour tout ERP y compris de 5ᵉ catégorie, et y ajoute pour les 1ʳᵉ à 4ᵉ catégories une attestation annuelle de l'employeur décrivant les actions de formation des personnels chargés de l'accueil des personnes handicapées.",
      citationCle:
        "Le registre public d'accessibilité contient les pièces suivantes ou une copie de celles-ci : I. - Pour tous les établissements recevant du public, y compris les établissements de 5e catégorie : 1° Lorsque l'établissement est nouvellement construit, l'attestation prévue par l'article L. 111-7-4 après achèvement des travaux ; 2° Lorsque l'établissement est conforme aux règles d'accessibilité au 31 décembre 2014, l'attestation d'accessibilité prévue à l'article R. 111-19-33 ; 3° Lorsque l'établissement fait l'objet d'un agenda d'accessibilité programmée conformément aux articles R. 111-19-31 à R. 111-19-47, le calendrier de la mise en accessibilité ; 4° Lorsque l'établissement fait l'objet d'un agenda d'accessibilité programmée comportant plus d'une période, le bilan des travaux et des autres actions de mise en accessibilité réalisés à la moitié de la durée ; 5° Lorsque l'établissement fait l'objet d'un agenda d'accessibilité programmée et à l'achèvement de celui-ci, l'attestation d'achèvement prévue à l'article D. 111-19-46 ; 6° Le cas échéant, les arrêtés préfectoraux accordant les dérogations aux règles d'accessibilité mentionnées à l'article R. 111-19-10 ; 7° Lorsque l'établissement a fait l'objet d'une autorisation de construire, d'aménager ou de modifier un établissement recevant du public, la notice d'accessibilité prévue à l'article D. 111-19-18 ; 8° Le document d'aide à l'accueil des personnes handicapées à destination du personnel en contact avec le public élaboré par le ministre en charge de la construction ; 9° Les modalités de maintenance des équipements d'accessibilité tels que les ascenseurs, élévateurs et rampes amovibles automatiques. Le personnel d'accueil doit être en capacité d'informer l'usager des modalités d'accessibilité aux différentes prestations de l'établissement. II. - Pour les établissements recevant du public de 1re à 4e catégorie : En plus des éléments mentionnés au précédent I, le registre public d'accessibilité contient une attestation signée et mise à jour annuellement par l'employeur décrivant les actions de formation des personnels chargés de l'accueil des personnes handicapées et leurs justificatifs.",
      statut: "sans_objet",
      motif:
        PORTE_PAR_LE_MODULE +
        "\n\nCE QUE L'ARTICLE NE DIT PAS, ET C'EST POURQUOI IL EST ICI. Il ne nomme AUCUNE famille de handicap : neuf fois « l'attestation », « le calendrier », « la notice », et partout « les personnes handicapées » au pluriel indistinct. Son 8° renvoie au « document d'aide à l'accueil […] élaboré par le ministre en charge de la construction » — c'est là que vivent les « quatre familles de handicap » qui circulent —, mais l'arrêté impose d'ANNEXER ce document, il n'en édicte pas le contenu. Une nomenclature reprise d'un support ministériel d'aide n'est pas une nomenclature de droit.",
    },
    {
      ref: "Arrêté 2017-04-19 art. 2",
      intitule: "Points d'arrêt des services de transport collectif",
      versionEnVigueur: "2017-04-23",
      modifiePar: null,
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Adapte le contenu du registre au point d'arrêt de transport collectif relevant du régime des ERP, selon qu'il fait ou non l'objet d'un schéma directeur d'accessibilité-agenda d'accessibilité programmée.",
      citationCle:
        "Pour un point d'arrêt relevant du régime des établissements recevant du public desservi par un service de transport collectif, le registre public d'accessibilité contient : I. - Lorsque l'établissement ne fait pas l'objet d'un schéma directeur d'accessibilité-agenda d'accessibilité programmée, les documents mentionnés à l'article 1er ou une copie de ceux-ci. II. - Lorsque l'établissement fait l'objet d'un schéma directeur d'accessibilité-agenda d'accessibilité programmée, les documents mentionnés à l'article 1er ou une copie de ceux-ci, à l'exception du calendrier, du bilan et de l'attestation d'achèvement prévus aux points 4 et 5 du I de l'article 1er ; 1° L'appartenance de ce point d'arrêt à la liste des points d'arrêt prioritaires ou à la liste complémentaire des points d'arrêt établie en application des dispositions de l'article D. 1112-9 du code des transports ; 2° Lorsque ce point d'arrêt fait l'objet d'une dérogation motivée par une impossibilité technique avérée au sens de l'article L. 1112-4 du même code, la décision de validation préfectorale ou, le cas échéant, la décision de validation du ministre chargé des transports du schéma directeur d'accessibilité-agenda d'accessibilité programmée susmentionné et valant approbation de la dérogation concernée ; 3° Le calendrier de la mise en accessibilité ; 4° Lorsque ce point d'arrêt est concerné par un schéma directeur d'accessibilité-agenda d'accessibilité programmée comportant plus d'une période de trois ans, les bilans des travaux et des autres actions de mise en accessibilité réalisés à l'issue de chaque période de trois ans.",
      statut: "sans_objet",
      motif:
        "Vise le point d'arrêt d'un service de transport collectif — gare routière, station, quai. Il n'écarte pas ces établissements du périmètre : il ADAPTE pour eux la liste de l'article 1er, et ne prescrit rien de plus à l'exploitant d'un ERP ordinaire, qui est la cible du produit. `sans_objet` et non `hors_perimetre` : aucune des quatre exclusions déclarées ne le vise, et en inventer une pour ranger l'article serait exactement ce que `perimetre.ts` interdit en tête de fichier.\n\nRelevé quand même, et c'est son utilité principale : son verbatim participe à la démonstration que l'arrêté ne nomme nulle part une famille de handicap.",
    },
    {
      ref: "Arrêté 2017-04-19 art. 3",
      intitule: "Modalités de consultation du registre",
      versionEnVigueur: "2017-04-23",
      modifiePar: null,
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Le registre est consultable sur place au principal point d'accueil accessible, éventuellement dématérialisé ; à titre alternatif, il est mis en ligne.",
      citationCle:
        "Le registre public d'accessibilité est consultable par le public sur place au principal point d'accueil accessible de l'établissement, éventuellement sous forme dématérialisée. A titre alternatif, il est mis en ligne sur un site internet. Pour les points d'arrêt des services de transport collectif relevant du régime des établissements recevant du public, le registre public d'accessibilité peut porter sur l'ensemble d'une ligne ou d'un réseau. Ce dispositif d'information est accessible par un service de communication au public en ligne en conformité avec le référentiel général d'accessibilité pour les administrations.",
      statut: "sans_objet",
      motif:
        PORTE_PAR_LE_MODULE +
        " La mise en ligne « à titre alternatif » est exactement ce que la page publique du module réalise, avec son affiche et son QR code.",
    },
    {
      ref: "Arrêté 2017-04-19 art. 4",
      intitule: "Délai de mise à disposition",
      versionEnVigueur: "2017-04-23",
      modifiePar: null,
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Six mois à compter de la publication de l'arrêté pour mettre le registre à disposition du public.",
      citationCle:
        "Le registre public d'accessibilité est mis à disposition du public dans un délai de six mois à compter du jour de la publication du présent arrêté.",
      statut: "sans_objet",
      motif:
        "Délai transitoire, échu le 22 octobre 2017. Il ne produit plus rien aujourd'hui : l'obligation est pleine et entière pour tout ERP, sans date d'entrée en vigueur restant à courir. Relevé pour que le compte des articles de l'arrêté soit juste.",
    },
  ],
};
