import "server-only";
// Les documents de découverte OAuth hors de `/api/auth` (ADR-062) : les
// plugins `mcp()` et du fournisseur les servent depuis `auth.handler`, qui
// reconnaît leur chemin avant tout routage. Seuls GET et HEAD arrivent ici
// (les routes n'exportent rien d'autre).

import { auth } from "@/lib/auth/better-auth";

export function servirDecouverte(request: Request): Promise<Response> {
  return auth.handler(request);
}
