import "server-only";
// Le client borné au compte (ADR-051) pour un accès SANS session : un jeton
// d'accès externe, une signature vérifiée publiquement, une clé MCP, et la
// notification signée d'un webhook Stripe (ADR-053). Le compte est celui qui possède l'établissement que porte la
// PREUVE déjà vérifiée — jamais un identifiant reçu de l'appelant.
//
// LA BORNE DE COMPTE S'AJOUTE AUX CONTRÔLES DE LA PREUVE, ELLE NE LES REMPLACE
// PAS (seconde lecture du 2026-10-31). Un jeton vaut pour UN établissement,
// une portée et un objet ; le compte en couvre plusieurs. Les lectures et
// écritures de l'OBJET faites par ce client gardent donc l'`etablissementId`
// de la preuve dans leur `where` — chacune éprouvée par un homonyme d'un autre
// établissement du même compte (`signatures/traversee-etablissement.test.ts`)
// — et les contrôles du jeton (`verifierAccessToken`, portée,
// `objetEstSignable`, partie, OTP) restent appliqués tels quels. Rien ne le
// vérifie à la construction : c'est la discipline de chaque appelant, que ces
// tests tiennent.
//
// [2026-11-09, chantier 3 du renforcement : la borne d'ÉTABLISSEMENT s'y ajoute.
// `clientDuProprietaire` et `sessionStdio` rendent un client borné au compte
// ET à l'établissement de la preuve (`Portee.etablissementId`, `borne.ts`) : une
// ligne d'un autre établissement du même compte y est absente, comme celle
// d'un autre compte. Les `where: { etablissementId }` écrits restent, en
// seconde ceinture (ADR-051 § 7).]

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { clientBorne, clientBorneSur, type ClientBorne } from "./portee/client";

/** `null` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function clientDuProprietaire(etablissementId: string): Promise<ClientBorne | null> {
  const etab = await prisma.etablissement.findUnique({
    where: { id: etablissementId },
    select: { entreprise: { select: { compteId: true } } },
  });
  const compteId = etab?.entreprise.compteId;
  // Sans session, personne n'agit au nom du compte : une relation vers `User`
  // n'y désigne personne (ADR-054 § 3).
  return compteId ? clientBorne({ type: "compte", compteId, userId: null, etablissementId }) : null;
}

/**
 * La session du serveur MCP stdio, lue UNE fois au démarrage, sur son propre
 * client brut (`mcp/prisma.ts` : rien sur la sortie standard, qui appartient
 * au protocole) : le nom de l'établissement servi et le client borné au compte
 * de son propriétaire, construit sur ce client. `null` si l'établissement a
 * disparu ou n'a pas de propriétaire. Réservé à `scripts/mcp-server.ts`.
 * Même lecture que `clientDuProprietaire`, écrite deux fois exprès : celle-là
 * doit rester un `prisma.etablissement.findUnique` littéral (seul usage admis
 * du client brut ici, `portee/imports.test.ts`).
 */
export async function sessionStdio(
  base: PrismaClient,
  etablissementId: string,
): Promise<{ nom: string; db: ClientBorne } | null> {
  const etab = await base.etablissement.findUnique({
    where: { id: etablissementId },
    select: { raisonDisplay: true, entreprise: { select: { compteId: true } } },
  });
  const compteId = etab?.entreprise.compteId;
  return etab && compteId
    ? { nom: etab.raisonDisplay, db: clientBorneSur(base, { type: "compte", compteId, userId: null, etablissementId }) }
    : null;
}

/**
 * Le webhook Stripe (ADR-053 § 5) : le compte est celui que désigne le client
 * Stripe RELU par l'API (`compteDuClientStripe`), après une notification dont
 * la signature est vérifiée — jamais un identifiant pris dans la charge utile.
 * Personne n'agit : aucune relation vers `User` (ADR-054 § 3). Réservé à
 * `stripe/synchronisation.ts` (`portee/imports.test.ts`).
 */
export function clientDuClientStripe(compteId: string): ClientBorne {
  return clientBorne({ type: "compte", compteId, userId: null });
}
