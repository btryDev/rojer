import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { motifErreur, sendMail } from "@/lib/email";
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

/** L'adresse de l'app : la variable en production, localhost en développement. */
function adresseApp(): string | undefined {
  return (
    process.env.PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000")
  );
}

/** Un e-mail de compte : l'échec se journalise, jamais ne s'avale. */
async function envoyer(to: string, subject: string, lignes: string[]): Promise<void> {
  try {
    await sendMail({ to, subject, text: lignes.join("\n") });
  } catch (e) {
    console.error(
      JSON.stringify({ type: "envoi_mail_compte_echoue", sujet: subject, motif: motifErreur(e) }),
    );
  }
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
    sendResetPassword: async ({ user, token }) => {
      await envoyer(user.email, "Rojer — réinitialiser votre mot de passe", [
        "Bonjour,",
        "",
        "Pour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :",
        lienReinitialisation(token),
        "",
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.",
      ]);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Une connexion sur un compte non confirmé renvoie un lien.
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: UN_JOUR,
    sendVerificationEmail: async ({ user, token }) => {
      await envoyer(user.email, "Rojer — confirmez votre adresse", [
        "Bonjour,",
        "",
        "Pour confirmer votre adresse et activer votre compte Rojer, ouvrez ce lien (valable 24 heures) :",
        lienVerification(token),
        "",
        "Si vous n'avez pas créé de compte, ignorez ce message.",
      ]);
    },
  },
  session: {
    // En base, sans cache de cookie : une session fermée l'est tout de suite.
    expiresIn: SEPT_JOURS,
    updateAge: UN_JOUR,
  },
  // `nextCookies` en dernier : sans lui, une connexion faite dans une action
  // serveur ne pose pas de cookie.
  plugins: [nextCookies()],
});
