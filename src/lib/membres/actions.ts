"use server";
// Les gestes de l'écran « Membres » (ADR-054 § 5 et § 6) et de l'invitation.
//
// Chaque geste passe par le plugin `organization` de Better Auth, qui vérifie
// lui-même la session et les droits du demandeur dans le compte. Rojer lui
// donne TOUJOURS le compte vérifié par `requireCompte` (`organizationId`),
// jamais celui de la session, et vérifie le rôle avant, pour un refus lisible.
// Le plugin garde aussi le dernier propriétaire (ni retiré, ni rétrogradé par
// un autre, ni parti seul).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifierRole, verifierSaisie } from "@/lib/abonnements/saisie";
import { requireCompte } from "@/lib/auth/compte";
import { auth } from "@/lib/auth/better-auth";
import { entetesDeSession } from "@/lib/auth/require-user";
import { requireInvitationDeLaSession } from "@/lib/auth/scope";
import { ROLES } from "@/lib/auth/roles";

export type EtatMembres = { status: "idle" | "success" | "error"; message?: string };

const PAGE = "/compte/membres";
const REFUS_PROPRIETAIRE: EtatMembres = { status: "error", message: "Seul un propriétaire du compte peut faire ce geste." };

/** Le code d'erreur du plugin, s'il en porte un. */
function codeDe(e: unknown): string | null {
  const corps = (e as { body?: { code?: unknown } } | null)?.body;
  return typeof corps?.code === "string" ? corps.code : null;
}

const MESSAGES: Record<string, string> = {
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "Cette personne est déjà membre du compte.",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
    "Le compte doit garder au moins un propriétaire : nommez-en un autre d'abord.",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
    "Le compte doit garder au moins un propriétaire : nommez-en un autre d'abord.",
};

function refus(e: unknown, contexte: string): EtatMembres {
  const code = codeDe(e);
  if (code && MESSAGES[code]) return { status: "error", message: MESSAGES[code] };
  console.error(JSON.stringify({ type: "membres_geste_refuse", contexte, code }));
  return { status: "error", message: "Ce geste n'a pas pu être fait. Réessayez, ou contactez l'assistance." };
}

const schemaInvitation = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
  role: z.enum(ROLES),
});

/** Inviter une personne par e-mail, avec un rôle. Propriétaire seulement. */
export async function inviterMembre(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  await verifierSaisie();
  const { compte } = await requireCompte();
  if (compte.role !== "owner") return REFUS_PROPRIETAIRE;
  const lu = schemaInvitation.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!lu.success) return { status: "error", message: lu.error.issues[0]?.message ?? "Formulaire invalide" };
  try {
    await auth.api.createInvitation({
      headers: await entetesDeSession(),
      body: { email: lu.data.email, role: lu.data.role, organizationId: compte.compteId },
    });
  } catch (e) {
    return refus(e, "inviter");
  }
  revalidatePath(PAGE);
  return { status: "success", message: `Invitation envoyée à ${lu.data.email}.` };
}

/** Annuler une invitation en attente. Propriétaire seulement. */
export async function annulerInvitation(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  await verifierSaisie();
  const { compte } = await requireCompte();
  if (compte.role !== "owner") return REFUS_PROPRIETAIRE;
  const invitationId = String(formData.get("invitationId") ?? "");
  try {
    // Le plugin vérifie que l'invitation est à un compte où le demandeur a le droit d'annuler.
    await auth.api.cancelInvitation({ headers: await entetesDeSession(), body: { invitationId } });
  } catch (e) {
    return refus(e, "annuler");
  }
  revalidatePath(PAGE);
  return { status: "success", message: "Invitation annulée." };
}

/**
 * Retirer un membre. Propriétaire seulement. Ouverte à un compte impayé (une
 * mesure de sécurité), pas à la lecture seule. L'accès tombe à la requête
 * suivante de la personne retirée (`requireCompte` relit `Membre`).
 */
export async function retirerMembre(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  await verifierRole();
  const { compte } = await requireCompte();
  if (compte.role !== "owner") return REFUS_PROPRIETAIRE;
  const membreId = String(formData.get("membreId") ?? "");
  if (!membreId || membreId.includes("@")) return { status: "error", message: "Membre introuvable." };
  try {
    await auth.api.removeMember({
      headers: await entetesDeSession(),
      body: { memberIdOrEmail: membreId, organizationId: compte.compteId },
    });
  } catch (e) {
    return refus(e, "retirer");
  }
  revalidatePath(PAGE);
  return { status: "success", message: "Membre retiré : son accès est fermé." };
}

/** Changer le rôle d'un membre. Propriétaire seulement ; effet à la requête suivante. */
export async function changerRoleMembre(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  await verifierSaisie();
  const { compte } = await requireCompte();
  if (compte.role !== "owner") return REFUS_PROPRIETAIRE;
  const membreId = String(formData.get("membreId") ?? "");
  const role = z.enum(ROLES).safeParse(formData.get("role"));
  if (!membreId || !role.success) return { status: "error", message: "Rôle invalide." };
  try {
    await auth.api.updateMemberRole({
      headers: await entetesDeSession(),
      body: { memberId: membreId, role: role.data, organizationId: compte.compteId },
    });
  } catch (e) {
    return refus(e, "changer_role");
  }
  revalidatePath(PAGE);
  return { status: "success", message: "Rôle modifié." };
}

/** Quitter le compte (tout rôle ; le dernier propriétaire ne le peut pas). */
export async function quitterCompte(_prev: EtatMembres): Promise<EtatMembres> {
  const { compte } = await requireCompte();
  try {
    await auth.api.leaveOrganization({ headers: await entetesDeSession(), body: { organizationId: compte.compteId } });
  } catch (e) {
    return refus(e, "quitter");
  }
  redirect("/");
}

/**
 * Accepter une invitation. Le plugin vérifie que l'adresse de la session est
 * celle de l'invitation, qu'elle est confirmée, et que l'invitation est
 * valable ; il fait du compte rejoint le compte actif de la session.
 */
export async function accepterInvitation(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  const invitationId = String(formData.get("invitationId") ?? "");
  await requireInvitationDeLaSession(invitationId);
  try {
    await auth.api.acceptInvitation({ headers: await entetesDeSession(), body: { invitationId } });
  } catch (e) {
    return refus(e, "accepter");
  }
  redirect("/");
}

/** Refuser une invitation adressée à la personne connectée. */
export async function refuserInvitation(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  const invitationId = String(formData.get("invitationId") ?? "");
  await requireInvitationDeLaSession(invitationId);
  try {
    await auth.api.rejectInvitation({ headers: await entetesDeSession(), body: { invitationId } });
  } catch (e) {
    return refus(e, "refuser");
  }
  redirect("/");
}
