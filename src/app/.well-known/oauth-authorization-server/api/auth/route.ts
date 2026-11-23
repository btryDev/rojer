// Métadonnées du serveur d'autorisation (RFC 8414), à l'adresse que construit
// un client depuis l'émetteur `https://<hôte>/api/auth` par insertion du
// chemin (ADR-062). Servies par le fournisseur OAuth de Better Auth.

import { servirDecouverte } from "@/lib/mcp/decouverte";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return servirDecouverte(request);
}

export async function HEAD(request: Request) {
  return servirDecouverte(request);
}
