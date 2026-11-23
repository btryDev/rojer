"use server";
// Retirer un assistant autorisé (ADR-062 § 8) : le consentement de la
// personne sur son compte, et les jetons de rafraîchissement qui en sont nés.
// Un membre ne retire que ce qu'il a lui-même autorisé — `retirerAssistant`
// borne par la personne ET par le compte.

import { revalidatePath } from "next/cache";
import { requireEtablissement } from "@/lib/auth/scope";
import { reglerOutilsNonVerifies, retirerAssistant } from "@/lib/connecteur/assistants";
import { verifierProprietaire } from "@/lib/abonnements/saisie";
import { memeCompteQueLaPage } from "@/lib/auth/compte-attendu";

export async function retirerAssistantAction(etablissementId: string, formData: FormData): Promise<void> {
  const { user, compte } = await requireEtablissement(etablissementId);
  await retirerAssistant(user.id, compte.compteId, String(formData.get("consentement") ?? ""));
  revalidatePath(`/etablissements/${etablissementId}/connecter`);
}

/**
 * Ouvrir ou fermer le compte aux outils non vérifiés (ADR-062 § 12) : le
 * propriétaire seul — relu ici, la page ne fait que cacher le bouton. Fermer
 * retire l'accès de ceux déjà autorisés, pour tous les membres.
 */
export async function reglerOutilsNonVerifiesAction(etablissementId: string, formData: FormData): Promise<void> {
  const { compte } = await verifierProprietaire();
  // Le compte que la page montrait : un autre onglet a pu changer de compte actif.
  if (!memeCompteQueLaPage(formData, compte.compteId)) return;
  await reglerOutilsNonVerifies(compte.compteId, String(formData.get("ouvrir") ?? "") === "oui");
  revalidatePath(`/etablissements/${etablissementId}/connecter`);
}
