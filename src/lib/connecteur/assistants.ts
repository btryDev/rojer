import "server-only";
// Les assistants qu'une personne a autorisés sur un compte (ADR-062 § 8), et
// leur retrait. Lus dans les tables du fournisseur OAuth, hors compte au sens
// du client borné (`portee/correspondance.ts`) : on borne ici, à la main, par
// la personne ET par le compte du consentement (`referenceId`).
//
// Module hors compte nommé (`portee/imports.test.ts`).

import { prisma } from "@/lib/prisma";
import { connecteurOuvert } from "@/lib/abonnements/connecteur";

export type AssistantAutorise = { id: string; nom: string; autoriseLe: Date | null };

/** Les consentements de la personne pour ce compte, le plus récent d'abord. */
export async function assistantsAutorises(userId: string, compteId: string): Promise<AssistantAutorise[]> {
  const lignes = await prisma.oauthConsent.findMany({
    where: { userId, referenceId: compteId },
    select: { id: true, createdAt: true, updatedAt: true, client: { select: { name: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return lignes.map((l) => ({ id: l.id, nom: l.client.name ?? "Assistant sans nom", autoriseLe: l.updatedAt ?? l.createdAt }));
}

/**
 * Retire un assistant : le consentement disparaît, et ses jetons de
 * rafraîchissement pour ce compte sont révoqués — sans quoi l'assistant
 * continuerait d'en obtenir de nouveaux. Le jeton d'accès en cours (un JWT,
 * non révocable) meurt au plus tard quinze minutes après. Rend `false` si le
 * consentement n'est pas celui de la personne sur ce compte.
 */
export async function retirerAssistant(userId: string, compteId: string, consentementId: string): Promise<boolean> {
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

/** Le connecteur est-il ouvert pour ce compte ? (`connecteurOuvert`, formule Pro.) */
export async function connecteurOuvertPour(compteId: string): Promise<boolean> {
  const ligne = await prisma.abonnement.findUnique({ where: { compteId }, select: { statut: true, formule: true } });
  return connecteurOuvert(ligne);
}
