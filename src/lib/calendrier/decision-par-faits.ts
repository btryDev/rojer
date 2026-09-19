// La décision de date du réconciliateur : la date et le statut d'une ligne
// sortent de `echeanceDeLigne`, calculés depuis des faits — ADR-036.
//
// ~~Stratégie CANDIDATE, que rien en production n'importe (lot 2c).~~ DEPUIS LA
// BASCULE (lot 4, 2026-09-19), C'EST LA SEULE. `reconcilierCalendrier` l'appelle
// directement (~~par défaut, au lot 4~~ — la couture est partie au lot 5), et
// c'est par lui qu'elle sert les trois chemins qui écrivent une
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
// ~~UNE SEULE GARDE, HORS DE LA FONCTION : le LEGS d'un ponctuel au statut
// réalisé sans aucun rapport réalisé, dont statut et date étaient conservés.~~
// RETIRÉE AU LOT 5 (2026-09-19) : le contrôle de santé du même jour n'en a
// compté AUCUN en production, et aucun chemin du produit n'en fabrique — le
// dépôt n'écrit un statut réalisé que depuis un rapport réalisé, le retrait le
// rouvre. Ce module ne décide plus rien hors de la fonction.

import {
  statutDepuisResultat,
  type ResultatRealise,
} from "@/lib/rapports/schema";
import type { FaitsDeLigne } from "./echeance-de-ligne";
// DES TYPES SEULEMENT, et en `import type` : `generateur.ts` importe ce module
// pour sa décision, et un import de valeur dans l'autre sens ferait
// un cycle à l'exécution.
import type { OccurrenceExistante, VerificationGenere } from "./generateur";

/**
 * Le dernier rapport RÉALISÉ d'une ligne, ou `null`.
 *
 * `derniereRealisation` est RÉALISÉE PAR CONTRAT : la lecture de production ne
 * la tire que de rapports filtrés par `WHERE_RAPPORT_REALISE`
 * (`passe.ts`), et `OccurrenceExistante` la définit ainsi. Le résultat qui
 * l'accompagne est vérifié — un « non vérifiable » passé par erreur n'entre
 * jamais comme réalisation (ADR-036 § 3).
 *
 * ~~QUAND IL MANQUAIT (`dernierResultat` absent), la date restait une
 * réalisation sur un rythme cyclique, avec le résultat neutre `conforme`, pour
 * que `continuite-identite.test.ts` reste vert sans retouche.~~ Retiré le
 * 2026-09-19 : un repli de production qui ne servait qu'aux fixtures, et qui
 * fabriquait un résultat en silence. Le champ est requis ; une date de rapport
 * SANS résultat est une incohérence de lecture — la production lit les deux
 * sur le même rapport (`indexerDernieresRealisations`) — et elle est refusée,
 * en nommant la ligne, au lieu d'être tenue pour une réalisation ou pour rien.
 */
function realisationPropre(ex: OccurrenceExistante): FaitsDeLigne["realisation"] {
  const date = ex.derniereRealisation ?? null;
  if (date === null) return null;
  if (ex.dernierResultat === null) {
    throw new Error(
      `faitsDeLigne : la ligne « ${ex.id} » porte une dernière réalisation sans ` +
        "son résultat. Les deux se lisent sur le même rapport ; l'un sans l'autre " +
        "est un défaut de lecture, pas un cas à servir (ADR-036 § 3).",
    );
  }
  if (statutDepuisResultat(ex.dernierResultat) === null) return null;
  return { date, resultat: ex.dernierResultat as ResultatRealise };
}

/** Refuse une ligne existante à laquelle manque un fait que le type rend
 *  requis — une fixture ou une donnée passée par un `as`. Même règle que pour
 *  les `sources` d'une ligne générée : on nomme la ligne, on ne retombe pas. */
function exigerFaitsDeLaLigne(ex: OccurrenceExistante): void {
  const manquants = [
    (ex.suiviDepuis as Date | undefined) === undefined ? "suiviDepuis" : null,
    (ex.dernierResultat as string | null | undefined) === undefined
      ? "dernierResultat"
      : null,
  ].filter((m): m is string => m !== null);
  if (manquants.length > 0) {
    throw new Error(
      `faitsDeLigne : la ligne « ${ex.id} » arrive sans ${manquants.join(" ni ")}. ` +
        "La lecture de production les porte toujours ; sans eux, l'origine du " +
        "suivi retomberait sur l'horloge et une date de rapport sur un résultat " +
        "inventé, en silence (ADR-036).",
    );
  }
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
 *  · l'origine est `suiviDepuis` de la ligne en base, REQUISE, ou l'horloge de
 *    la passe pour une ligne à naître — celle que `actions.ts` persistera.
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
  if (ex !== null) exigerFaitsDeLaLigne(ex);
  return {
    periodicite: g.periodicite,
    premierPas: g.sources.premierPas,
    dateDuTitre: g.sources.dateDuTitre,
    realisation: ex === null ? null : realisationPropre(ex),
    realisationHeritee: heritee,
    miseEnService: g.sources.miseEnService,
    origine: ex === null ? now : ex.suiviDepuis,
  };
}

// ~~`deciderParFaits`, `creerParFaits`~~ — retirées le 2026-09-19 : deux
// relais d'une ligne, un seul appelant chacun. `reconcilierCalendrier` appelle
// `echeanceDeLigne(faitsDeLigne(…))` lui-même.
