import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
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
const TRENTE_JOURS = UN_JOUR * 30;

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
async function envoyer(to: string, subject: string, lignes: string[]): Promise<void> {
  // Sans `after()` de Next : Better Auth l'appelle aussi hors requête (script
  // de mesure), et Clever Cloud sert depuis un processus Node durable, qui
  // mène la promesse à son terme.
  void sendMail({ to, subject, text: lignes.join("\n") }).catch((e: unknown) => {
    console.error(
      JSON.stringify({ type: "envoi_mail_compte_echoue", sujet: subject, motif: motifErreur(e) }),
    );
  });
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: adresseApp(),
  trustedOrigins: () => [adresseApp()],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  verification: { modelName: "authVerification" },
  advanced: {
    // Pas de `joins` : avec Prisma (chargement des relations par requêtes
    // séparées), la session puis son compte restent deux requêtes, mesuré en
    // CI (budget de la PR #135) — l'option ne gagnait rien.
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
  plugins: [
    // Double authentification (ADR-052 § 7), proposée, non imposée : une
    // application d'authentification (TOTP) et des codes de secours, chiffrés
    // par le secret. PAS de code par e-mail (`otpOptions` absent, décision du
    // 2026-10-30) : qui tient la boîte tient déjà la réinitialisation du mot
    // de passe, et le second facteur ne protégerait plus que d'un mot de passe
    // divulgué.
    //
    // À la connexion, le plugin remplace la session par un défi de dix
    // minutes (cookie signé) ; `/login/code` le relève. Cinq essais par défi,
    // et le compte se verrouille quinze minutes après dix échecs consécutifs,
    // défis confondus. Sa propre limitation de débit ne garde que ses routes
    // HTTP, que nous ne montons pas : nos actions posent la leur.
    twoFactor({
      issuer: "Rojer",
      backupCodeOptions: { amount: 10, storeBackupCodes: "encrypted" },
      twoFactorCookieMaxAge: 10 * 60,
      trustDeviceMaxAge: TRENTE_JOURS,
      accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 15 * 60 },
    }),
    // `nextCookies` en dernier : sans lui, une connexion faite dans une action
    // serveur ne pose pas de cookie — ni celui du défi de double authentification.
    nextCookies(),
  ],
});
