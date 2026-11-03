import "server-only";
// L'appartenance d'une personne à un compte (ADR-054 § 3), relue à chaque
// appel. C'est elle, et elle seule, qui fait d'un compte la portée d'une
// requête : `Session.compteActifId` n'est qu'une préférence. Le plugin
// `organization` ne remet à zéro le compte actif que dans la session de qui
// se retire lui-même (`crud-members.mjs`, 1.7.14) : les sessions d'un membre
// retiré le gardent, et il ne doit rien ouvrir.
//
// Module hors compte nommé (`portee/imports.test.ts`) : `Membre` et `Compte`
// ne passent pas par le client borné, qui ne sait les lire qu'une fois la
// portée connue.

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "./better-auth";
import { lireSessionCourante } from "./require-user";
import { estRole, type Role } from "./roles";

export type Appartenance = { compteId: string; role: Role };

/**
 * Le compte où la personne travaille : le compte actif de sa session si elle
 * en est membre, sinon le plus ancien de ses comptes (défaut raisonnable, comme
 * l'établissement actif, ADR-028). `null` seulement si elle n'est membre
 * d'aucun compte : c'est le seul cas où l'onboarding en crée un.
 */
export async function appartenanceCourante(
  userId: string,
  compteActifId: string | null | undefined,
): Promise<Appartenance | null> {
  const lignes = await prisma.membre.findMany({
    where: { userId },
    select: { compteId: true, role: true },
    // Le plus ancien d'abord, à égalité départagé par l'identifiant : deux
    // lectures concurrentes désignent le même (`compteDOnboarding`).
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const valides = lignes.filter((l): l is Appartenance => estRole(l.role));
  const active = compteActifId ? valides.find((l) => l.compteId === compteActifId) : undefined;
  return active ?? valides[0] ?? null;
}

/** L'appartenance de la personne de la session courante (`compteActifId` lu dans la session). */
export async function appartenanceDeLaSession(userId: string): Promise<Appartenance | null> {
  const session = await lireSessionCourante();
  return appartenanceCourante(userId, session?.session.activeOrganizationId);
}

/**
 * Crée un compte dont la personne est propriétaire : le premier établissement
 * d'une personne qui n'appartient à aucun compte (onboarding). Par le plugin,
 * en « action système » (sans en-têtes, `userId` fourni) : la création depuis
 * une session est fermée (`allowUserToCreateOrganization: false`). Le `slug`,
 * que le plugin exige unique, est tiré au hasard et jamais affiché.
 */
async function creerCompte(userId: string, nom: string): Promise<Appartenance> {
  const compte = await auth.api.createOrganization({
    body: { userId, name: nom, slug: randomUUID(), keepCurrentActiveOrganization: true },
  });
  if (!compte) throw new Error("création du compte refusée par le plugin organization");
  return { compteId: compte.id, role: "owner" };
}

/**
 * Le compte d'une personne qui n'en a aucun : créé par le plugin, puis relu.
 * Deux premiers onboardings simultanés (deux onglets) en créent chacun un ;
 * à la relecture, tous deux désignent le plus ancien, et celui qui ne l'est
 * pas supprime le sien — il est vide, l'établissement s'écrit après.
 */
export async function compteDOnboarding(userId: string, nom: string): Promise<Appartenance> {
  const cree = await creerCompte(userId, nom);
  const retenu = await appartenanceCourante(userId, null);
  if (retenu && retenu.compteId !== cree.compteId) {
    await prisma.compte.delete({ where: { id: cree.compteId } });
    return retenu;
  }
  return cree;
}

/**
 * Le compte dont la personne est l'UNIQUE propriétaire, ou `null` (aucun, ou
 * plusieurs : on ne devine pas). Sert à relire un client Stripe créé avant
 * l'ADR-054, qui ne désigne que son propriétaire (`metadata.userId`).
 */
export async function compteDontEstProprietaire(userId: string): Promise<string | null> {
  const lignes = await prisma.membre.findMany({ where: { userId, role: "owner" }, select: { compteId: true }, take: 2 });
  return lignes.length === 1 ? lignes[0].compteId : null;
}

// --- Lectures de l'écran « Membres » (ADR-054 § 5, § 6) --------------------
// Toutes prennent le compte déjà vérifié par `requireCompte` (jamais un
// identifiant reçu), ou l'adresse de la session.

export type MembreAffiche = { id: string; userId: string; nom: string; email: string; role: Role };

/** Les membres du compte, le plus ancien d'abord ; un rôle inconnu n'est pas affiché. */
export async function membresDuCompte(compteId: string): Promise<MembreAffiche[]> {
  const lignes = await prisma.membre.findMany({
    where: { compteId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, userId: true, role: true, user: { select: { name: true, email: true } } },
  });
  return lignes.flatMap((l) =>
    estRole(l.role) ? [{ id: l.id, userId: l.userId, nom: l.user.name, email: l.user.email, role: l.role }] : [],
  );
}

export type InvitationAffichee = { id: string; email: string; role: Role; expireLe: Date };

/** Les invitations du compte encore valables. */
export async function invitationsDuCompte(compteId: string, maintenant = new Date()): Promise<InvitationAffichee[]> {
  const lignes = await prisma.invitationCompte.findMany({
    where: { compteId, status: "pending", expiresAt: { gt: maintenant } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, expiresAt: true },
  });
  return lignes.flatMap((l) => (estRole(l.role) ? [{ id: l.id, email: l.email, role: l.role, expireLe: l.expiresAt }] : []));
}

export type InvitationRecue = { id: string; compte: string; role: Role; invitePar: string };

/**
 * Les invitations valables adressées à `email` (celle de la session, jamais
 * une adresse reçue) : ce que la personne peut accepter.
 */
export async function invitationsPourAdresse(email: string, maintenant = new Date()): Promise<InvitationRecue[]> {
  const lignes = await prisma.invitationCompte.findMany({
    where: { email: email.toLowerCase(), status: "pending", expiresAt: { gt: maintenant } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      compte: { select: { name: true } },
      inviter: { select: { name: true, email: true } },
    },
  });
  return lignes.flatMap((l) =>
    estRole(l.role)
      ? [{ id: l.id, compte: l.compte.name, role: l.role, invitePar: l.inviter.name || l.inviter.email }]
      : [],
  );
}

/**
 * L'invitation `id`, si elle est adressée à `email` (celle de la session) et
 * encore valable ; `null` sinon — une invitation adressée à un autre se lit
 * comme une invitation qui n'existe pas.
 */
export async function invitationAdresseeA(
  id: string,
  email: string,
  maintenant = new Date(),
): Promise<InvitationRecue | null> {
  const toutes = await invitationsPourAdresse(email, maintenant);
  return toutes.find((i) => i.id === id) ?? null;
}
