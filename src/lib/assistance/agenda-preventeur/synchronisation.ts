import "server-only";
// La réconciliation appliquée en base (ADR-064) : l'état lu dans l'agenda est
// réconcilié (`reconciliation.ts`) et appliqué sous un verrou, dans une
// transaction. Rend ce qu'il reste à écrire dans l'agenda (`tache.ts`).
//
// - Cadence : sous le verrou, un passage trop rapproché du précédent est
//   sauté — deux instances que la crontab lance à la même minute n'en font
//   qu'un.
// - Plafond de dégâts : un passage qui fermerait trop de créneaux d'un coup
//   est refusé (§ 3, point 5).
// - Une écriture que la base refuse (réservé entre-temps, début pris) ne
//   donne pas de consigne : le passage suivant reprend l'état réel.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Fenetre } from "../creneaux";
import {
  creneauxConcernes,
  creneauxSansEvenement,
  dernierPassage,
  enCreneauxConnus,
  fermer,
  journaliser,
  ouvrir,
  rattacher,
  titresDesReserves,
  verrouillerLaSynchronisation,
  type Bilan,
} from "./base";
import { dansLaFenetre, reconcilier, titreDuCreneau, type EvenementRecu, type Plan } from "./reconciliation";

/** Un passage toutes les 15 minutes ; la crontab, elle, appelle chaque minute. */
export const INTERVALLE_MS = 15 * 60_000;
/** Au-delà, un passage qui fermerait des créneaux est tenu pour un agenda mal lu. */
export const PLAFOND_FERMETURES = 10;
/** Un agenda vide qui fermerait au moins autant de créneaux est refusé. */
const PLAFOND_FERMETURES_AGENDA_VIDE = 3;

/** Un passage trop rapproché du précédent est sauté (une minute de marge pour la crontab). */
export const tropTot = (dernier: Date | null, maintenant: Date) =>
  dernier !== null && maintenant.getTime() - dernier.getTime() < INTERVALLE_MS - 60_000;

export type Lecture = { fenetre: Fenetre; evenements: EvenementRecu[] };

/** Un créneau dont l'événement est à créer dans l'agenda, et ce qu'il remplace. */
export type ACreer = { creneauId: string; ancien: string | null; debut: Date; fin: Date; titre: string };

export type Resultat =
  | { etat: "deja-fait" }
  | { etat: "plafond"; fermetures: number }
  | { etat: "fait"; plan: Plan; ecartes: Set<string>; aCreer: ACreer[]; bilan: Bilan };

/**
 * Les créneaux que le plan ferme pour de bon (un déplacement rouvre aussitôt),
 * ou `null` s'il reste sous le plafond. « Vide » se lit sur les événements de
 * la fenêtre : un événement entamé n'en fait pas un agenda.
 */
function fermeturesAuDelaDuPlafond(plan: Plan, lecture: Lecture): number | null {
  const fermetures = plan.operations.fermer.filter((f) => !f.deplacement).length;
  const vide = !lecture.evenements.some((ev) => dansLaFenetre(lecture.fenetre, ev.debut));
  const depasse = fermetures > PLAFOND_FERMETURES || (vide && fermetures >= PLAFOND_FERMETURES_AGENDA_VIDE);
  return depasse ? fermetures : null;
}

async function appliquer(tx: Prisma.TransactionClient, plan: Plan): Promise<{ bilan: Bilan; ecartes: Set<string> }> {
  const bilan: Bilan = { ouverts: 0, deplaces: 0, fermes: 0, rattaches: 0, conflits: plan.conflits.length };
  // Les événements dont l'écriture n'a pas pris : pas de consigne pour eux.
  const ecartes = new Set<string>();
  const { fermer: aFermer, rattacher: aRattacher, ouvrir: aOuvrir } = plan.operations;
  // D'abord libérer les débuts, ensuite les occuper : deux créneaux qui
  // échangent leurs heures passent dans le même passage.
  for (const f of aFermer) {
    if (await fermer(tx, f)) {
      if (!f.deplacement) bilan.fermes++;
    } else if (f.deplacement && f.evenementId) {
      ecartes.add(f.evenementId);
    }
  }
  for (const r of aRattacher) {
    if (await rattacher(tx, r)) bilan.rattaches++;
    else ecartes.add(r.evenementId);
  }
  for (const o of aOuvrir) {
    // Un déplacé dont la fermeture n'a pas pris (réservé entre-temps) ne se rouvre pas.
    if (o.evenementId && ecartes.has(o.evenementId)) continue;
    if (await ouvrir(tx, o)) bilan[o.deplacement ? "deplaces" : "ouverts"]++;
    else if (o.evenementId) ecartes.add(o.evenementId);
  }
  return { bilan, ecartes };
}

export async function synchroniser(lecture: Lecture, maintenant: Date): Promise<Resultat> {
  return prisma.$transaction(
    async (tx) => {
      await verrouillerLaSynchronisation(tx);
      if (tropTot(await dernierPassage(tx), maintenant)) return { etat: "deja-fait" as const };

      const lignes = await creneauxConcernes(tx, lecture.fenetre, lecture.evenements.map((ev) => ev.id));
      const titres = await titresDesReserves(tx, lignes.filter((l) => l.reserve).map((l) => l.id));
      const plan = reconcilier({ ...lecture, creneaux: enCreneauxConnus(lignes, titres) });
      const fermetures = fermeturesAuDelaDuPlafond(plan, lecture);
      if (fermetures !== null) {
        await journaliser(tx, { quand: maintenant, accepte: false, motif: "plafond" });
        return { etat: "plafond" as const, fermetures };
      }
      const { bilan, ecartes } = await appliquer(tx, plan);

      // Les créneaux qui restent sans événement (heures découpées à l'instant,
      // ouverts par script, création échouée au passage précédent) : leur
      // événement est créé dans l'agenda après la transaction.
      const sans = await creneauxSansEvenement(tx, lecture.fenetre);
      const titresSans = await titresDesReserves(tx, sans.filter((l) => l.reserve).map((l) => l.id));
      const aCreer: ACreer[] = [
        ...plan.aCreer,
        ...enCreneauxConnus(sans, titresSans).map((c) => ({
          creneauId: c.id,
          ancien: null,
          debut: c.debut,
          fin: c.fin,
          titre: titreDuCreneau(c),
        })),
      ];
      await journaliser(tx, { quand: maintenant, accepte: true, motif: null, bilan });
      return { etat: "fait" as const, plan, ecartes, aCreer, bilan };
    },
    { timeout: 20_000 },
  );
}
