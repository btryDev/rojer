"use server";

// Server actions pour l'authentification (ADR-005).
// Email + password pour le MVP. Le flux magic-link / OAuth est hors MVP.

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicAppUrl, refusUrlPublique } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_ETABLISSEMENT_ACTIF } from "@/lib/auth/scope";
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
// adresse de retour se prend au serveur, jamais au formulaire, qu'un POST forgé
// remplit à sa guise (audit du 2026-10-13, C3). Sans adresse publique connue
// en production, on refuse d'envoyer plutôt que d'envoyer un lien faux.
const ENVOI_IMPOSSIBLE =
  "L'adresse publique de l'application n'est pas configurée sur ce serveur : aucun e-mail ne peut partir. Prévenez l'équipe Rojer.";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
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

  if (refusUrlPublique()) return { error: ENVOI_IMPOSSIBLE };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${publicAppUrl()}/auth/callback` },
  });
  if (error) {
    return { error: error.message };
  }

  // Deux cas selon config Supabase :
  // - Email confirmation OFF : session créée, on log direct → /entreprises
  // - Email confirmation ON (défaut) : session null, on envoie sur une page
  //   dédiée qui dit clairement "vérifie tes mails".
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/entreprises");
  }

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

  if (refusUrlPublique()) return { error: ENVOI_IMPOSSIBLE };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${publicAppUrl()}/auth/reinitialisation`,
  });

  // Réponse identique que le compte existe ou non : pas d'énumération
  // d'adresses possibles via ce formulaire.
  return {
    message:
      "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient de partir.",
  };
}

/**
 * Pose le nouveau mot de passe, au retour du lien de réinitialisation.
 *
 * Côté SERVEUR (audit OWASP B4) : la page appelait `updateUser` depuis le
 * navigateur, où seule la règle de l'attribut HTML s'appliquait. La session de
 * récupération, posée par le navigateur à l'échange du code (PKCE), est dans
 * les cookies : le client serveur la lit.
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

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) {
    return {
      error:
        error.message === "New password should be different from the old password."
          ? "Le nouveau mot de passe doit être différent de l'ancien"
          : "Impossible de mettre à jour le mot de passe. Redemandez un lien.",
    };
  }
  revalidatePath("/", "layout");
  redirect("/entreprises");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // L'établissement choisi au sélecteur ne survit pas à la déconnexion (audit
  // Next.js, B3). Il était déjà sans risque — revalidé contre l'utilisateur à
  // chaque lecture (`scope.ts`) —, mais rien ne justifie de le laisser traîner
  // sur un poste partagé.
  (await cookies()).delete(COOKIE_ETABLISSEMENT_ACTIF);
  revalidatePath("/", "layout");
  redirect("/login");
}
