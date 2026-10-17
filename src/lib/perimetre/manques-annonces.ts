// Ce que l'outil ne suit pas, et qui peut concerner ce dossier (C45).
//
// DÉCISION DE LA PROPRIÉTAIRE DU 2026-09-27. L'évaluation des quarante-deux
// obligations manquantes qui touchent la cible en recommandait vingt-trois à
// ANNONCER ; s'y ajoutent `L. 8222-5`, dont l'encodage attend la décision B1,
// et `R. 4323-63` (l'escabeau), que l'évaluation a trouvé annoncé nulle part.
// Vingt-cinq articles, tous `non_couvert` au corpus, tous avec la même adresse
// (`ADRESSE_MANQUES_ANNONCES`) — et cette adresse, c'est ce module.
//
// POURQUOI CE N'EST PAS LE RETOUR DE `famille_obligation`. L'axe retiré le
// 2026-08-28 nommait À CHAQUE DIRIGEANT les vingt-sept articles d'alors —
// hôtels, établissements de soins, équipements sportifs —, la même liste pour
// tout le monde. Ce module ne projette que des articles qui visent la cible
// (restaurant, commerce, bureau), et chacun ne s'affiche qu'au dossier qu'il
// PEUT concerner : un bureau qui a répondu « non » aux équipements de
// protection individuelle ne lit pas la formation au port. ~~Un dossier sans
// prestataire ne lit pas le cocontractant étranger.~~ [Contre-lecture M4 :
// zéro prestataire saisi est un silence, pas un « non » ; aucun fait déclaré
// n'exclut `D. 8222-7`, il est donc annoncé à tous.] La question que l'axe
// retiré n'avait pas — « que couvre-t-on ? » — a été tranchée pour ces
// articles-ci par la décision du 2026-09-27.
//
// LE SENS DU DOUTE. Une condition ne retire un article que sur un fait
// DÉCLARÉ : « non » aux EPI, aucun salarié. ~~Aucun prestataire saisi~~ n'en
// est pas un : l'annuaire vide dit qu'on n'a rien saisi, pas qu'on ne
// contracte avec personne (M4). Le
// silence ne retire rien — l'incertitude ne réduit jamais la couverture, et
// une annonce se lit sans coût.
//
// CE QUE CE MODULE NE FAIT JAMAIS. Aucun total, aucun score, aucune
// qualification : ni « conforme » ni « non conforme ». Les phrases disent ce
// que l'OUTIL ne suit pas, jamais ce que le dirigeant aurait omis. Chaque
// sujet non porté passe par `nonPorte(…)`, que `non-couverture.test.ts`
// confronte au référentiel : le jour où l'un d'eux serait encodé, la page
// cesserait de pouvoir l'annoncer sans que personne le voie.
//
// Module pur : les faits lui sont donnés (`faits.ts` les collecte), le corpus
// est lu en données.
//
// ~~La page affiche chaque domaine, sa phrase, et chaque article avec sa
// référence, son intitulé, sa phrase et son corpus.~~ [2026-10-17, ADR-046 :
// la page n'affiche plus que `phrasePage`, une phrase par domaine faite des
// `sujet` des articles. Références, intitulés, phrases détaillées et corpus
// vont à l'annexe du PDF du référentiel complet (`toutesLesAnnonces`,
// `detail-hors-page.ts`).]

import { ADRESSE_MANQUES_ANNONCES } from "@/lib/referentiels/corpus/adresses";
import type { Corpus } from "@/lib/referentiels/corpus/types";
import { nonPorte } from "./non-couverture";
import { PHRASE_BOXES_DE_STOCKAGE } from "@/lib/equipements/materiels-non-couverts";
import type { CategorieErp } from "@/lib/referentiels/types-communs";

/**
 * Le titre de la section de la page qui projette ces annonces (2026-10-17,
 * ADR-046). `ADRESSE_MANQUES_ANNONCES` la nomme par ce titre : une adresse de
 * PAGE, jamais le PDF — `parite-page-pdf.test.ts` tient les deux ensemble.
 */
export const TITRE_ANNONCES =
  "Ce qui peut vous concerner, et que Rojer ne suit pas";

/** Les faits du dossier qui décident de ce qui peut le concerner. */
export type FaitsManquesAnnonces = {
  /** `Etablissement.estEtablissementTravail` : des travailleurs y sont employés. */
  travail: boolean;
  /** `Etablissement.epiPresents` : `null` = pas de réponse, jamais « non ». */
  epiPresents: boolean | null;
  /**
   * `Etablissement.categorieErp` si l'établissement reçoit du public, `null`
   * sinon (2026-10-13). La base rend impossible un ERP sans catégorie
   * (`Etablissement_erp_type_categorie_requis`).
   */
  categorieErp: CategorieErp | null;
  /** `Etablissement.estHabitation` (2026-10-13). */
  habitation: boolean;
  /** `Etablissement.operationsElectriques` (ADR-041) : `null` = pas de réponse, jamais « non » (2026-10-13). */
  operationsElectriques: boolean | null;
};

/**
 * À qui l'article peut s'adresser. Fermé : une condition neuve se justifie
 * ici, avec le fait déclaré qui la tranche.
 */
type Condition =
  /** Tout dossier : le texte vise « toute personne » ou le propriétaire des réseaux. */
  | "tous"
  /** Un employeur : le Code du travail, quatrième partie. */
  | "travail"
  // ~~`travail_epi` — un employeur qui n'a pas répondu « non » aux
  // équipements de protection~~ : 2026-10-17, sous-lot B, retirée avec son
  // seul article (`R. 4323-106`, déplacé vers l'aide des catégories d'EPI).
  /** Un ERP des quatre premières catégories : le livre II du règlement de sécurité. */
  | "erp_1_4"
  /** Un dossier qui déclare le régime d'habitation. */
  | "habitation"
  /** Un employeur qui n'a pas répondu « non » aux opérations électriques. */
  | "travail_electricite";

function concerne(c: Condition, f: FaitsManquesAnnonces): boolean {
  switch (c) {
    case "tous":
      return true;
    case "travail":
      return f.travail;
    case "erp_1_4":
      return f.categorieErp !== null && f.categorieErp !== "N5";
    case "habitation":
      return f.habitation;
    case "travail_electricite":
      return f.travail && f.operationsElectriques !== false;
  }
}

export type CleDomaine =
  | "matieres_inflammables"
  | "plan_prevention"
  | "vigilance"
  | "document_unique"
  | "bruit"
  | "formation"
  | "boissons"
  | "risque_chimique"
  | "habitation"
  | "electricite"
  | "reglement_erp_1_4";

type Domaine = {
  titre: string;
  /**
   * Ce que l'outil ne suit pas, pour tout le domaine. Absent si les articles le disent un à un.
   *
   * [2026-10-17, ADR-046 : cette phrase, références comprises, ne s'affiche
   * plus sur la page ; elle va à l'annexe du PDF du référentiel complet
   * (`detail-hors-page.ts`). La page lit `phrasePage`, faite des `sujet`.]
   */
  phrase?: string;
  /**
   * Ce que le domaine annonce EN PLUS de ses articles, en sujets `nonPorte`
   * (2026-10-17, ADR-046). Aujourd'hui : les atmosphères explosives, que la
   * rubrique des matières annonce sans article propre au corpus (décision du
   * 2026-10-14).
   */
  sujets?: readonly string[];
};

/** Dans l'ordre d'affichage : celui de l'évaluation du 2026-09-27. */
const DOMAINES: Record<CleDomaine, Domaine> = {
  // 2026-10-14, décision de la propriétaire : les poussières en nuage ne sont
  // pas dans la question des matières (`etablissements/questions.ts`), elles
  // s'annoncent ici. Section 6 « Prévention des explosions » (R. 4227-42 à
  // R. 4227-54) lue sur Légifrance le 2026-10-14 : R. 4227-43 définit
  // l'atmosphère explosive par « gaz, vapeurs, brouillards ou poussières ».
  matieres_inflammables: {
    titre: "Matières explosives et inflammables",
    phrase: `Rojer ne suit pas ${nonPorte("l'aménagement des locaux où des matières explosives, comburantes ou inflammables sont entreposées ou manipulées")} : sources d'ignition, ventilation, interdiction de fumer aux emplacements à l'air libre, distance des postes aux issues, sens d'ouverture des portes, dépôts dans les escaliers, passages et couloirs. Il ne suit pas non plus ${nonPorte("la prévention des explosions des articles R. 4227-42 à R. 4227-54")} : les atmosphères explosives, qu'elles viennent de gaz, de vapeurs, de brouillards ou de poussières en suspension dans l'air — silos, broyage, meunerie, ponçage du bois, par exemple.`,
    sujets: [
      nonPorte("la prévention des atmosphères explosives, qu'elles viennent de gaz, de vapeurs ou de poussières en suspension dans l'air — silos, meunerie, ponçage du bois"),
    ],
  },
  // ~~travail_en_hauteur (« Travail en hauteur », l'échelle de R. 4323-63)~~
  // et ~~eau (« Réseaux intérieurs d'eau », R. 1321-60 et l'arrêté du
  // 10 septembre 2021)~~ — 2026-10-14, décision de la propriétaire :
  // DÉPLACÉES, phrase comprise, dans la liste des matériels non couverts
  // (`equipements/materiels-non-couverts.ts`, entrées `echelle` et
  // `reservoir_eau`), nouvelle adresse au corpus
  // (`ADRESSE_MATERIELS_NON_COUVERTS`). La rubrique « Travail en hauteur » ne
  // portait que l'échelle : elle disparaît avec elle.
  plan_prevention: {
    titre: "Plan de prévention",
    phrase: `Le plan tenu dans Rojer ne rattache qu'une entreprise extérieure et ne suit pas ${nonPorte("les nouveaux sous-traitants recrutés après le début de l'intervention")} ; il ne porte ni ${nonPorte("la liste des postes relevant du suivi individuel renforcé")}, ni ${nonPorte("le dossier technique amiante joint au plan")}, et ne demande pas si les risques liés aux épisodes de chaleur intense ont été pris en compte. Ces articles sont cités sur la fiche de chaque plan.`,
  },
  vigilance: {
    titre: "Vigilance à l'égard des cocontractants",
    phrase: `Rojer tient les dates des attestations que vous saisissez. Il ne vérifie pas ${nonPorte("l'authenticité de l'attestation de vigilance")}, ne connaît ni le montant ni la date de conclusion de vos contrats, et ne suit pas ${nonPorte("l'injonction due après un signalement écrit de situation irrégulière")}.`,
  },
  document_unique: {
    titre: "Document unique",
    phrase: `Le questionnaire du document unique de Rojer ne porte pas ${nonPorte("la prise en compte de l'impact différencié de l'exposition au risque en fonction du sexe")}, et le document imprimé ne comprend pas ${nonPorte("l'annexe des données collectives d'exposition aux facteurs de risques professionnels")}.`,
  },
  bruit: {
    titre: "Bruit",
    phrase: `Rojer ne suit pas ${nonPorte("le mesurage du bruit et son renouvellement")} : quand il y a eu mesurage, le texte le renouvelle au moins tous les cinq ans.`,
  },
  formation: {
    titre: "Formation",
  },
  boissons: {
    titre: "Boissons",
    phrase: `Rojer ne suit pas ${nonPorte("la mise à disposition gratuite d'une boisson non alcoolisée")} lorsque des conditions particulières de travail conduisent à se désaltérer fréquemment, ni la liste des postes de travail concernés.`,
  },
  // 2026-10-12 (`lot/suites-0810`) — décision de la propriétaire du
  // 2026-10-08 (« ok pour tes recos », point 13 : « une rubrique « Risque
  // chimique » »), après le retrait des lignes de rétention et d'état du
  // stockage (relecture du préventeur du 30/09 : « à exclure sauf 3 derniers
  // points »). Entrée après l'évaluation du 2026-09-27, donc en dernier. Les
  // deux sujets sont les objets des deux articles, tels que le corpus les
  // relève (`prescrit`, `citationCle`) — rien de plus.
  risque_chimique: {
    titre: "Risque chimique",
    phrase: `Rojer ne suit pas ${nonPorte("les mesures de prévention du risque d'exposition aux agents chimiques dangereux")} que l'employeur définit et applique, ni ${nonPorte("les mesures contre le débordement, les éclaboussures et le déversement par rupture des parois des récipients de produits chimiques")}.`,
  },
  // 2026-10-13 : décision de la propriétaire sur les quinze manques entrés
  // dans la cible le 2026-10-12. Les articles disent chacun ce qu'ils ne
  // suivent pas : ils ne visent pas les mêmes dossiers.
  // ~~gaz: { titre: "Installations de gaz" }~~ — 2026-10-14 : rubrique
  // déplacée dans l'aide de la catégorie « Installation de gaz ».
  habitation: {
    titre: "Immeuble d'habitation",
  },
  electricite: {
    titre: "Électricité",
  },
  // 2026-10-17, sous-lot C du plan « mise à jour du référentiel » (découpage
  // validé par c6) : les actes du livre II, titre Ier, annoncés plutôt
  // qu'encodés — règle de niche (notes-cadre, ligne de partage 5), ou un
  // tiers, ou un événement que le produit n'observe pas. Chaque article dit
  // ce qu'il ne suit pas : ils ne visent pas les mêmes établissements.
  reglement_erp_1_4: {
    titre: "Règlement de sécurité, catégories 1 à 4",
  },
  // ~~escaliers_mecaniques (« Escaliers mécaniques et trottoirs roulants »,
  // AS 10)~~ — 2026-10-14, décision de la propriétaire : DÉPLACÉE dans la
  // liste des matériels non couverts, entrée `escalier_mecanique`.
};

type Annonce = {
  domaine: CleDomaine;
  condition: Condition;
  /**
   * Ce que Rojer ne suit pas, en quelques mots, sans référence (2026-10-17,
   * ADR-046) : la page compose la phrase du domaine de ces sujets, et rien
   * d'autre. Obligatoire, et toujours écrit par `nonPorte(…)` — le balayage
   * `non-couverture.test.ts` le confronte au référentiel.
   */
  sujet: string;
  /**
   * L'intitulé à lire sous « ce que l'outil ne suit pas », quand celui du
   * corpus nomme l'article entier et non la part que Rojer ne suit pas
   * (contre-lecture F2). Absent : l'intitulé du corpus.
   */
  intitule?: string;
  /** Ce que l'outil ne suit pas, propre à l'article, quand le domaine ne le dit pas. */
  phrase?: string;
};

/**
 * Les articles annoncés, par référence (vingt-cinq au 2026-09-27, vingt-huit
 * au 2026-10-12 : `R. 4323-1` le 2026-10-07, `R. 4412-11` et `R. 4412-17`).
 * 2026-10-13 : + 4, `GZ 13`, `GZ 14`, `AS 10`, arrêté du 23 février 2018
 * art. 26 § 3 ; puis + 2 après revue, arrêté du 31 janvier 1986 art. 78-1 et
 * 102 ; puis + 1, `R. 4544-11`. Trente-cinq à la réunion avec `main` —
 * compté en appelant (`Object.keys(ANNONCES).length`), jamais au grep. [La
 * branche disait « trente-trois » : elle ne voyait pas les deux du risque
 * chimique, entrés sur `main` par `lot/suites-0810`.]
 * [2026-10-14, décision de la propriétaire : 35 − 3 (gaz : `GZ 13`, `GZ 14`,
 * 26 § 3, vers l'aide de la catégorie « Installation de gaz ») − 1 (`AS 10`)
 * − 6 (eau : `R. 1321-60`, arrêté du 10 septembre 2021 art. 4, 8, 9, 10, 12)
 * − 1 (`R. 4323-63`, l'échelle), ces huit-là vers la liste des matériels non
 * couverts + 0 = 24 — compté en appelant dans `manques-annonces.test.ts`.]
 *
 * LA CLÉ EST LA RÉFÉRENCE DU CORPUS, ET RIEN N'EST RECOPIÉ D'AUTRE : ni
 * intitulé, ni texte. `manques-annonces.test.ts` tient l'égalité entre ces
 * clés et les articles dont le `declareA` est `ADRESSE_MANQUES_ANNONCES` —
 * dans les deux sens. Une entrée ici sans l'adresse là-bas, ou l'inverse, fait
 * tomber le test.
 */
export const ANNONCES: Readonly<Record<string, Annonce>> = {
  "R. 4227-22": { domaine: "matieres_inflammables", condition: "travail", sujet: nonPorte("l'absence de source d'ignition et la ventilation des locaux où des matières explosives ou inflammables sont entreposées ou manipulées") },
  "R. 4227-23": { domaine: "matieres_inflammables", condition: "travail", sujet: nonPorte("l'interdiction de fumer aux emplacements à l'air libre où ces matières se trouvent") },
  "R. 4227-24": { domaine: "matieres_inflammables", condition: "travail", sujet: nonPorte("la distance des postes de travail aux issues et le sens d'ouverture des portes de ces locaux") },
  "R. 4227-25": { domaine: "matieres_inflammables", condition: "travail", sujet: nonPorte("l'interdiction de déposer ces matières dans les escaliers, passages et couloirs") },
  // ~~« R. 4323-63 » (travail_en_hauteur), « R. 1321-60 » et « Arrêté
  // 10-09-2021 art. 4, 8, 9, 10, 12 » (eau)~~ — 2026-10-14 : déplacés dans la
  // liste des matériels non couverts (entrées `echelle`, `reservoir_eau`).
  "R. 4463-8": {
    domaine: "plan_prevention",
    condition: "travail",
    sujet: nonPorte("la prise en compte des épisodes de chaleur intense dans le plan de prévention"),
    intitule: "Prise en compte, dans le plan de prévention, des risques liés aux épisodes de chaleur intense",
  },
  "R. 4512-1": { domaine: "plan_prevention", condition: "travail", sujet: nonPorte("les nouveaux sous-traitants recrutés après le début de l'intervention") },
  "R. 4512-9": { domaine: "plan_prevention", condition: "travail", sujet: nonPorte("la liste des postes relevant du suivi individuel renforcé") },
  "R. 4512-11": { domaine: "plan_prevention", condition: "travail", sujet: nonPorte("le dossier technique amiante joint au plan") },
  "L. 8222-1": { domaine: "vigilance", condition: "tous", sujet: nonPorte("le montant et la date de conclusion de vos contrats") },
  "L. 8222-5": { domaine: "vigilance", condition: "tous", sujet: nonPorte("l'injonction due après un signalement écrit de situation irrégulière") },
  "D. 8222-5": { domaine: "vigilance", condition: "tous", sujet: nonPorte("la vérification de l'authenticité de l'attestation de vigilance") },
  "D. 8222-7": {
    domaine: "vigilance",
    condition: "tous",
    sujet: nonPorte("les pièces à se faire remettre d'un cocontractant établi à l'étranger"),
    phrase: `Rojer ne distingue pas ${nonPorte("le cocontractant établi ou domicilié à l'étranger")} : les pièces à se faire remettre sont alors celles de l'article D. 8222-7.`,
  },
  "L. 4121-3": {
    domaine: "document_unique",
    condition: "travail",
    sujet: nonPorte("la prise en compte de l'impact différencié de l'exposition au risque en fonction du sexe"),
    intitule: "Évaluation des risques : prise en compte de l'impact différencié de l'exposition selon le sexe",
  },
  "R. 4121-1-1": { domaine: "document_unique", condition: "travail", sujet: nonPorte("l'annexe des données collectives d'exposition aux facteurs de risques professionnels") },
  "R. 4433-2": { domaine: "bruit", condition: "travail", sujet: nonPorte("le mesurage du bruit et son renouvellement") },
  "L. 4141-5": {
    domaine: "formation",
    condition: "travail",
    sujet: nonPorte("le passeport de prévention"),
    phrase: `Rojer ne renseigne pas ${nonPorte("le passeport de prévention")} : le texte en confie le renseignement à l'employeur, sur un service national que Rojer ne rejoint pas.`,
  },
  // ~~"R. 4323-106" (domaine « formation », condition `travail_epi`)~~ —
  // 2026-10-17, sous-lot B, décision de c6 : DÉPLACÉ vers l'aide des quatre
  // catégories d'EPI (`equipements/labels.ts`, `PHRASE_FORMATION_EPI`).
  "R. 4225-3": { domaine: "boissons", condition: "travail", sujet: nonPorte("la mise à disposition gratuite d'une boisson non alcoolisée quand les conditions de travail conduisent à se désaltérer fréquemment") },
  // 2026-10-07 : l'obligation qui le citait pour les seuls équipements sous
  // pression est retirée (relecture préventeur du 30/09, décision de la
  // propriétaire du 07/10). L'article vise tout employeur.
  // 2026-10-12 : rubrique « Risque chimique » (décision du 2026-10-08). Les
  // deux articles visent l'employeur dont les travailleurs sont exposés à des
  // agents chimiques dangereux : la condition est celle du Code du travail.
  "R. 4412-11": { domaine: "risque_chimique", condition: "travail", sujet: nonPorte("les mesures de prévention du risque d'exposition aux agents chimiques dangereux") },
  "R. 4412-17": { domaine: "risque_chimique", condition: "travail", sujet: nonPorte("les mesures contre le débordement, les éclaboussures et le déversement des récipients de produits chimiques") },
  "R. 4323-1": {
    domaine: "formation",
    condition: "travail",
    sujet: nonPorte("l'information des travailleurs chargés de l'utilisation ou de la maintenance des équipements de travail"),
    phrase: `Rojer ne suit pas ${nonPorte("l'information des travailleurs chargés de l'utilisation ou de la maintenance des équipements de travail")} : conditions d'utilisation, consignes de la notice du fabricant, conduite à tenir face aux situations anormales prévisibles.`,
  },
  // 2026-10-13 : décision de la propriétaire (grille C45 sur les quinze
  // manques entrés dans la cible le 2026-10-12).
  // ~~« GZ 13 », « GZ 14 », « Arrêté 23-02-2018 art. 26 § 3 » (rubrique
  // « Installations de gaz »)~~ — 2026-10-14, décision de la propriétaire :
  // DÉPLACÉS dans l'aide de la catégorie « Installation de gaz »
  // (`DESCRIPTION_CATEGORIE.INSTALLATION_GAZ`), leur nouvelle adresse au
  // corpus. La catégorie existe désormais, et GZ 15 s'y accroche.
  // ~~« AS 10 » (escaliers_mecaniques)~~ — 2026-10-14 : déplacé dans la liste
  // des matériels non couverts (entrée `escalier_mecanique`).
  // 2026-10-13, après revue : classés hors cadre puis annoncés, décision de
  // la propriétaire.
  "Arrêté 1986-01-31 art. 78-1": {
    domaine: "habitation",
    condition: "habitation",
    sujet: nonPorte("les boxes de stockage d'un parc de stationnement couvert"),
    // 2026-10-14 : la phrase est partagée avec l'entrée « box de stockage »
    // de la liste des matériels non couverts — une seule rédaction. L'article
    // garde son adresse ici : la rubrique « Immeuble d'habitation » n'est pas
    // déplacée (décision du 2026-10-14, qui nomme le gaz, les escaliers
    // mécaniques, l'eau et les échelles).
    phrase: PHRASE_BOXES_DE_STOCKAGE,
  },
  "Arrêté 1986-01-31 art. 102": {
    domaine: "habitation",
    condition: "habitation",
    sujet: nonPorte("les transformations de l'immeuble au regard du feu et les places de stationnement des non-résidents"),
    phrase: `Rojer ne suit pas ${nonPorte("la vérification que les transformations de l'immeuble ne diminuent pas la réaction et la résistance au feu")}, à la charge du propriétaire, ni ${nonPorte("l'identification des places de stationnement utilisées par des personnes non résidentes")} pour une durée inférieure à trente jours consécutifs.`,
  },
  // 2026-10-13 : « hors cadre et on l'annonce », décision de la propriétaire.
  // 2026-10-17, sous-lot C : rubrique « Règlement de sécurité, catégories 1
  // à 4 ». Le livre II ne vise que les quatre premières catégories : la
  // condition est `erp_1_4`.
  "MS 46 § 3 — convention avec un organisateur, annexée au registre": {
    domaine: "reglement_erp_1_4",
    condition: "erp_1_4",
    sujet: nonPorte("la convention qui confie le service de sécurité à l'organisateur d'une manifestation"),
    intitule: "Convention avec l'organisateur d'une manifestation",
    phrase: `Rojer ne suit pas ${nonPorte("la convention par laquelle l'exploitant confie le service de sécurité à l'organisateur d'une manifestation, ni son annexion au registre de sécurité")}. Le texte ouvre cette faculté hors 1ʳᵉ catégorie, sans hébergement, avec une alarme générale qui ne nécessite pas de surveillance humaine et jusqu'à 300 personnes.`,
  },
  "EL 23 § 2 — vérification des installations électriques semi-permanentes": {
    domaine: "reglement_erp_1_4",
    condition: "erp_1_4",
    sujet: nonPorte("la vérification des installations électriques semi-permanentes"),
    intitule: "Vérification des installations électriques semi-permanentes",
    phrase: `Rojer ne suit pas ${nonPorte("la vérification des installations électriques semi-permanentes")}, due initialement et à chaque installation : en 1ʳᵉ, 2ᵉ et 3ᵉ catégorie, initialement par une personne ou un organisme agréé, puis par un technicien compétent ; en 4ᵉ catégorie, par un technicien compétent.`,
  },
  "CO 10": {
    domaine: "reglement_erp_1_4",
    condition: "erp_1_4",
    sujet: nonPorte("la maintenance d'un franchissement vers des locaux occupés par des tiers"),
    intitule: "Maintenance d'un franchissement d'isolement avec des locaux occupés par des tiers",
    phrase: `Rojer ne suit pas ${nonPorte("la maintenance d'un dispositif de franchissement ou d'un passage")} entre l'établissement et un bâtiment ou des locaux occupés par des tiers, que le texte place sous la responsabilité de l'exploitant.`,
  },
  "CO 45 § 5 — inscription « sans issue » des portes en cul-de-sac": {
    domaine: "reglement_erp_1_4",
    condition: "erp_1_4",
    sujet: nonPorte("l'inscription « sans issue » des portes en cul-de-sac"),
    intitule: "Inscription « sans issue » des portes en cul-de-sac",
    phrase: `Rojer ne suit pas ${nonPorte("l'inscription « sans issue »")}, non lumineuse et jamais verte, sur les portes des locaux en cul-de-sac qui risquent d'être confondues avec une issue d'évacuation.`,
  },
  "CO 47 § 2 — avertissement porté par les portes coupe-feu maintenues ouvertes": {
    domaine: "reglement_erp_1_4",
    condition: "erp_1_4",
    sujet: nonPorte("la plaque des portes coupe-feu maintenues ouvertes"),
    intitule: "Plaque des portes coupe-feu maintenues ouvertes",
    phrase: `Rojer ne suit pas ${nonPorte("la plaque « Porte coupe-feu. - Ne mettez pas d'obstacle à la fermeture »")}, en lettres blanches sur fond rouge ou l'inverse, sur la face apparente des portes coupe-feu maintenues ouvertes.`,
  },
  "CO 59 — g) consignes affichées dans l'espace d'attente sécurisé": {
    domaine: "reglement_erp_1_4",
    condition: "erp_1_4",
    sujet: nonPorte("les consignes affichées dans un espace d'attente sécurisé"),
    intitule: "Consignes affichées dans un espace d'attente sécurisé",
    phrase: `Rojer ne suit pas ${nonPorte("les consignes disposées à l'intérieur d'un espace d'attente sécurisé")}, bien visibles, rédigées en français et dans les principales langues parlées par les usagers habituels des lieux.`,
  },
  "CH 52": {
    domaine: "reglement_erp_1_4",
    condition: "erp_1_4",
    sujet: nonPorte("le rappel, près d'un appareil de chauffage à combustible liquide, de l'interdiction de le remplir en marche"),
    intitule: "Interdiction de remplir en marche un appareil à combustible liquide, rappelée près de l'appareil",
    phrase: `Rojer ne suit pas ${nonPorte("le rappel, près d'un appareil de chauffage indépendant à combustible liquide, de l'interdiction de remplir son réservoir pendant qu'il fonctionne")}.`,
  },
  "R. 4544-11": {
    domaine: "electricite",
    condition: "travail_electricite",
    sujet: nonPorte("l'habilitation spécifique aux travaux sous tension"),
    phrase: `Rojer ne suit pas ${nonPorte("l'habilitation spécifique aux travaux sous tension")}, délivrée par l'employeur après un document d'un organisme de formation agréé, et dont la validité est subordonnée à une attestation médicale propre à ces travaux.`,
  },
};

/**
 * À qui l'article s'adresse, en clair — pour l'annexe du PDF du référentiel
 * complet, qui les liste tous (2026-10-17, ADR-046). La page n'en a pas
 * besoin : elle ne montre que ce qui peut concerner le dossier ouvert.
 */
export const LIBELLE_CONDITION: Record<Condition, string> = {
  tous: "Tout dossier",
  travail: "Tout employeur",
  erp_1_4: "Établissement recevant du public des catégories 1 à 4",
  habitation: "Dossier qui déclare le régime d'habitation",
  travail_electricite:
    "Employeur qui n'a pas répondu « non » aux opérations électriques",
};

export type ArticleAnnonce = {
  ref: string;
  intitule?: string;
  url?: string;
  /** Le texte d'où vient l'article, pour le situer. */
  corpus: string;
  phrase?: string;
  /** Ce que Rojer ne suit pas, sans référence (ADR-046). */
  sujet: string;
  /** À qui l'article s'adresse (`LIBELLE_CONDITION`). */
  aQui: string;
};

export type DomaineAnnonce = {
  cle: CleDomaine;
  titre: string;
  /** La phrase détaillée, références comprises : l'annexe du PDF seulement (ADR-046). */
  phrase?: string;
  /**
   * La phrase que la page affiche (ADR-046) : une seule, composée des sujets
   * des articles qui concernent ce dossier, puis de ceux du domaine. Aucune
   * référence.
   */
  phrasePage: string;
  articles: ArticleAnnonce[];
};

/**
 * Une phrase, faite des sujets : « Rojer ne suit pas A, ni B, ni C. » Les
 * doublons tombent (plusieurs articles peuvent partager un sujet).
 */
export function phraseDesSujets(sujets: readonly string[]): string {
  const uniques = [...new Set(sujets)];
  if (uniques.length === 0) return "";
  return `Rojer ne suit pas ${uniques.join(", ni ")}.`;
}

/**
 * Les domaines annoncés à ce dossier, chacun avec les articles qui peuvent le
 * concerner. Un domaine dont aucun article ne le concerne n'est pas rendu.
 *
 * Les articles viennent du corpus (`declareA === ADRESSE_MANQUES_ANNONCES`),
 * pas de la table : un article qui perdrait son adresse — couvert entre-temps,
 * ou reclassé — disparaît de la page au lieu d'y être annoncé à tort.
 */
export function manquesAnnoncesDuDossier(
  corpus: readonly Corpus[],
  faits: FaitsManquesAnnonces,
): DomaineAnnonce[] {
  const parDomaine = new Map<CleDomaine, ArticleAnnonce[]>();
  for (const c of corpus) {
    for (const a of c.articles) {
      if (a.statut !== "non_couvert" || a.declareA !== ADRESSE_MANQUES_ANNONCES) {
        continue;
      }
      const annonce = ANNONCES[a.ref];
      if (!annonce || !concerne(annonce.condition, faits)) continue;
      const liste = parDomaine.get(annonce.domaine) ?? [];
      liste.push({
        ref: a.ref,
        intitule: annonce.intitule ?? a.intitule,
        url: a.url,
        corpus: c.intitule,
        ...(annonce.phrase ? { phrase: annonce.phrase } : {}),
        sujet: annonce.sujet,
        aQui: LIBELLE_CONDITION[annonce.condition],
      });
      parDomaine.set(annonce.domaine, liste);
    }
  }
  return (Object.keys(DOMAINES) as CleDomaine[]).flatMap((cle) => {
    const articles = parDomaine.get(cle);
    if (!articles || articles.length === 0) return [];
    return [
      {
        cle,
        titre: DOMAINES[cle].titre,
        ...(DOMAINES[cle].phrase ? { phrase: DOMAINES[cle].phrase } : {}),
        phrasePage: phraseDesSujets([
          ...articles.map((a) => a.sujet),
          ...(DOMAINES[cle].sujets ?? []),
        ]),
        articles,
      },
    ];
  });
}

/**
 * TOUTES les annonces, quel que soit le dossier (2026-10-17, ADR-046) : ce
 * que l'annexe du PDF du référentiel complet imprime. Le dossier qui
 * n'écarte rien — chaque condition y est satisfaite —, pas une liste
 * recopiée : `manques-annonces.test.ts` tient que ce dossier lit toutes les
 * entrées.
 */
export function toutesLesAnnonces(corpus: readonly Corpus[]): DomaineAnnonce[] {
  return manquesAnnoncesDuDossier(corpus, DOSSIER_QUI_N_ECARTE_RIEN);
}

/** Chaque condition de `concerne` y est vraie. */
export const DOSSIER_QUI_N_ECARTE_RIEN: FaitsManquesAnnonces = {
  travail: true,
  epiPresents: null,
  categorieErp: "N1",
  habitation: true,
  operationsElectriques: null,
};
