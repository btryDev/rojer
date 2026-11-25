import "server-only";
// La synchronisation de l'agenda du préventeur (ADR-064) : un envoi déjà lu
// (`envoi.ts`) est réconcilié (`reconciliation.ts`) et appliqué sous un
// verrou, dans une transaction. Rend les consignes de l'agent.
//
// - Anti-rejeu : un envoi qui n'est pas postérieur au dernier accepté est
//   refusé (§ 3, point 4).
// - Plafond de dégâts : un envoi qui fermerait trop de créneaux d'un coup est
//   refusé, et l'équipe prévenue (§ 3, point 5).
// - Une écriture que la base refuse (réservé entre-temps, début pris) ne
//   donne pas de consigne : l'envoi suivant reprend l'état réel.

import type { Prisma } from "@prisma/client";
import { alerter, alerterUneFoisParJour } from "@/lib/alertes";
import { prisma } from "@/lib/prisma";
import { heureCourte, jourAvecAnnee, quandLeRendezVous } from "../rendez-vous-libelles";
import {
  creneauxConcernes,
  derniereSynchronisation,
  dernierEnvoiAccepte,
  enCreneauxConnus,
  fermer,
  journaliser,
  ouvrir,
  rattacher,
  titresDesReserves,
  verrouillerLaSynchronisation,
  type Bilan,
} from "./base";
import type { Envoi } from "./envoi";
import { reconcilier, type Conflit, type Plan } from "./reconciliation";

/** Le secret que l'agent présente, ou `null` : la route répond alors 404. */
export function secretDeLAgenda(env: Record<string, string | undefined> = process.env): string | null {
  return env.AGENDA_SECRET?.trim() || null;
}

/** Au-delà, un envoi qui fermerait des créneaux est tenu pour un agenda mal lu. */
export const PLAFOND_FERMETURES = 10;
/** Un envoi vide qui fermerait au moins autant de créneaux est refusé. */
export const PLAFOND_FERMETURES_ENVOI_VIDE = 3;

export type ReponseAgent = {
  evenements: { id: string; titre: string; debut?: string; fin?: string }[];
  aCreer: { debut: string; fin: string; titre: string }[];
  bilan: Bilan;
};

export type Resultat =
  | { statut: 200; corps: ReponseAgent }
  | { statut: 409 | 422; corps: { erreur: "rejeu" | "plafond" } };

/** Le plan dépasse-t-il le plafond de dégâts ? Exporté pour les tests. */
export function depasseLePlafond(plan: Plan): boolean {
  const fermetures = plan.operations.fermer.length;
  if (fermetures > PLAFOND_FERMETURES) return true;
  return plan.evenementsDansLaFenetre === 0 && fermetures >= PLAFOND_FERMETURES_ENVOI_VIDE;
}

type Applique = { bilan: Bilan; ecartes: Set<string> };

async function appliquer(tx: Prisma.TransactionClient, plan: Plan): Promise<Applique> {
  const bilan: Bilan = { ouverts: 0, deplaces: 0, fermes: 0, rattaches: 0, conflits: plan.conflits.length };
  // Les événements dont l'écriture n'a pas pris : pas de consigne pour eux.
  const ecartes = new Set<string>();
  const { operations: o } = plan;
  // D'abord libérer les débuts (fermés, puis déplacés), ensuite les occuper :
  // deux créneaux qui échangent leurs heures passent dans le même envoi.
  for (const f of o.fermer) if (await fermer(tx, f)) bilan.fermes++;
  const deplaces = [];
  for (const d of o.deplacer) {
    if (await fermer(tx, { creneauId: d.creneauId, evenementId: d.evenementId })) deplaces.push(d);
    else ecartes.add(d.evenementId);
  }
  for (const r of o.rattacher) {
    if (await rattacher(tx, r)) bilan.rattaches++;
    else ecartes.add(r.evenementId);
  }
  for (const d of deplaces) {
    if (await ouvrir(tx, d)) bilan.deplaces++;
    else ecartes.add(d.evenementId);
  }
  for (const n of o.ouvrir) {
    if (await ouvrir(tx, n)) bilan.ouverts++;
    else ecartes.add(n.evenementId);
  }
  return { bilan, ecartes };
}

function enReponse(plan: Plan, { bilan, ecartes }: Applique): ReponseAgent {
  return {
    evenements: plan.consignes
      .filter((c) => !ecartes.has(c.id))
      .map((c) =>
        c.remettre
          ? { id: c.id, titre: c.titre, debut: c.remettre.debut.toISOString(), fin: c.remettre.fin.toISOString() }
          : { id: c.id, titre: c.titre },
      ),
    aCreer: plan.aCreer.map((a) => ({ debut: a.debut.toISOString(), fin: a.fin.toISOString(), titre: a.titre })),
    bilan,
  };
}

const PHRASE_CONFLIT: Record<Conflit["nature"], string> = {
  deplace: "Son événement a été déplacé dans l'agenda : l'agent le remet à son heure.",
  supprime: "Son événement a été supprimé de l'agenda : l'agent le recrée.",
};

async function signalerLesConflits(conflits: Conflit[], maintenant: Date): Promise<void> {
  for (const c of conflits) {
    await alerterUneFoisParJour(
      `agenda:${c.creneauId}:${c.nature}`,
      "Agenda du préventeur : un créneau réservé a bougé",
      [`Créneau réservé : ${quandLeRendezVous(c.debut, c.fin)} (${c.titre}).`, PHRASE_CONFLIT[c.nature], "Rien n'a changé dans Rojer."],
      maintenant,
    );
  }
}

export async function synchroniser(envoi: Envoi, maintenant: Date): Promise<Resultat> {
  const issue = await prisma.$transaction(
    async (tx) => {
      await verrouillerLaSynchronisation(tx);
      const dernier = await dernierEnvoiAccepte(tx);
      if (dernier && envoi.envoyeLe.getTime() <= dernier.getTime()) {
        await journaliser(tx, { envoyeLe: envoi.envoyeLe, accepte: false, motif: "rejeu" });
        return { refus: "rejeu" as const };
      }
      const lignes = await creneauxConcernes(
        tx,
        envoi.fenetre,
        envoi.evenements.map((ev) => ev.id),
      );
      const titres = await titresDesReserves(tx, lignes.filter((l) => l.reserve).map((l) => l.id));
      const plan = reconcilier({ fenetre: envoi.fenetre, evenements: envoi.evenements, creneaux: enCreneauxConnus(lignes, titres) });
      if (depasseLePlafond(plan)) {
        await journaliser(tx, { envoyeLe: envoi.envoyeLe, accepte: false, motif: "plafond" });
        return { refus: "plafond" as const, fermetures: plan.operations.fermer.length };
      }
      const applique = await appliquer(tx, plan);
      await journaliser(tx, { envoyeLe: envoi.envoyeLe, accepte: true, motif: null, bilan: applique.bilan });
      return { plan, applique };
    },
    { timeout: 20_000 },
  );

  if ("refus" in issue) {
    if (issue.refus === "plafond") {
      await alerter("Agenda du préventeur : envoi refusé", [
        `L'envoi aurait fermé ${issue.fermetures} créneau(x) d'un coup : il est refusé, rien n'a changé.`,
        "Vérifier que l'agent lit le bon agenda, et qu'il n'a pas été vidé.",
      ]);
      return { statut: 422, corps: { erreur: "plafond" } };
    }
    return { statut: 409, corps: { erreur: "rejeu" } };
  }
  await signalerLesConflits(issue.plan.conflits, maintenant);
  return { statut: 200, corps: enReponse(issue.plan, issue.applique) };
}

const H = 60 * 60 * 1000;

/**
 * Le silence admis depuis le dernier envoi accepté, au passage de la tâche
 * quotidienne (9 h, Paris) : l'agent passe de 8 h à 19 h en semaine. Le lundi
 * couvre le week-end ; le samedi et le dimanche, rien n'est attendu.
 */
export function silenceAdmis(maintenant: Date): number | null {
  const jour = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Paris" }).format(maintenant);
  if (jour === "Sat" || jour === "Sun") return null;
  return jour === "Mon" ? 74 * H : 26 * H;
}

/**
 * La tâche quotidienne : un agent arrêté ne se voit nulle part (plus de
 * créneau ouvert, plus de « Réservé » dans l'agenda) — on le dit. Rien
 * avant la première synchronisation : l'agent n'est pas encore en service.
 */
export async function verifierQueLAgentPasse(maintenant: Date): Promise<{ silencieux: boolean }> {
  const admis = silenceAdmis(maintenant);
  if (!secretDeLAgenda() || admis === null) return { silencieux: false };
  const derniere = await derniereSynchronisation();
  if (!derniere || maintenant.getTime() - derniere.getTime() <= admis) return { silencieux: false };
  await alerter("Agenda du préventeur : l'agent ne passe plus", [
    `Dernière synchronisation acceptée : ${jourAvecAnnee(derniere)} à ${heureCourte(derniere)}.`,
    "Les créneaux ouverts dans l'agenda n'arrivent plus dans Rojer, et les réservations n'y sont plus reportées.",
    "Vérifier la tâche planifiée de l'agent et son connecteur Google Calendar.",
  ]);
  return { silencieux: true };
}
