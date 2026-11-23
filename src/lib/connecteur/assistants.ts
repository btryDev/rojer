import "server-only";
// Les assistants qu'une personne a autorisés sur un compte (ADR-062 § 8), et
// leur retrait. Lus dans les tables du fournisseur OAuth, hors compte au sens
// du client borné (`portee/correspondance.ts`) : on borne ici, à la main, par
// la personne ET par le compte du consentement (`referenceId`).
//
// Module hors compte nommé (`portee/imports.test.ts`).

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { connecteurOuvert } from "@/lib/abonnements/connecteur";
import { niveauDuClient, type NiveauDeConfiance } from "@/lib/mcp/oauth";

export type AssistantAutorise = { id: string; nom: string; autoriseLe: Date | null; niveau: NiveauDeConfiance };

/** Les consentements de la personne pour ce compte, le plus récent d'abord, avec le niveau du client (ADR-062 § 12). */
export async function assistantsAutorises(userId: string, compteId: string): Promise<AssistantAutorise[]> {
  const lignes = await prisma.oauthConsent.findMany({
    where: { userId, referenceId: compteId },
    select: { id: true, createdAt: true, updatedAt: true, client: { select: { name: true, redirectUris: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return lignes.map((l) => ({
    id: l.id,
    nom: l.client.name ?? "Assistant sans nom",
    autoriseLe: l.updatedAt ?? l.createdAt,
    niveau: niveauDuClient(l.client.redirectUris),
  }));
}

/** Les outils non vérifiés peuvent-ils se connecter à ce compte ? (ADR-062 § 12, faux par défaut.) */
export async function outilsNonVerifiesOuverts(compteId: string): Promise<boolean> {
  const c = await prisma.compte.findUnique({ where: { id: compteId }, select: { outilsNonVerifiesAutorises: true } });
  return c?.outilsNonVerifiesAutorises === true;
}

/**
 * Ouvre ou ferme le compte aux outils non vérifiés (ADR-062 § 12). Le rôle
 * de propriétaire se vérifie AVANT, dans l'action : ici, le compte est celui
 * qu'elle a jugé. Fermer efface, pour tous les membres, les autorisations des
 * clients dont une adresse de retour n'est pas vérifiée — consentements et
 * jetons : `/api/mcp` relisant le consentement à chaque requête, l'accès
 * tombe tout de suite. Rend le nombre d'autorisations effacées.
 */
export async function reglerOutilsNonVerifies(compteId: string, ouvert: boolean): Promise<number> {
  if (!compteId) throw new Error("réglage des outils non vérifiés sans compte");
  return prisma.$transaction(async (tx) => {
    await tx.compte.update({ where: { id: compteId }, data: { outilsNonVerifiesAutorises: ouvert } });
    if (ouvert) return 0;
    const consentements = await tx.oauthConsent.findMany({
      where: { referenceId: compteId },
      select: { id: true, clientId: true, client: { select: { redirectUris: true } } },
    });
    const aEffacer = consentements.filter((c) => niveauDuClient(c.client.redirectUris) === "non_verifie");
    if (aEffacer.length === 0) return 0;
    await oublierAssistants(compteId, undefined, tx, [...new Set(aEffacer.map((c) => c.clientId))]);
    return aEffacer.length;
  });
}

/**
 * Retire un assistant : le consentement disparaît, et ses jetons de
 * rafraîchissement pour ce compte sont révoqués — sans quoi l'assistant
 * continuerait d'en obtenir de nouveaux. ~~Le jeton d'accès en cours (un JWT,
 * non révocable) meurt au plus tard quinze minutes après.~~ [2026-11-23 :
 * il est refusé tout de suite — `/api/mcp` relit le consentement à chaque
 * requête (`mcp/acces-compte.ts`).] Rend `false` si le
 * consentement n'est pas celui de la personne sur ce compte.
 */
export async function retirerAssistant(userId: string, compteId: string, consentementId: string): Promise<boolean> {
  // La colonne est un `uuid` : un champ vide ou modifié à la main ne désigne
  // rien, et ne doit pas faire échouer la requête.
  if (!z.uuid().safeParse(consentementId).success) return false;
  return prisma.$transaction(async (tx) => {
    const consentement = await tx.oauthConsent.findFirst({
      where: { id: consentementId, userId, referenceId: compteId },
      select: { id: true, clientId: true },
    });
    if (!consentement) return false;
    await tx.oauthConsent.delete({ where: { id: consentement.id } });
    await tx.oauthRefreshToken.updateMany({
      where: { userId, clientId: consentement.clientId, referenceId: compteId, revoked: null },
      data: { revoked: new Date() },
    });
    return true;
  });
}

/** Ce qu'`oublierAssistants` touche : un client Prisma ou une transaction. */
type ClientOAuth = Pick<Prisma.TransactionClient, "oauthConsent" | "oauthRefreshToken" | "oauthAccessToken">;

/**
 * Efface les autorisations d'assistant portées par un compte — d'une
 * personne (`userId`), ou de tous ses membres : consentements, jetons de
 * rafraîchissement et jetons d'accès enregistrés. Au départ d'un membre (retiré
 * ou parti) et à la suppression du compte (ADR-058) : sans cela, une personne
 * réinvitée retrouverait un jeton de rafraîchissement vivant sans nouveau
 * consentement, et le compte effacé laisserait ces lignes derrière lui.
 * `/api/mcp` refuse déjà tout jeton d'une personne qui n'est plus membre.
 */
export async function oublierAssistants(
  compteId: string,
  userId?: string,
  client: ClientOAuth = prisma,
  /** Seulement ces clients OAuth (fermeture aux outils non vérifiés, ADR-062 § 12). */
  clientIds?: readonly string[],
): Promise<void> {
  if (!compteId) throw new Error("oubli d'autorisations sans compte");
  const where = { referenceId: compteId, ...(userId ? { userId } : {}), ...(clientIds ? { clientId: { in: [...clientIds] } } : {}) };
  await client.oauthRefreshToken.deleteMany({ where });
  await client.oauthAccessToken.deleteMany({ where });
  await client.oauthConsent.deleteMany({ where });
}

/** Le connecteur est-il ouvert pour ce compte ? (`connecteurOuvert`, formule Pro.) */
export async function connecteurOuvertPour(compteId: string): Promise<boolean> {
  const ligne = await prisma.abonnement.findUnique({ where: { compteId }, select: { statut: true, formule: true } });
  return connecteurOuvert(ligne);
}
