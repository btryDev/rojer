import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { motifErreur, publicAppUrl, refusUrlPublique, sendMail } from "@/lib/email";
import { ENTETE_IP_CLIENT } from "./entete-ip";
import { lienReinitialisation, lienVerification } from "./liens-compte";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "./mot-de-passe";

/**
 * L'authentification (ADR-052) : Better Auth, ses tables dans notre base.
 *
 * Aucune route HTTP de Better Auth n'est montée (pas de `/api/auth/*`) : tout
 * passe par nos actions serveur et nos routes, qui appellent `auth.api.*` en
 * direct. La surface exposée reste celle de l'app, avec sa limitation de débit
 * (`securite/limite-debit.ts`) ; celle de Better Auth, qui ne protège que ses
 * routes HTTP, n'a rien à garder.
 *
 * Les liens envoyés par e-mail mènent à nos pages (`/auth/verification`,
 * `/auth/reinitialisation`), construits depuis `PUBLIC_APP_URL` : jamais
 * depuis la requête, qu'un en-tête forgé ferait pointer ailleurs.
 */

const SEPT_JOURS = 60 * 60 * 24 * 7;
const UN_JOUR = 60 * 60 * 24;

/**
 * L'adresse de l'app, par la règle commune (`@/lib/email`). Elle décide aussi
 * des cookies : `Secure` et le préfixe `__Secure-` viennent d'une adresse en
 * https. Absente en production, `env.ts` arrête le démarrage ; pendant le
 * build, elle peut manquer sans dommage (aucune session n'y est servie).
 */
function adresseApp(): string | undefined {
  return refusUrlPublique() ? undefined : publicAppUrl();
}

/**
 * Un e-mail de compte part SANS être attendu : Better Auth attend sa fonction
 * d'envoi, et l'appel à Mailpace n'a lieu que pour un compte existant (mot de
 * passe oublié) ou nouveau (inscription). L'attendre rendait la réponse plus
 * lente dans un cas que dans l'autre, et le chronomètre disait qui a un compte
 * (revue de sécurité de la PR #135). L'échec se journalise, jamais ne s'avale.
 */
function envoyer(to: string, subject: string, lignes: string[]): Promise<void> {
  void sendMail({ to, subject, text: lignes.join("\n") }).catch((e: unknown) => {
    console.error(
      JSON.stringify({ type: "envoi_mail_compte_echoue", sujet: subject, motif: motifErreur(e) }),
    );
  });
  return Promise.resolve();
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: adresseApp(),
  trustedOrigins: () => [adresseApp()],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  verification: { modelName: "authVerification" },
  advanced: {
    database: { generateId: "uuid" },
    ipAddress: { ipAddressHeaders: [ENTETE_IP_CLIENT] },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: LONGUEUR_MIN_MOT_DE_PASSE,
    maxPasswordLength: 128,
    // Un mot de passe réinitialisé ferme toutes les sessions ouvertes.
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: ({ user, token }) =>
      envoyer(user.email, "Rojer — réinitialiser votre mot de passe", [
        "Bonjour,",
        "",
        "Pour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :",
        lienReinitialisation(token),
        "",
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.",
      ]),
    // Une adresse déjà inscrite reçoit la même réponse qu'une nouvelle (pas
    // d'énumération) ; si son compte n'est pas encore confirmé — lien de 24 h
    // expiré —, elle reçoit un nouveau lien au lieu de n'avoir rien.
    onExistingUserSignUp: async ({ user }) => {
      if (!user.emailVerified) {
        await auth.api.sendVerificationEmail({ body: { email: user.email } });
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Une connexion sur un compte non confirmé renvoie un lien.
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: UN_JOUR,
    sendVerificationEmail: ({ user, token }) =>
      envoyer(user.email, "Rojer — confirmez votre adresse", [
        "Bonjour,",
        "",
        "Pour confirmer votre adresse et activer votre compte Rojer, ouvrez ce lien (valable 24 heures) :",
        lienVerification(token),
        "",
        "Si vous n'avez pas créé de compte, ignorez ce message.",
      ]),
  },
  session: {
    // En base, sans cache de cookie : une session fermée l'est tout de suite.
    // Sept jours depuis la connexion, sans prolongation : prolongée pendant le
    // rendu d'une page, la session l'était en base mais pas dans le cookie
    // (un composant serveur ne peut pas écrire de cookie), et la déconnexion
    // tombait au septième jour malgré tout (revue de la PR #135).
    expiresIn: SEPT_JOURS,
    disableSessionRefresh: true,
  },
  // `nextCookies` en dernier : sans lui, une connexion faite dans une action
  // serveur ne pose pas de cookie.
  plugins: [nextCookies()],
});
