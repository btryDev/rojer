// Ancienneté du DUERP — **une seule lecture** de la règle, pour tout le
// tableau de bord.
//
// Le produit posait la question « ce DUERP est-il à jour ? » à quatre
// endroits, avec quatre réponses :
//
//   - `recommandations.ts` déclenchait le rappel à 330 jours ;
//   - `queries.ts` écrivait `365` en dur ;
//   - `score.ts` exportait `SEUIL_DUERP_A_METTRE_A_JOUR_JOURS = 365` que
//     personne n'importait ;
//   - la page de synthèse du DUERP (`/duerp/[id]/synthese`) était seule à
//     appliquer la **condition légale d'effectif**.
//
// Résultat visible : une entreprise de quatre salariés dont la dernière
// version avait 400 jours ne lisait rien sur la page DUERP (c'était juste)
// mais voyait sur son tableau de bord une alerte, une pastille « à faire »
// et une pénalité de score (c'était faux). Et un DUERP tout juste ouvert,
// sans aucune version, s'entendait dire qu'il avait « plus de douze mois ».
//
// Ce module tranche les deux questions une fois pour toutes :
//
//   1. **Qui est soumis à la mise à jour annuelle ?** L'art. R. 4121-2 du
//      Code du travail impose la mise à jour au moins annuelle du document
//      unique aux entreprises d'au moins onze salariés. En dessous, la mise
//      à jour reste exigée lors de toute décision d'aménagement important
//      ou lorsqu'une information nouvelle apparaît — mais pas au titre du
//      calendrier. Le produit ne peut donc pas reprocher un âge à un
//      dossier de quatre salariés.
//   2. **Qu'est-ce qu'« à jour » ?** Deux situations distinctes, jamais
//      confondues : *aucune version validée* (la transcription n'a pas
//      encore été figée — art. R. 4121-1) et *version trop ancienne*.
//
// L'arithmétique passe par `ajouterAns` : « la version + un an » retombe
// toujours sur la même date civile, là où `+ 365 jours` décale d'un jour dès
// qu'un 29 février tombe dans l'intervalle. L'horloge est injectée (ADR-011).

import { ajouterAns, joursCivilsEntre, JOURS_HORIZON_PROCHE } from "@/lib/dates";
import { estDansLesProchainsJours, estEnRetard } from "@/lib/dates/retard";
import {
  seuilEntrepriseAtteint,
  type EffectifsDeclares,
} from "@/lib/matching/effectif-entreprise";

/** Effectif à partir duquel la mise à jour annuelle est exigée
 *  (art. R. 4121-2 du Code du travail : « au moins onze salariés »). */
export const EFFECTIF_MAJ_ANNUELLE = 11;

/** Période de validité d'une version, en années calendaires. */
export const ANS_VALIDITE_VERSION_DUERP = 1;

export type EntreeEtatDuerp = {
  /** Un DUERP a été ouvert pour l'établissement. */
  ouvert: boolean;
  /** Date de la dernière version **validée**, `null` si aucune. */
  dateDerniereVersion: Date | null;
  /**
   * Les deux effectifs déclarés. Le seuil de R. 4121-2 1° se compte sur
   * l'entreprise ; le site n'intervient que par la prudence commune à tous
   * les seuils d'entreprise (`effectifRetenuPourSeuil`, C37).
   */
  effectifs: EffectifsDeclares;
};

export type EtatDuerp = {
  ouvert: boolean;
  /** Au moins une version a été figée. */
  aVersionValidee: boolean;
  /** Âge de la dernière version, en jours civils. `null` si aucune. */
  ageJours: number | null;
  /** Date à laquelle la mise à jour annuelle devient exigible. `null` si
   *  aucune version n'existe ou si l'entreprise n'y est pas soumise. */
  dateLimiteMaj: Date | null;
  /** L'entreprise est soumise à la mise à jour annuelle (effectif ≥ 11). */
  soumisMajAnnuelle: boolean;
  /**
   * `soumisMajAnnuelle` ne tient qu'à la prudence : l'entreprise est déclarée
   * sous onze, le site en compte onze ou plus (C37).
   */
  majAnnuelleAConfirmer: boolean;
  /** Une version existe et a moins d'un an — fait d'ancienneté pur, sans
   *  condition d'effectif. C'est ce que le brief peut annoncer comme acquis
   *  (« votre DUERP est à jour ») sans en dire plus qu'il ne sait. */
  versionRecente: boolean;
  /** DUERP ouvert dont aucune version n'a jamais été validée. */
  jamaisValide: boolean;
  /** Version validée, mais la mise à jour annuelle est dépassée. */
  majEchue: boolean;
  /** L'échéance annuelle tombe dans l'horizon proche — on prévient avant,
   *  pas après. */
  rappelMajProche: boolean;
  /**
   * Rien à reprocher au DUERP sur son ancienneté : une version est figée
   * et, si l'entreprise y est soumise, elle a moins d'un an.
   *
   * Attention à la lecture : « à jour » ne veut pas dire « conforme ».
   * L'outil ne certifie rien (règle n°8 du projet), il constate qu'aucune
   * échéance de mise à jour n'est dépassée.
   */
  estAJour: boolean;
};

export function evaluerEtatDuerp(e: EntreeEtatDuerp, now: Date): EtatDuerp {
  const seuilMaj = seuilEntrepriseAtteint(EFFECTIF_MAJ_ANNUELLE, e.effectifs);
  const soumisMajAnnuelle = seuilMaj.atteint;
  const aVersionValidee = e.ouvert && e.dateDerniereVersion !== null;

  const ageJours = e.dateDerniereVersion
    ? Math.max(0, joursCivilsEntre(e.dateDerniereVersion, now))
    : null;

  // Anniversaire de la dernière version. Sans version, il n'y a pas de point
  // de départ : aucune date n'est fabriquée à partir de la création du DUERP,
  // ce qui inventerait une échéance que le texte n'écrit pas.
  const anniversaire =
    aVersionValidee && e.dateDerniereVersion
      ? ajouterAns(e.dateDerniereVersion, ANS_VALIDITE_VERSION_DUERP)
      : null;
  const versionRecente =
    anniversaire !== null && !estEnRetard(anniversaire, now);

  // La date limite n'existe que pour qui est soumis à la mise à jour
  // annuelle : ailleurs, l'anniversaire est une information, pas une
  // échéance.
  const dateLimiteMaj = soumisMajAnnuelle ? anniversaire : null;

  const jamaisValide = e.ouvert && !aVersionValidee;
  const majEchue = dateLimiteMaj !== null && !versionRecente;
  const rappelMajProche =
    dateLimiteMaj !== null &&
    !majEchue &&
    estDansLesProchainsJours(dateLimiteMaj, now, JOURS_HORIZON_PROCHE);

  return {
    ouvert: e.ouvert,
    aVersionValidee,
    ageJours,
    dateLimiteMaj,
    soumisMajAnnuelle,
    majAnnuelleAConfirmer: seuilMaj.aConfirmer,
    versionRecente,
    jamaisValide,
    majEchue,
    rappelMajProche,
    estAJour: aVersionValidee && !majEchue,
  };
}

/** Âge exprimé en mois pleins — pour les libellés (« il y a 14 mois »). */
export function ageEnMois(ageJours: number): number {
  return Math.round(ageJours / 30);
}
