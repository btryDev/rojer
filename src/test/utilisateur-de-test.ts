// Un compte `User` pour les tests d'intégration : sur cc, les tables métier
// pointent vers `User` (auteurs) et, depuis l'ADR-054, leurs racines vers un
// `Compte` dont la personne est membre.

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export async function creerUtilisateurDeTest(prisma: PrismaClient, id: string = randomUUID()): Promise<string> {
  await prisma.user.create({ data: { id, name: id, email: `${id}@exemple.test` } });
  return id;
}

export async function effacerUtilisateursDeTest(prisma: PrismaClient, ids: string[]): Promise<void> {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

/**
 * Un compte dont `userId` est membre (propriétaire par défaut), la personne
 * créée si elle n'existe pas. L'identifiant du compte est TIRÉ À PART : un
 * test qui confondrait la personne et le compte tomberait.
 */
export async function creerCompteDeTest(
  prisma: PrismaClient,
  userId: string,
  role: "owner" | "member" | "lecture" = "owner",
): Promise<string> {
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, name: userId, email: `${userId}@exemple.test` },
    update: {},
  });
  const compte = await prisma.compte.create({
    data: { name: `compte de ${userId}`, slug: randomUUID(), membres: { create: { userId, role } } },
    select: { id: true },
  });
  return compte.id;
}
