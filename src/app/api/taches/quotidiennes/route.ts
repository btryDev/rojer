// Les tâches quotidiennes (`lib/taches/quotidiennes.ts`), appelées par la
// crontab de Clever Cloud. Sans session : la garde est le secret partagé.

import { appelAutorise, lancerTachesQuotidiennes, secretDesTaches } from "@/lib/taches/quotidiennes";

const SANS_CACHE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const secret = secretDesTaches();
  if (!secret) return new Response(null, { status: 404, headers: SANS_CACHE });
  if (!appelAutorise(request.headers.get("authorization"), secret)) {
    return new Response(null, { status: 401, headers: SANS_CACHE });
  }
  return Response.json(await lancerTachesQuotidiennes(new Date()), { headers: SANS_CACHE });
}
