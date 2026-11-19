import type { ObjetSignable, PartieSignataire, Prisma } from "@prisma/client";

/**
 * Une re-signature après correction ne compte pas dans le plafond annuel de
 * signatures de la formule (ADR-061 § 6, décision de la propriétaire du
 * 2026-11-19) : le client ne paie pas deux fois le même plan, et une
 * correction demandée par l'entreprise extérieure ne le pénalise pas.
 *
 * **Module pur, sans `"use server"`.**
 *
 * « Déjà comptée » se lit sur des FAITS structurés, jamais sur un texte libre
 * (relecture du 2026-11-19 : un motif de révocation se réécrit), et pour la
 * MÊME PERSONNE — sinon un plan vidé puis réécrit pour une autre entreprise
 * se ferait signer gratuitement à l'infini :
 * - une signature révoquée de cette partie, par cette adresse ;
 * - ou une proposition de modification faite depuis un lien de cette partie,
 *   envoyé à cette adresse (le lien a été compté à son émission, et la
 *   proposition l'a fait tomber avant qu'il serve).
 */
export async function signatureDejaComptee(
  /** Le client borné au compte, ou sa transaction (ADR-051). */
  db: Prisma.TransactionClient,
  params: {
    etablissementId: string;
    objetType: ObjetSignable | string;
    objetId: string;
    partie?: PartieSignataire | null;
    /** L'adresse de qui signera : celle du lien, ou celle du compte. */
    email: string | null | undefined;
  },
): Promise<boolean> {
  const email = params.email?.trim().toLowerCase();
  if (params.objetType !== "plan_prevention" || !params.partie || !email) return false;
  const { etablissementId, objetId, partie } = params;
  const revoquees = await db.signature.count({
    where: { etablissementId, objetType: "plan_prevention", objetId, partie, signataireEmail: email, active: null },
  });
  if (revoquees > 0) return true;
  const propositions = await db.propositionModificationPlan.findMany({
    where: { etablissementId, planPreventionId: objetId },
    select: { accessTokenId: true },
  });
  if (propositions.length === 0) return false;
  const liens = await db.accessToken.count({
    where: {
      etablissementId,
      id: { in: propositions.map((p) => p.accessTokenId) },
      partie,
      emailDestinataire: email,
    },
  });
  return liens > 0;
}
