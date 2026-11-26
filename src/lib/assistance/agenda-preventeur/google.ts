import "server-only";
// Le client de l'API Google Agenda de la synchronisation (ADR-064, amendée le
// 2026-11-26). Sans dépendance : un jeton de compte de service (JWT signé
// RS256, portée `calendar.events`), puis trois appels — lister, modifier,
// créer. Une seule adresse, celle de Google, en dur ; un délai par appel.
//
// Le compte de service ne voit que l'agenda partagé avec lui. Sa clé vit dans
// `AGENDA_GOOGLE_CLE` (le fichier JSON de Google, en base64) ; l'agenda, dans
// `AGENDA_GOOGLE_ID`. Sans l'une ou l'autre, la synchronisation ne tourne pas.
//
// Ce que Google rend est tenu pour non fiable : la forme est relue, et rien
// d'un titre ni d'une description n'entre dans Rojer.

import { createSign } from "node:crypto";
import { z } from "zod";

const JETON_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3/calendars";
const PORTEE = "https://www.googleapis.com/auth/calendar.events";
const DELAI_MS = 15_000;
/** Le fuseau des événements que Rojer écrit : celui du préventeur, pas UTC. */
const FUSEAU = "Europe/Paris";
const heure = (d: Date) => ({ dateTime: d.toISOString(), timeZone: FUSEAU });
/** Au-delà, la lecture est tenue pour anormale et le passage s'arrête. */
export const MAX_EVENEMENTS = 1000;

export type ConfigGoogle = { agendaId: string; email: string; cle: string };

/** La configuration, ou `null` si la synchronisation n'est pas en service. Lève sur une clé illisible. */
export function configurationGoogle(env: Record<string, string | undefined> = process.env): ConfigGoogle | null {
  const agendaId = env.AGENDA_GOOGLE_ID?.trim();
  const brute = env.AGENDA_GOOGLE_CLE?.trim();
  if (!agendaId || !brute) return null;
  let json: unknown = null;
  try {
    json = JSON.parse(Buffer.from(brute, "base64").toString("utf8"));
  } catch {
    // forme refusée juste dessous
  }
  const cle = z
    .object({ client_email: z.string().email(), private_key: z.string().startsWith("-----BEGIN PRIVATE KEY-----") })
    .safeParse(json);
  if (!cle.success) throw new ErreurGoogle("AGENDA_GOOGLE_CLE illisible (fichier JSON du compte de service, en base64)");
  return { agendaId, email: cle.data.client_email, cle: cle.data.private_key };
}

/** Une erreur dont le message est écrit par Rojer : jamais une réponse de Google recopiée. */
export class ErreurGoogle extends Error {
  constructor(
    message: string,
    readonly statut?: number,
  ) {
    super(message);
    this.name = "ErreurGoogle";
  }
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

let jetonEnCache: { valeur: string; jusqua: number; email: string } | null = null;

async function jeton(config: ConfigGoogle, maintenant = Date.now()): Promise<string> {
  if (jetonEnCache && jetonEnCache.email === config.email && jetonEnCache.jusqua > maintenant + 60_000) {
    return jetonEnCache.valeur;
  }
  const t = Math.floor(maintenant / 1000);
  const corps = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: config.email, scope: PORTEE, aud: JETON_URL, iat: t, exp: t + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(corps).sign(config.cle, "base64url");
  const r = await fetch(JETON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${corps}.${signature}` }),
    signal: AbortSignal.timeout(DELAI_MS),
  });
  const j = z.object({ access_token: z.string(), expires_in: z.number() }).safeParse(await r.json().catch(() => null));
  if (!r.ok || !j.success) throw new ErreurGoogle("jeton du compte de service refusé", r.status);
  jetonEnCache = { valeur: j.data.access_token, jusqua: maintenant + j.data.expires_in * 1000, email: config.email };
  return jetonEnCache.valeur;
}

/** Pour les tests. */
export function oublierLeJeton() {
  jetonEnCache = null;
}

/** Un événement de l'agenda, tel que Rojer en a besoin. Le titre ne sert qu'à ne pas réécrire ce qui est juste. */
export type EvenementGoogle = { id: string; etag: string; titre: string; debut: Date; fin: Date };

const schemaEvenement = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,1024}$/),
  etag: z.string(),
  status: z.string().optional(),
  summary: z.string().optional(),
  // Un événement « toute la journée » n'a pas de `dateTime` : il est ignoré.
  start: z.object({ dateTime: z.string().optional() }),
  end: z.object({ dateTime: z.string().optional() }),
});
const schemaPage = z.object({ items: z.array(z.unknown()).default([]), nextPageToken: z.string().optional() });

async function appeler(config: ConfigGoogle, chemin: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API}/${encodeURIComponent(config.agendaId)}${chemin}`, {
    ...init,
    headers: { Authorization: `Bearer ${await jeton(config)}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(DELAI_MS),
  });
}

/**
 * Tous les événements datés de la fenêtre, occurrences des récurrents
 * dépliées. Une lecture incomplète (page en erreur, trop d'événements) LÈVE :
 * la réconciliation croirait supprimés des événements qu'elle n'a pas lus.
 */
export async function listerEvenements(config: ConfigGoogle, fenetre: { depuis: Date; jusqua: Date }): Promise<EvenementGoogle[]> {
  const evenements: EvenementGoogle[] = [];
  let page: string | undefined;
  do {
    const q = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "false",
      maxResults: "250",
      timeMin: fenetre.depuis.toISOString(),
      timeMax: fenetre.jusqua.toISOString(),
      ...(page && { pageToken: page }),
    });
    const r = await appeler(config, `/events?${q}`);
    const lue = schemaPage.safeParse(await r.json().catch(() => null));
    if (!r.ok || !lue.success) throw new ErreurGoogle("lecture de l'agenda refusée", r.status);
    for (const brut of lue.data.items) {
      const ev = schemaEvenement.safeParse(brut);
      if (!ev.success) throw new ErreurGoogle("événement de forme inattendue");
      const { start, end, status } = ev.data;
      if (status === "cancelled" || !start.dateTime || !end.dateTime) continue;
      const debut = new Date(start.dateTime);
      const fin = new Date(end.dateTime);
      if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin <= debut) continue;
      evenements.push({ id: ev.data.id, etag: ev.data.etag, titre: ev.data.summary ?? "", debut, fin });
    }
    if (evenements.length > MAX_EVENEMENTS) throw new ErreurGoogle(`plus de ${MAX_EVENEMENTS} événements dans la fenêtre`);
    page = lue.data.nextPageToken;
  } while (page);
  return evenements;
}

/**
 * Retitre un événement, et le remet à une heure s'il y en a une. Conditionnel
 * (`If-Match`) : si le préventeur l'a changé depuis la lecture, Google refuse
 * (412) et rien n'est écrasé — le passage suivant reprend. `false` : non écrit.
 */
export async function modifierEvenement(
  config: ConfigGoogle,
  ev: { id: string; etag: string },
  changement: { titre: string; debut?: Date; fin?: Date },
): Promise<boolean> {
  const corps = {
    summary: changement.titre,
    ...(changement.debut && changement.fin && {
      start: heure(changement.debut),
      end: heure(changement.fin),
    }),
  };
  const r = await appeler(config, `/events/${encodeURIComponent(ev.id)}?sendUpdates=none`, {
    method: "PATCH",
    headers: { "If-Match": ev.etag },
    body: JSON.stringify(corps),
  });
  if (r.status === 412 || r.status === 404 || r.status === 410) return false;
  if (!r.ok) throw new ErreurGoogle("modification d'un événement refusée", r.status);
  return true;
}

/** Crée un événement, sans invité ni notification ; rend son identifiant. */
export async function creerEvenement(config: ConfigGoogle, ev: { titre: string; debut: Date; fin: Date }): Promise<string> {
  const r = await appeler(config, "/events?sendUpdates=none", {
    method: "POST",
    body: JSON.stringify({ summary: ev.titre, start: heure(ev.debut), end: heure(ev.fin) }),
  });
  const cree = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,1024}$/) }).safeParse(await r.json().catch(() => null));
  if (!r.ok || !cree.success) throw new ErreurGoogle("création d'un événement refusée", r.status);
  return cree.data.id;
}
