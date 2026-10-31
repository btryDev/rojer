// Un compte `User` pour les tests d'intégration : sur cc, `Entreprise.userId`
// est une clé vers `User`, le compte existe avant ses entreprises.

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export async function creerUtilisateurDeTest(prisma: PrismaClient, id: string = randomUUID()): Promise<string> {
  await prisma.user.create({ data: { id, name: id, email: `${id}@exemple.test` } });
  return id;
}

export async function effacerUtilisateursDeTest(prisma: PrismaClient, ids: string[]): Promise<void> {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
