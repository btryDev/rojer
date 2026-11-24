import "server-only";
// Le rendez-vous annuel de la formule Pro (ADR-063) : l'année où il compte,
// et ce que la page Assistance en montre. Lu par le client borné au compte ;
// les créneaux, hors compte, par `creneaux.ts`.

import type { ModeRendezVous } from "@prisma/client";
import { anniversaire, debutDeLAnnee } from "@/lib/abonnements/quotas";
import type { Db } from "@/lib/auth/compte";
import { creneauxLibres } from "./creneaux";
import { fenetreDesCreneaux } from "./rendez-vous-libelles";

/**
 * L'année où tombe un rendez-vous (ADR-063 § 2) : de l'anniversaire du
 * premier paiement (`debutPayantLe`, l'ancre des plafonds annuels de l'ADR-053
 * § 14) au suivant. Un compte qui n'a jamais payé — un compte offert — suit
 * l'année civile.
 */
export function anneeDuRendezVous(ancre: Date | null | undefined, date: Date): { debut: Date; fin: Date } {
  if (!ancre) {
    const a = date.getUTCFullYear();
    return { debut: new Date(Date.UTC(a, 0, 1)), fin: new Date(Date.UTC(a + 1, 0, 1)) };
  }
  const debut = debutDeLAnnee(ancre, date);
  return { debut, fin: anniversaire(ancre, debut.getUTCFullYear() + 1) };
}

/** La fin connue de l'abonnement : une date programmée, ou la fin de la période d'un abonnement résilié. */
export function finConnueDeLAbonnement(
  ligne: { finPrevueLe: Date | null; resilieEnFinDePeriode: boolean | null; finPeriode: Date | null } | null,
): Date | null {
  if (!ligne) return null;
  return ligne.finPrevueLe ?? (ligne.resilieEnFinDePeriode ? ligne.finPeriode : null);
}

const COLONNES_RENDEZ_VOUS = {
  id: true,
  creneauId: true,
  debut: true,
  fin: true,
  mode: true,
  telephone: true,
  sujet: true,
  userId: true,
  createdAt: true,
} as const;

export type RendezVousDuCompte = {
  id: string;
  creneauId: string;
  debut: Date;
  fin: Date;
  mode: ModeRendezVous;
  telephone: string | null;
  sujet: string | null;
  /** Qui l'a réservé, et quand : « Réservé par Marie Durand le 24 novembre ». */
  userId: string;
  createdAt: Date;
};

/**
 * Ce que l'onglet « Rendez-vous annuel » montre :
 * - le rendez-vous à venir (ou en cours), s'il y en a un ;
 * - celui de l'année, s'il a déjà eu lieu ;
 * - les créneaux libres du mois qui vient (à plus de 24 h), sans ceux qui
 *   tombent dans une année déjà prise — en dehors du rendez-vous à venir,
 *   qu'un déplacement remplace.
 */
export async function rendezVousDuCompte(db: Db, ancre: Date | null | undefined, maintenant: Date) {
  const annee = anneeDuRendezVous(ancre, maintenant);
  const [rendezVous, libres] = await Promise.all([
    db.rendezVousAssistance.findMany({
      where: { annuleLe: null, debut: { gte: annee.debut } },
      orderBy: { debut: "asc" },
      select: COLONNES_RENDEZ_VOUS,
    }),
    creneauxLibres(db, fenetreDesCreneaux(maintenant)),
  ]);
  const prochain = rendezVous.find((r) => r.fin > maintenant) ?? null;
  const passe = rendezVous.findLast((r) => r.fin <= maintenant) ?? null;
  const autres = rendezVous.filter((r) => r.id !== prochain?.id);
  const creneaux = libres.filter((c) => {
    const a = anneeDuRendezVous(ancre, c.debut);
    return !autres.some((r) => r.debut >= a.debut && r.debut < a.fin);
  });
  return { prochain, passe, creneaux, finDeLAnnee: annee.fin };
}
