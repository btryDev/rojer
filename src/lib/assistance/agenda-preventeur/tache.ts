import "server-only";
// La synchronisation de l'agenda du préventeur, lancée par la crontab de
// chaque minute (`taches/quotidiennes.ts`), un passage toutes les 15 minutes
// (ADR-064, amendée le 2026-11-26 : plus d'agent ni de route).
//
// 1. Lire l'agenda (`google.ts`). Une lecture incomplète arrête tout : rien
//    n'est réconcilié sur une liste partielle.
// 2. Réconcilier et appliquer en base, sous verrou (`synchronisation.ts`).
// 3. Écrire dans l'agenda ce qui diffère : titres, heures à remettre, et les
//    événements à créer, liés à leur créneau dès leur création. Une écriture
//    qui échoue est reprise au passage suivant — tout est rejouable.
//
// Les problèmes vont à `ALERTES_EMAIL`, une fois par jour et par nature.

import { alerterUneFoisParJour } from "@/lib/alertes";
import { quandLeRendezVous } from "../rendez-vous-libelles";
import { dernierPassageHorsVerrou, journaliserUnEchec, lierEvenement } from "./base";
import {
  ErreurGoogle,
  configurationGoogle,
  creerEvenement,
  listerEvenements,
  modifierEvenement,
  type ConfigGoogle,
  type EvenementGoogle,
} from "./google";
import type { Conflit } from "./reconciliation";
import { synchroniser, tropTot, type ACreer } from "./synchronisation";

/** Un motif écrit par Rojer, jamais un message reçu (qui pourrait citer des données). */
function motifDErreur(e: unknown): string {
  if (e instanceof ErreurGoogle) return e.statut ? `${e.message} (HTTP ${e.statut})` : e.message;
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return "Google ne répond pas";
  return e instanceof Error ? `erreur inattendue (${e.name})` : "erreur inattendue";
}

/** La fenêtre lue : de maintenant à huit semaines (le client réserve sur un mois). */
const FENETRE_MS = 56 * 24 * 60 * 60_000;

export type Passage =
  | { etat: "hors-service" | "pas-encore" | "deja-fait" | "plafond" }
  | { etat: "echec"; motif: string }
  | { etat: "fait"; bilan: object; agenda: { modifies: number; crees: number; echecs: number } };

const PHRASE_CONFLIT: Record<Conflit["nature"], string> = {
  deplace: "Son événement a été déplacé dans l'agenda : Rojer le remet à son heure.",
  supprime: "Son événement a été supprimé de l'agenda : Rojer le recrée.",
};

async function signalerLesConflits(conflits: Conflit[], maintenant: Date): Promise<void> {
  for (const c of conflits) {
    await alerterUneFoisParJour(
      `agenda:${c.creneauId}:${c.nature}`,
      "Agenda du préventeur : un créneau réservé a bougé",
      // La date seule : la raison sociale (parfois un nom de personne) ne va ni
      // au journal ni à l'alerte (`lib/alertes.ts`, « jamais une donnée de
      // l'utilisateur », revue de sécurité du 2026-11-26).
      [`Créneau réservé : ${quandLeRendezVous(c.debut, c.fin)}.`, PHRASE_CONFLIT[c.nature], "Rien n'a changé dans Rojer."],
      maintenant,
    );
  }
}

/** Écrit dans l'agenda ce qui diffère de ce que Rojer y veut. */
async function ecrireDansLAgenda(
  config: ConfigGoogle,
  lus: EvenementGoogle[],
  consignes: { id: string; titre: string; remettre?: { debut: Date; fin: Date } }[],
  aCreer: ACreer[],
) {
  const parId = new Map(lus.map((ev) => [ev.id, ev]));
  const bilan = { modifies: 0, crees: 0, echecs: 0 };
  for (const c of consignes) {
    const ev = parId.get(c.id);
    if (!ev) continue;
    const memeTitre = ev.titre === c.titre;
    const memeHeure =
      !c.remettre || (ev.debut.getTime() === c.remettre.debut.getTime() && ev.fin.getTime() === c.remettre.fin.getTime());
    if (memeTitre && memeHeure) continue;
    try {
      if (await modifierEvenement(config, ev, { titre: c.titre, ...(c.remettre ?? {}) })) bilan.modifies++;
    } catch (e) {
      bilan.echecs++;
      console.error(`agenda : modification non écrite — ${motifDErreur(e)}`);
    }
  }
  for (const a of aCreer) {
    try {
      const id = await creerEvenement(config, a);
      bilan.crees++;
      // Non lié (le créneau a changé entre-temps) : l'événement sera repris par son heure au passage suivant.
      await lierEvenement({ creneauId: a.creneauId, ancien: a.ancien, evenementId: id });
    } catch (e) {
      bilan.echecs++;
      console.error(`agenda : création non écrite — ${motifDErreur(e)}`);
    }
  }
  return bilan;
}

export async function synchroniserLAgenda(maintenant: Date): Promise<Passage> {
  let config: ConfigGoogle | null;
  try {
    config = configurationGoogle();
  } catch (e) {
    if (!tropTot(await dernierPassageHorsVerrou(), maintenant)) {
      await journaliserUnEchec(maintenant, "configuration");
      await alerterUneFoisParJour("agenda:config", "Agenda du préventeur : configuration à corriger", [motifDErreur(e)], maintenant);
    }
    return { etat: "echec", motif: "configuration" };
  }
  if (!config) return { etat: "hors-service" };
  // Une économie avant d'appeler Google ; le verrou départage ensuite.
  const dernier = await dernierPassageHorsVerrou();
  if (tropTot(dernier, maintenant)) return { etat: "pas-encore" };

  const fenetre = { depuis: maintenant, jusqua: new Date(maintenant.getTime() + FENETRE_MS) };
  let lus: EvenementGoogle[];
  try {
    lus = await listerEvenements(config, fenetre);
  } catch (e) {
    const motif = motifDErreur(e);
    await journaliserUnEchec(maintenant, "google");
    await alerterUneFoisParJour("agenda:lecture", "Agenda du préventeur : lecture impossible", [
      `L'agenda n'a pas pu être lu (${motif}). Rien n'a changé dans Rojer ; la synchronisation reprendra toute seule.`,
      "Si ça dure : vérifier que l'agenda est toujours partagé avec le compte de service, et que sa clé n'a pas été révoquée.",
    ], maintenant);
    return { etat: "echec", motif };
  }

  const r = await synchroniser({ fenetre, evenements: lus.map(({ id, debut, fin }) => ({ id, debut, fin })) }, maintenant);
  if (r.etat === "deja-fait") return { etat: "deja-fait" };
  if (r.etat === "plafond") {
    await alerterUneFoisParJour("agenda:plafond", "Agenda du préventeur : passage refusé", [
      `Le passage aurait fermé ${r.fermetures} créneau(x) d'un coup : il est refusé, rien n'a changé.`,
      "Vérifier que l'agenda n'a pas été vidé, ou supprimer les créneaux à la main si c'est voulu.",
    ], maintenant);
    return { etat: "plafond" };
  }
  await signalerLesConflits(r.plan.conflits, maintenant);
  const consignes = r.plan.consignes.filter((c) => !r.ecartes.has(c.id));
  const agenda = await ecrireDansLAgenda(config, lus, consignes, r.aCreer);
  if (agenda.echecs > 0) {
    await alerterUneFoisParJour("agenda:ecriture", "Agenda du préventeur : écritures en échec", [
      `${agenda.echecs} écriture(s) dans l'agenda n'ont pas abouti ; elles sont reprises au passage suivant.`,
    ], maintenant);
  }
  return { etat: "fait", bilan: r.bilan, agenda };
}

/** Pour la tâche de chaque minute : ne lève jamais. */
export async function synchroniserLAgendaSansLever(maintenant: Date): Promise<Passage> {
  try {
    return await synchroniserLAgenda(maintenant);
  } catch (e) {
    console.error(`agenda : synchronisation en échec — ${motifDErreur(e)}`);
    await alerterUneFoisParJour("agenda:echec", "Agenda du préventeur : synchronisation en échec", [motifDErreur(e)], maintenant).catch(
      () => undefined,
    );
    return { etat: "echec", motif: motifDErreur(e) };
  }
}
