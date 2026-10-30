"use server";

// Server actions pour l'authentification : Better Auth (ADR-052), appelé en
// direct (`auth.api.*`) — aucune route HTTP de Better Auth n'est montée.
// E-mail et mot de passe, adresse confirmée avant toute session.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAPIError } from "better-auth/api";
import { envoiEnService, refusUrlPublique } from "@/lib/email";
import { auth } from "./better-auth";
import { MESSAGE_MOT_DE_PASSE_DIVULGUE, motDePasseDivulgue } from "./mot-de-passe-divulgue";
import { requireUser } from "./require-user";
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

const LIEN_INVALIDE =
  "Ce lien de réinitialisation est invalide ou a expiré. Redemandez un lien.";

function envoiImpossible(): boolean {
  return refusUrlPublique() !== null || !envoiEnService();
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

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
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

  revalidatePath("/", "layout");
  redirect(cheminDeRetour(formData.get("next")));
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
  if (await motDePasseDivulgue(parsed.data.password)) {
    return { error: MESSAGE_MOT_DE_PASSE_DIVULGUE };
  }

  if (envoiImpossible()) return { error: ENVOI_IMPOSSIBLE };
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
  if (await motDePasseDivulgue(motDePasse)) return { error: MESSAGE_MOT_DE_PASSE_DIVULGUE };
  try {
    await auth.api.resetPassword({ body: { newPassword: motDePasse, token } });
  } catch (e) {
    return {
      error:
        codeErreur(e) === "PASSWORD_TOO_LONG"
          ? "Le mot de passe est trop long (128 caractères au plus)."
          : LIEN_INVALIDE,
    };
  }
  redirect("/login?reinitialise=1");
}


// ~~`signOutAction`~~ [2026-10-30, lot 3a : la déconnexion passe par la route
// `/auth/deconnexion`, qui seule peut poser `Clear-Site-Data`.]

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

  const limite = await refusParLimite("changement-mot-de-passe", LIMITES.connexionIp, {
    adresse: user.id,
    limite: LIMITES.connexionCompte,
  });
  if (limite) return { error: limite };
  if (await motDePasseDivulgue(nouveau)) return { error: MESSAGE_MOT_DE_PASSE_DIVULGUE };

  try {
    await auth.api.changePassword({
      body: { currentPassword: actuel, newPassword: nouveau, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (e) {
    return {
      error:
        codeErreur(e) === "INVALID_PASSWORD"
          ? "Mot de passe actuel incorrect"
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
  const entetes = await headers();
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
