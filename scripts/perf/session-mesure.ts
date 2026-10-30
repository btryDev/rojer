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
import { auth } from "../../src/lib/auth/better-auth";
import { prisma } from "../../src/lib/prisma";

const EMAIL = "mesure@rojer.invalid";
const MOT_DE_PASSE = "mesure-des-pages-perf";

async function main(): Promise<void> {
  const [fichierId, fichierCookie] = process.argv.slice(2);
  if (!fichierId || !fichierCookie) {
    throw new Error("Usage : session-mesure.ts <fichier-id> <fichier-cookie>");
  }

  if (!(await prisma.user.findUnique({ where: { email: EMAIL } }))) {
    await auth.api.signUpEmail({ body: { email: EMAIL, password: MOT_DE_PASSE, name: EMAIL } });
  }
  const user = await prisma.user.update({
    where: { email: EMAIL },
    data: { emailVerified: true },
    select: { id: true },
  });

  const reponse = await auth.api.signInEmail({
    body: { email: EMAIL, password: MOT_DE_PASSE },
    asResponse: true,
  });
  const cookie = reponse.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => /session_token=/.test(c));
  if (!reponse.ok || !cookie) {
    throw new Error(`Connexion de mesure refusée (${reponse.status}).`);
  }

  writeFileSync(fichierId, user.id);
  writeFileSync(fichierCookie, cookie);
  console.log(`Compte de mesure ${user.id}, session écrite dans ${fichierCookie}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
