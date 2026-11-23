// Métadonnées de ressource protégée (RFC 9728) du serveur MCP, au chemin que
// les clients essaient d'abord : `/.well-known/oauth-protected-resource`
// suivi du chemin du serveur (ADR-062). Servies par le plugin `mcp()`, qui
// les construit depuis sa configuration (`resource`, émetteur, portées).

import { servirDecouverte } from "@/lib/mcp/decouverte";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return servirDecouverte(request);
}

export async function HEAD(request: Request) {
  return servirDecouverte(request);
}
