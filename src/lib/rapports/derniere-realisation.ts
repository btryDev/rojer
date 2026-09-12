// La dernière réalisation d'une ligne de suivi se lit sur ses RAPPORTS, pas sur
// la ligne (ADR-034, 2026-09-11).
//
// La ligne ne porte que l'échéance ouverte. Ce qu'un contrôle a été — sa date,
// son résultat — vit sur le `RapportVerification`, et « dernière réalisation »
// est la date du rapport réalisé le plus récent. Trois choses sont alors vraies
// par construction, qu'une colonne recopiée sur la ligne obligeait à maintenir
// à la main : retirer le rapport le plus récent fait reculer la dernière
// réalisation ; un rapport antidaté n'est jamais le plus récent ; un rapport
// « non vérifiable » ne compte pas, puisqu'il n'atteste d'aucun contrôle.
//
// `Verification.dateRealisee` n'est plus écrite depuis ce jour. Elle reste en
// base, gelée, jusqu'au lot N5 qui la retire.

//
// Module PUR : aucun client de base. La jointure par le client de
// l'application vit dans `joindre-realisations.ts`.

import type { Prisma } from "@prisma/client";
import { RESULTATS_REALISES } from "./schema";

/** Clause `where` d'un rapport qui vaut réalisation du contrôle. */
export const WHERE_RAPPORT_REALISE = {
  resultat: { in: [...RESULTATS_REALISES] },
} satisfies Prisma.RapportVerificationWhereInput;

/**
 * À poser dans le `select` d'une `Verification` pour lire sa dernière
 * réalisation : `rapports: SELECT_DERNIER_RAPPORT_REALISE`, puis
 * `derniereRealisation(v.rapports)`.
 */
export const SELECT_DERNIER_RAPPORT_REALISE = {
  where: WHERE_RAPPORT_REALISE,
  orderBy: { dateRapport: "desc" as const },
  take: 1,
  select: { dateRapport: true },
} satisfies Prisma.Verification$rapportsArgs;

/** La date du rapport réalisé le plus récent, ou `null` si aucun. Accepte la
 *  liste complète des rapports comme la liste réduite du `select` ci-dessus. */
export function derniereRealisation(
  rapports: ReadonlyArray<{ dateRapport: Date; resultat?: string }>,
): Date | null {
  let derniere: Date | null = null;
  for (const r of rapports) {
    if (
      r.resultat !== undefined &&
      !(RESULTATS_REALISES as readonly string[]).includes(r.resultat)
    ) {
      continue;
    }
    if (derniere === null || r.dateRapport.getTime() > derniere.getTime()) {
      derniere = r.dateRapport;
    }
  }
  return derniere;
}

/**
 * Pour un lot de lignes lu d'un coup — la réconciliation lit tous les rapports
 * réalisés d'un établissement en une requête plutôt qu'une par ligne — : le
 * dernier rapport réalisé de chaque ligne, indexé par identifiant de ligne.
 *
 * Le RÉSULTAT voyage avec la date, et pas par confort : une obligation sans
 * rendez-vous suivant garde sur sa ligne le statut de son unique contrôle
 * (`realisee_conforme`…), et c'est le résultat du rapport qui le dit. Sans
 * lui, la réconciliation devrait inventer un statut ou l'effacer.
 */
export type DerniereRealisation = { dateRapport: Date; resultat: string | null };

export function indexerDernieresRealisations(
  rapports: ReadonlyArray<{
    verificationId: string;
    dateRapport: Date;
    resultat?: string;
  }>,
): Map<string, DerniereRealisation> {
  const index = new Map<string, DerniereRealisation>();
  for (const r of rapports) {
    const connue = index.get(r.verificationId);
    if (
      connue === undefined ||
      r.dateRapport.getTime() > connue.dateRapport.getTime()
    ) {
      index.set(r.verificationId, {
        dateRapport: r.dateRapport,
        resultat: r.resultat ?? null,
      });
    }
  }
  return index;
}
