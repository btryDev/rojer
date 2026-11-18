"use server";
// Supprimer le compte, ou y renoncer (ADR-058 § 8) : gestes d'un propriétaire,
// sur le compte que la page montrait. Ouverts à un compte impayé ou dont la
// saisie est fermée — c'est un droit (RGPD, art. 17), pas une saisie.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { auth } from "@/lib/auth/better-auth";
import { entetesDeSession } from "@/lib/auth/require-user";
import { MESSAGE_COMPTE_CHANGE, memeCompteQueLaPage } from "@/lib/auth/compte-attendu";
import { verifierProprietaire } from "@/lib/abonnements/saisie";
import { cleLimite, consommer, LIMITES, messageTropDeTentatives } from "@/lib/securite/limite-debit";
import { nomDuCompte, PAGE_SUPPRESSION, poserLaDemande, retirerLaDemande } from "./suppression";

export type EtatSuppression = { erreur?: string };

/**
 * Demander la suppression : le nom du compte tapé, puis le mot de passe de la
 * personne (Better Auth le vérifie ; les essais sont comptés comme une
 * connexion). L'effacement vient sept jours plus tard.
 */
export async function demanderSuppressionAction(_prev: EtatSuppression, formData: FormData): Promise<EtatSuppression> {
  const { user, compte } = await verifierProprietaire();
  if (!memeCompteQueLaPage(formData, compte.compteId)) return { erreur: MESSAGE_COMPTE_CHANGE };
  const tape = String(formData.get("nom") ?? "").trim();
  if (tape !== (await nomDuCompte(compte.compteId)).trim()) {
    return { erreur: "Le nom tapé n'est pas celui du compte : recopiez-le tel qu'il est écrit au-dessus." };
  }
  const password = String(formData.get("password") ?? "");
  if (!password) return { erreur: "Saisissez votre mot de passe." };
  const verdict = await consommer([{ cle: cleLimite("suppression-compte", "compte", user.id), limite: LIMITES.connexionCompte }]);
  if (!verdict.ok) return { erreur: messageTropDeTentatives(verdict.reessayerDansSecondes) };
  try {
    await auth.api.verifyPassword({ body: { password }, headers: await entetesDeSession() });
  } catch (e) {
    if (!isAPIError(e)) throw e;
    return { erreur: (e.body as { code?: unknown } | undefined)?.code === "INVALID_PASSWORD" ? "Mot de passe incorrect." : "La vérification a échoué. Réessayez." };
  }
  const issue = await poserLaDemande(compte.compteId, user.email ?? "un propriétaire du compte", new Date());
  if ("refus" in issue) return { erreur: issue.refus };
  revalidatePath("/", "layout");
  redirect(PAGE_SUPPRESSION);
}

/** Annuler la suppression demandée : tout redevient comme avant la demande. */
export async function annulerSuppressionAction(_prev: EtatSuppression, formData: FormData): Promise<EtatSuppression> {
  const { user, compte } = await verifierProprietaire();
  if (!memeCompteQueLaPage(formData, compte.compteId)) return { erreur: MESSAGE_COMPTE_CHANGE };
  const issue = await retirerLaDemande(compte.compteId, user.email ?? "un propriétaire du compte");
  if ("refus" in issue) return { erreur: issue.refus };
  revalidatePath("/", "layout");
  redirect(PAGE_SUPPRESSION);
}
