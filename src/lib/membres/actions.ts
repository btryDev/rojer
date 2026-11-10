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
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { refusInvitationBaissePrevue } from "@/lib/abonnements/baisse";
import { motifPlafondMembres } from "@/lib/abonnements/quotas";
import { getOptionalCompte, requireCompte } from "@/lib/auth/compte";
import { annulerInvitationsEnAttenteDe, comptesDeLaPersonne, invitationsDuCompte } from "@/lib/auth/membres";
import { auth } from "@/lib/auth/better-auth";
import { entetesDeSession } from "@/lib/auth/require-user";
import { requireInvitationDeLaSession } from "@/lib/auth/scope";
import { MESSAGE_COMPTE_CHANGE, memeCompteQueLaPage } from "@/lib/auth/compte-attendu";
import { ROLES } from "@/lib/auth/roles";
import { cleLimite, consommer, LIMITES, messageTropDeTentatives } from "@/lib/securite/limite-debit";
import { envoiEnService, refusUrlPublique } from "@/lib/email";

export type EtatMembres = { status: "idle" | "success" | "error"; message?: string };

const PAGE = "/compte/membres";
const REFUS_PROPRIETAIRE: EtatMembres = { status: "error", message: "Seul un propriétaire du compte peut faire ce geste." };

/**
 * Le compte, si la personne en est PROPRIÉTAIRE ; sinon le refus à rendre. Un
 * lecteur n'étant jamais propriétaire, la lecture seule est fermée du même coup.
 * Seule l'invitation, qui ajoute une place, passe aussi par `verifierSaisie`
 * (abonnement) : retirer, annuler, changer un rôle restent possibles à un
 * compte impayé — ce sont des mesures de sécurité.
 */
async function proprietaireOuRefus(): Promise<
  Pick<Awaited<ReturnType<typeof requireCompte>>, "compte" | "db"> | { refus: EtatMembres }
> {
  const { compte, db } = await requireCompte();
  return compte.role === "owner" ? { compte, db } : { refus: REFUS_PROPRIETAIRE };
}

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
  // Plafond d'utilisateurs de la formule, à l'acceptation (ADR-053 § 14) : la
  // personne invitée ne voit pas la formule du compte qui l'invite.
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED:
    "Ce compte a atteint le nombre d'utilisateurs de sa formule : demandez à son propriétaire de passer à une formule supérieure.",
};


function refus(e: unknown, contexte: string): EtatMembres {
  const code = codeDe(e);
  if (code && MESSAGES[code]) return { status: "error", message: MESSAGES[code] };
  console.error(JSON.stringify({ type: "membres_geste_refuse", contexte, code }));
  return { status: "error", message: "Ce geste n'a pas pu être fait. Réessayez, ou contactez l'assistance." };
}

/** Le refus d'un geste parti d'un onglet resté sur un autre compte ; la page se rend sur le compte actif. */
function compteChange(): EtatMembres {
  revalidatePath(PAGE);
  return { status: "error", message: MESSAGE_COMPTE_CHANGE };
}

const schemaInvitation = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
  role: z.enum(ROLES),
});

/** Inviter une personne par e-mail, avec un rôle. Propriétaire seulement. */
export async function inviterMembre(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  const juge = await verifierSaisie();
  const p = await proprietaireOuRefus();
  if ("refus" in p) return p.refus;
  const { compte, db } = p;
  // Deux contrôles, deux motifs (audit du 2026-11-10). Piste 2 : le plugin
  // écrit l'invitation hors du client borné, donc le compte visé doit être
  // celui dont la saisie vient d'être jugée. Point 8 : le geste ne porte aucun
  // identifiant, donc le compte doit être celui que montrait la page.
  if ((juge && juge !== compte.compteId) || !memeCompteQueLaPage(formData, compte.compteId)) return compteChange();
  const lu = schemaInvitation.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!lu.success) return { status: "error", message: lu.error.issues[0]?.message ?? "Formulaire invalide" };
  // Une baisse de formule planifiée borne déjà les utilisateurs (ADR-053 § 10).
  const baisse = await refusInvitationBaissePrevue(db, compte.compteId);
  if (baisse) return { status: "error", message: baisse };
  // Sans pilote d'e-mail réel (ou sans adresse publique pour le lien), aucune
  // invitation ne partirait : on le dit avant d'en créer une (même règle que
  // l'inscription et les liens prestataires).
  if (refusUrlPublique() !== null || !envoiEnService())
    return { status: "error", message: "L'envoi des invitations est momentanément hors service. Réessayez plus tard." };
  // Chaque invitation est un e-mail Rojer vers un tiers : plafonnée par compte.
  const verdict = await consommer([
    { cle: cleLimite("invitation", "compte", compte.compteId), limite: LIMITES.invitationCompte },
  ]);
  if (!verdict.ok) return { status: "error", message: messageTropDeTentatives(verdict.reessayerDansSecondes) };
  let invitationId: string | null = null;
  try {
    const creee = await auth.api.createInvitation({
      headers: await entetesDeSession(),
      body: { email: lu.data.email, role: lu.data.role, organizationId: compte.compteId },
    });
    invitationId = (creee as { id?: string } | null)?.id ?? null;
  } catch (e) {
    // Plafond d'utilisateurs de la formule, invitations comprises (ADR-053 § 14).
    if (codeDe(e) === "INVITATION_LIMIT_REACHED") return { status: "error", message: await motifPlafondMembres(db, compte.compteId) };
    return refus(e, "inviter");
  }
  // Une baisse planifiée au même instant que cette invitation : la seconde
  // vérification la voit, et l'invitation de trop est retirée.
  const apres = await refusInvitationBaissePrevue(db, compte.compteId, { apresCreation: true });
  if (apres && invitationId) {
    const retirer = async () => auth.api.cancelInvitation({ headers: await entetesDeSession(), body: { invitationId } });
    await retirer().catch(retirer).catch((e: unknown) =>
      console.error(JSON.stringify({ type: "membres_invitation_non_retiree", invitationId, code: codeDe(e) })),
    );
    return { status: "error", message: apres };
  }
  revalidatePath(PAGE);
  return { status: "success", message: `Invitation envoyée à ${lu.data.email}.` };
}

/** Annuler une invitation en attente. Propriétaire seulement. */
export async function annulerInvitation(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  const p = await proprietaireOuRefus();
  if ("refus" in p) return p.refus;
  const invitationId = String(formData.get("invitationId") ?? "");
  // L'invitation doit être à CE compte (le plugin, lui, juge le compte de
  // l'invitation) : la même réponse pour une invitation d'ailleurs ou inconnue.
  if (!(await invitationsDuCompte(p.compte.compteId)).some((i) => i.id === invitationId))
    return { status: "error", message: "Invitation introuvable." };
  try {
    await auth.api.cancelInvitation({ headers: await entetesDeSession(), body: { invitationId } });
  } catch (e) {
    return refus(e, "annuler");
  }
  revalidatePath(PAGE);
  return { status: "success", message: "Invitation annulée." };
}

/**
 * Retirer un membre. Propriétaire seulement. L'accès tombe à la requête
 * suivante de la personne retirée (`requireCompte` relit `Membre`), et ses
 * invitations en attente avec lui (crochet `afterRemoveMember`).
 */
export async function retirerMembre(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  const p = await proprietaireOuRefus();
  if ("refus" in p) return p.refus;
  const { compte } = p;
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
  const p = await proprietaireOuRefus();
  if ("refus" in p) return p.refus;
  const { compte } = p;
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

/**
 * Quitter le compte (tout rôle ; le dernier propriétaire ne le peut pas). Le
 * compte quitté est celui que la page montrait : un autre onglet a pu changer
 * le compte actif de la session.
 */
export async function quitterCompte(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  const { user, compte } = await requireCompte();
  if (!memeCompteQueLaPage(formData, compte.compteId)) return compteChange();
  try {
    await auth.api.leaveOrganization({ headers: await entetesDeSession(), body: { organizationId: compte.compteId } });
  } catch (e) {
    return refus(e, "quitter");
  }
  // Ses invitations en attente tombent avec son départ (l'acceptation les
  // refuserait de toute façon : l'invitant n'est plus propriétaire).
  await annulerInvitationsEnAttenteDe(user.id, compte.compteId);
  redirect("/entreprises");
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
  redirect("/entreprises");
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
  // Avec un compte, retour au dossier ; sans, l'onboarding (qui montrera une
  // autre invitation en attente s'il y en a une).
  redirect((await getOptionalCompte()) ? "/entreprises" : "/onboarding");
}

/**
 * Travailler sur un autre de ses comptes (ADR-054 § 7). Le compte demandé doit
 * être l'un de ceux dont la personne est membre, relus en base ; le plugin
 * revérifie l'appartenance avant de poser le compte actif de la session.
 */
export async function choisirCompte(_prev: EtatMembres, formData: FormData): Promise<EtatMembres> {
  const { user } = await requireCompte();
  const compteId = String(formData.get("compte") ?? "");
  if (!(await comptesDeLaPersonne(user.id)).some((c) => c.compteId === compteId))
    return { status: "error", message: "Compte introuvable." };
  try {
    await auth.api.setActiveOrganization({ headers: await entetesDeSession(), body: { organizationId: compteId } });
  } catch (e) {
    return refus(e, "choisir_compte");
  }
  redirect("/entreprises");
}
