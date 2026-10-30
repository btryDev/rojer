"use server";

// Server actions pour l'authentification : Better Auth (ADR-052), appelé en
// direct (`auth.api.*`) — aucune route HTTP de Better Auth n'est montée.
// E-mail et mot de passe, adresse confirmée avant toute session.

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAPIError } from "better-auth/api";
import { envoiEnService, motifErreur, refusUrlPublique } from "@/lib/email";
import { COOKIE_ETABLISSEMENT_ACTIF } from "@/lib/auth/scope";
import { auth, VERROU_DOUBLE_AUTH_MINUTES } from "./better-auth";
import { MESSAGE_MOT_DE_PASSE_DIVULGUE, motDePasseDivulgue } from "./mot-de-passe-divulgue";
import { entetesDeSession, requireUser } from "./require-user";
import { codeSaisi, donneesActivation, type DonneesActivation } from "./double-authentification";
import { ipClient } from "@/lib/securite/ip-client";
import {
  cleLimite,
  consommer,
  LIMITES,
  messageTropDeTentatives,
  type Limite,
} from "@/lib/securite/limite-debit";
import { cheminDeRetour } from "./chemin-de-retour";
import { erreurMotDePasse } from "./mot-de-passe";

const emailSchema = z.string().email("Adresse e-mail invalide");

// Connexion : aucune règle de longueur (comptes créés sous l'ancienne règle,
// cf. `mot-de-passe.ts`) ; seulement un champ non vide.
const connexionSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Saisissez votre mot de passe"),
});

// Inscription : la règle des douze caractères, vérifiée ici, côté serveur
// (audit OWASP B4) — l'attribut `minLength` du formulaire n'est qu'un confort.
const nouveauMotDePasse = z.string().superRefine((valeur, ctx) => {
  const erreur = erreurMotDePasse(valeur);
  if (erreur) ctx.addIssue({ code: "custom", message: erreur });
});

const inscriptionSchema = z.object({
  email: emailSchema,
  password: nouveauMotDePasse,
});

/**
 * Consomme une tentative par IP et, quand on l'a, par compte visé (audit OWASP
 * B3 / B14). Rend le message à afficher si la limite est atteinte.
 *
 * Pas d'énumération : la clé « compte » est l'adresse SAISIE, qu'un compte
 * existe ou non — la réponse est la même dans les deux cas.
 *
 * `parIp` sur le compte (connexion) : la clé devient « adresse + IP ». Comptée
 * sur l'adresse seule, la limite se consomme avant le fournisseur, réussites
 * comme échecs : dix essais d'un tiers par quart d'heure suffisaient à refuser
 * indéfiniment à la titulaire son propre mot de passe, depuis n'importe quelle
 * IP (revue de l'intégration Next.js du 2026-10-14, C1). Liée à l'IP, elle ne
 * bloque que celui qui insiste ; un essai distribué reste borné par la limite
 * par IP. La réinitialisation garde l'adresse seule : ce qu'elle protège est
 * la boîte de la titulaire contre l'envoi en rafale, et la refuser n'empêche
 * pas de se connecter. Une action serveur
 * ne choisit pas son statut HTTP : le refus est un message du formulaire, pas
 * un 429.
 */
async function refusParLimite(
  action: string,
  parIp: Limite,
  compte?: { adresse: string; limite: Limite; parIp?: boolean },
): Promise<string | null> {
  const ip = ipClient(await headers());
  const demandes = [
    ...(ip ? [{ cle: cleLimite(action, "ip", ip), limite: parIp }] : []),
    ...(compte
      ? [
          {
            cle: cleLimite(
              action,
              "compte",
              compte.parIp && ip
                ? `${compte.adresse.trim().toLowerCase()}|${ip}`
                : compte.adresse.trim().toLowerCase(),
            ),
            limite: compte.limite,
          },
        ]
      : []),
  ];
  if (demandes.length === 0) return null;
  const verdict = await consommer(demandes);
  return verdict.ok ? null : messageTropDeTentatives(verdict.reessayerDansSecondes);
}

/**
 * La limite d'un geste du compte connecté qui exige un secret (mot de passe,
 * code) : une devinette comme une autre, comptée par IP et par compte.
 */
function refusParCompte(action: string, userId: string): Promise<string | null> {
  return refusParLimite(action, LIMITES.connexionIp, { adresse: userId, limite: LIMITES.connexionCompte });
}

export type AuthActionState = {
  error?: string;
  message?: string;
};

// Les liens de confirmation et de réinitialisation partent par mail : leur
// adresse se prend au serveur (`better-auth.ts`, depuis `PUBLIC_APP_URL`),
// jamais au formulaire, qu'un POST forgé remplit à sa guise (audit du
// 2026-10-13, C3). Sans adresse publique connue ou sans pilote d'envoi, on
// refuse d'avance plutôt que de promettre un e-mail qui ne partira pas.
const ENVOI_IMPOSSIBLE =
  "L'envoi d'e-mails n'est pas configuré sur ce serveur : aucun lien ne peut partir. Prévenez l'équipe Rojer.";

const MOT_DE_PASSE_TROP_LONG = "Le mot de passe est trop long (128 caractères au plus).";

const LIEN_INVALIDE =
  "Ce lien de réinitialisation est invalide ou a expiré. Redemandez un lien.";

function envoiImpossible(): boolean {
  return refusUrlPublique() !== null || !envoiEnService();
}

/**
 * La règle d'un NOUVEAU mot de passe, en un endroit pour les trois portes
 * (inscription, réinitialisation, changement) : longueur, puis fuites connues
 * (`mot-de-passe-divulgue.ts`, appel réseau — à placer après les refus
 * gratuits et la limitation de débit). Rend le message, ou `null`.
 */
async function refusNouveauMotDePasse(motDePasse: string): Promise<string | null> {
  return (
    erreurMotDePasse(motDePasse) ??
    ((await motDePasseDivulgue(motDePasse)) ? MESSAGE_MOT_DE_PASSE_DIVULGUE : null)
  );
}

/** Le code d'erreur de Better Auth (`EMAIL_NOT_VERIFIED`…), ou `null`. */
function codeErreur(e: unknown): string | null {
  if (!isAPIError(e)) return null;
  const code = (e.body as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : null;
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = connexionSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const limite = await refusParLimite("connexion", LIMITES.connexionIp, {
    adresse: parsed.data.email,
    limite: LIMITES.connexionCompte,
    parIp: true,
  });
  if (limite) return { error: limite };

  let resultat: Awaited<ReturnType<typeof auth.api.signInEmail>>;
  try {
    resultat = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    // Un compte non confirmé n'est révélé qu'à qui a le bon mot de passe ; un
    // nouveau lien part (`emailVerification.sendOnSignIn`) — sauf si l'envoi
    // n'est pas en service, et alors on ne le promet pas.
    if (codeErreur(e) === "EMAIL_NOT_VERIFIED") {
      return {
        error: envoiImpossible()
          ? `Votre adresse n'est pas encore confirmée. ${ENVOI_IMPOSSIBLE}`
          : "Votre adresse n'est pas encore confirmée : un nouveau lien vient de vous être envoyé. Ouvrez-le, puis reconnectez-vous.",
      };
    }
    return { error: "Identifiants invalides" };
  }

  const next = cheminDeRetour(formData.get("next"));
  // Double authentification active : pas de session encore, un défi que
  // `/login/code` relève (`better-auth.ts`).
  if ("twoFactorRedirect" in resultat && resultat.twoFactorRedirect) {
    redirect(`/login/code?next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = inscriptionSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const limite = await refusParLimite("inscription", LIMITES.inscriptionIp);
  if (limite) return { error: limite };

  if (envoiImpossible()) return { error: ENVOI_IMPOSSIBLE };
  const refus = await refusNouveauMotDePasse(parsed.data.password);
  if (refus) return { error: refus };
  try {
    await auth.api.signUpEmail({
      // Le nom n'est demandé nulle part : l'adresse en tient lieu.
      body: { email: parsed.data.email, password: parsed.data.password, name: parsed.data.email },
      headers: await headers(),
    });
  } catch (e) {
    // Une adresse déjà inscrite reçoit la même réponse qu'une nouvelle : le
    // formulaire ne dit pas qui a un compte.
    if (codeErreur(e) !== "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return { error: "L'inscription n'a pas abouti. Réessayez dans un instant." };
    }
  }

  // Adresse à confirmer avant toute session : page qui le dit clairement.
  redirect(
    `/signup/verification-en-attente?email=${encodeURIComponent(parsed.data.email)}`,
  );
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adresse invalide" };
  }

  const limite = await refusParLimite("reinitialisation", LIMITES.reinitialisationIp, {
    adresse: parsed.data,
    limite: LIMITES.reinitialisationCompte,
  });
  if (limite) return { error: limite };

  if (envoiImpossible()) return { error: ENVOI_IMPOSSIBLE };
  // Better Auth répond pareil qu'un compte existe ou non ; le lien vers
  // `/auth/reinitialisation?token=…` est construit dans `better-auth.ts`.
  await auth.api.requestPasswordReset({ body: { email: parsed.data } });

  // Réponse identique que le compte existe ou non : pas d'énumération
  // d'adresses possibles via ce formulaire.
  return {
    message:
      "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient de partir.",
  };
}

/**
 * Pose le nouveau mot de passe, au retour du lien de réinitialisation : le
 * jeton du lien arrive par un champ caché du formulaire. Côté SERVEUR (audit
 * OWASP B4). Toutes les sessions du compte sont fermées
 * (`revokeSessionsOnPasswordReset`) : on se reconnecte.
 */
export async function definirMotDePasseAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const motDePasse = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm") ?? "");
  if (motDePasse !== confirmation) {
    return { error: "Les deux mots de passe ne correspondent pas" };
  }
  const invalide = erreurMotDePasse(motDePasse);
  if (invalide) return { error: invalide };

  const token = String(formData.get("token") ?? "");
  if (!token) return { error: LIEN_INVALIDE };
  // Avant l'appel réseau du contrôle des fuites : sans limite, un script
  // ferait appeler le service en boucle, jusqu'à ce qu'il nous refuse.
  const limite = await refusParLimite("definir-mot-de-passe", LIMITES.reinitialisationIp);
  if (limite) return { error: limite };
  const divulgue = await refusNouveauMotDePasse(motDePasse);
  if (divulgue) return { error: divulgue };
  try {
    await auth.api.resetPassword({ body: { newPassword: motDePasse, token } });
  } catch (e) {
    return {
      error:
        codeErreur(e) === "PASSWORD_TOO_LONG"
          ? MOT_DE_PASSE_TROP_LONG
          : LIEN_INVALIDE,
    };
  }
  redirect("/login?reinitialise=1");
}


/**
 * Déconnexion : la session se ferme en base, puis les cookies sensibles sont
 * effacés NOMMÉMENT. Pas de `Clear-Site-Data` (revue de la PR #138) : il
 * effacerait les préférences du tableau de bord (stockage local, sans donnée
 * personnelle) et tous les cookies du domaine rojer.fr, et `"cache"` bloque la
 * navigation dans Chromium — pour ne rien protéger de plus, les pages
 * personnelles n'étant pas mises en cache.
 *
 * Une session déjà fermée (`APIError`) n'empêche pas de finir ; une panne,
 * elle, se voit — sinon on croirait déconnecté un compte dont la session vit
 * encore en base.
 */
export async function signOutAction() {
  try {
    await auth.api.signOut({ headers: await entetesDeSession() });
  } catch (e) {
    if (!isAPIError(e)) throw e;
  }
  // L'établissement choisi au sélecteur ne survit pas à la déconnexion (audit
  // Next.js, B3) : revalidé à chaque lecture (`scope.ts`), mais rien ne
  // justifie de le laisser traîner sur un poste partagé.
  (await cookies()).delete(COOKIE_ETABLISSEMENT_ACTIF);
  revalidatePath("/", "layout");
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Sécurité du compte (ADR-052, lot 3a) : mot de passe et sessions ouvertes.
// ---------------------------------------------------------------------------

/**
 * Changer de mot de passe : l'actuel est exigé (ASVS V6.2.3), le nouveau suit
 * la règle et n'a pas fui, et toutes les AUTRES sessions sont fermées — un
 * voleur de session ne survit pas au changement. Limité par compte : la
 * saisie de l'actuel est une devinette comme une autre.
 */
export async function changerMotDePasseAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireUser();
  const actuel = String(formData.get("actuel") ?? "");
  const nouveau = String(formData.get("password") ?? "");
  if (!actuel) return { error: "Saisissez votre mot de passe actuel" };
  if (nouveau !== String(formData.get("confirm") ?? "")) {
    return { error: "Les deux mots de passe ne correspondent pas" };
  }
  const invalide = erreurMotDePasse(nouveau);
  if (invalide) return { error: invalide };

  const limite = await refusParCompte("changement-mot-de-passe", user.id);
  if (limite) return { error: limite };
  const refus = await refusNouveauMotDePasse(nouveau);
  if (refus) return { error: refus };

  try {
    await auth.api.changePassword({
      body: { currentPassword: actuel, newPassword: nouveau, revokeOtherSessions: true },
      headers: await entetesDeSession(),
    });
  } catch (e) {
    return {
      error:
        codeErreur(e) === "INVALID_PASSWORD"
          ? "Mot de passe actuel incorrect"
          : codeErreur(e) === "PASSWORD_TOO_LONG"
            ? MOT_DE_PASSE_TROP_LONG
            : "Le mot de passe n'a pas pu être changé. Réessayez dans un instant.",
    };
  }
  revalidatePath("/compte/securite");
  return { message: "Mot de passe changé. Vos autres sessions ont été fermées." };
}

/**
 * Fermer des sessions ouvertes du compte : une, désignée par son identifiant
 * (`session`), ou toutes les autres (`session=autres`). Le jeton de session ne
 * quitte jamais le serveur : la page n'affiche que des identifiants, et
 * Better Auth ne liste que les sessions du compte connecté. La session
 * courante se ferme par la déconnexion.
 */
export async function fermerSessionsAction(formData: FormData): Promise<void> {
  await requireUser();
  const entetes = await entetesDeSession();
  const choix = String(formData.get("session") ?? "");
  if (choix === "autres") {
    await auth.api.revokeOtherSessions({ headers: entetes });
  } else {
    const [courante, sessions] = await Promise.all([
      auth.api.getSession({ headers: entetes }),
      auth.api.listSessions({ headers: entetes }),
    ]);
    const cible = sessions.find((s) => s.id === choix);
    if (cible && cible.id !== courante?.session.id) {
      await auth.api.revokeSession({ body: { token: cible.token }, headers: entetes });
    }
  }
  revalidatePath("/compte/securite");
}

// ---------------------------------------------------------------------------
// Double authentification (ADR-052 § 7, lot 3b) : application
// d'authentification et codes de secours, proposée, non imposée.
// ---------------------------------------------------------------------------

/**
 * Le second facteur à la connexion : un code de l'application (six chiffres)
 * ou un code de secours. Better Auth borne les essais du défi
 * (`better-auth.ts`) ; la limite par IP s'y ajoute, la sienne ne gardant que
 * ses routes HTTP, que nous ne montons pas.
 */
export async function verifierSecondFacteurAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const code = codeSaisi(String(formData.get("code") ?? ""));
  if (!code) return { error: "Saisissez le code à six chiffres de votre application, ou un code de secours." };

  const limite = await refusParLimite("second-facteur", LIMITES.connexionIp);
  if (limite) return { error: limite };

  const body = { code: code.valeur, trustDevice: formData.get("confiance") === "on" };
  const entetes = await headers();
  try {
    if (code.genre === "application") await auth.api.verifyTOTP({ body, headers: entetes });
    else await auth.api.verifyBackupCode({ body, headers: entetes });
  } catch (e) {
    if (!isAPIError(e)) throw e;
    return { error: messageSecondFacteur(codeErreur(e)) };
  }
  revalidatePath("/", "layout");
  redirect(cheminDeRetour(formData.get("next")));
}

function messageSecondFacteur(code: string | null): string {
  switch (code) {
    case "INVALID_CODE":
    case "INVALID_BACKUP_CODE":
      return "Code incorrect. Vérifiez qu'il vient bien de l'application liée à Rojer, puis réessayez.";
    case "ACCOUNT_TEMPORARILY_LOCKED":
      return `Trop de codes incorrects sur ce compte : réessayez dans ${VERROU_DOUBLE_AUTH_MINUTES} minutes.`;
    case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
    case "INVALID_TWO_FACTOR_COOKIE":
    // Désactivée depuis un autre appareil pendant le défi.
    case "TOTP_NOT_ENABLED":
    case "BACKUP_CODES_NOT_ENABLED":
      return "Cette connexion a expiré ou a reçu trop de codes incorrects : reconnectez-vous avec votre mot de passe.";
    default:
      return "Le code n'a pas pu être vérifié. Réessayez dans un instant.";
  }
}

export type DoubleAuthState = {
  error?: string;
  message?: string;
  /** Activation en cours : QR code, clé à saisir et codes de secours. */
  activation?: DonneesActivation;
  /** Premier code vérifié : la double authentification est active. */
  confirmee?: boolean;
  /** Codes de secours neufs, affichés une seule fois. */
  codes?: string[];
};

/**
 * Le début commun des gestes qui exigent le mot de passe : compte connecté,
 * mot de passe saisi, limite par compte.
 */
async function avecMotDePasse(
  action: string,
  formData: FormData,
): Promise<{ password: string } | { error: string }> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Saisissez votre mot de passe" };
  const limite = await refusParCompte(action, user.id);
  return limite ? { error: limite } : { password };
}

function messageMotDePasse(e: unknown, defaut: string): string {
  if (!isAPIError(e)) throw e;
  return codeErreur(e) === "INVALID_PASSWORD" ? "Mot de passe incorrect" : defaut;
}

/**
 * Activer, première étape : Better Auth crée le secret (chiffré, `verified`
 * faux) et les codes de secours ; rien n'est actif avant le premier code.
 * Recommencer remplace le secret en attente.
 */
export async function activerDoubleAuthAction(
  _prev: DoubleAuthState,
  formData: FormData,
): Promise<DoubleAuthState> {
  const saisie = await avecMotDePasse("double-authentification", formData);
  if ("error" in saisie) return saisie;

  let reponse: Awaited<ReturnType<typeof auth.api.enableTwoFactor>>;
  try {
    reponse = await auth.api.enableTwoFactor({
      body: { password: saisie.password, method: "totp" },
      headers: await entetesDeSession(),
    });
  } catch (e) {
    if (isAPIError(e) && codeErreur(e) === "TOTP_ALREADY_ENABLED") {
      return { error: "La double authentification est déjà active sur ce compte." };
    }
    return { error: messageMotDePasse(e, "La double authentification n'a pas pu être préparée. Réessayez.") };
  }
  if (reponse.method !== "totp") {
    throw new Error(`enableTwoFactor a rendu la méthode « ${reponse.method} », TOTP attendue`);
  }
  return { activation: await donneesActivation(reponse.totpURI, reponse.backupCodes) };
}

/**
 * Activer, seconde étape : le premier code de l'application l'active (Better
 * Auth renouvelle la session), puis les AUTRES sessions sont fermées, comme au
 * changement de mot de passe : une session ouverte avec un mot de passe volé
 * n'a jamais passé de second facteur. Pas de `revalidatePath` : l'écran reste
 * monté pour montrer les codes de secours.
 */
export async function confirmerDoubleAuthAction(
  _prev: DoubleAuthState,
  formData: FormData,
): Promise<DoubleAuthState> {
  const user = await requireUser();
  const code = codeSaisi(String(formData.get("code") ?? ""));
  if (code?.genre !== "application") {
    return { error: "Saisissez le code à six chiffres affiché par l'application." };
  }
  // Déjà active : rejouée, l'action servirait d'oracle de codes en session,
  // où Better Auth ne compte pas les essais.
  if (user.twoFactorEnabled) {
    return { error: "La double authentification est déjà active sur ce compte." };
  }
  const limite = await refusParCompte("double-authentification", user.id);
  if (limite) return { error: limite };
  try {
    await auth.api.verifyTOTP({ body: { code: code.valeur }, headers: await entetesDeSession() });
  } catch (e) {
    if (!isAPIError(e)) throw e;
    return {
      error:
        codeErreur(e) === "INVALID_CODE"
          ? "Code incorrect. Vérifiez que l'heure du téléphone est à jour, puis saisissez le code affiché."
          : "Le code n'a pas pu être vérifié. Annulez, puis recommencez l'activation.",
    };
  }
  // Active désormais : un échec ici se dit, il ne lève pas — l'écran perdrait
  // des codes de secours jamais vus.
  try {
    await auth.api.revokeOtherSessions({ headers: await entetesDeSession() });
  } catch (e) {
    console.error(JSON.stringify({ type: "fermeture_autres_sessions_echouee", motif: motifErreur(e) }));
    return {
      confirmee: true,
      message: "Vos autres sessions n'ont pas pu être fermées : fermez-les plus bas, dans « Sessions ouvertes ».",
    };
  }
  return { confirmee: true, message: "Vos sessions sur les autres appareils ont été fermées." };
}

/**
 * Double authentification active : de nouveaux codes de secours (les anciens
 * cessent de valoir), ou la désactiver. Un formulaire, deux boutons : le
 * geste vient du bouton (`geste`). Désactiver oublie aussi tous les appareils
 * de confiance (`better-auth.ts`).
 */
export async function gererDoubleAuthAction(
  _prev: DoubleAuthState,
  formData: FormData,
): Promise<DoubleAuthState> {
  const saisie = await avecMotDePasse("double-authentification", formData);
  if ("error" in saisie) return saisie;
  const body = { password: saisie.password };
  const headers = await entetesDeSession();

  if (formData.get("geste") === "desactiver") {
    try {
      await auth.api.disableTwoFactor({ body, headers });
    } catch (e) {
      return { error: messageMotDePasse(e, "La double authentification n'a pas pu être désactivée. Réessayez.") };
    }
    revalidatePath("/compte/securite");
    return {};
  }
  try {
    const { backupCodes } = await auth.api.generateBackupCodes({ body, headers });
    return { codes: backupCodes };
  } catch (e) {
    return { error: messageMotDePasse(e, "Les codes n'ont pas pu être générés. Réessayez.") };
  }
}
