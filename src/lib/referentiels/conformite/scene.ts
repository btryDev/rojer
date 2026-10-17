/**
 * Obligations réglementaires — Espace scénique (chapitre L du règlement de
 * sécurité ERP).
 *
 * Source primaire : arrêté du 25 juin 1980, livre II, titre II, chapitre Ier
 * « Etablissements du type L — Salles à usage d'audition, de conférences, de
 * réunions, de spectacles ou à usages multiples », art. L 1, L 13, L 49 et
 * L 57, avec les articles du titre Ier auxquels ils renvoient (GE 6, GE 7,
 * GE 8, EL 23). Les 85 articles du chapitre ont été relus le 2026-10-17 par
 * l'API Légifrance (PISTE, BAC À SABLE ; égalité avec la production non
 * vérifiée) : textes identiques à la lecture du 2026-10-16, tous en vigueur,
 * aucune version à venir. Classement article par article au corpus
 * `arrete-1980-livre-2-titre-2`. Lecture préparatoire :
 * `propositions/lecture-L-prerequis-2026-10-18.md`.
 *
 * DÉCISIONS DU 2026-10-17 (sous-lot G du plan « mise à jour du référentiel »,
 * § 8, § 11 et § 12). La propriétaire : la catégorie `SCENE` est proposée aux
 * types L ET P — L 1 § 3 applique le chapitre aux salles de danse « comportant
 * des installations de projection ou des aménagements de spectacle », pour ces
 * seuls aménagements (« ça ne coûte rien de proposer »). c6 : L 57 § 1 a et
 * L 13 § 5 en lignes d'ÉTABLISSEMENT dues dès qu'une scène est déclarée,
 * L 57 § 3 par scène, L 57 § 7 en ligne sœur de la présence d'EL 18 § 2
 * (`electricite.ts`) ; L 57 § 1 b, § 4, L 63 § 4, L 55 et L 75 § 3 annoncés
 * dans l'aide de la catégorie (`DESCRIPTION_CATEGORIE.SCENE`).
 *
 * LA BORNE. `erp: { categories: N1–N4, types: ["L", "P"] }` : le chapitre ne
 * vaut qu'au-dessus des seuils de L 1 § 2 (catégories 1 à 4), et PE 1 § 1
 * écarte le livre II en 5ᵉ catégorie. Une salle qui ne déclare pas de scène ne
 * reçoit aucune de ces lignes : c'est en déclarant la scène que le dirigeant
 * dit qu'il en a une (« on n'alourdit pas », décision de la propriétaire).
 *
 * TEXTES NON LUS, NOMMÉS ET JAMAIS CITÉS COMME LUS : l'IT 246 (désenfumage),
 * l'instruction technique « relative à l'utilisation d'installations
 * particulières » de L 19, et la norme NF EN 17206 (machinerie scénique) que
 * cite L 57 § 4 — aucune n'est sur Légifrance, aucune n'a été ouverte.
 */

import type { Obligation, ReferenceLegale } from "./types";

const URL_L_57 = "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048310306";

/** La borne commune : catégories 1 à 4, types L et P (L 1 § 3). */
const BORNE_SCENE: Obligation["typologies"] = {
  erp: {
    categories: ["N1", "N2", "N3", "N4"],
    types: ["L", "P"],
  },
};

const REF_L_1: ReferenceLegale = {
  source: "ARRETE",
  reference:
    "Arrêté du 25 juin 1980, art. L 1 (établissements assujettis au chapitre ; § 3, salles de danse comportant des aménagements de spectacle) — livre II, titre II, type L, établissements des quatre premières catégories",
  article: "L 1",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045143482",
  note: "Le champ. « § 2. Sont assujettis les établissements dans lesquels l'effectif total du public admis est supérieur ou égal à l'un des chiffres suivants : a) Etablissements visés aux a, b, e, f et g du paragraphe 1 : 100 personnes en sous-sol ; 200 personnes au total. b) Autres établissements visés aux c et d du paragraphe 1 : 20 personnes en sous-sol ; 50 personnes au total. […] § 3. Dans les salles de danse comportant des installations de projection ou des aménagements de spectacle, les dispositions du présent chapitre ne sont applicables qu'à ces installations ou aménagements. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000045143482, en vigueur depuis le 2022-02-10.",
  versionConstatee: "2022-02-10",
};

const REF_L_49: ReferenceLegale = {
  source: "ARRETE",
  reference:
    "Arrêté du 25 juin 1980, art. L 49 (terminologie : espace scénique isolable, intégré ou adossé) — livre II, titre II, type L, établissements des quatre premières catégories",
  article: "L 49",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024767433",
  note: "« a) Espace scénique : espace comportant les scènes, les estrades, les plateaux (fixes ou mobiles), les pistes, les aires de service ou tout autre dispositif permettant des représentations théâtrales, des concerts, des attractions et, en général, tout spectacle. » C'est ce que la catégorie `SCENE` désigne. Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable) : LEGIARTI000024767433, en vigueur depuis le 2007-06-22.",
  versionConstatee: "2007-06-22",
};

export const obligationsScene: Obligation[] = [
  {
    id: "scene-erp-verifications-triennales-organisme-agree",
    domaine: "incendie",
    libelle:
      "Vérifications techniques par un organisme agréé, au moins tous les trois ans (salle avec scène, ERP des quatre premières catégories)",
    description:
      "Dans une salle de type L — ou une salle de danse de type P pour ses aménagements de spectacle — des quatre premières catégories qui comporte un espace scénique, les vérifications techniques que le règlement de sécurité impose doivent être faites tous les trois ans par des personnes ou des organismes agréés (art. L 57 § 1 a, en application de GE 7). Ce n'est pas une vérification de plus : c'est un organisme agréé qui, au moins une fois tous les trois ans, fait les vérifications réglementaires de l'espace scénique — électricité, désenfumage, moyens d'extinction, éclairage de sécurité. Les installations électriques des quatre premières catégories sont déjà vérifiées chaque année par un organisme agréé, et un système de sécurité incendie de catégorie A ou B tous les trois ans : une même visite peut porter ces vérifications.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. L 57 § 1 a (vérifications techniques tous les trois ans par des personnes ou des organismes agréés) — livre II, titre II, type L, établissements des quatre premières catégories",
        article: "L 57",
        url: URL_L_57,
        note: "« § 1. Vérifications techniques : a) En application de l'article GE 7 (§ 1, deuxième tiret), les vérifications techniques imposées par le règlement doivent être effectuées tous les trois ans par des personnes ou des organismes agréés dans tous les établissements du premier groupe. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000048310306, en vigueur depuis le 2023-11-04 (arrêté du 30 octobre 2023), aucune version à venir.",
        versionConstatee: "2023-11-04",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GE 7 § 1 (vérifications par des organismes agréés dans les établissements des quatre premières catégories, lorsque le règlement l'impose) — livre II, établissements des quatre premières catégories",
        article: "GE 7",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020380174",
        note: "« § 1. Les vérifications techniques doivent être effectuées par des organismes agréés par le ministre de l'intérieur : […] -dans tous les établissements des 1re, 2e, 3e et 4e catégories, lorsque les dispositions du présent règlement l'imposent ; […] » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable) PAR SON IDENTIFIANT — la recherche par numéro ne le rend pas, l'article étant à abrogation différée : LEGIARTI000020380174, en vigueur depuis le 2007-11-19 jusqu'au 2027-06-01. La rédaction au 2027-06-01 (arrêté du 19 février 2026, LEGIARTI000053564573) garde le tiret : « lorsque les dispositions du présent règlement l'imposent » — le renvoi de L 57 tient après cette date.",
        versionConstatee: "2007-11-19",
      },
      REF_L_49,
      REF_L_1,
    ],
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: BORNE_SCENE,
    porteur: "etablissement",
    siEquipementDeclare: ["SCENE"],
    notesInternes:
      "ENTRÉE LE 2026-10-17, sous-lot G (décision de c6 : une ligne d'établissement due dès qu'une scène est déclarée, plan § 12).\n\nCE QUE L 57 § 1 a IMPOSE, ET CE QUI EST UNE LECTURE. Le texte ne crée pas un objet nouveau : il fait faire « les vérifications techniques imposées par le règlement » par des personnes ou organismes agréés, tous les trois ans. Deux lectures : (i) celles de l'ESPACE SCÉNIQUE, l'article étant au sous-chapitre IV « Mesures applicables aux espaces scéniques » ; (ii) toutes celles de l'établissement, le texte ne restreignant pas « imposées par le règlement ». La ligne retient (i) — c'est une lecture, pas le texte. GE 8 § 2 dit que la vérification en exploitation peut « concerner tout ou partie des installations » : un seul rapport par établissement, d'où le porteur établissement plutôt qu'une ligne par scène (deux scènes déclarées feraient deux triennales pour un seul rapport).\n\nRECOUPEMENTS, MESURÉS EN APPELANT LE MOTEUR le 2026-10-17 sur c5f638a5 (salle L en N2 et N3, électricité, extincteur, RIA, désenfumage, alarme, BAES et levage déclarés) : `elec-erp-cat1-4-annuelle` (annuelle, organisme agréé — déjà plus fréquente) et `incendie-erp-ssi-triennale` (triennale, organisme agréé, SSI A ou B) recoupent une partie de l'objet ; `incendie-erp-ria-annuelle`, `incendie-erp-desenfumage-annuelle`, `incendie-erp-baes-annuelle` (personne qualifiée) et `incendie-erp-extincteurs-annuelle` (personne compétente) ne demandent pas l'agrément. Ce que cette ligne ajoute, c'est l'agrément tous les trois ans sur ces dernières. Aucune ne porte le même acte : pas de doublon. La description le dit, pour qu'une même visite agréée serve.\n\nRYTHME ÉCRIT : « tous les trois ans ». NORMES ET ARRÊTÉS D'APPLICATION (exigence de la propriétaire) : aucune norme, aucun arrêté d'application ne fixe ce rythme ; le texte le porte lui-même. Temporalité nette.\n\nRÉALISATEUR `organisme_agree`. Le texte dit « personnes ou organismes agréés » ; GE 7 en vigueur ne connaît plus que des « organismes agréés par le ministre de l'intérieur » (la personne agréée vient de la rédaction de 1980, LEGIARTI000020304171). Même choix que `incendie-erp-ssi-triennale`, avec la même réserve au corpus (MS 73).\n\nTYPE P. L 1 § 3 n'applique le chapitre aux salles de danse qu'à leurs « installations de projection ou aménagements de spectacle » : une salle de danse qui déclare une scène reçoit la ligne pour cet espace-là (décision de la propriétaire du 2026-10-17).\n\nSANS SCÈNE DÉCLARÉE, RIEN (`siEquipementDeclare`) : garde `matching/scene-chapitre-l.test.ts`.\n\n`usageEcran: null` : échéance datée, elle ne va pas à l'écran « Ce qui doit être en place ».",
  },
  {
    id: "scene-erp-depoussierage-annuel",
    domaine: "incendie",
    libelle:
      "Dépoussiérage annuel des cintres, grils, dessous, fosses et planchers techniques (scène, ERP des quatre premières catégories)",
    description:
      "Dans une salle de type L — ou une salle de danse de type P pour ses aménagements de spectacle — des quatre premières catégories, un dépoussiérage doit être fait une fois par an dans les cintres, les grils, les dessous, les fosses techniques, les planchers techniques et les dépôts de l'espace scénique (art. L 57 § 3). Le texte ne demande pas de professionnel : l'exploitant le fait faire comme il l'entend.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. L 57 § 3 (dépoussiérage annuel de l'espace scénique) — livre II, titre II, type L, établissements des quatre premières catégories",
        article: "L 57",
        url: URL_L_57,
        note: "« § 3. Un dépoussiérage annuel doit être effectué dans les cintres, les grils, les dessous, les fosses techniques, les planchers techniques, les dépôts, etc. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000048310306, en vigueur depuis le 2023-11-04, aucune version à venir.",
        versionConstatee: "2023-11-04",
      },
      REF_L_49,
      REF_L_1,
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: BORNE_SCENE,
    porteur: "equipement",
    categoriesEquipement: ["SCENE"],
    notesInternes:
      "ENTRÉE LE 2026-10-17, sous-lot G. Un ENTRETIEN, pas une vérification.\n\nUNE LIGNE PAR SCÈNE DÉCLARÉE : les cintres, grils et dessous sont ceux de chaque espace scénique. L'article est en section 1 « Généralités » du sous-chapitre IV : il vaut pour les trois sortes d'espace scénique de L 49 § 2 (isolable, intégré, adossé). La liste est ouverte (« etc. ») ; une estrade sans gril ni dessous n'en a guère l'objet, mais le texte ne l'en sort pas.\n\nRYTHME ÉCRIT : « annuel ». NORMES ET ARRÊTÉS D'APPLICATION (exigence de la propriétaire) : aucun ; le texte porte le rythme. Temporalité nette.\n\nRÉALISATEUR `exploitant` : le texte ne réserve l'acte à personne et n'exige aucun agrément. `pieceAttendue: null` : le texte ne demande aucune pièce.\n\nDOUBLON : aucun — grep vide sur « dépoussi », « cintre », « gril » dans le référentiel, et rien de tel dans les lignes servies à une salle L (mesuré en appelant le moteur le 2026-10-17).\n\n`usageEcran: null` : échéance datée.",
  },
  {
    id: "scene-erp-materiels-installations-temporaires-annuelle",
    domaine: "electricite",
    libelle:
      "Vérification annuelle par un organisme agréé du matériel d'éclairage de spectacle et d'effets scéniques monté pour une durée limitée (ERP des quatre premières catégories)",
    description:
      "Dans une salle de type L — ou une salle de danse de type P pour ses aménagements de spectacle — des quatre premières catégories, le matériel des installations temporaires ou semi-permanentes d'éclairage de spectacle et d'effets scéniques doit justifier d'une vérification annuelle par un organisme agréé (art. L 13 § 5). Une installation semi-permanente est autorisée pour trois mois au plus. Le texte ne dit pas qui fait vérifier : quand ce matériel appartient à une compagnie ou à un prestataire, c'est son rapport de vérification qui en justifie. Les vérifications de l'installation elle-même, au premier montage puis à chaque montage, relèvent d'un autre article (EL 23), que Rojer ne suit pas.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. L 13 § 5 (matériels des installations temporaires ou semi-permanentes : vérification annuelle par un organisme agréé) — livre II, titre II, type L, établissements des quatre premières catégories",
        article: "L 13",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766668",
        note: "« § 5. Les installations semi-permanentes relatives aux éclairages de spectacles ainsi qu'aux effets scéniques sont autorisées pour une durée maximale de trois mois et doivent répondre aux dispositions de l'article EL 23. […] Les matériels des installations temporaires ou semi-permanentes doivent justifier d'une vérification annuelle par un organisme agréé. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024766668, en vigueur depuis le 2007-06-22, aucune version à venir.",
        versionConstatee: "2007-06-22",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. EL 23 (installations semi-permanentes : vérification initiale, puis à chaque installation) — livre II, établissements des quatre premières catégories",
        article: "EL 23",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049576760",
        note: "Contexte, renvoi de L 13 § 5. « § 2. Dans les établissements recevant du public des 1re, 2e et 3e catégories, les installations semi-permanentes doivent être vérifiées initialement par une personne ou un organisme agréé et à chaque installation par un technicien compétent. Dans les établissements recevant du public de 4e catégorie, ces installations doivent être vérifiées, initialement et à chaque installation, par un technicien compétent. » Un acte daté par le MONTAGE, que cette ligne ne porte pas (entrée `EL 23 § 2` du corpus, `non_couvert`). Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable) : LEGIARTI000049576760, en vigueur depuis le 2024-05-24.",
        versionConstatee: "2024-05-24",
      },
      REF_L_1,
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: BORNE_SCENE,
    porteur: "etablissement",
    siEquipementDeclare: ["SCENE"],
    notesInternes:
      "ENTRÉE LE 2026-10-17, sous-lot G (porteur établissement, décision de c6 du 2026-10-17).\n\nCE QUE L 13 § 5 AJOUTE À EL 23. EL 23 vise l'INSTALLATION semi-permanente — vérification initiale, puis « à chaque installation » : un acte daté par un événement, le montage. L 13 § 5 ajoute une vérification ANNUELLE des MATÉRIELS (projecteurs, gradateurs, coffrets, câbles), par un organisme agréé, quel que soit le nombre de montages. Deux objets : pas de doublon.\n\nCHAMP, ET CE QUE LA LIGNE NE SAIT PAS. L 13 est au sous-chapitre Ier (« Mesures applicables à tous les établissements ») : une salle L qui monte des éclairages de spectacle sans déclarer de scène y est soumise et ne reçoit pas cette ligne — un faux négatif accepté, la scène déclarée étant la seule approximation dont le produit dispose (« on n'alourdit pas »). « Temporaires » n'est défini ni par L 13 ni par EL 23 (lu en entier) ; « semi-permanentes » l'est par L 13 § 5 (trois mois au plus).\n\nDÉBITEUR. « doivent justifier » ne nomme personne. Quand le matériel est celui d'une compagnie en tournée, le rapport est le sien et l'exploitant s'en assure ; la description le dit — c'est une lecture, pas le texte.\n\nRYTHME ÉCRIT : « annuelle ». NORMES ET ARRÊTÉS D'APPLICATION (exigence de la propriétaire) : aucun ne fixe ce rythme. Temporalité nette pour la vérification ; le champ (« temporaires ») ne l'est pas.\n\nRÉALISATEUR écrit : « par un organisme agréé ».\n\nDOUBLON : aucun. `elec-erp-cat1-4-annuelle` vise les installations NON MODIFIÉES (EL 19 § 3), dont la liste ne cite pas EL 23 ; `elec-erp-mise-en-service` vise les installations fixes neuves.\n\n`usageEcran: null` : échéance datée.",
  },
];
