// La stratégie CANDIDATE du réconciliateur : la date et le statut d'une ligne
// sortent de `echeanceDeLigne`, calculés depuis des faits — ADR-036, lot 2c.
//
// ⚠ RIEN EN PRODUCTION N'IMPORTE CE MODULE, ET C'EST VOULU (2026-09-18). Il
// n'est appelé que par le passage à blanc (`scripts/passage-a-blanc-echeances.ts`,
// en lecture seule) et par ses tests. `echeance-de-ligne.test.ts` garde la
// liste des fichiers autorisés à importer la fonction d'échéance ; ce module
// en fait partie, `actions.ts`, `generateur.ts` et `rapports/` n'en font pas
// partie. La bascule est le lot 4.
//
// CE QUE FAIT CE MODULE. Il RASSEMBLE : le réconciliateur lui donne la ligne
// en base, la ligne générée avec ses `sources`, la réalisation propre et
// l'héritage ; il en fait des `FaitsDeLigne`, appelle la fonction pure, et rend
// ce qu'elle rend. Aucune règle de date n'est écrite ici — c'est tout l'objet
// de l'ADR-036 : une seule fonction décide, et ce module ne fait que lui
// apporter ses faits.
//
// UNE SEULE GARDE, HORS DE LA FONCTION, ET ELLE EST ÉTROITE : le legs d'un
// ponctuel au statut réalisé SANS AUCUN RAPPORT (seed uniquement — le produit
// rouvre la ligne quand son dernier rapport part). La fonction ne voit que des
// faits et effacerait cette trace ; l'ADR-036 § 5 demande de la conserver, et
// le passage à blanc la compte à part (`legs_statut_realise`).

import { estStatutRealise } from "@/lib/dates/retard";
import {
  statutDepuisResultat,
  type ResultatRealise,
} from "@/lib/rapports/schema";
import { echeanceDeLigne, type FaitsDeLigne } from "./echeance-de-ligne";
import {
  type ContexteCreation,
  type ContexteExistante,
  type DecisionDeLigne,
  type OccurrenceExistante,
  type StrategieDecision,
  type VerificationGenere,
} from "./generateur";
import { estCyclique } from "./periodicite";

/**
 * Le dernier rapport RÉALISÉ d'une ligne, ou `null` — et seulement si son
 * résultat vaut réalisation. `derniereRealisation` est déjà filtrée par
 * `WHERE_RAPPORT_REALISE` chez l'appelant réel ; une fixture peut ne pas
 * l'être, et un « non vérifiable » ne doit jamais entrer comme réalisation.
 */
function realisationPropre(
  ex: OccurrenceExistante,
): FaitsDeLigne["realisation"] {
  const date = ex.derniereRealisation ?? null;
  if (date === null) return null;
  if (statutDepuisResultat(ex.dernierResultat) === null) return null;
  return { date, resultat: ex.dernierResultat as ResultatRealise };
}

/**
 * Les faits d'une ligne, rassemblés depuis ce que le réconciliateur sait.
 *
 *  · le rythme EFFECTIF est celui de la ligne générée — surcharge de
 *    prescription comprise, c'est ce que le générateur y écrit ;
 *  · le premier pas, la mise en service et la date du titre viennent de
 *    `g.sources`. Une ligne générée sans `sources` — une fixture d'avant la
 *    couture — retombe sur le rythme, aucune mise en service, et la date de
 *    titre que `datePrevueFaisantFoi` désignait ;
 *  · l'origine est `suiviDepuis` de la ligne en base, ou l'horloge de la passe
 *    pour une ligne à naître — celle que `actions.ts` persistera.
 */
export function faitsDeLigne(
  g: VerificationGenere,
  ex: OccurrenceExistante | null,
  heritee: Date | null,
  now: Date,
): FaitsDeLigne {
  return {
    periodicite: g.periodicite,
    premierPas: g.sources?.premierPas ?? g.periodicite,
    dateDuTitre:
      g.sources?.dateDuTitre ??
      (g.datePrevueFaisantFoi === true ? g.datePrevue : null),
    realisation: ex === null ? null : realisationPropre(ex),
    realisationHeritee: heritee,
    miseEnService: g.sources?.miseEnService ?? null,
    origine: ex?.suiviDepuis ?? now,
  };
}

/**
 * Le legs à protéger hors de la fonction (ADR-036 § 5) : un ponctuel au statut
 * réalisé sans aucun rapport réalisé. Sa seule trace est son statut ; la
 * fonction, qui ne voit que des faits, le rouvrirait.
 */
export function estLegsStatutRealise(
  ex: OccurrenceExistante,
  periodiciteEffective: FaitsDeLigne["periodicite"],
): boolean {
  return (
    !estCyclique(periodiciteEffective) &&
    estStatutRealise(ex.statut) &&
    realisationPropre(ex) === null
  );
}

/** Nom de source rendu pour le legs, à côté des sources de la fonction. */
export const SOURCE_LEGS = "legs_statut_realise";

/** La date et le statut d'une ligne EXISTANTE, depuis ses faits. */
export function deciderParFaits(ctx: ContexteExistante): DecisionDeLigne {
  const { ex, g, heritee, now } = ctx;
  if (estLegsStatutRealise(ex, g.periodicite)) {
    return { datePrevue: ex.datePrevue, statut: ex.statut, source: SOURCE_LEGS };
  }
  const r = echeanceDeLigne(faitsDeLigne(g, ex, heritee, now));
  return { datePrevue: r.datePrevue, statut: r.statut, source: r.source };
}

/** La date et le statut d'une ligne À CRÉER : mêmes faits, origine = `now`. */
export function creerParFaits(ctx: ContexteCreation): DecisionDeLigne {
  const r = echeanceDeLigne(faitsDeLigne(ctx.g, null, ctx.heritee, ctx.now));
  return { datePrevue: r.datePrevue, statut: r.statut, source: r.source };
}

/** La stratégie complète, à passer à `reconcilierCalendrier` ou `planifier`. */
export const STRATEGIE_FAITS: StrategieDecision = {
  existante: deciderParFaits,
  creation: creerParFaits,
};
