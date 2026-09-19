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
// `Verification.dateRealisee` n'est plus écrite depuis ce jour, et le lot N5
// (2026-09-13) l'a retirée de la base : il n'y a plus de seconde source.

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
 * L'ordre « du plus récent au plus ancien » des rapports d'une ligne, en
 * `orderBy` Prisma : la date du rapport, puis l'instant de dépôt pour
 * départager deux rapports du même jour (`dateRapport` est un jour civil).
 *
 * C'EST L'ORDRE DU MOTEUR, écrit pour les lecteurs. Le moteur départage en
 * mémoire, par `indexerDernieresRealisations` ; les écrans, le registre, le
 * serveur MCP et le dépôt d'un rapport lisent le premier d'une liste triée en
 * base. L'ordre était recopié en littéral à huit endroits (audit du
 * 2026-09-19) : une copie qui perdrait son second terme ferait afficher, pour
 * deux rapports du même jour, un autre « dernier rapport » que celui dont le
 * moteur a tiré le statut. `derniere-realisation.test.ts` tient l'équivalence
 * entre cette constante et le départage du moteur.
 */
export const ORDRE_RAPPORT_PLUS_RECENT = [
  { dateRapport: "desc" },
  { createdAt: "desc" },
] satisfies Prisma.RapportVerificationOrderByWithRelationInput[];

/** La date du rapport réalisé le plus récent, ou `null` si aucun. Accepte la
 *  liste complète des rapports comme une liste déjà réduite au plus récent.
 *  Deux rapports du même jour portent la même date : le départage n'importe
 *  pas ici, il n'importe que pour le RÉSULTAT (`indexerDernieresRealisations`). */
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
    /** REQUIS : il départage deux rapports du même jour. `dateRapport` est un
     *  jour civil, si bien que deux rapports déposés le même jour portent le
     *  même instant ; sans départage, « le plus récent » était le premier que
     *  rendait PostgreSQL, et le statut d'une ponctuelle — qui se lit sur son
     *  RÉSULTAT — pouvait changer d'une régénération à l'autre (revue du
     *  2026-09-14). Le dépôt et la suppression départagent déjà ainsi. */
    createdAt: Date;
    resultat?: string;
  }>,
): Map<string, DerniereRealisation> {
  const retenus = new Map<string, (typeof rapports)[number]>();
  for (const r of rapports) {
    const connu = retenus.get(r.verificationId);
    if (
      connu === undefined ||
      r.dateRapport.getTime() > connu.dateRapport.getTime() ||
      (r.dateRapport.getTime() === connu.dateRapport.getTime() &&
        r.createdAt.getTime() > connu.createdAt.getTime())
    ) {
      retenus.set(r.verificationId, r);
    }
  }
  const index = new Map<string, DerniereRealisation>();
  for (const [id, r] of retenus) {
    index.set(id, { dateRapport: r.dateRapport, resultat: r.resultat ?? null });
  }
  return index;
}
