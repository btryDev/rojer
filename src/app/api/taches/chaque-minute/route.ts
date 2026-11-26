// Les tâches de Rojer (`lib/taches/quotidiennes.ts`), appelées chaque minute
// par la crontab de Clever Cloud. Sans session : la garde est le secret
// partagé. La réponse part tout de suite ; le travail suit (`after()`) — la
// requête ne dépend ni du délai du proxy (180 s) ni de la durée des tâches.
// Une exécution coupée par un déploiement est reprise par les baux en base.

import { after } from "next/server";
import { appelAutorise, lancerTaches, secretDesTaches } from "@/lib/taches/quotidiennes";

const SANS_CACHE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const secret = secretDesTaches();
  if (!secret) return new Response(null, { status: 404, headers: SANS_CACHE });
  if (!appelAutorise(request.headers.get("authorization"), secret)) {
    return new Response(null, { status: 401, headers: SANS_CACHE });
  }
  after(async () => {
    try {
      await lancerTaches();
    } catch (e) {
      console.error(`tâches en échec — ${e instanceof Error ? e.name : "erreur"}`);
    }
  });
  return new Response(null, { status: 202, headers: SANS_CACHE });
}
