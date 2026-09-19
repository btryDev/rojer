// La décision de date du réconciliateur : la date et le statut d'une ligne
// sortent de `echeanceDeLigne`, calculés depuis des faits — ADR-036.
//
// ~~Stratégie CANDIDATE, que rien en production n'importe (lot 2c).~~ DEPUIS LA
// BASCULE (lot 4, 2026-09-19), C'EST LA SEULE. `reconcilierCalendrier` la prend
// par défaut, et c'est par lui qu'elle sert les trois chemins qui écrivent une
// date : la régénération, le dépôt et la suppression d'un rapport
// (`recalcul-ligne.ts`, qui rejoue le plan de la passe pour UNE ligne).
//
// CE QUE FAIT CE MODULE. Il RASSEMBLE : le réconciliateur lui donne la ligne
// en base, la ligne générée avec ses `sources`, la réalisation propre et
// l'héritage ; il en fait des `FaitsDeLigne`, appelle la fonction pure, et rend
// ce qu'elle rend. Aucune règle de date n'est écrite ici — c'est tout l'objet
// de l'ADR-036 : une seule fonction décide, et ce module ne fait que lui
// apporter ses faits.
//
// UNE SEULE GARDE, HORS DE LA FONCTION, ET ELLE EST ÉTROITE : le LEGS d'un
// ponctuel au statut réalisé SANS AUCUN RAPPORT RÉALISÉ (seed uniquement — le
// produit rouvre la ligne quand son dernier rapport part). La fonction ne voit
// que des faits et effacerait cette trace : la garde conserve statut ET date.
// Le passage à blanc du 2026-09-18 en a compté ZÉRO en production ; elle reste
// le temps de le vérifier une seconde fois juste avant la fusion, et le lot 5
// la retire (ADR-036 § 5 et § 9).

import { estStatutRealise } from "@/lib/dates/retard";
import {
  statutDepuisResultat,
  type ResultatRealise,
} from "@/lib/rapports/schema";
import { echeanceDeLigne, type FaitsDeLigne } from "./echeance-de-ligne";
// DES TYPES SEULEMENT, et en `import type` : `generateur.ts` importe ce module
// pour sa décision par défaut, et un import de valeur dans l'autre sens ferait
// un cycle à l'exécution.
import type {
  ContexteCreation,
  ContexteExistante,
  DecisionDeLigne,
  OccurrenceExistante,
  StrategieDecision,
  VerificationGenere,
} from "./generateur";
import { estCyclique } from "./periodicite";

/**
 * Le dernier rapport RÉALISÉ d'une ligne, ou `null`.
 *
 * `derniereRealisation` est RÉALISÉE PAR CONTRAT : la lecture de production ne
 * la tire que de rapports filtrés par `WHERE_RAPPORT_REALISE`
 * (`passe.ts`), et `OccurrenceExistante` la définit ainsi. Le résultat qui
 * l'accompagne est vérifié quand il est LÀ — un « non vérifiable » passé par
 * erreur n'entre jamais comme réalisation (ADR-036 § 3).
 *
 * QUAND IL MANQUE (`dernierResultat` absent — une fixture pure d'avant ce
 * champ ; la lecture de production le porte toujours), la date reste une
 * réalisation, et ce qui en dépend se décide selon le rythme :
 *  · CYCLIQUE : la règle 3 ne lit du résultat que « est-ce une réalisation ? »,
 *    ce que le contrat garantit déjà ; la date de la ligne n'en dépend pas, et
 *    son statut est « planifiée » quel que soit le résultat. On transmet donc
 *    la date avec le résultat neutre `conforme`, JAMAIS LU pour autre chose.
 *    `continuite-identite.test.ts` — un rapport de 2025 en quinquennal donne
 *    2030 — en dépend, et doit rester vert sans retouche (plan de l'ADR-036) ;
 *  · PONCTUEL : le résultat EST le statut de la ligne soldée (règle 2), et on
 *    ne l'invente pas : pas de réalisation, et la garde du legs conserve le
 *    statut réalisé que la ligne porte — ce que `deciderParConservation`
 *    faisait (`statutDepuisResultat(…) ?? ex.statut`).
 */
function realisationPropre(
  ex: OccurrenceExistante,
  periodicite: FaitsDeLigne["periodicite"],
): FaitsDeLigne["realisation"] {
  const date = ex.derniereRealisation ?? null;
  if (date === null) return null;
  if (ex.dernierResultat == null) {
    return estCyclique(periodicite) ? { date, resultat: "conforme" } : null;
  }
  if (statutDepuisResultat(ex.dernierResultat) === null) return null;
  return { date, resultat: ex.dernierResultat as ResultatRealise };
}

/**
 * Les faits d'une ligne, rassemblés depuis ce que le réconciliateur sait.
 *
 *  · le rythme EFFECTIF est celui de la ligne générée — surcharge de
 *    prescription comprise, c'est ce que le générateur y écrit ;
 *  · le premier pas, la mise en service et la date du titre viennent de
 *    `g.sources`, REQUIS. ~~Une ligne générée sans `sources` retombait sur le
 *    rythme, aucune mise en service, et la date que `datePrevueFaisantFoi`
 *    désignait~~ — ce repli silencieux perdait la mise en service et le premier
 *    délai sans rien dire. Depuis la bascule (2026-09-19), c'est une ERREUR,
 *    comme le lot 2c l'annonçait : une ligne générée sans ses sources est un
 *    défaut de câblage, pas un cas à servir ;
 *  · l'origine est `suiviDepuis` de la ligne en base, ou l'horloge de la passe
 *    pour une ligne à naître — celle que `actions.ts` persistera.
 */
export function faitsDeLigne(
  g: VerificationGenere,
  ex: OccurrenceExistante | null,
  heritee: Date | null,
  now: Date,
): FaitsDeLigne {
  // Le type le rend requis ; une fixture ou une donnée passée par un `as` peut
  // encore arriver sans. On refuse, en nommant la ligne.
  if ((g.sources as VerificationGenere["sources"] | undefined) === undefined) {
    throw new Error(
      `faitsDeLigne : la ligne générée « ${g.cleUnique} » n'a pas de sources ` +
        "de calcul. Le générateur les renseigne toujours ; sans elles, la mise " +
        "en service et le premier délai seraient perdus en silence (ADR-036).",
    );
  }
  return {
    periodicite: g.periodicite,
    premierPas: g.sources.premierPas,
    dateDuTitre: g.sources.dateDuTitre,
    realisation: ex === null ? null : realisationPropre(ex, g.periodicite),
    realisationHeritee: heritee,
    miseEnService: g.sources.miseEnService,
    origine: ex?.suiviDepuis ?? now,
  };
}

/**
 * Le legs à protéger hors de la fonction (ADR-036 § 5) : un ponctuel au statut
 * réalisé sans aucun rapport réalisé. Sa seule trace est son statut ; la
 * fonction, qui ne voit que des faits, le rouvrirait.
 *
 * ÉTROITE PAR CONSTRUCTION, et chaque condition compte : un CYCLIQUE au statut
 * réalisé n'est pas un legs (la fonction le remet « planifiée » sur ses faits,
 * ADR-036 § 5) ; un ponctuel qui porte un rapport réalisé se solde par la
 * fonction elle-même (règle 2). Retirée au lot 5 si la production n'en compte
 * aucun au passage à blanc refait avant la fusion.
 */
export function estLegsStatutRealise(
  ex: OccurrenceExistante,
  periodiciteEffective: FaitsDeLigne["periodicite"],
): boolean {
  return (
    !estCyclique(periodiciteEffective) &&
    estStatutRealise(ex.statut) &&
    realisationPropre(ex, periodiciteEffective) === null
  );
}

/** Nom de source rendu pour le legs, à côté des sources de la fonction. */
export const SOURCE_LEGS = "legs_statut_realise";

/** La date et le statut d'une ligne EXISTANTE, depuis ses faits — la garde du
 *  legs comprise. C'est la décision de la régénération. */
export function deciderParFaits(ctx: ContexteExistante): DecisionDeLigne {
  const { ex, g } = ctx;
  if (estLegsStatutRealise(ex, g.periodicite)) {
    return { datePrevue: ex.datePrevue, statut: ex.statut, source: SOURCE_LEGS };
  }
  return deciderSurLesFaitsSeuls(ctx);
}

/**
 * La même décision SANS la garde du legs — pour la suppression d'un rapport
 * RÉALISÉ (`recalculerLigne`, option `garderLegs: false`).
 *
 * POURQUOI. Un ponctuel soldé dont on retire le seul rapport réalisé porte
 * encore, au moment du recalcul, le statut réalisé que ce rapport lui avait
 * donné : vu de la ligne, c'est exactement un legs — statut réalisé, aucun
 * rapport. La garde le conserverait, et le contrôle unique resterait « fait »
 * sans aucune pièce au dossier. Or ici on SAIT d'où venait le statut : du
 * rapport qu'on retire. La ligne rouvre sur ses faits (règle 2), comme
 * `supprimerRapport` le faisait avant la bascule.
 */
export function deciderSurLesFaitsSeuls(ctx: ContexteExistante): DecisionDeLigne {
  const { ex, g, heritee, now } = ctx;
  const r = echeanceDeLigne(faitsDeLigne(g, ex, heritee, now));
  return { datePrevue: r.datePrevue, statut: r.statut, source: r.source };
}

/** La date et le statut d'une ligne À CRÉER : mêmes faits, origine = `now`. */
export function creerParFaits(ctx: ContexteCreation): DecisionDeLigne {
  const r = echeanceDeLigne(faitsDeLigne(ctx.g, null, ctx.heritee, ctx.now));
  return { datePrevue: r.datePrevue, statut: r.statut, source: r.source };
}

/** La décision complète — celle que `reconcilierCalendrier` prend par défaut. */
export const STRATEGIE_FAITS: StrategieDecision = {
  existante: deciderParFaits,
  creation: creerParFaits,
};

/** La décision sans garde du legs — voir `deciderSurLesFaitsSeuls`. */
export const STRATEGIE_FAITS_SANS_LEGS: StrategieDecision = {
  existante: deciderSurLesFaitsSeuls,
  creation: creerParFaits,
  garderLegs: false,
};
