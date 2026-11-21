"use server";
// Retirer un assistant autorisé (ADR-062 § 8) : le consentement de la
// personne sur son compte, et les jetons de rafraîchissement qui en sont nés.
// Un membre ne retire que ce qu'il a lui-même autorisé — `retirerAssistant`
// borne par la personne ET par le compte.

import { revalidatePath } from "next/cache";
import { requireEtablissement } from "@/lib/auth/scope";
import { retirerAssistant } from "@/lib/connecteur/assistants";

export async function retirerAssistantAction(etablissementId: string, formData: FormData): Promise<void> {
  const { user, compte } = await requireEtablissement(etablissementId);
  await retirerAssistant(user.id, compte.compteId, String(formData.get("consentement") ?? ""));
  revalidatePath(`/etablissements/${etablissementId}/connecter`);
}
