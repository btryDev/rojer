import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { organization } from "better-auth/plugins/organization";
import { estRole, libelleRole, ROLES_DU_PLUGIN } from "./roles";
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { oublierAppareilsDeConfiance } from "./appareils-de-confiance";
import { poserMotDePasseAvantConfirmation } from "./activation";
import { prisma } from "@/lib/prisma";
import { motifErreur, publicAppUrl, refusUrlPublique, sendMail } from "@/lib/email";
import { ENTETE_IP_CLIENT } from "./entete-ip";
import { cleLimite, consommer, LIMITES, type Limite } from "@/lib/securite/limite-debit";
import { lienInvitation, lienReinitialisation, lienVerification } from "./liens-compte";
import { LONGUEUR_MAX_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "./mot-de-passe";

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
 * Un nom saisi par un utilisateur (personne, compte), mis dans un e-mail que
 * Rojer envoie à un tiers : une ligne, sans lien, 80 caractères au plus —
 * qu'un nom ne fasse pas d'une invitation Rojer un hameçonnage.
 */
export function nomPourEmail(brut: string): string {
  // Normaliser d'abord : formes de compatibilité (NFKC), caractères invisibles
  // retirés, points idéographiques ramenés au point.
  const normal = brut.normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/[\u3002\uFF0E\uFF61]/g, ".");
  // Puis rien de ce qu'une messagerie rendrait cliquable : un lien explicite,
  // et tout point collé entre deux caractères (domaine nu, adresse, IP) — le
  // point devient une espace ; « @ » disparaît.
  const sansLien = normal
    .replace(/\S*(?:https?:\/\/|www\.)\S*/giu, "[lien retiré]")
    .replace(/(?<=\S)\.(?=\S)/gu, " ")
    .replace(/@/g, " ");
  const uneLigne = sansLien.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  return uneLigne.length > 80 ? `${uneLigne.slice(0, 79)}…` : uneLigne;
}

/** Les invitations en attente qu'une personne a envoyées pour un compte tombent (ADR-054 § 6). */
async function annulerInvitationsDe(inviterId: string, compteId: string): Promise<void> {
  // Sans l'un des deux, Prisma ignorerait le filtre : toutes les invitations tomberaient.
  if (!inviterId || !compteId) throw new Error("annulation d'invitations sans personne ou sans compte");
  await prisma.invitationCompte.updateMany({
    where: { inviterId, compteId, status: "pending" },
    data: { status: "canceled" },
  });
}

/** Verrou du compte après dix seconds facteurs faux de suite (repris par le message). */
export const VERROU_DOUBLE_AUTH_MINUTES = 15;

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
async function envoyer(
  to: string,
  subject: string,
  lignes: string[],
  plafond?: { action: string; limite: Limite },
): Promise<void> {
  // Sans `after()` de Next : Better Auth l'appelle aussi hors requête (script
  // de mesure), et Clever Cloud sert depuis un processus Node durable, qui
  // mène la promesse à son terme.
  void (async () => {
    // Le plafond par destinataire se juge DANS l'envoi détaché : le consulter
    // avant de répondre rallongerait la réponse pour une adresse inscrite, et
    // le chronomètre redirait qui a un compte. Limites assumées (audit du
    // 2026-11-10) : un tiers qui réinscrit l'adresse en boucle épuise ce
    // plafond et retarde l'activation du titulaire — sans plus pouvoir
    // détourner le compte (`activation.ts`) — ; un envoi échoué compte.
    if (plafond) {
      const verdict = await consommer([
        { cle: cleLimite(plafond.action, "adresse", to.trim().toLowerCase()), limite: plafond.limite },
      ]);
      if (!verdict.ok) {
        console.warn(JSON.stringify({ type: "envoi_mail_compte_plafonne", sujet: subject }));
        return;
      }
    }
    await sendMail({ to, subject, text: lignes.join("\n") });
  })().catch((e: unknown) => {
    console.error(
      JSON.stringify({ type: "envoi_mail_compte_echoue", sujet: subject, motif: motifErreur(e) }),
    );
  });
}

/** Les limites du plugin d'organisation pour un compte (`abonnements/quotas.ts`). */
const limitesMembres = async (compteId: string) =>
  (await import("@/lib/abonnements/quotas")).limitesMembresDuPlugin(prisma, compteId);

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
    maxPasswordLength: LONGUEUR_MAX_MOT_DE_PASSE,
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
    // Qui confirme l'adresse choisit le mot de passe, posé AVANT la
    // confirmation ; hors de la page d'activation, la confirmation est
    // refusée (`activation.ts`, audit du 2026-11-10).
    beforeEmailVerification: async (user) => {
      await poserMotDePasseAvantConfirmation(user, await auth.$context);
    },
    sendVerificationEmail: ({ user, token }) =>
      envoyer(
        user.email,
        "Rojer — confirmez votre adresse",
        [
          "Bonjour,",
          "",
          "Pour confirmer votre adresse et activer votre compte Rojer, ouvrez ce lien (valable 24 heures) ; vous y choisirez votre mot de passe :",
          lienVerification(token),
          "",
          "Si vous n'avez pas créé de compte, ignorez ce message.",
        ],
        { action: "verification-envoi", limite: LIMITES.verificationEnvoiAdresse },
      ),
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
  hooks: {
    // Désactiver la double authentification oublie TOUS les appareils de
    // confiance du compte : le plugin n'efface que celui du navigateur qui
    // désactive, et les autres passeraient sans code à la réactivation.
    // Accroché à l'appel lui-même, l'invariant vaut quel que soit l'appelant.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/two-factor/disable" || isAPIError(ctx.context.returned)) return;
      const userId = ctx.context.session?.user.id;
      if (!userId) throw new Error("two-factor/disable réussi sans session lue : appareils de confiance non oubliés");
      await oublierAppareilsDeConfiance(ctx.context.adapter, userId);
    }),
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
      accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: VERROU_DOUBLE_AUTH_MINUTES * 60 },
    }),
    // Comptes et membres (ADR-054) : l'« organisation » du plugin est notre
    // `Compte`. Le plugin tient les membres, les rôles et les invitations ;
    // l'accès aux données, lui, ne croit jamais `compteActifId` : il relit
    // `Membre` à chaque appel (`auth/membres.ts`). Aucune création de compte
    // depuis une session : l'onboarding le crée par un appel serveur
    // (`compteDOnboarding`), que le plugin appelle « action système ».
    organization({
      allowUserToCreateOrganization: false,
      creatorRole: "owner",
      ac: ROLES_DU_PLUGIN.ac,
      roles: ROLES_DU_PLUGIN.roles,
      invitationExpiresIn: SEPT_JOURS,
      // Plafond d'utilisateurs de la formule, invitations comprises (ADR-053 §
      // 14). Import différé : `abonnements/saisie` remonte jusqu'ici.
      invitationLimit: async ({ organization }) => (await limitesMembres(organization.id)).invitations,
      membershipLimit: async (_user, organization) => (await limitesMembres(organization.id)).membres,
      cancelPendingInvitationsOnReInvite: true,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: ({ id, email, role, organization, inviter }) =>
        envoyer(email, "Rojer — invitation à rejoindre un compte", [
          "Bonjour,",
          "",
          `${(inviter.user.name && nomPourEmail(inviter.user.name)) || "Un propriétaire du compte"} vous invite à travailler sur le compte Rojer « ${nomPourEmail(organization.name)} », en tant que ${libelleRole(role)}.`,
          "",
          "Pour accepter, ouvrez ce lien (valable 7 jours) :",
          lienInvitation(id),
          "",
          `Si vous n'avez pas encore de compte Rojer, créez-le avec cette adresse : ${email}.`,
          "Si vous ne vous attendiez pas à cette invitation, ignorez ce message.",
        ]),
      organizationHooks: {
        // Un rôle, et l'un des trois (ADR-054 § 2) : le plugin accepterait
        // « member,lecture », que `estRole` écarte ensuite sans un mot.
        beforeCreateInvitation: async ({ invitation }) => {
          if (!estRole(invitation.role)) throw new Error(`rôle d'invitation refusé : ${invitation.role}`);
        },
        beforeUpdateMemberRole: async ({ newRole }) => {
          if (!estRole(newRole)) throw new Error(`rôle refusé : ${newRole}`);
        },
        // Une invitation ne vaut que tant que son auteur est PROPRIÉTAIRE du
        // compte (revue de sécurité des lots 3-4) : sinon un propriétaire
        // écarté, qui se serait invité à une seconde adresse, reprendrait le
        // compte. Le plugin ne revérifie pas l'invitant à l'acceptation.
        beforeAcceptInvitation: async ({ invitation }) => {
          const invitant = await prisma.membre.findUnique({
            where: { compteId_userId: { compteId: invitation.organizationId, userId: invitation.inviterId } },
            select: { role: true },
          });
          if (invitant?.role !== "owner") throw new Error("invitation dont l'auteur n'est plus propriétaire du compte");
        },
        // Ménage : les sessions de la personne retirée oublient ce compte, et
        // ses invitations en attente tombent. La sécurité n'en dépend pas —
        // `requireCompte` relit `Membre`, l'acceptation relit l'invitant.
        afterRemoveMember: async ({ member }) => {
          await prisma.session.updateMany({
            where: { userId: member.userId, compteActifId: member.organizationId },
            data: { compteActifId: null },
          });
          await annulerInvitationsDe(member.userId, member.organizationId);
        },
        afterUpdateMemberRole: async ({ member }) => {
          if (member.role !== "owner") await annulerInvitationsDe(member.userId, member.organizationId);
        },
      },
      schema: {
        organization: { modelName: "compte" },
        member: { modelName: "membre", fields: { organizationId: "compteId" } },
        invitation: { modelName: "invitationCompte", fields: { organizationId: "compteId" } },
        session: { fields: { activeOrganizationId: "compteActifId" } },
      },
    }),
    // `nextCookies` en dernier : sans lui, une connexion faite dans une action
    // serveur ne pose pas de cookie — ni celui du défi de double authentification.
    nextCookies(),
  ],
});
