// La synchronisation de l'agenda du préventeur (ADR-064), appelée par un agent
// planifié. Sans session : la garde est le secret `AGENDA_SECRET` ; absent,
// la route n'existe pas (404). Dans cet ordre, chaque refus avant tout effet :
// limite par réseau, secret, limite de la route, corps borné, JSON, schéma
// strict et heures (`envoi.ts`). Puis la réconciliation, sous verrou
// (`synchronisation.ts`).
//
// Les réponses d'erreur ne portent qu'un code, jamais l'écho de l'envoi.

import { lireEnvoi } from "@/lib/assistance/agenda-preventeur/envoi";
import { secretDeLAgenda, synchroniser } from "@/lib/assistance/agenda-preventeur/synchronisation";
import { ipPourLimite } from "@/lib/securite/ip-client";
import { LIMITES, cleLimite, consommer } from "@/lib/securite/limite-debit";
import { alerterUneFoisParJour } from "@/lib/alertes";
import { appelAutorise, lireCorpsBorne, reponseMachine } from "@/lib/securite/requete-machine";

export const dynamic = "force-dynamic";

/** 200 événements d'identifiants et d'heures tiennent largement dans 256 Ko. */
const TAILLE_MAX = 256 * 1024;

const vide = (status: number) => reponseMachine(status);
const json = (status: number, corps: unknown) => reponseMachine(status, corps);
const tropDAppels = (secondes: number) => reponseMachine(429, undefined, { "Retry-After": String(secondes) });

export async function POST(request: Request) {
  const secret = secretDeLAgenda();
  if (!secret) return vide(404);

  const reseau = ipPourLimite(request.headers) ?? "inconnue";
  const parReseau = await consommer([{ cle: cleLimite("agenda", "ip", reseau), limite: LIMITES.agendaIp }]);
  if (!parReseau.ok) {
    console.warn("agenda : limite par réseau atteinte");
    return tropDAppels(parReseau.reessayerDansSecondes);
  }

  if (!appelAutorise(request.headers.get("authorization"), secret)) {
    console.warn("agenda : jeton refusé");
    return vide(401);
  }

  const parRoute = await consommer([{ cle: cleLimite("agenda", "route", "toutes"), limite: LIMITES.agendaRoute }]);
  if (!parRoute.ok) {
    // Le quota du jour, atteint avec le bon jeton : une boucle de l'agent, ou
    // un jeton qui a fui.
    await alerterUneFoisParJour("agenda:quota", "Agenda du préventeur : quota d'appels atteint", [
      `Plus de ${LIMITES.agendaRoute.max} appels authentifiés en 24 h : l'agent boucle, ou son jeton est utilisé ailleurs.`,
      "Vérifier la tâche planifiée ; au moindre doute, changer AGENDA_SECRET et le secret réseau de l'agent.",
    ]);
    return tropDAppels(parRoute.reessayerDansSecondes);
  }

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return vide(415);
  const corps = await lireCorpsBorne(request, TAILLE_MAX);
  if (corps === null) return vide(413);

  let donnees: unknown;
  try {
    donnees = JSON.parse(corps);
  } catch {
    return json(400, { erreur: "json" });
  }
  const maintenant = new Date();
  const lecture = lireEnvoi(donnees, maintenant);
  if (!lecture.ok) return json(400, { erreur: lecture.motif });

  try {
    const r = await synchroniser(lecture.envoi, maintenant);
    return json(r.statut, r.corps);
  } catch (e) {
    console.error(`agenda : synchronisation en échec — ${e instanceof Error ? e.name : "erreur"}`);
    return vide(500);
  }
}
