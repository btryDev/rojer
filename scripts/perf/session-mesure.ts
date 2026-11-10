#!/usr/bin/env tsx
/**
 * Le compte et la session de la mesure des pages (plan performance, lot 0 ;
 * ADR-052). Remplace le faux serveur Auth Supabase (`faux-auth.mjs`) : la
 * session est une VRAIE session Better Auth, créée par la configuration de
 * l'app (inscription, adresse marquée confirmée, connexion), donc lue par
 * `requireUser` exactement comme en production.
 *
 *   pnpm exec tsx --import ./scripts/server-only-hors-next.mjs \
 *     scripts/perf/session-mesure.ts <fichier-id> <fichier-cookie>
 *
 * Écrit l'identifiant du compte (pour `seed:complet --user`) et l'en-tête
 * `cookie` à rejouer (pour `mesurer.mjs`, via MESURE_COOKIE_FICHIER). Exige
 * DATABASE_URL et BETTER_AUTH_SECRET — le même secret que le serveur mesuré.
 * Base de mesure seulement : le mot de passe est écrit ici.
 */
import { writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { ouvrirSession } from "./ouvrir-session";

const EMAIL = "mesure@rojer.invalid";
const MOT_DE_PASSE = "mesure-des-pages-perf";

async function main(): Promise<void> {
  const [fichierId, fichierCookie] = process.argv.slice(2);
  if (!fichierId || !fichierCookie) {
    throw new Error("Usage : session-mesure.ts <fichier-id> <fichier-cookie>");
  }

  const { userId, cookie } = await ouvrirSession(EMAIL, MOT_DE_PASSE);

  writeFileSync(fichierId, userId);
  writeFileSync(fichierCookie, cookie);
  console.log(`Compte de mesure ${userId}, session écrite dans ${fichierCookie}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
