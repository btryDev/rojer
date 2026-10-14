// Corpus : le défibrillateur automatisé externe (DAE) en établissement
// recevant du public — CCH R. 157-1 à R. 157-4, et les textes qui en portent
// la signalétique et la déclaration à la base nationale.
//
// POURQUOI CE FICHIER EXISTE. Le DAE avait été instruit le 2026-09-01
// (`docs/revues/lot-d3-recoupement-droit.md` § 3) et écarté : la cible était
// alors la 5ᵉ catégorie seule, et aucun des trois secteurs ne figure aux
// familles a à h du 2° de R. 157-1. Le même paragraphe écrivait la réserve :
// « si les catégories 1-4 s'ouvrent, le DAE devient dû sans condition ».
// Depuis le 2026-10-12 la cible est ce que l'onboarding ne refuse pas (ADR-031),
// catégories 1 à 4 comprises ; le reclassement du 2026-10-13 a manqué la
// conséquence. Encodage validé par la propriétaire le 2026-10-14 (« c'est un
// gros manque »), décisions Q1 à Q4 du même jour.
//
// TOUT A ÉTÉ RELU LE 2026-10-14 PAR L'API LÉGIFRANCE (PISTE), EN BAC À SABLE
// — l'`.env.local` pointe la sandbox ; égalité avec la production non
// vérifiée —, versions en vigueur à cette date. `lecture: "api_legifrance"`
// vaut pour cette lecture-là, comme pour les articles d'`arrete-1980-livre-2.ts`
// relus en bac à sable le 2026-10-07. `pnpm legifrance:verifier -- --corpus
// cch-defibrillateur`, le même jour et dans le même bac à sable : 9 OK sur 9.
// Trois pièges relevés à la lecture :
//
//  1. R. 157-1 a changé le 7 décembre 2025 (décret n° 2025-1167) : le 2° pose
//     désormais deux conditions cumulatives en 5ᵉ catégorie — implantation de
//     plus de trois mois, et un nombre minimal de personnes « défini par
//     arrêté ». Cet arrêté n'est PAS publié au JORF : recherche du 2026-10-14 (API, bac à sable)
//     sur « défibrillateur », « nombre minimal de personnes » et « R. 157-1 »
//     depuis le 2025-12-06 — l'index de l'API a été vu jusqu'au 2026-09-17 au
//     moins.
//  2. Le renvoi de R. 157-4 vise, depuis le décret n° 2026-299 du 17 avril
//     2026, « R. 5212-16 » du code de la santé publique — l'article des
//     décisions de l'ANSM sur le contrôle de qualité. Le texte de l'ancien
//     R. 5212-25 (maintenance par l'exploitant) se retrouve au R. 5212-14,
//     qui vise toutefois les « dispositifs mentionnés au I de l'article
//     L. 5211-1 » et non plus les « dispositifs médicaux ». Que le renvoi soit une erreur est UNE LECTURE, pas ce que dit
//     le texte : rien n'est corrigé sur cette base.
//  3. Trois porteurs différents selon le texte : « les propriétaires des
//     établissements recevant du public » installent (décret n° 2018-1186,
//     art. 2) et signalent (arrêté du 29 octobre 2019, art. 2) ; « le
//     propriétaire du défibrillateur » fait maintenir (R. 157-4) ; « l'exploitant
//     […] propriétaire du DAE » déclare à la base (arrêté du 29 octobre 2019
//     relatif à la base, annexe 1). Le référentiel les porte tous trois par
//     l'établissement — voir les `notesInternes` des trois obligations.
//
// Étendue « articles_cites » : quatre articles du chapitre VII du CCH, et les
// seuls articles des textes connexes que le référentiel cite.

import type { Corpus } from "./types";

const ART_CODE = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;
const ART_LODA = (id: string) =>
  `https://www.legifrance.gouv.fr/loda/article_lc/${id}`;

export const CCH_DEFIBRILLATEUR: Corpus = {
  id: "cch-defibrillateur",
  intitule:
    "Défibrillateur automatisé externe en ERP — CCH R. 157-1 à R. 157-4, signalétique et base nationale",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052997831",
  etendue: "articles_cites",
  portee:
    "Détention, emplacement, signalisation, maintenance et déclaration à la base nationale du défibrillateur automatisé externe dans les établissements recevant du public. Lu le 2026-10-14 ; les articles non cités de l'arrêté du 29 octobre 2019 relatif à la base (art. 2, 4 à 8) et du décret n° 2018-1259 (art. 1, 3) ne sont pas dépouillés.",
  articles: [
    {
      ref: "CCH R. 157-1",
      intitule:
        "Établissements recevant du public soumis à l'obligation de détenir un DAE",
      url: ART_CODE("LEGIARTI000052997831"),
      versionEnVigueur: "2025-12-07",
      modifiePar: {
        texte: "Décret n° 2025-1167 du 5 décembre 2025 - art. 1",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052993669",
      },
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Les ERP des catégories 1 à 4 détiennent un défibrillateur automatisé externe, sans autre condition. En 5ᵉ catégorie, seuls y sont soumis ceux des familles a à h, implantés plus de trois mois et accueillant un nombre minimal de personnes fixé par arrêté.",
      citationCle:
        "Sont soumis à l'obligation de détenir un défibrillateur automatisé externe, les établissements recevant du public qui relèvent : 1° Des catégories 1 à 4 mentionnées à l'article R. 143-19 ; 2° Et parmi ceux relevant de la catégorie 5, lorsqu'ils sont implantés pour une durée supérieure à trois mois et accueillent un nombre minimal de personnes défini par arrêté des ministres chargés de la santé et de la construction :",
      statut: "retenu",
      obligations: [
        "dae-erp-detention",
        "dae-erp-maintenance",
        "dae-erp-declaration-geodae",
      ],
      reserve:
        "LE 2° (5ᵉ CATÉGORIE) N'EST PAS ENCODÉ — décision de la propriétaire du 2026-10-14 (Q4). Deux raisons, dont une seule tient au texte. (1) L'arrêté qui fixe « un nombre minimal de personnes » n'est pas publié : recherche au JORF du 2026-10-14 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), aucune occurrence de « nombre minimal de personnes » ni de « défibrillateur » en ce sens depuis le décret n° 2025-1167 (index vu jusqu'au 2026-09-17 au moins). Sans seuil, le champ du 2° ne se lit pas, et le texte ne dit pas ce qui vaut en son absence. (2) La condition « implantés pour une durée supérieure à trois mois » ne correspond à aucun attribut d'établissement. Les familles a à h se rapprochent des types J (a), U (b), X (c), P (d), GA (e), OA (g) et REF (h) ; les aéroports (f) n'ont pas de type ERP dédié. `relectureDue` au 2027-01-14 sur `dae-erp-detention` pour rouvrir la question.",
    },
    {
      ref: "CCH R. 157-2",
      intitule: "Emplacement visible et accessible en permanence ; signalétique",
      url: ART_CODE("LEGIARTI000043819227"),
      versionEnVigueur: "2021-07-01",
      modifiePar: null,
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Le DAE est installé dans un emplacement visible du public et en permanence facile d'accès ; la signalétique est renvoyée à un arrêté (celui du 29 octobre 2019).",
      citationCle:
        "Le défibrillateur automatisé externe est installé dans un emplacement visible du public et en permanence facile d'accès.",
      statut: "retenu",
      obligations: ["dae-erp-detention"],
    },
    {
      ref: "CCH R. 157-3",
      intitule: "Mise en commun du DAE entre établissements",
      url: ART_CODE("LEGIARTI000043819229"),
      versionEnVigueur: "2021-07-01",
      modifiePar: null,
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Faculté : des ERP soumis à R. 157-1, situés sur un même site géographique ou placés sous une direction commune, peuvent mettre leur DAE en commun.",
      citationCle:
        "Lorsque plusieurs établissements recevant du public, mentionnés à l'article R. 157-1, sont situés soit sur un même site géographique soit sont placés sous une direction commune au sens de l'article R. 143-21, le défibrillateur automatisé externe peut être mis en commun.",
      statut: "sans_objet",
      motif:
        "Une FACULTÉ, pas une obligation : « peut être mis en commun ». Elle ne crée aucune ligne et n'en retire aucune — l'établissement qui partage le DAE d'un voisin détient toujours un DAE au sens de R. 157-1, et le déclare « en place » sur `dae-erp-detention`, dont la note le dit.",
    },
    {
      ref: "CCH R. 157-4",
      intitule: "Maintenance du DAE à la charge de son propriétaire",
      url: ART_CODE("LEGIARTI000053925011"),
      versionEnVigueur: "2026-04-22",
      modifiePar: {
        texte: "Décret n° 2026-299 du 17 avril 2026 - art. 2",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053916215",
      },
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Le propriétaire du DAE veille à la maintenance de l'appareil et de ses accessoires et aux contrôles de qualité, réalisés par le fabricant, un tiers mainteneur ou, si le propriétaire n'est pas l'exploitant, par l'exploitant. Aucun rythme écrit.",
      citationCle:
        "Le propriétaire du défibrillateur veille à la mise en œuvre de la maintenance du défibrillateur et de ses accessoires et des contrôles de qualité prévus pour les dispositifs médicaux qu'il exploite. La maintenance est réalisée soit par le fabricant ou sous sa responsabilité, soit par un fournisseur de tierce maintenance, soit, si le propriétaire n'est pas l'exploitant, par l'exploitant lui-même conformément aux dispositions de l'article R. 5212-16 du code de la santé publique.",
      statut: "retenu",
      obligations: ["dae-erp-maintenance"],
    },
    {
      ref: "Arrêté 2019-10-29 DAE signalisation art. 2",
      intitule:
        "Affiche à chaque entrée, fléchage du chemin d'accès, étiquette sur le boîtier",
      url: ART_LODA("LEGIARTI000039364652"),
      versionEnVigueur: "2019-11-14",
      modifiePar: null,
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Les propriétaires d'ERP exploitant un DAE apposent une affiche visible à chaque entrée, signalent l'emplacement et le chemin d'accès, et apposent sur le boîtier une étiquette tenue visible, lisible et à jour.",
      citationCle:
        "1° d'apposer une affiche de signalisation, visible à chaque entrée de l'établissement, conformément au modèle 1 de l'annexe 1 du présent arrêté ;",
      statut: "retenu",
      obligations: ["dae-erp-detention"],
    },
    {
      ref: "Arrêté 2019-10-29 DAE signalisation art. 3",
      intitule: "Emplacement accessible et utilisation permanente ; boîtier extérieur",
      url: ART_LODA("LEGIARTI000039364654"),
      versionEnVigueur: "2019-11-14",
      modifiePar: null,
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Le DAE est installé dans un emplacement facilement accessible permettant son utilisation permanente par toute personne présente ; à l'extérieur, il est protégé par un boîtier contre les intempéries.",
      citationCle:
        "Le défibrillateur automatisé externe est installé dans un emplacement facilement accessible et permettant son utilisation permanente par toute personne présente dans l'enceinte de l'établissement.",
      statut: "retenu",
      obligations: ["dae-erp-detention"],
    },
    {
      ref: "CSP L. 5233-1",
      intitule: "Base de données nationale des défibrillateurs automatisés externes",
      url: ART_CODE("LEGIARTI000037118534"),
      versionEnVigueur: "2018-06-30",
      modifiePar: null,
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Crée la base nationale des lieux d'implantation et de l'accessibilité des DAE, alimentée par les informations que fournissent les exploitants des appareils.",
      citationCle:
        "Il est créé une base de données nationale relative aux lieux d'implantation et à l'accessibilité des défibrillateurs automatisés externes sur l'ensemble du territoire, constituée au moyen des informations fournies par les exploitants de ces appareils",
      statut: "retenu",
      obligations: ["dae-erp-declaration-geodae"],
    },
    {
      ref: "Décret 2018-1259 art. 2",
      intitule: "Transmission des informations à la base par les exploitants",
      url: ART_LODA("LEGIARTI000037973080"),
      versionEnVigueur: "2018-12-29",
      modifiePar: null,
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "Les exploitants des DAE transmettent les informations relatives aux lieux d'implantation et à l'accessibilité de leurs appareils au gestionnaire de la base, à compter des dates d'installation du décret n° 2018-1186.",
      citationCle:
        "Les exploitants des défibrillateurs automatisés externes transmettent les informations relatives aux lieux d'implantation et à l'accessibilité de leurs appareils au gestionnaire de la base de données désigné par le présent décret",
      statut: "retenu",
      obligations: ["dae-erp-declaration-geodae"],
    },
    {
      ref: "Arrêté 2019-10-29 DAE base nationale art. 3",
      intitule: "Informations obligatoirement transmises par l'exploitant (annexe 1)",
      url: ART_LODA("LEGIARTI000039364770"),
      versionEnVigueur: "2020-01-01",
      modifiePar: null,
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      prescrit:
        "L'annexe 1 fixe les informations que l'exploitant du DAE transmet obligatoirement — localisation, accès et horaires, état de fonctionnement, fabricant, modèle, numéro de série, date de la dernière maintenance, coordonnées de l'exploitant — et l'exploitant les valide. L'annexe 1 précise (champ `expt_rais`) : « L'exploitant est le propriétaire du DAE, seul responsable de la déclaration sur la base ». Aucune fréquence de mise à jour n'est écrite.",
      citationCle:
        "l'annexe 1 précise les informations qui devront être obligatoirement transmises par l'exploitant du défibrillateur",
      statut: "retenu",
      obligations: ["dae-erp-declaration-geodae"],
    },
  ],
};
