import "server-only";
// Les documents de découverte OAuth hors de `/api/auth` (ADR-062) : les
// plugins `mcp()` et du fournisseur les servent depuis `auth.handler`, qui
// reconnaît leur chemin avant tout routage. Seuls GET et HEAD arrivent ici
// (les routes n'exportent rien d'autre).

import { auth } from "@/lib/auth/better-auth";

/**
 * Ce que le fournisseur annonce toujours et que Rojer ne sert pas
 * (`CHEMINS_AUTH_SERVIS`) : l'introspection — les jetons d'accès sont des JWT
 * vérifiés sur place. Une métadonnée qui annonce une adresse fermée trompe
 * le client qui la lit.
 */
const NON_SERVIES = /^introspection_/;

export async function servirDecouverte(request: Request): Promise<Response> {
  const reponse = await auth.handler(request);
  if (!reponse.ok || request.method === "HEAD") return reponse;
  const document: unknown = await reponse.clone().json().catch(() => null);
  if (!document || typeof document !== "object" || !("introspection_endpoint" in document)) return reponse;
  const servi = Object.fromEntries(Object.entries(document).filter(([cle]) => !NON_SERVIES.test(cle)));
  const entetes = new Headers(reponse.headers);
  entetes.delete("content-length");
  return Response.json(servi, { status: reponse.status, headers: entetes });
}
