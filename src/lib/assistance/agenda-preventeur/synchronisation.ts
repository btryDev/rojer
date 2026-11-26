import "server-only";
// La réconciliation appliquée en base (ADR-064) : l'état lu dans l'agenda est
// réconcilié (`reconciliation.ts`) et appliqué sous un verrou, dans une
// transaction. Rend ce qu'il reste à écrire dans l'agenda (`tache.ts`).
//
// - Plafond de dégâts : un passage qui fermerait trop de créneaux d'un coup
//   est refusé (§ 3, point 5).
// - Une écriture que la base refuse (réservé entre-temps, début pris) ne
//   donne pas de consigne : le passage suivant reprend l'état réel.
// - Les créneaux sans événement (heures découpées, détachés, script) sont
//   relus après l'application : ce sont les événements à créer.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Fenetre } from "../creneaux";
import {
  clorePassage,
  creneauxConcernes,
  creneauxSansEvenement,
  enCreneauxConnus,
  fermer,
  ouvrir,
  rattacher,
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

export type Lecture = { fenetre: Fenetre; evenements: EvenementRecu[] };

/** Un créneau dont l'événement est à créer dans l'agenda. */
export type ACreer = { creneauId: string; debut: Date; fin: Date; titre: string };

export type Resultat =
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
    else if (r.evenementId) ecartes.add(r.evenementId);
  }
  for (const o of aOuvrir) {
    // Un déplacé dont la fermeture n'a pas pris (réservé entre-temps) ne se rouvre pas.
    if (o.evenementId && ecartes.has(o.evenementId)) continue;
    if (await ouvrir(tx, o)) bilan[o.deplacement ? "deplaces" : "ouverts"]++;
    else if (o.evenementId) ecartes.add(o.evenementId);
  }
  return { bilan, ecartes };
}

/** `passage` : la ligne du journal prise par `prendreLePassage`, close ici. */
export async function synchroniser(lecture: Lecture, passage: string): Promise<Resultat> {
  return prisma.$transaction(
    async (tx) => {
      await verrouillerLaSynchronisation(tx);
      const lignes = await creneauxConcernes(tx, lecture.fenetre, lecture.evenements.map((ev) => ev.id));
      const creneaux = await enCreneauxConnus(tx, lignes);
      const plan = reconcilier({ ...lecture, creneaux });
      const fermetures = fermeturesAuDelaDuPlafond(plan, lecture);
      if (fermetures !== null) {
        await clorePassage(tx, passage, { accepte: false, motif: "plafond" });
        return { etat: "plafond" as const, fermetures };
      }
      const { bilan, ecartes } = await appliquer(tx, plan);
      // Un créneau sans événement était déjà lu (fenêtre), ou vient d'être
      // ouvert, donc libre : son titre se prend sur ce qui est lu.
      const parId = new Map(creneaux.map((c) => [c.id, c]));
      const aCreer = (await creneauxSansEvenement(tx, lecture.fenetre)).map((l) => ({
        creneauId: l.id,
        debut: l.debut,
        fin: l.fin,
        titre: titreDuCreneau(parId.get(l.id) ?? { reserve: false, titreReserve: null }),
      }));
      await clorePassage(tx, passage, { accepte: true, motif: null, bilan });
      return { etat: "fait" as const, plan, ecartes, aCreer, bilan };
    },
    { timeout: 20_000 },
  );
}
