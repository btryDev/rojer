// Métadonnées de ressource protégée (RFC 9728), au chemin racine que les
// clients essaient ensuite (ADR-062). Même document que sous `/api/mcp`.

import { servirDecouverte } from "@/lib/mcp/decouverte";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return servirDecouverte(request);
}

export async function HEAD(request: Request) {
  return servirDecouverte(request);
}
