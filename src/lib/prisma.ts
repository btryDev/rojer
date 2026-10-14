import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Les délais de transaction sont laissés à leurs défauts (5 s d'exécution,
    // 2 s d'attente d'une connexion). Ils avaient été desserrés le temps que
    // les deux transactions qui écrivaient ligne à ligne — resynchronisation du
    // calendrier et import de DUERP — soient réécrites en lots. Elles le sont :
    // plus aucune transaction du code n'enchaîne un nombre d'allers-retours
    // proportionnel à la donnée, toutes tiennent en quelques requêtes.
    //
    // Si un P2028 réapparaît, la réponse n'est pas de rallonger le délai mais
    // de chercher la boucle qui vient d'être introduite.
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
