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

import { ADRESSE_MANQUES_ANNONCES } from "@/lib/referentiels/corpus/adresses";
import type { Corpus } from "@/lib/referentiels/corpus/types";
import { nonPorte, porte } from "./non-couverture";
import type { CategorieErp } from "@/lib/referentiels/types-communs";

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
  /** Un employeur qui n'a pas répondu « non » aux équipements de protection. */
  | "travail_epi"
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
    case "travail_epi":
      return f.travail && f.epiPresents !== false;
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
  | "travail_en_hauteur"
  | "eau"
  | "plan_prevention"
  | "vigilance"
  | "document_unique"
  | "bruit"
  | "formation"
  | "boissons"
  | "risque_chimique"
  | "gaz"
  | "escaliers_mecaniques"
  | "habitation"
  | "electricite";

type Domaine = {
  titre: string;
  /** Ce que l'outil ne suit pas, pour tout le domaine. Absent si les articles le disent un à un. */
  phrase?: string;
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
    phrase: `Rojer ne suit pas ${nonPorte("l'aménagement des locaux où des matières explosives, comburantes ou inflammables sont entreposées ou manipulées")} : sources d'ignition, ventilation, interdiction de fumer aux emplacements à l'air libre, distance des postes aux issues, sens d'ouverture des portes, dépôts dans les escaliers, passages et couloirs. Il ne suit pas non plus ${nonPorte("les atmosphères explosives dues aux poussières ou matières combustibles en nuage")} (silos, broyage, meunerie, ponçage du bois), que l'article R. 4227-22 vise parmi les « matières dans un état physique susceptible d'engendrer des risques d'explosion », ni ${nonPorte("la prévention des explosions des articles R. 4227-42 à R. 4227-54")}.`,
  },
  travail_en_hauteur: {
    titre: "Travail en hauteur",
    phrase: `Rojer ne suit pas ${nonPorte("l'usage des échelles, escabeaux et marchepieds comme poste de travail")}. Le texte l'interdit, sauf impossibilité technique de recourir à une protection collective, ou risque évalué comme faible pour des travaux de courte durée sans caractère répétitif.`,
  },
  eau: {
    titre: "Réseaux intérieurs d'eau",
    phrase: `Rojer ne suit pas ${nonPorte("la protection des réseaux intérieurs d'eau contre les retours d'eau")}, ni ${nonPorte("l'entretien des réservoirs et bâches de stockage d'eau")}. L'arrêté du 10 septembre 2021 vise les réseaux mis en place ou rénovés totalement à partir du 1er janvier 2023, et en charge le propriétaire des réseaux intérieurs de distribution, que Rojer ne sait pas identifier.`,
  },
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
  gaz: {
    titre: "Installations de gaz",
  },
  habitation: {
    titre: "Immeuble d'habitation",
  },
  electricite: {
    titre: "Électricité",
  },
  escaliers_mecaniques: {
    titre: "Escaliers mécaniques et trottoirs roulants",
    phrase: `Rojer ne suit pas ${nonPorte("la vérification annuelle des escaliers mécaniques et des trottoirs roulants")} par une personne ou un organisme agréé, ni ${nonPorte("l'examen des chaînes et crémaillères au milieu de l'année")}, ni ${nonPorte("la vérification de l'escalier mécanique avant sa remise en service après une transformation importante")}.`,
  },
};

type Annonce = {
  domaine: CleDomaine;
  condition: Condition;
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
 *
 * LA CLÉ EST LA RÉFÉRENCE DU CORPUS, ET RIEN N'EST RECOPIÉ D'AUTRE : ni
 * intitulé, ni texte. `manques-annonces.test.ts` tient l'égalité entre ces
 * clés et les articles dont le `declareA` est `ADRESSE_MANQUES_ANNONCES` —
 * dans les deux sens. Une entrée ici sans l'adresse là-bas, ou l'inverse, fait
 * tomber le test.
 */
export const ANNONCES: Readonly<Record<string, Annonce>> = {
  "R. 4227-22": { domaine: "matieres_inflammables", condition: "travail" },
  "R. 4227-23": { domaine: "matieres_inflammables", condition: "travail" },
  "R. 4227-24": { domaine: "matieres_inflammables", condition: "travail" },
  "R. 4227-25": { domaine: "matieres_inflammables", condition: "travail" },
  "R. 4323-63": { domaine: "travail_en_hauteur", condition: "travail" },
  "R. 1321-60": { domaine: "eau", condition: "tous" },
  "Arrêté 10-09-2021 art. 4": { domaine: "eau", condition: "tous" },
  "Arrêté 10-09-2021 art. 8": { domaine: "eau", condition: "tous" },
  "Arrêté 10-09-2021 art. 9": { domaine: "eau", condition: "tous" },
  "Arrêté 10-09-2021 art. 10": { domaine: "eau", condition: "tous" },
  "Arrêté 10-09-2021 art. 12": { domaine: "eau", condition: "tous" },
  "R. 4463-8": {
    domaine: "plan_prevention",
    condition: "travail",
    intitule: "Prise en compte, dans le plan de prévention, des risques liés aux épisodes de chaleur intense",
  },
  "R. 4512-1": { domaine: "plan_prevention", condition: "travail" },
  "R. 4512-9": { domaine: "plan_prevention", condition: "travail" },
  "R. 4512-11": { domaine: "plan_prevention", condition: "travail" },
  "L. 8222-1": { domaine: "vigilance", condition: "tous" },
  "L. 8222-5": { domaine: "vigilance", condition: "tous" },
  "D. 8222-5": { domaine: "vigilance", condition: "tous" },
  "D. 8222-7": {
    domaine: "vigilance",
    condition: "tous",
    phrase: `Rojer ne distingue pas ${nonPorte("le cocontractant établi ou domicilié à l'étranger")} : les pièces à se faire remettre sont alors celles de l'article D. 8222-7.`,
  },
  "L. 4121-3": {
    domaine: "document_unique",
    condition: "travail",
    intitule: "Évaluation des risques : prise en compte de l'impact différencié de l'exposition selon le sexe",
  },
  "R. 4121-1-1": { domaine: "document_unique", condition: "travail" },
  "R. 4433-2": { domaine: "bruit", condition: "travail" },
  "L. 4141-5": {
    domaine: "formation",
    condition: "travail",
    phrase: `Rojer ne renseigne pas ${nonPorte("le passeport de prévention")} : le texte en confie le renseignement à l'employeur, sur un service national que Rojer ne rejoint pas.`,
  },
  "R. 4323-106": {
    domaine: "formation",
    condition: "travail_epi",
    phrase: `Rojer ne suit pas ${nonPorte("la formation au port des équipements de protection individuelle")} : le texte la renouvelle aussi souvent que nécessaire, sans fixer de durée.`,
  },
  "R. 4225-3": { domaine: "boissons", condition: "travail" },
  // 2026-10-07 : l'obligation qui le citait pour les seuls équipements sous
  // pression est retirée (relecture préventeur du 30/09, décision de la
  // propriétaire du 07/10). L'article vise tout employeur.
  // 2026-10-12 : rubrique « Risque chimique » (décision du 2026-10-08). Les
  // deux articles visent l'employeur dont les travailleurs sont exposés à des
  // agents chimiques dangereux : la condition est celle du Code du travail.
  "R. 4412-11": { domaine: "risque_chimique", condition: "travail" },
  "R. 4412-17": { domaine: "risque_chimique", condition: "travail" },
  "R. 4323-1": {
    domaine: "formation",
    condition: "travail",
    phrase: `Rojer ne suit pas ${nonPorte("l'information des travailleurs chargés de l'utilisation ou de la maintenance des équipements de travail")} : conditions d'utilisation, consignes de la notice du fabricant, conduite à tenir face aux situations anormales prévisibles.`,
  },
  // 2026-10-13 : décision de la propriétaire (grille C45 sur les quinze
  // manques entrés dans la cible le 2026-10-12).
  "GZ 13": {
    domaine: "gaz",
    condition: "erp_1_4",
    phrase: `Rojer ne suit pas ${nonPorte("la vérification d'une installation de gaz neuve ou modifiée avant sa mise en service")}, par une personne ou un organisme agréé, avant toute utilisation du gaz.`,
  },
  "GZ 14": {
    domaine: "gaz",
    condition: "erp_1_4",
    phrase: `Rojer ne suit pas ${nonPorte("l'entretien des installations et appareils à gaz et de leurs conduits d'évacuation")}, ni ${nonPorte("l'accès et la signalisation de l'organe de coupure de branchement du gaz")}. Il suit ${porte("la vérification annuelle des installations de gaz")} lorsqu'un appareil de cuisson est déclaré au parc.`,
  },
  "Arrêté 23-02-2018 art. 26 § 3": {
    domaine: "gaz",
    condition: "habitation",
    phrase: `Rojer ne suit pas ${nonPorte("l'entretien des installations collectives de gaz situées entre l'organe de coupure générale et les compteurs individuels")}, que le texte fait faire au moins tous les dix ans dans les bâtiments collectifs.`,
  },
  "AS 10": { domaine: "escaliers_mecaniques", condition: "erp_1_4" },
  // 2026-10-13, après revue : classés hors cadre puis annoncés, décision de
  // la propriétaire.
  "Arrêté 1986-01-31 art. 78-1": {
    domaine: "habitation",
    condition: "habitation",
    phrase: `Rojer ne suit pas ${nonPorte("le contrôle visuel des boxes de stockage d'un parc de stationnement couvert annexe")}, que le gestionnaire du parc fait au moins une fois par an et à chaque changement d'utilisateur.`,
  },
  "Arrêté 1986-01-31 art. 102": {
    domaine: "habitation",
    condition: "habitation",
    phrase: `Rojer ne suit pas ${nonPorte("la vérification que les transformations de l'immeuble ne diminuent pas la réaction et la résistance au feu")}, à la charge du propriétaire, ni ${nonPorte("l'identification des places de stationnement utilisées par des personnes non résidentes")} pour une durée inférieure à trente jours consécutifs.`,
  },
  // 2026-10-13 : « hors cadre et on l'annonce », décision de la propriétaire.
  "R. 4544-11": {
    domaine: "electricite",
    condition: "travail_electricite",
    phrase: `Rojer ne suit pas ${nonPorte("l'habilitation spécifique aux travaux sous tension")}, délivrée par l'employeur après un document d'un organisme de formation agréé, et dont la validité est subordonnée à une attestation médicale propre à ces travaux.`,
  },
};

export type ArticleAnnonce = {
  ref: string;
  intitule?: string;
  url?: string;
  /** Le texte d'où vient l'article, pour le situer. */
  corpus: string;
  phrase?: string;
};

export type DomaineAnnonce = {
  cle: CleDomaine;
  titre: string;
  phrase?: string;
  articles: ArticleAnnonce[];
};

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
        articles,
      },
    ];
  });
}
