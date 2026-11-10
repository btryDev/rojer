/**
 * Un compte et sa session Better Auth, pour les mesures (plan performance,
 * lot 0 ; test de charge, `docs/plan-test-de-charge.md` § 4). Partagé par
 * `session-mesure.ts` (un compte) et `scripts/charge/semer-comptes.ts` (N).
 *
 * La session est une VRAIE session Better Auth, créée par la configuration de
 * l'app (inscription, adresse marquée confirmée, connexion), donc lue par
 * `requireUser` exactement comme en production. Les appels passent par
 * `auth.api`, pas par les actions de l'app : la limite de débit de la
 * connexion (`LIMITES.connexionIp`) ne s'y applique pas, et c'est voulu —
 * cinquante connexions depuis une machine la toucheraient. Elle n'est pas
 * desserrée : la connexion se mesure à part, à petit volume.
 *
 * Exige DATABASE_URL et BETTER_AUTH_SECRET — le même secret que le serveur
 * mesuré, sans quoi le cookie est refusé. Bases de mesure seulement : le mot
 * de passe est écrit dans les scripts.
 */
import { auth } from "../../src/lib/auth/better-auth";
import { prisma } from "../../src/lib/prisma";

export type SessionDeMesure = { userId: string; cookie: string };

export async function ouvrirSession(email: string, motDePasse: string): Promise<SessionDeMesure> {
  if (!(await prisma.user.findUnique({ where: { email } }))) {
    await auth.api.signUpEmail({ body: { email, password: motDePasse, name: email } });
  }
  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: true },
    select: { id: true },
  });

  const reponse = await auth.api.signInEmail({
    body: { email, password: motDePasse },
    asResponse: true,
  });
  const cookie = reponse.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => /session_token=/.test(c));
  if (!reponse.ok || !cookie) {
    throw new Error(`Connexion de mesure refusée pour ${email} (${reponse.status}).`);
  }
  return { userId: user.id, cookie };
}
