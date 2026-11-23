import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { organization } from "better-auth/plugins/organization";
import { estRole, libelleRole, ROLES_DU_PLUGIN } from "./roles";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { jwt } from "better-auth/plugins/jwt";
import { mcp } from "@better-auth/mcp";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import {
  DUREES_OAUTH,
  PORTEE_LECTURE,
  MODES_DE_JETON,
  PORTEES_FOURNISSEUR,
  estAdresseDeRetourAdmise,
  adressesDUnSeulTenant,
  niveauDuClient,
  nomReserve,
  estDocumentCimdAdmis,
  ressourceMcp,
} from "@/lib/mcp/oauth";
import { CLAIM_COMPTE, compteDuConsentement, doitChoisirLeCompte } from "@/lib/mcp/compte-oauth";
import { oublierAssistants } from "@/lib/connecteur/assistants";
import { oublierAppareilsDeConfiance } from "./appareils-de-confiance";
import { poserMotDePasseAvantConfirmation } from "./activation";
import { prisma } from "@/lib/prisma";
import { motifErreur, sendMail } from "@/lib/email";
import { adressePubliqueOuNull } from "@/lib/url-publique";
import { mailCompte, type MailCompte } from "@/lib/email/gabarit";
import { ENTETE_IP_CLIENT } from "./entete-ip";
import { cleLimite, consommer, LIMITES, type Limite } from "@/lib/securite/limite-debit";
import { lienConnexion, lienInvitation, lienMotDePasseOublie, lienReinitialisation, lienVerification } from "./liens-compte";
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
  return adressePubliqueOuNull() ?? undefined;
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
  message: MailCompte,
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
    // Mis en page depuis le 2026-11-16 (`email/gabarit.ts`), le texte brut à côté.
    await sendMail({ to, subject, ...mailCompte(message) });
  })().catch((e: unknown) => {
    console.error(
      JSON.stringify({ type: "envoi_mail_compte_echoue", sujet: subject, motif: motifErreur(e) }),
    );
  });
}

/**
 * Le fournisseur OAuth du connecteur MCP (ADR-062). Absent quand l'adresse
 * publique est inconnue (compilation sans environnement, production mal
 * configurée) : l'identifiant de ressource EST cette adresse, et un jeton
 * émis pour `localhost` en production ne vaudrait rien. Le connecteur reste
 * alors fermé, et `/api/mcp` répond comme une route absente.
 */
function pluginsConnecteurMcp() {
  const adresse = adresseApp();
  if (!adresse) return [];
  const ressource = ressourceMcp(adresse);
  /** Le compte actif de la session (`organization`), que le type du plugin `mcp` ne connaît pas. */
  const compteActif = (session: unknown) => (session as { activeOrganizationId?: string | null }).activeOrganizationId;
  return [
    // Le plugin `jwt` ne sert qu'à signer les jetons d'accès : sa route
    // `/token` (un JWT de session) est coupée (`disabledPaths`), et l'en-tête
    // `set-auth-jwt` aussi — aucun JWT de session n'atteint un navigateur.
    jwt({ disableSettingJwtHeader: true }),
    mcp({
      resource: ressource,
      loginPage: "/oauth/reprendre",
      consentPage: "/oauth/consentement",
      scopes: [...PORTEES_FOURNISSEUR],
      grantTypes: [...MODES_DE_JETON],
      resources: [{ identifier: ressource, name: "Rojer", allowedScopes: [PORTEE_LECTURE] }],
      // claude.ai s'enregistre par DCR, sans jeton préalable : c'est la seule
      // porte qu'il sait ouvrir. Bornée par les adresses de retour admises
      // (crochet `before` ci-dessous et `validateRedirectUri`) et par la
      // limite de débit (route `/api/auth/[...all]`).
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultScopes: [...PORTEES_FOURNISSEUR],
      clientRegistrationAllowedScopes: [...PORTEES_FOURNISSEUR],
      clientRegistrationDefaultApplicationType: "infer",
      // Au-delà de la correspondance exacte du plugin, l'adresse doit être
      // celle d'un assistant admis : un client enregistré avant un
      // resserrement de la liste n'en passe pas davantage.
      // Et, pour TOUT client — enregistré ou CIMD, que le crochet
      // d'enregistrement ne voit pas —, des adresses d'un seul tenant : sans
      // quoi le consentement donné par l'une servirait l'autre (ADR-062 § 12).
      validateRedirectUri: (adresseRetour, enregistrees, parDefaut) =>
        parDefaut && estAdresseDeRetourAdmise(adresseRetour) && adressesDUnSeulTenant(enregistrees),
      // Les limites du plugin comptent par IP, et les serveurs de claude.ai
      // rafraîchissent les jetons de TOUS ses utilisateurs depuis quelques
      // adresses : les défauts (20 jetons, 5 enregistrements par minute)
      // couperaient le connecteur dès une poignée de clients. L'enregistrement
      // garde en plus sa limite en base (route `/api/auth/[...all]`).
      rateLimit: {
        token: { window: 60, max: 600 },
        register: { window: 60, max: 60 },
      },
      accessTokenExpiresIn: DUREES_OAUTH.jetonAcces,
      refreshTokenExpiresIn: DUREES_OAUTH.jetonRafraichissement,
      codeExpiresIn: DUREES_OAUTH.codeAutorisation,
      // Le compte, choisi après la connexion (ADR-062 § 4, ADR-054) : une
      // personne membre de plusieurs comptes passe par `/oauth/compte`.
      postLogin: {
        page: "/oauth/compte",
        shouldRedirect: ({ user, session, isContinuation }) =>
          doitChoisirLeCompte(user.id, compteActif(session), isContinuation),
        consentReferenceId: ({ user, session }) =>
          compteDuConsentement(user.id, compteActif(session)),
      },
      // Le compte du consentement entre au jeton : le serveur de ressource le
      // lit, puis relit l'appartenance et l'abonnement (ADR-062 § 4).
      customAccessTokenClaims: ({ referenceId }) => {
        if (!referenceId) throw new APIError("BAD_REQUEST", { message: "consentement sans compte" });
        return { [CLAIM_COMPTE]: referenceId };
      },
    }),
    // Claude Code s'identifie par un document CIMD : récupéré par le
    // transport du plugin (résolution unique, adresses spéciales refusées,
    // sans redirection), et seulement chez les éditeurs admis.
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
      isMetadataDocumentUrlAllowed: (identifiant) => estDocumentCimdAdmis(identifiant),
    }),
  ];
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
  // Le JWT de session du plugin `jwt` n'est jamais servi (ADR-062 § 1).
  disabledPaths: ["/token"],
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
    // Un compte pas encore activé reçoit le lien d'ACTIVATION à la place : il
    // y choisit son mot de passe en une fois, au lieu de le choisir ici puis
    // de nouveau à l'activation (revue du 2026-11-16). La réponse de la page
    // ne change pas.
    sendResetPassword: async ({ user, token }) => {
      if (!user.emailVerified) {
        await auth.api.sendVerificationEmail({ body: { email: user.email } });
        return;
      }
      await envoyer(user.email, "Rojer — réinitialiser votre mot de passe", {
        titre: "Choisir un nouveau mot de passe",
        paragraphes: ["Vous avez demandé à changer le mot de passe de votre compte Rojer."],
        bouton: { libelle: "Choisir mon mot de passe", url: lienReinitialisation(token) },
        validite: "une heure",
        apres: [
          "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.",
        ],
      });
    },
    // Une adresse déjà inscrite reçoit la même réponse qu'une nouvelle (pas
    // d'énumération) ; si son compte n'est pas encore confirmé — lien de 24 h
    // expiré —, elle reçoit un nouveau lien au lieu de n'avoir rien. Déjà
    // actif : un message qui le dit et mène à la connexion (retours de test
    // du 2026-11-16 — la page annonçait un lien qui ne partait jamais). Envoi
    // détaché et plafonné, comme le lien : la réponse ne change pas.
    onExistingUserSignUp: async ({ user }) => {
      if (!user.emailVerified) {
        await auth.api.sendVerificationEmail({ body: { email: user.email } });
        return;
      }
      await envoyer(
        user.email,
        "Rojer — vous avez déjà un compte",
        {
          titre: "Vous avez déjà un compte Rojer",
          paragraphes: [
            "Une inscription vient d'être demandée avec cette adresse, qui a déjà un compte actif. Connectez-vous avec votre mot de passe habituel.",
            `Mot de passe oublié ? Choisissez-en un nouveau : ${lienMotDePasseOublie()}`,
          ],
          bouton: { libelle: "Me connecter", url: lienConnexion() },
          apres: ["Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien n'a changé sur votre compte."],
        },
        { action: "verification-envoi", limite: LIMITES.verificationEnvoiAdresse },
      );
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
        {
          titre: "Activez votre compte Rojer",
          paragraphes: [
            "Confirmez votre adresse pour activer votre compte. Vous choisirez ensuite votre mot de passe.",
          ],
          bouton: { libelle: "Activer mon compte", url: lienVerification(token) },
          validite: "24 heures",
          apres: ["Si vous n'avez pas créé de compte, ignorez ce message."],
        },
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
    // Enregistrement d'un client OAuth (ADR-062 §§ 3 et 12) : aucune adresse
    // de retour refusée (`http` hors boucle locale, schéma d'application…),
    // sinon le client n'est pas créé ; et un client qui n'est pas vérifié ne
    // porte pas le nom d'un assistant vérifié ni celui de Rojer.
    // `validateRedirectUri` garde aussi l'autorisation.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/oauth2/register") return;
      const corps = ctx.body as { redirect_uris?: unknown; client_name?: unknown } | undefined;
      const adresses = corps?.redirect_uris;
      const lisibles = Array.isArray(adresses) && adresses.length > 0 && adresses.every((a) => typeof a === "string");
      if (!lisibles || !(adresses as string[]).every(estAdresseDeRetourAdmise)) {
        throw new APIError("BAD_REQUEST", {
          error: "invalid_redirect_uri",
          error_description: "Adresse de retour refusée : HTTPS exigé, ou la boucle locale d'un programme de cet ordinateur.",
        });
      }
      if (!adressesDUnSeulTenant(adresses as string[])) {
        throw new APIError("BAD_REQUEST", {
          error: "invalid_redirect_uri",
          error_description: "Une adresse de retour non vérifiée ne se déclare pas avec d'autres : un client par outil.",
        });
      }
      const nom = typeof corps?.client_name === "string" ? corps.client_name : "";
      if (niveauDuClient(adresses as string[]) === "non_verifie" && nomReserve(nom)) {
        throw new APIError("BAD_REQUEST", {
          error: "invalid_client_metadata",
          error_description: "Ce nom est celui d'un assistant vérifié ou de Rojer : un outil non vérifié ne peut pas le porter.",
        });
      }
    }),
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
        envoyer(email, "Rojer — invitation à rejoindre un compte", {
          titre: "Invitation à rejoindre un compte Rojer",
          paragraphes: [
            `${(inviter.user.name && nomPourEmail(inviter.user.name)) || "Un propriétaire du compte"} vous invite à travailler sur le compte Rojer « ${nomPourEmail(organization.name)} », en tant que ${libelleRole(role)}.`,
          ],
          bouton: { libelle: "Voir l'invitation", url: lienInvitation(id) },
          validite: "7 jours",
          apres: [
            `Si vous n'avez pas encore de compte Rojer, créez-le avec cette adresse : ${email}.`,
            "Si vous ne vous attendiez pas à cette invitation, ignorez ce message.",
          ],
        }),
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
        // Ménage : les sessions de la personne retirée oublient ce compte, ses
        // invitations en attente tombent, et ses assistants autorisés sur ce
        // compte aussi (ADR-062 § 8). La sécurité n'en dépend pas —
        // `requireCompte` et `/api/mcp` relisent `Membre`, l'acceptation
        // relit l'invitant.
        afterRemoveMember: async ({ member }) => {
          await oublierAssistants(member.organizationId, member.userId);
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
    ...pluginsConnecteurMcp(),
    nextCookies(),
  ],
});
