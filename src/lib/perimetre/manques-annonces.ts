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
import { nonPorte } from "./non-couverture";

/** Les faits du dossier qui décident de ce qui peut le concerner. */
export type FaitsManquesAnnonces = {
  /** `Etablissement.estEtablissementTravail` : des travailleurs y sont employés. */
  travail: boolean;
  /** `Etablissement.epiPresents` : `null` = pas de réponse, jamais « non ». */
  epiPresents: boolean | null;
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
  | "travail_epi";

function concerne(c: Condition, f: FaitsManquesAnnonces): boolean {
  switch (c) {
    case "tous":
      return true;
    case "travail":
      return f.travail;
    case "travail_epi":
      return f.travail && f.epiPresents !== false;
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
  | "boissons";

type Domaine = {
  titre: string;
  /** Ce que l'outil ne suit pas, pour tout le domaine. Absent si les articles le disent un à un. */
  phrase?: string;
};

/** Dans l'ordre d'affichage : celui de l'évaluation du 2026-09-27. */
const DOMAINES: Record<CleDomaine, Domaine> = {
  matieres_inflammables: {
    titre: "Matières explosives et inflammables",
    phrase: `Rojer ne suit pas ${nonPorte("l'aménagement des locaux où des matières explosives, comburantes ou inflammables sont entreposées ou manipulées")} : sources d'ignition, ventilation, interdiction de fumer aux emplacements à l'air libre, distance des postes aux issues, sens d'ouverture des portes, dépôts dans les escaliers, passages et couloirs.`,
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
 * Les vingt-cinq articles annoncés, par référence.
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
