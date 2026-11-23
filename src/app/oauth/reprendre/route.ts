// La page de connexion du fournisseur OAuth (`loginPage`, ADR-062 § 7).
//
// Le fournisseur y envoie une requête d'autorisation signée. Signature
// fausse ou expirée : refus. Pas de session : `/login`, avec cette page (et
// sa requête signée) en `next` — la connexion, double authentification
// comprise, ramène ici. Session : la requête d'origine est rejouée sur
// `/api/auth/oauth2/authorize`, que le fournisseur revérifie entièrement —
// sauf si elle exige une connexion plus récente que la session
// (`prompt=login`, `max_age`) : on le dit, sans rien rejouer.

import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth/better-auth";
import { lireSessionCourante } from "@/lib/auth/require-user";
import { CHEMIN_AUTH } from "@/lib/mcp/oauth";
import { requeteARejouer } from "@/lib/mcp/reprise-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const requete = url.search.replace(/^\?/, "");
  const { secret } = await auth.$context;
  if (!requete || !(await verifyOAuthQueryParams(requete, secret))) {
    return new Response(
      "Cette demande de connexion a expiré ou n'est pas valide. Relancez la connexion depuis votre assistant.",
      { status: 400, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } },
    );
  }

  const enTete = { "cache-control": "no-store" };
  const session = await lireSessionCourante();
  if (!session) {
    const retour = `/oauth/reprendre?${requete}`;
    return new Response(null, {
      status: 303,
      headers: { ...enTete, location: `/login?next=${encodeURIComponent(retour)}` },
    });
  }
  const rejouee = requeteARejouer(requete, new Date(session.session.createdAt));
  if (rejouee === null) {
    return new Response(
      "Votre assistant demande une connexion récente. Déconnectez-vous de Rojer, puis relancez la connexion depuis votre assistant.",
      { status: 400, headers: { "content-type": "text/plain; charset=utf-8", ...enTete } },
    );
  }
  return new Response(null, {
    status: 303,
    headers: { ...enTete, location: `${CHEMIN_AUTH}/oauth2/authorize?${rejouee}` },
  });
}
