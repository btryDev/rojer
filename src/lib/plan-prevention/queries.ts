import "server-only";
import type { Prisma } from "@prisma/client";
import { requireCompte } from "@/lib/auth/compte";
import { requireEtablissement } from "@/lib/auth/scope";
import { listSignatures, listSignaturesRevoquees } from "@/lib/signatures/queries";
import { LIEN_PARTI } from "@/lib/access-tokens/revocation";

export async function listPlansPrevention(etablissementId: string) {
  const { db, etablissement } = await requireEtablissement(etablissementId);
  return db.planPrevention.findMany({
    where: { etablissementId: etablissement.id },
    orderBy: [{ numero: "desc" }],
    include: { _count: { select: { lignes: true } } },
  });
}

export async function getPlanPrevention(
  etablissementId: string,
  planId: string,
) {
  const { db, etablissement, user } = await requireEtablissement(etablissementId);
  const plan = await db.planPrevention.findFirst({
    where: { id: planId, etablissementId: etablissement.id },
    include: {
      lignes: { orderBy: { ordre: "asc" } },
      // Le 1° de `R. 4512-8`, à ne pas confondre avec `lignes` ci-dessus, qui
      // porte l'analyse d'interférence de `R. 4512-6` — voir
      // `contenu-r4512-8.ts`.
      phasesDangereuses: { orderBy: { ordre: "asc" } },
    },
  });
  if (!plan) return null;
  const [signatures, signaturesRevoquees, propositionEnAttente, liens, propositions] = await Promise.all([
    listSignatures(db, etablissement.id, "plan_prevention", plan.id),
    // ADR-061 : les signatures révoquées se montrent à part, et la
    // proposition de l'entreprise extérieure attend une décision.
    listSignaturesRevoquees(db, etablissement.id, "plan_prevention", plan.id),
    db.propositionModificationPlan.findFirst({
      where: { planPreventionId: plan.id, etablissementId: etablissement.id, enAttente: true },
      select: { id: true, contenu: true, createdAt: true, accessTokenId: true },
    }),
    // La fiche (2026-11-19) : les liens de signature de chaque partie et
    // l'historique — liens, propositions et décisions —, lus ici.
    db.accessToken.findMany({
      where: { etablissementId: etablissement.id, objetType: "plan_prevention", objetId: plan.id, scope: "signature" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        partie: true,
        emailDestinataire: true,
        nomDestinataire: true,
        createdAt: true,
        expireLe: true,
        utiliseLe: true,
        revoqueLe: true,
        revoqueMotif: true,
        otpExpireLe: true,
      },
    }),
    db.propositionModificationPlan.findMany({
      where: { planPreventionId: plan.id, etablissementId: etablissement.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        accessTokenId: true,
        statut: true,
        createdAt: true,
        traiteeLe: true,
        traiteeParEmail: true,
        corrigeeLe: true,
        finaliseeLe: true,
      },
    }),
  ]);
  const entreprise = await db.etablissement.findFirst({
    where: { id: etablissement.id },
    select: { entreprise: { select: { raisonSociale: true } } },
  });
  return {
    ...plan,
    signatures,
    signaturesRevoquees,
    propositionEnAttente,
    liens,
    propositions,
    // La fenêtre « Signer et envoyer » : qui signe, et au nom de quelle entreprise.
    raisonEU: entreprise?.entreprise.raisonSociale ?? "l'entreprise utilisatrice",
    vous: { nom: user.name?.trim() || user.email || "", email: user.email ?? "" },
  };
}

/**
 * Les plans de la liste qui ont un lien parti ou une signature en vigueur —
 * les autres s'affichent « Brouillon » (`etatAffichePlan`, 2026-11-19).
 */
export async function plansAvecLienOuSignature(etablissementId: string, planIds: string[]): Promise<Set<string>> {
  if (planIds.length === 0) return new Set();
  const { db, etablissement } = await requireEtablissement(etablissementId);
  return lienOuSignatureParPlan(db, etablissement.id, planIds);
}

/** La même lecture, sur le client borné de l'appelant (le ZIP de contrôle). */
export async function lienOuSignatureParPlan(
  db: Prisma.TransactionClient,
  etablissementId: string,
  planIds: string[],
): Promise<Set<string>> {
  if (planIds.length === 0) return new Set();
  const [liens, signatures] = await Promise.all([
    db.accessToken.findMany({
      where: { etablissementId, objetType: "plan_prevention", objetId: { in: planIds }, scope: "signature", ...LIEN_PARTI },
      select: { objetId: true },
    }),
    db.signature.findMany({
      where: { etablissementId, objetType: "plan_prevention", objetId: { in: planIds }, active: true },
      select: { objetId: true },
    }),
  ]);
  return new Set([...liens, ...signatures].map((x) => x.objetId));
}

/**
 * Le numéro suivant de la série de l'établissement. Même raison que
 * `nextNumeroPermisFeu` : un entier reste une lecture, et une lecture porte
 * sa portée (ADR-005).
 */
export async function nextNumeroPlan(
  etablissementId: string,
): Promise<number> {
  const { db } = await requireCompte();
  const last = await db.planPrevention.findFirst({
    where: {
      etablissementId,
    },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (last?.numero ?? 0) + 1;
}
