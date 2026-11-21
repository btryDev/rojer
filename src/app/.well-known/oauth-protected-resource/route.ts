// Métadonnées de ressource protégée (RFC 9728), au chemin racine que les
// clients essaient ensuite (ADR-062). Même document que sous `/api/mcp`.

import { servirDecouverte } from "@/lib/mcp/decouverte";

export const dynamic = "force-dynamic";
export const GET = servirDecouverte;
export const HEAD = servirDecouverte;
