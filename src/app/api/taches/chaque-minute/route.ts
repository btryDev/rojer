// Les tâches de Rojer (`lib/taches/quotidiennes.ts`), appelées chaque minute
// par la crontab de Clever Cloud. Sans session : la garde est le secret
// partagé. La réponse part tout de suite ; le travail suit (`after()`) — la
// requête ne dépend ni du délai du proxy (180 s) ni de la durée des tâches.
// Une exécution coupée par un déploiement est reprise par les baux en base.

import { after } from "next/server";
import { appelAutorise, reponseMachine } from "@/lib/securite/requete-machine";
import { lancerTaches, secretDesTaches } from "@/lib/taches/quotidiennes";

export async function POST(request: Request) {
  const secret = secretDesTaches();
  if (!secret) return reponseMachine(404);
  if (!appelAutorise(request.headers.get("authorization"), secret)) {
    return reponseMachine(401);
  }
  after(async () => {
    try {
      await lancerTaches();
    } catch (e) {
      console.error(`tâches en échec — ${e instanceof Error ? e.name : "erreur"}`);
    }
  });
  return reponseMachine(202);
}
