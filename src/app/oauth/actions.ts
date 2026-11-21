"use server";
// Le parcours OAuth du connecteur MCP, côté personne (ADR-062 § 7) : choisir
// le compte, consentir ou refuser. Chaque geste revérifie ce qu'il engage —
// la session et l'appartenance (`requireCompte`), le compte choisi, la
// formule — et passe la requête signée au fournisseur, qui en vérifie
// lui-même la signature et l'expiration.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/better-auth";
import { requireCompte } from "@/lib/auth/compte";
import { memeCompteQueLaPage } from "@/lib/auth/compte-attendu";
import { comptesDeLaPersonne } from "@/lib/auth/membres";
import { entetesDeSession, lireSessionCourante } from "@/lib/auth/require-user";
import { compteDuConsentement } from "@/lib/mcp/compte-oauth";
import { connecteurOuvertPour } from "@/lib/connecteur/assistants";

const texte = (formData: FormData, nom: string) => String(formData.get(nom) ?? "");

/** L'URL où le fournisseur renvoie : le client (code ou refus), ou la page suivante. */
function urlDeSuite(reponse: unknown): string {
  const url = (reponse as { url?: unknown } | null)?.url;
  if (typeof url !== "string" || !url) throw new Error("réponse du fournisseur OAuth sans URL de suite");
  return url;
}

/** Le compte choisi devient le compte actif, puis l'autorisation reprend (`postLogin`). */
export async function choisirCompteOAuth(formData: FormData): Promise<void> {
  const { user } = await requireCompte();
  const compteId = texte(formData, "compte");
  if (!(await comptesDeLaPersonne(user.id)).some((c) => c.compteId === compteId)) {
    throw new Error("compte OAuth choisi dont la personne n'est pas membre");
  }
  const entetes = await entetesDeSession();
  await auth.api.setActiveOrganization({ headers: entetes, body: { organizationId: compteId } });
  const suite = await auth.api.oauth2Continue({
    headers: entetes,
    body: { postLogin: true, oauth_query: texte(formData, "oauth_query") },
  });
  redirect(urlDeSuite(suite));
}

/**
 * Consentir ou refuser. Hors formule Pro, le consentement est toujours un
 * refus : la page n'offre pas d'autre bouton, et le geste ne se fie pas à la
 * page. Accepter lie l'autorisation au compte actif : si un autre onglet en a
 * changé depuis que la page l'a nommé, rien n'est accordé et la page est
 * rendue de nouveau sur le compte actif (audit du 2026-11-10, point 8).
 * Refuser n'accorde rien, quel que soit le compte.
 */
export async function repondreConsentement(formData: FormData): Promise<void> {
  const { user } = await requireCompte();
  const session = await lireSessionCourante();
  const compteId = await compteDuConsentement(user.id, session?.session.activeOrganizationId);
  const oauthQuery = texte(formData, "oauth_query");
  if (texte(formData, "reponse") === "accepter" && !memeCompteQueLaPage(formData, compteId)) {
    redirect(`/oauth/consentement?${new URLSearchParams(oauthQuery).toString()}`);
  }
  const accepte = texte(formData, "reponse") === "accepter" && (await connecteurOuvertPour(compteId));
  const suite = await auth.api.oauth2Consent({
    headers: await entetesDeSession(),
    body: { accept: accepte, oauth_query: oauthQuery },
  });
  redirect(urlDeSuite(suite));
}
