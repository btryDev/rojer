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
 * en est membre, sinon son seul compte. `null` si elle n'est membre d'aucun
 * compte, ou de plusieurs sans en avoir choisi un qu'elle tienne encore.
 */
export async function appartenanceCourante(
  userId: string,
  compteActifId: string | null | undefined,
): Promise<Appartenance | null> {
  const lignes = await prisma.membre.findMany({
    where: { userId },
    select: { compteId: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  const valides = lignes.filter((l): l is Appartenance => estRole(l.role));
  const active = compteActifId ? valides.find((l) => l.compteId === compteActifId) : undefined;
  if (active) return active;
  return valides.length === 1 ? valides[0] : null;
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
export async function creerCompte(userId: string, nom: string): Promise<Appartenance> {
  const compte = await auth.api.createOrganization({
    body: { userId, name: nom, slug: randomUUID(), keepCurrentActiveOrganization: true },
  });
  if (!compte) throw new Error("création du compte refusée par le plugin organization");
  return { compteId: compte.id, role: "owner" };
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
