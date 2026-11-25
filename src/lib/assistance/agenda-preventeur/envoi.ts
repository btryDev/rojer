// La lecture de ce que l'agent envoie (ADR-064 § 3, point 3) : un schéma
// strict, qui refuse tout champ inconnu, puis les bornes qui dépendent de
// l'heure du serveur. Aucun texte de l'agenda n'est accepté : des
// identifiants et des heures. Module pur.

import { z } from "zod";
import type { EvenementRecu, Fenetre } from "./reconciliation";

export const MAX_EVENEMENTS = 200;
export const FENETRE_MAX_MS = 90 * 24 * 60 * 60 * 1000;
/** L'écart admis entre l'heure de l'envoi et celle du serveur (anti-rejeu). */
export const DERIVE_MAX_MS = 5 * 60 * 1000;
/** Le début de la fenêtre : « maintenant » pour l'agent, à l'exécution près. */
export const DEBUT_FENETRE_MAX_MS = 15 * 60 * 1000;

// La forme des identifiants d'événement Google (base32hex), occurrences d'un
// événement récurrent comprises (`<id>_<date>`).
const identifiant = z.string().regex(/^[A-Za-z0-9_-]{1,1024}$/);
const heure = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

const schema = z.strictObject({
  envoyeLe: heure,
  fenetre: z.strictObject({ depuis: heure, jusqua: heure }),
  evenements: z
    .array(z.strictObject({ id: identifiant, debut: heure, fin: heure }))
    .max(MAX_EVENEMENTS),
});

export type Envoi = { envoyeLe: Date; fenetre: Fenetre; evenements: EvenementRecu[] };

export type LectureEnvoi = { ok: true; envoi: Envoi } | { ok: false; motif: string };

export function lireEnvoi(json: unknown, maintenant: Date): LectureEnvoi {
  const r = schema.safeParse(json);
  if (!r.success) return { ok: false, motif: "forme" };
  const { envoyeLe, fenetre, evenements } = r.data;
  const t = maintenant.getTime();
  if (Math.abs(envoyeLe.getTime() - t) > DERIVE_MAX_MS) return { ok: false, motif: "heure_envoi" };
  if (Math.abs(fenetre.depuis.getTime() - t) > DEBUT_FENETRE_MAX_MS) return { ok: false, motif: "fenetre" };
  const largeur = fenetre.jusqua.getTime() - fenetre.depuis.getTime();
  if (largeur <= 0 || largeur > FENETRE_MAX_MS) return { ok: false, motif: "fenetre" };
  if (evenements.some((ev) => ev.fin.getTime() <= ev.debut.getTime())) return { ok: false, motif: "heures" };
  if (new Set(evenements.map((ev) => ev.id)).size !== evenements.length) return { ok: false, motif: "doublon" };
  return { ok: true, envoi: { envoyeLe, fenetre, evenements } };
}
