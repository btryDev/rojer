/**
 * Obligations réglementaires — Installations frigorifiques (contrôle
 * d'étanchéité des fluides frigorigènes).
 *
 * Sources primaires :
 *   - Code de l'environnement, art. R. 543-79 : le contrôle d'étanchéité à la
 *     mise en service, et son renouvellement.
 *   - Règlement (UE) 2024/573 du 7 février 2024, art. 5 : seuils de
 *     déclenchement, exemption des équipements hermétiquement scellés et
 *     paliers de périodicité.
 *
 * ── Qui dit quoi : la chaîne de délégation ─────────────────────────────────
 *
 * Elle a été relue sur le texte authentique le 23 août 2026 (Légifrance,
 * version en vigueur au 1ᵉʳ janvier 2025) parce que ce fichier en donnait une
 * lecture approximative dans les deux sens.
 *
 * **L'article national porte son propre seuil.** L'alinéa 1 vise « le
 * détenteur d'un équipement dont la charge en HCFC est supérieure à deux
 * kilogrammes, ou dont la charge en HFC ou PFC est supérieure à cinq tonnes
 * équivalent CO2 au sens du règlement (UE) n° 517/2014 ». Le renvoi au
 * règlement n'y sert qu'à définir ce qu'est une tonne équivalent CO2 : il ne
 * délègue pas le déclenchement. Ce fichier a affirmé le contraire, et c'était
 * faux.
 *
 * **Ce que l'article délègue, c'est la périodicité.** L'alinéa 2, en toutes
 * lettres : « Ce contrôle est ensuite périodiquement renouvelé dans les
 * conditions définies par arrêté du ministre chargé de l'environnement. Il est
 * également renouvelé à chaque fois que des modifications ayant une incidence
 * sur le circuit contenant les fluides frigorigènes sont apportées à
 * l'équipement. » La chaîne est donc : alinéa 2 → arrêté du 29 février 2016 →
 * règlement (UE) n° 517/2014.
 *
 * **Et le dernier maillon a changé.** Le 517/2014 a été **abrogé le 11 mars
 * 2024** par le règlement (UE) 2024/573, sans que le droit national ait été
 * réécrit. Un règlement européen étant d'application directe, ce sont les
 * paliers du 2024/573 qui valent aujourd'hui : le référentiel les cite eux, et
 * jamais le texte abrogé. Le jour où le code de l'environnement et l'arrêté
 * seront mis à jour, les références nationales de ce fichier seront à revoir —
 * pas les périodicités.
 *
 * Les deux seuils ne se recouvrent pas exactement — le national de l'alinéa 1
 * (plus de 5 t CO2e de HFC/PFC, plus de 2 kg de HCFC) et le déclencheur de
 * l'article 5 européen (5 t CO2e de gaz de l'annexe I, 1 kg de gaz de
 * l'annexe II section 1). La question `estChargeSousSeuilControle` porte le
 * plus protecteur des deux : le contrôle ne disparaît que si l'appareil sort
 * du champ des deux textes. Cf. `AU_DESSUS_DU_SEUIL`, plus bas.
 *
 * ── Périodicités : texte authentique vérifié, réserve levée ────────────────
 *
 * Les six paliers ont été confrontés au texte du Journal officiel de l'Union
 * européenne le 21 août 2026. EUR-Lex ne sert plus ses pages à un client
 * automatisé — il répond par un défi WAF (HTTP 202, corps vide, en-tête
 * `x-amzn-waf-action: challenge`), en HTML comme en PDF, quelle que soit
 * l'URL. Le texte a donc été obtenu auprès du **Cellar de l'Office des
 * publications**, qui sert le même document sans filtrage :
 *
 *   http://publications.europa.eu/resource/celex/32024R0573
 *   (Accept-Language: fra → `L_202400573FR`, texte publié le 20 février 2024)
 *
 * Article 5, paragraphe 6, cité verbatim :
 *
 *   « Les contrôles d'étanchéité visés au paragraphe 1 sont effectués à la
 *   fréquence suivante :
 *   a) pour les équipements contenant moins de 50 tonnes équivalent CO2 de gaz
 *      à effet de serre fluorés inscrits à l'annexe I ou moins de 10
 *      kilogrammes [...] à la section 1 de l'annexe II : au moins tous les
 *      douze mois ; ou, lorsqu'un système de détection des fuites est installé
 *      dans ces équipements, au moins tous les vingt-quatre mois ;
 *   b) pour les équipements contenant 50 tonnes équivalent CO2 ou plus, mais
 *      moins de 500 tonnes équivalent CO2 [...] ou 10 kilogrammes ou plus, mais
 *      moins de 100 kilogrammes [...] : au moins tous les six mois ou, lorsqu'un
 *      système de détection des fuites est installé dans ces équipements, au
 *      moins tous les douze mois ;
 *   c) pour les équipements contenant 500 tonnes équivalent CO2 ou plus [...]
 *      ou 100 kilogrammes ou plus [...] : au moins tous les trois mois ou,
 *      lorsqu'un système de détection des fuites est installé dans ces
 *      équipements, au moins tous les six mois. »
 *
 * La version anglaise authentique (`L_202400573EN`, même source) dit la même
 * chose : 12 / 24, 6 / 12, 3 / 6 mois. Et le règlement n'a fait l'objet
 * d'aucune consolidation à ce jour — le Cellar ne connaît pas de CELEX
 * `02024R0573` — donc le texte publié est celui en vigueur.
 *
 * La réserve est levée : les six périodicités de ce fichier reproduisent ce
 * paragraphe, et rien d'autre. Elles restent groupées dans
 * `PERIODICITES_ARTICLE_5` pour qu'une relecture porte sur douze valeurs
 * lisibles d'un coup plutôt que sur huit obligations dispersées.
 *
 * ── Note de conception : six périodicités, quatre questions fermées ────────
 *
 * L'article 5 croise deux variables : un palier de charge (moins de 50 t CO2e,
 * de 50 à 500, 500 et plus — ou, pour les fluides insaturés de l'annexe II
 * section 1, moins de 10 kg, de 10 à 100, 100 et plus) et la présence d'un
 * système fixe de détection des fuites, qui double l'intervalle. Six cas, donc
 * six obligations qui s'excluent.
 *
 * La tentation était de demander la charge en tonnes équivalent CO2 et de
 * poser les paliers en conditions numériques. C'eût été un piège : une
 * condition numérique n'est **pas** satisfaite quand la propriété est absente,
 * et ce chiffre ne se lit pas sur la porte d'une chambre froide — il se
 * calcule à partir du fluide et de sa charge. Le dirigeant qui déclare son
 * groupe froid sans le connaître — le cas de loin le plus fréquent — n'aurait
 * déclenché aucune des six obligations. Silence total sur une obligation de
 * criticité 4, exactement ce que la doctrine du dépôt interdit.
 *
 * Le modèle retenu est donc celui du couple de VGP de levage, étendu à trois
 * paliers : des **questions fermées à trois états**, et une obligation par
 * combinaison, rédigée de sorte qu'exactement une s'applique quel que soit
 * l'état des réponses.
 *
 *   `estChargeSuperieure50TCo2`   ·  `estChargeSuperieure500TCo2`
 *   `aDetectionDeFuites`          ·  `estHermetiquementScelleSousSeuil`
 *
 * Chaque obligation cumule des conditions `infirmee` (satisfaites tant que la
 * réponse n'est pas « oui ») et `booleenne` (satisfaites sur un « oui »
 * explicite). Le tableau des vingt-sept états possibles se lit ainsi :
 *
 *   palier 500 = oui  → trimestriel, ou semestriel si détection ;
 *   sinon palier 50 = oui  → semestriel, ou annuel si détection ;
 *   sinon → annuel, ou biennal si détection.
 *
 * Aucune réponse n'éteint rien : un équipement déclaré sans qu'aucune question
 * n'ait reçu de réponse tombe sur le contrôle **annuel**, qui est la
 * périodicité de l'écrasante majorité des parcs de TPE/PME. Répondre ne fait
 * que déplacer l'échéance vers le palier exact — jamais la faire disparaître.
 *
 * ~~La seule réponse qui retire des obligations est~~ [2026-09-27, remesuré en
 * appelant : DEUX réponses les retirent — le « oui » à `estChargeSousSeuilControle`
 * (hors du champ des deux textes, voir `AU_DESSUS_DU_SEUIL`) et] le « oui » explicite à la
 * dispense des équipements hermétiquement scellés (art. 5 : scellé, étiqueté
 * comme tel, et sous 10 t CO2e ou 2 kg selon l'annexe du fluide). Elle est
 * posée en `infirmee` sur les huit obligations : tant qu'elle n'a pas été
 * tranchée, les échéances restent affichées.
 *
 * Scope : installations frigorifiques **fixes** — chambres froides, vitrines
 * et meubles réfrigérés, groupes froid, refroidisseurs. Les unités de
 * réfrigération des véhicules et conteneurs, que le règlement 2024/573 fait
 * entrer dans le champ par étapes jusqu'au 12 mars 2027, sortent du périmètre.
 */

import type { Periodicite } from "../types-communs";
import type { Obligation } from "./types";

const CATEGORIE = "INSTALLATION_FRIGORIFIQUE" as const;

/**
 * Les six paliers de l'article 5, nommés — trois charges, chacune dédoublée
 * par la présence d'un système fixe de détection des fuites.
 */
type PalierArticle5 =
  | "sous50"
  | "sous50Detection"
  | "sup50"
  | "sup50Detection"
  | "sup500"
  | "sup500Detection";

/**
 * ── Les douze valeurs de l'article 5, groupées ────────────────────────────
 *
 * Les six paliers de l'article 5, paragraphe 6 — trois tranches de charge,
 * chacune dédoublée par la présence d'un système fixe de détection des fuites
 * qui double l'intervalle. Ces valeurs sont **fondées**, pas présumées : elles
 * recopient le paragraphe cité en tête de fichier, lu sur le texte authentique
 * du Journal officiel servi par le Cellar de l'Office des publications.
 *
 * Elles vivent ici plutôt que dispersées dans les huit obligations pour qu'une
 * relecture ultérieure — au premier règlement modificatif, par exemple — porte
 * sur une table de douze lignes et non sur le fichier entier. Un test vérifie
 * qu'aucune obligation ne se remet à porter sa périodicité en dur.
 */
export const PERIODICITES_ARTICLE_5: Record<PalierArticle5, Periodicite> = {
  /** Moins de 50 t CO2e (ou moins de 10 kg, annexe II section 1) : douze mois. */
  sous50: "annuelle",
  /** Le même palier avec détection des fuites : vingt-quatre mois. */
  sous50Detection: "biennale",
  /** De 50 à 500 t CO2e (ou de 10 à 100 kg) : six mois. */
  sup50: "semestrielle",
  /** Le même palier avec détection des fuites : douze mois. */
  sup50Detection: "annuelle",
  /** 500 t CO2e ou plus (ou 100 kg ou plus) : trois mois. */
  sup500: "trimestrielle",
  /** Le même palier avec détection des fuites : six mois. */
  sup500Detection: "semestrielle",
};

/** Le palier dont chaque obligation périodique tire sa périodicité. */
export const PALIER_PAR_OBLIGATION: Record<string, PalierArticle5> = {
  "froid-controle-etancheite-annuel": "sous50",
  "froid-controle-etancheite-biennal-detection": "sous50Detection",
  "froid-controle-etancheite-semestriel-50t": "sup50",
  "froid-controle-etancheite-annuel-50t-detection": "sup50Detection",
  "froid-controle-etancheite-trimestriel-500t": "sup500",
  "froid-controle-etancheite-semestriel-500t-detection": "sup500Detection",
};

/** Article national fondateur — relu sur Légifrance le 23 août 2026, version
 *  en vigueur au 1ᵉʳ janvier 2025. */
const REF_ENVIRONNEMENT_MISE_EN_SERVICE = {
  source: "CODE_ENVIRONNEMENT",
  reference: "R. 543-79, al. 1",
  article: "C. env. R. 543-79",
  url:
    "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031790640",
  note: "Contrôle d'étanchéité lors de la mise en service, par un opérateur disposant de l'attestation de capacité prévue à l'article R. 543-99. L'alinéa porte aussi le seuil national : charge en HCFC supérieure à 2 kg, ou charge en HFC ou PFC supérieure à 5 tonnes équivalent CO2.",
} as const;

// La note reprend le texte **mot pour mot**. Elle a longtemps porté une
// paraphrase entre guillemets — « Le contrôle est renouvelé périodiquement et
// chaque fois que des modifications affectant le circuit frigorifique sont
// apportées » — qui escamotait le membre de phrase décisif : les conditions du
// renouvellement sont fixées par arrêté, pas par l'article. Une citation
// approximative sur un document opposable vaut une référence inventée.
const REF_ENVIRONNEMENT_RENOUVELLEMENT = {
  source: "CODE_ENVIRONNEMENT",
  reference: "R. 543-79, al. 2",
  article: "C. env. R. 543-79",
  url:
    "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031790640",
  note: "« Ce contrôle est ensuite périodiquement renouvelé dans les conditions définies par arrêté du ministre chargé de l'environnement. Il est également renouvelé à chaque fois que des modifications ayant une incidence sur le circuit contenant les fluides frigorigènes sont apportées à l'équipement. »",
} as const;

/** Article européen qui fixe les seuils et les paliers de périodicité. */
const REF_REGLEMENT_ART_5 = {
  source: "REGLEMENT_UE",
  reference: "Règlement (UE) 2024/573, art. 5",
  article: "Règlement UE 2024/573 art. 5",
  url: "https://eur-lex.europa.eu/eli/reg/2024/573/oj/fra",
  note: "Contrôles d'étanchéité. Déclenchement à 5 t CO2e de gaz de l'annexe I ou 1 kg de gaz de l'annexe II section 1 ; dispense des équipements hermétiquement scellés étiquetés comme tels sous 10 t CO2e ou 2 kg. Abroge le règlement (UE) n° 517/2014 depuis le 11 mars 2024.",
} as const;

/** Dispense des équipements hermétiquement scellés — posée sur les huit obligations. */
const HORS_DISPENSE = {
  type: "equipement_propriete_infirmee",
  categorie: CATEGORIE,
  propriete: "estHermetiquementScelleSousSeuil",
} as const;

/**
 * Le seuil de déclenchement — la question qui décide de l'existence même du
 * contrôle, et non de sa fréquence.
 *
 * Elle manquait, et c'était le seul des quatre paliers à n'être qu'une note.
 * Conséquence : une vitrine réfrigérée de quelques centaines de grammes
 * héritait d'un contrôle d'étanchéité annuel de criticité 4 **par opérateur
 * certifié** — une intervention payante, récurrente, sur un appareil que ni
 * le règlement ni le code de l'environnement ne visent. Sur des secteurs où
 * le partage passe précisément entre la vitrine et la chambre froide, ce
 * n'est pas un cas d'école.
 *
 * Elle appartient à la famille de la dispense, pas à celle des paliers : les
 * trois questions de charge ne font que **resserrer** la fréquence (douze,
 * six, trois mois), celle-ci **retire** l'obligation. D'où le même protocole
 * strict — `equipement_propriete_booleenne` à `true` exigé, donc un « oui »
 * explicite du dirigeant ; « non » comme « je ne sais pas encore » gardent
 * tous les contrôles au calendrier.
 *
 * Un seul « oui » pour deux seuils qui ne coïncident pas — le national
 * (R. 543-79 al. 1 : plus de 5 t CO2e de HFC/PFC, plus de 2 kg de HCFC) et
 * l'européen (art. 5 : 5 t CO2e de gaz de l'annexe I, 1 kg de gaz de
 * l'annexe II section 1). La question porte le plus protecteur des deux : le
 * contrôle ne disparaît que si l'appareil sort du champ des deux textes.
 */
const AU_DESSUS_DU_SEUIL = {
  type: "equipement_propriete_infirmee",
  categorie: CATEGORIE,
  propriete: "estChargeSousSeuilControle",
} as const;

const SANS_DETECTION = {
  type: "equipement_propriete_infirmee",
  categorie: CATEGORIE,
  propriete: "aDetectionDeFuites",
} as const;

const AVEC_DETECTION = {
  type: "equipement_propriete_booleenne",
  categorie: CATEGORIE,
  propriete: "aDetectionDeFuites",
  valeur: true,
} as const;

const SOUS_50 = {
  type: "equipement_propriete_infirmee",
  categorie: CATEGORIE,
  propriete: "estChargeSuperieure50TCo2",
} as const;

const AU_DESSUS_50 = {
  type: "equipement_propriete_booleenne",
  categorie: CATEGORIE,
  propriete: "estChargeSuperieure50TCo2",
  valeur: true,
} as const;

const SOUS_500 = {
  type: "equipement_propriete_infirmee",
  categorie: CATEGORIE,
  propriete: "estChargeSuperieure500TCo2",
} as const;

const AU_DESSUS_500 = {
  type: "equipement_propriete_booleenne",
  categorie: CATEGORIE,
  propriete: "estChargeSuperieure500TCo2",
  valeur: true,
} as const;

export const obligationsFroid: Obligation[] = [
  {
    id: "froid-controle-etancheite-mise-en-service",
    domaine: "froid",
    libelle: "Contrôle d'étanchéité à la mise en service (installation frigorifique)",
    description:
      "Avant première mise en service, l'installation frigorifique fait l'objet d'un contrôle d'étanchéité du circuit de fluide frigorigène, réalisé par un opérateur titulaire de l'attestation de capacité. Le résultat est remis au détenteur de l'équipement.",
    referencesLegales: [REF_ENVIRONNEMENT_MISE_EN_SERVICE, REF_REGLEMENT_ART_5],
    periodicite: "mise_en_service_uniquement",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE],
    notesInternes:
      "Aucune des valeurs de `Realisateur` ne dit « opérateur titulaire de l'attestation de capacité prévue à R. 543-99 » : `personne_qualifiee` est la plus proche, la description porte l'exigence de certification. À revoir si l'enum s'enrichit.\n\nNATURE : PONCTUELLE (ADR-026). R. 543-79 alinéa 1 ne vise que la première mise en service ; l'alinéa 2 porte séparément le renouvellement périodique et le contrôle après modification, chacun sur sa propre ligne.",
  },
  {
    id: "froid-controle-etancheite-annuel",
    domaine: "froid",
    libelle: "Contrôle d'étanchéité annuel (installation frigorifique)",
    description:
      "L'installation frigorifique fait l'objet d'un contrôle d'étanchéité au moins tous les douze mois. Le contrôle porte sur l'ensemble du circuit de fluide frigorigène et sur les organes susceptibles de fuir (raccords, vannes, joints, échangeurs).",
    referencesLegales: [REF_REGLEMENT_ART_5, REF_ENVIRONNEMENT_RENOUVELLEMENT],
    periodicite: PERIODICITES_ARTICLE_5.sous50,
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE, SOUS_500, SOUS_50, SANS_DETECTION],
    notesInternes:
      "Obligation par défaut du domaine : c'est elle qui s'applique quand aucune des quatre questions n'a reçu de réponse, ce qui sera le cas le plus fréquent. Ses quatre conditions sont toutes de la forme `infirmee`, donc toutes satisfaites au silence. Palier « moins de 50 t CO2e (ou moins de 10 kg pour un fluide de l'annexe II section 1), sans système de détection des fuites » de l'article 5.",
  },
  {
    id: "froid-controle-etancheite-biennal-detection",
    domaine: "froid",
    libelle:
      "Contrôle d'étanchéité tous les deux ans (détection de fuites installée)",
    description:
      "Lorsque l'installation est équipée d'un système fixe de détection des fuites, l'intervalle entre deux contrôles d'étanchéité est porté à vingt-quatre mois.",
    referencesLegales: [REF_REGLEMENT_ART_5, REF_ENVIRONNEMENT_RENOUVELLEMENT],
    periodicite: PERIODICITES_ARTICLE_5.sous50Detection,
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE, SOUS_500, SOUS_50, AVEC_DETECTION],
    notesInternes:
      "Condition stricte (`booleenne`) assumée sur une criticité 4 : l'obligation est neuve, aucun équipement en base ne peut la perdre, et `froid-controle-etancheite-annuel` couvre l'installation tant que la question de la détection n'a pas reçu « oui ». Allonger l'intervalle sur une réponse explicite est le sens même de l'article 5.",
  },
  {
    id: "froid-controle-etancheite-semestriel-50t",
    domaine: "froid",
    libelle:
      "Contrôle d'étanchéité semestriel (charge supérieure à 50 t CO2e)",
    description:
      "Au-delà de cinquante tonnes équivalent CO2 de fluide frigorigène — ou de dix kilogrammes pour un fluide insaturé de l'annexe II section 1 — le contrôle d'étanchéité a lieu au moins tous les six mois.",
    referencesLegales: [REF_REGLEMENT_ART_5, REF_ENVIRONNEMENT_RENOUVELLEMENT],
    periodicite: PERIODICITES_ARTICLE_5.sup50,
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE, SOUS_500, AU_DESSUS_50, SANS_DETECTION],
    notesInternes:
      "Condition stricte (`booleenne`) assumée : obligation neuve, et la couverture par défaut reste assurée par `froid-controle-etancheite-annuel` tant que le palier n'a pas été confirmé. Le palier ne se déduit d'aucun autre champ — il est déclaré par le dirigeant, qui le lit sur le rapport de son frigoriste.",
  },
  {
    id: "froid-controle-etancheite-annuel-50t-detection",
    domaine: "froid",
    libelle:
      "Contrôle d'étanchéité annuel (charge supérieure à 50 t CO2e, détection de fuites)",
    description:
      "Au-delà de cinquante tonnes équivalent CO2, la présence d'un système fixe de détection des fuites porte l'intervalle entre deux contrôles d'étanchéité de six à douze mois.",
    referencesLegales: [REF_REGLEMENT_ART_5, REF_ENVIRONNEMENT_RENOUVELLEMENT],
    periodicite: PERIODICITES_ARTICLE_5.sup50Detection,
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE, SOUS_500, AU_DESSUS_50, AVEC_DETECTION],
    notesInternes:
      "Même périodicité que `froid-controle-etancheite-annuel`, pour une raison différente : ici le palier de charge est franchi mais la détection de fuites double l'intervalle. Les deux obligations s'excluent par leurs conditions ; en garder deux plutôt qu'une seule permet au registre de dire pourquoi l'échéance tombe à douze mois. Condition stricte assumée, cf. les obligations voisines.",
  },
  {
    id: "froid-controle-etancheite-trimestriel-500t",
    domaine: "froid",
    libelle:
      "Contrôle d'étanchéité trimestriel (charge supérieure à 500 t CO2e)",
    description:
      "Au-delà de cinq cents tonnes équivalent CO2 de fluide frigorigène — ou de cent kilogrammes pour un fluide insaturé de l'annexe II section 1 — le contrôle d'étanchéité a lieu au moins tous les trois mois.",
    referencesLegales: [REF_REGLEMENT_ART_5, REF_ENVIRONNEMENT_RENOUVELLEMENT],
    periodicite: PERIODICITES_ARTICLE_5.sup500,
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE, AU_DESSUS_500, SANS_DETECTION],
    notesInternes:
      "Palier rare dans le périmètre TPE/PME — quelques centaines de kilogrammes de fluide — mais modélisé pour ne pas laisser une installation de ce type sur une périodicité fausse. Pas de condition sur `estChargeSuperieure50TCo2` : franchir 500 emporte 50, et les obligations des paliers inférieurs sont déjà écartées par leur condition `infirmee` sur `estChargeSuperieure500TCo2`.",
  },
  {
    id: "froid-controle-etancheite-semestriel-500t-detection",
    domaine: "froid",
    libelle:
      "Contrôle d'étanchéité semestriel (charge supérieure à 500 t CO2e, détection de fuites)",
    description:
      "Au-delà de cinq cents tonnes équivalent CO2, la présence d'un système fixe de détection des fuites porte l'intervalle entre deux contrôles d'étanchéité de trois à six mois.",
    referencesLegales: [REF_REGLEMENT_ART_5, REF_ENVIRONNEMENT_RENOUVELLEMENT],
    periodicite: PERIODICITES_ARTICLE_5.sup500Detection,
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE, AU_DESSUS_500, AVEC_DETECTION],
    notesInternes:
      "Même périodicité que `froid-controle-etancheite-semestriel-50t`, palier et motif différents. Condition stricte assumée, cf. les obligations voisines.",
  },
  {
    id: "froid-controle-etancheite-apres-modification",
    domaine: "froid",
    libelle: "Contrôle d'étanchéité après modification du circuit frigorifique",
    description:
      "Toute modification affectant le circuit frigorifique impose un nouveau contrôle d'étanchéité, indépendamment du calendrier périodique. Après réparation d'une fuite, le contrôle est refait sur l'installation remise en fonctionnement. Quand une fuite est constatée, l'opérateur en remet le constat au détenteur, « lequel prend toutes mesures pour remédier à la fuite qui a été constatée » (C. env., R. 543-79).",
    referencesLegales: [REF_ENVIRONNEMENT_RENOUVELLEMENT, REF_REGLEMENT_ART_5],
    periodicite: "autre",
    nature: "evenementielle",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true },
    categoriesEquipement: [CATEGORIE],
    conditions: [AU_DESSUS_DU_SEUIL, HORS_DISPENSE],
    notesInternes:
      "Obligation permanente, sans échéance à poser : elle se déclenche sur un événement — une modification du circuit, une réparation de fuite — que l'outil n'observe pas. `mise_en_service_uniquement` avait d'abord été retenu par analogie avec `levage-remise-en-service-apres-reparation`, et c'était une erreur : le générateur en tire une occurrence `a_planifier` marquée urgente dès qu'aucune vérification n'est connue. Toute chambre froide neuve — l'équipement que le pré-remplissage suggère désormais à tout commerce alimentaire et à toute restauration — héritait donc d'une ligne « contrôle après modification » urgente alors que rien n'avait été modifié. Annoncer un retard sur un événement qui n'a pas eu lieu, c'est le défaut que le reste de ce référentiel s'emploie à éliminer. En `autre`, l'obligation reste posée par le référentiel : le guide « Comprendre » la cite parmi les obligations applicables chez vous, et l'équipement porte la pastille « Obligation sans rythme écrit » (`aucune_echeance_datable`). Elle n'apparaît en revanche ni au registre de sécurité ni au dossier de conformité, qui ne lisent que des `Verification` — c'est le prix d'une obligation sans date, et il vaut mieux que d'annoncer un retard sur un événement qui n'a pas eu lieu. Les délais du contrôle après réparation (au plus tôt vingt-quatre heures de fonctionnement, au plus tard un mois) ne sont de toute façon pas modélisables : le modèle n'a pas de forme pour un délai borné des deux côtés.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). La note ci-dessus le disait déjà en toutes lettres — « elle se déclenche sur un événement […] que l'outil n'observe pas » — sans qu'aucun champ ne le porte. C'est désormais le cas. Deuxième des trois cas d'école de l'audit du 2026-08-31.",
  },
];
