import "server-only";
// La requête signée qu'une page du parcours OAuth reçoit du fournisseur
// (ADR-062 § 7) : reconstituée depuis les paramètres de la page, vérifiée
// (signature, expiration) avant tout affichage. Une signature valide ne
// remplace ni la session ni l'appartenance : chaque page et chaque geste les
// relisent.

import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth/better-auth";

export type ParametresDePage = Record<string, string | string[] | undefined>;

/** La requête signée telle que le fournisseur l'a posée, ou `null` si elle n'est pas valide. */
export async function requeteSigneeDeLaPage(parametres: ParametresDePage): Promise<URLSearchParams | null> {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(parametres)) {
    for (const v of Array.isArray(valeur) ? valeur : valeur === undefined ? [] : [valeur]) requete.append(cle, v);
  }
  const { secret } = await auth.$context;
  return requete.size > 0 && (await verifyOAuthQueryParams(requete.toString(), secret)) ? requete : null;
}

/** L'hôte de l'adresse de retour, à montrer à la personne (spécification MCP, docs de Claude). */
export function hoteDeRetour(requete: URLSearchParams): string | null {
  try {
    return new URL(requete.get("redirect_uri") ?? "").host || null;
  } catch {
    return null;
  }
}
