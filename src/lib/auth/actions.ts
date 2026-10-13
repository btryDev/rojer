"use server";

// Server actions pour l'authentification (ADR-005).
// Email + password pour le MVP. Le flux magic-link / OAuth est hors MVP.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cheminDeRetour } from "./chemin-de-retour";

const emailSchema = z.string().email("Adresse e-mail invalide");
const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum");

const credsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type AuthActionState = {
  error?: string;
  message?: string;
};

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

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
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const supabase = await createClient();
  const origin = (formData.get("origin") as string) || "";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
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

  const supabase = await createClient();
  const origin = (formData.get("origin") as string) || "";
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: origin ? `${origin}/auth/reinitialisation` : undefined,
  });

  // Réponse identique que le compte existe ou non : pas d'énumération
  // d'adresses possibles via ce formulaire.
  return {
    message:
      "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient de partir.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
