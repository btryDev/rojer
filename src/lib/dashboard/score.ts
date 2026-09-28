/**
 * Score de conformité interne (étape 9).
 *
 * **Formule interne, pas une norme officielle.** Aucun texte réglementaire
 * n'impose de score agrégé — l'indicateur est là pour donner au dirigeant
 * un sens de "où j'en suis", pas pour certifier sa conformité.
 *
 * Principe :
 *   - dénominateur = nombre total d'engagements actifs
 *       (vérifications de la période + actions correctives ouvertes + 1 pour
 *        le DUERP s'il est ouvert)
 *   - pénalité   = nombre d'engagements en retard, pondérés par gravité
 *       - vérification en retard ................. ×3
 *       - action en retard (ouverte/en_cours) .... ×2
 *       - DUERP non à jour ....................... ×1
 *
 *   score = 100 * max(0, 1 − pénalité / (dénominateur × 3))
 *
 * Seuils d'affichage (interprétation UI, documentés ici) :
 *   - ≥ 80 : "conformité satisfaisante"
 *   - 50-79 : "à surveiller"
 *   - < 50 : "rattrapage nécessaire"
 *
 * **Ce que le score mesure, et ce qu'il ne mesure pas.** Les trois termes
 * ci-dessus se datent tous : une échéance, une action, une version de DUERP.
 * Les états permanents, eux, n'ont pas de date — ils sont en place ou ils ne
 * le sont pas, et seul le dirigeant peut le dire. Ils n'entrent donc pas dans
 * la formule ; ils empêchent seulement le score de conclure « satisfaisante »
 * tant qu'ils restent sans réponse (`qualifier`, plus bas, porte l'argument).
 *
 * Le score a longtemps ignoré leur existence, et il annonçait « 100 —
 * Situation satisfaisante » à un bureau de six personnes qui n'avait rien
 * renseigné du tout. C'est le défaut que cette version corrige.
 *
 * **Une seule porte d'entrée** : `calculerScoreDepuisEtat`. Le tableau de
 * bord et le dossier de conformité PDF affichaient des scores différents au
 * même instant parce que chacun composait son propre dénominateur (l'un
 * comptait les vérifications « à planifier », l'autre les oubliait). Les
 * deux appelants passent désormais par la même fonction, alimentée par la
 * même répartition (`repartirVerifications`) et le même état de DUERP
 * (`evaluerEtatDuerp`).
 */

import type { EtatDuerp } from "./duerp";

export type Score = {
  valeur: number; // 0..100 arrondi à l'entier
  niveau: "satisfaisante" | "a_surveiller" | "rattrapage" | "indetermine";
  libelle: string;
  /**
   * Combien d'états permanents applicables au dossier ne sont pas déclarés
   * en place.
   *
   * **Ce n'est pas un compte de manquements.** Un état non déclaré n'est pas
   * un état absent : c'est un état sur lequel l'outil n'a pas de réponse. La
   * distinction est celle que `perimetre/couverture.ts` porte déjà — une
   * indétermination énonce ce que l'outil ne sait pas dire, sans qualifier la
   * situation de l'établissement au regard du droit.
   *
   * Il est rendu à part de `valeur` pour que l'interface puisse le dire
   * quel que soit le niveau : un dossier en rattrapage a lui aussi le droit
   * de savoir ce qui reste non renseigné.
   */
  indetermines: number;
  /**
   * Combien de questions de COUVERTURE restent ouvertes
   * (`perimetre/couverture.ts`, `indeterminations`) : la donnée qui décide de
   * ce que l'outil couvre manque — un DUERP aux réponses d'activités
   * incomplètes, une catégorie d'ERP non renseignée.
   *
   * D2 (a), décision de la propriétaire du 2026-09-28 : même mécanisme que les
   * états permanents — ni au dénominateur ni à la pénalité, mais « Situation
   * satisfaisante » devient « Reste à renseigner » tant qu'il en reste. Avant,
   * un restaurant sans catégorie sortait à 100 « Situation satisfaisante »
   * avec une indétermination affichée sur une autre page. Rendu à part, pour
   * que l'interface dise laquelle des deux choses reste.
   */
  indeterminationsCouverture: number;
};

export const SEUIL_SATISFAISANT = 80;
export const SEUIL_SURVEILLANCE = 50;

/** Poids relatifs des retards. Une vérification réglementaire dépassée pèse
 *  plus qu'une action corrective, qui pèse plus qu'un document à rafraîchir. */
export const POIDS_VERIF_EN_RETARD = 3;
export const POIDS_ACTION_EN_RETARD = 2;
export const POIDS_DUERP_NON_A_JOUR = 1;

export type EntreeScoreConformite = {
  verifs: {
    /** Toutes les occurrences de la période — retards, « à planifier »,
     *  à venir sous 30 jours et réalisées sur 12 mois. C'est exactement le
     *  `total` de `repartirVerifications`, dont les quatre ensembles sont
     *  disjoints : pas de double compte possible. */
    total: number;
    enRetard: number;
  };
  actions: {
    /** Actions encore à traiter (ouvertes + en cours). */
    ouvertesTotal: number;
    enRetard: number;
  };
  /** `null` quand aucun DUERP n'est ouvert : un dossier qui n'a pas commencé
   *  n'est pas noté sur ce point — c'est l'amorçage qui le porte, pas le
   *  score. */
  duerp: EtatDuerp | null;
  /**
   * Les états permanents applicables, et ceux que le dirigeant a déclarés
   * en place. **Requis, et c'est le point.**
   *
   * Un champ optionnel serait resté vide : le tableau de bord et le dossier
   * PDF composaient déjà chacun son dénominateur, et ils ont affiché deux
   * scores différents au même instant jusqu'à ce que cette fonction devienne
   * leur porte unique. Le rendre obligatoire garantit qu'aucun appelant ne
   * peut noter un dossier en ignorant la moitié de ce que le produit sait.
   *
   * Ils n'entrent ni au dénominateur ni à la pénalité, et c'est délibéré —
   * voir `calculerScoreDepuisEtat`.
   */
  etatsPermanents: { total: number; enPlace: number };
  /**
   * Les questions de couverture ouvertes du dossier (D2 (a)). **Requis, pour
   * la raison même des états permanents** : un appelant qui l'omettrait
   * noterait « satisfaisante » un dossier dont l'outil ne sait pas ce qu'il
   * couvre. `indeterminations` est la longueur de la liste que
   * `couvertureDuDossier` rend — `0` quand le dossier est introuvable n'arrive
   * pas : l'appelant n'a alors pas de score à calculer.
   */
  couverture: { indeterminations: number };
};

function niveauDepuisValeur(v: number): Score["niveau"] {
  if (v >= SEUIL_SATISFAISANT) return "satisfaisante";
  if (v >= SEUIL_SURVEILLANCE) return "a_surveiller";
  return "rattrapage";
}

const LIBELLE_NIVEAU: Record<Score["niveau"], string> = {
  satisfaisante: "Situation satisfaisante",
  a_surveiller: "À surveiller",
  rattrapage: "Rattrapage nécessaire",
  // Nomme le geste qui lève le doute, pas un état de l'établissement.
  // « Incomplet » aurait qualifié le dossier ; c'est le score qui l'est.
  indetermine: "Reste à renseigner",
};

/**
 * Le DUERP pèse-t-il sur le score, et combien ?
 *
 * Deux situations coûtent le même point, pour une raison assumée :
 *
 *  - **version trop ancienne** alors que l'entreprise est soumise à la mise
 *    à jour annuelle (art. R. 4121-2) — l'échéance est dépassée ;
 *  - **aucune version validée** alors que le DUERP est ouvert — la
 *    transcription des résultats de l'évaluation n'a pas été figée
 *    (art. R. 4121-1).
 *
 * Ne pénaliser que la première reviendrait à récompenser l'inaction : un
 * DUERP jamais validé sortait du calcul (il ne coûtait rien) pendant qu'une
 * version de 366 jours coûtait un point. Le tableau de bord affichait donc
 * un meilleur score à qui ne validait jamais.
 */
function penaliteDuerp(d: EtatDuerp | null): number {
  if (d === null || !d.ouvert) return 0;
  return d.estAJour ? 0 : POIDS_DUERP_NON_A_JOUR;
}

/**
 * Le niveau annoncé, une fois l'indétermination prise en compte.
 *
 * **Pourquoi les états permanents ne pénalisent pas.** Les compter comme des
 * retards affirmerait un manquement que l'outil n'établit pas : un extincteur
 * signalé l'est peut-être depuis dix ans, sans que personne ait coché la
 * ligne. Ce serait aussi refaire, dans le score, la confusion que l'ADR-026
 * vient de défaire au référentiel — `periodicite: "autre"` y servait de
 * tenant-lieu à trois natures d'obligation distinctes, et le produit a payé
 * cher de les avoir mêlées.
 *
 * **Pourquoi les ignorer ne marche pas non plus.** C'est l'état d'avant, et il
 * ment dans l'autre sens : un bureau de six personnes sans équipement sortait
 * à 100, « Situation satisfaisante », avec treize états permanents non
 * déclarés à côté. `.claude/CLAUDE.md` promet que « l'outil ne ment pas sur
 * son niveau de conformité ».
 *
 * Le troisième terme est celui que ce dépôt applique partout ailleurs :
 * **nommer le trou sans le combler**. Le score reste ce qu'il a toujours été,
 * une mesure de ce qui se date ; il cesse seulement de conclure « satisfaisante »
 * quand une part du périmètre n'a pas de réponse.
 *
 * L'indétermination ne dégrade que ce seul niveau. « À surveiller » et
 * « Rattrapage nécessaire » sont des conclusions que des retards réels
 * soutiennent : les remplacer priverait le dirigeant de l'information la plus
 * urgente pour lui en substituer une moins pressante.
 */
function qualifier(valeur: number, indetermines: number): Score["niveau"] {
  const niveau = niveauDepuisValeur(valeur);
  if (niveau === "satisfaisante" && indetermines > 0) return "indetermine";
  return niveau;
}

export function calculerScoreDepuisEtat(e: EntreeScoreConformite): Score {
  // `max(0, …)` plutôt qu'une soustraction nue : `enPlace` et `total` sont
  // mesurés par le même passage, mais un appelant qui les composerait à la
  // main ne doit pas pouvoir rendre une indétermination négative.
  const indetermines = Math.max(
    0,
    e.etatsPermanents.total - e.etatsPermanents.enPlace,
  );

  const denominateur =
    e.verifs.total +
    e.actions.ouvertesTotal +
    (e.duerp !== null && e.duerp.ouvert ? 1 : 0);

  let valeur: number;
  if (denominateur === 0) {
    // Aucune échéance à suivre → rien à reprocher sur ce qui se date. Le
    // dossier peut malgré tout n'avoir rien renseigné : c'est `qualifier`
    // qui le dira, et c'est exactement le cas que ce retour rendait muet.
    valeur = 100;
  } else {
    const penalite =
      e.verifs.enRetard * POIDS_VERIF_EN_RETARD +
      e.actions.enRetard * POIDS_ACTION_EN_RETARD +
      penaliteDuerp(e.duerp);

    valeur = Math.round(
      100 * Math.max(0, 1 - penalite / (denominateur * POIDS_VERIF_EN_RETARD)),
    );
  }

  const indeterminationsCouverture = Math.max(0, e.couverture.indeterminations);
  // Les deux sources d'indétermination empêchent la même conclusion, et
  // seulement celle-là (`qualifier`) : un retard réel garde sa voix.
  const niveau = qualifier(valeur, indetermines + indeterminationsCouverture);
  return {
    valeur,
    niveau,
    libelle: LIBELLE_NIVEAU[niveau],
    indetermines,
    indeterminationsCouverture,
  };
}
