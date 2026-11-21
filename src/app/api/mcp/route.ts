// Point d'entrée du serveur MCP distant, en OAuth (ADR-062).
//
// Le porteur d'un jeton émis par le fournisseur OAuth de Rojer (Better Auth)
// lit le compte de son consentement, en lecture seule ; hors formule Pro, les
// outils le disent et ne lisent rien. Sans jeton valide : 401 et le défi
// RFC 9728, qui fait proposer « Connecter » au client.
//
// Sans état (révision 2026-07-28) : aucune session MCP, chaque POST porte son
// jeton et est vérifié de bout en bout ; GET et DELETE répondent 405. Sans
// adresse publique, le fournisseur n'existe pas (`auth/better-auth.ts`) : la
// route se comporte comme une route absente.

import { lireHotesAutorises } from "@/lib/mcp/hotes";
import { creerHandlerMcpHttp } from "@/lib/mcp/http";
import { resoudrePorteur } from "@/lib/mcp/acces-compte";
import { ressourceMcp } from "@/lib/mcp/oauth";
import { publicAppUrl, refusUrlPublique } from "@/lib/url-publique";

// Le serveur lit la base à chaque appel d'outil : rien à mettre en cache, et
// une réponse mise en cache serait ici une fuite entre requêtes.
export const dynamic = "force-dynamic";

const ressource = refusUrlPublique() ? null : ressourceMcp(publicAppUrl());
const hotes = lireHotesAutorises(process.env);

const handler = ressource
  ? creerHandlerMcpHttp({
      hotesAutorises: hotes,
      // Une origine de navigateur légitime ne peut être que le déploiement ;
      // les clients MCP n'envoient pas d'`Origin`.
      originesAutorisees: hotes,
      resoudrePorteur: (request) => resoudrePorteur(request, ressource),
    })
  : null;

const absent = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
const sansEtat = () =>
  new Response(null, { status: 405, headers: { allow: "POST", "cache-control": "no-store" } });

export async function POST(request: Request) {
  return handler ? handler.servir(request) : absent();
}

export async function GET(_request?: Request) {
  return handler ? sansEtat() : absent();
}

export async function DELETE(_request?: Request) {
  return handler ? sansEtat() : absent();
}
