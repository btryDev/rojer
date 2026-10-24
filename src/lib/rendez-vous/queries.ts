import "server-only";
import type { DomainePrestataire } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

/** Un prestataire tel que le choix du prestataire attitré le propose. */
export type PrestataireProposable = {
  id: string;
  raisonSociale: string;
  /** Il couvre le domaine de ce contrôle (`DOMAINES_PRESTATAIRE_ATTENDUS`). */
  couvre: boolean;
};

/**
 * Les prestataires de l'annuaire qu'un contrôle peut se voir attribuer
 * (ADR-049) : ceux qui couvrent son domaine d'abord, puis les autres — un
 * annuaire mal renseigné ne doit pas fermer le choix.
 */
export async function prestatairesProposables(
  etablissementId: string,
  domainesAttendus: readonly DomainePrestataire[],
): Promise<PrestataireProposable[]> {
  const user = await requireUser();
  const lignes = await prisma.prestataire.findMany({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
    select: { id: true, raisonSociale: true, domaines: true },
    orderBy: { raisonSociale: "asc" },
  });
  return lignes
    .map((p) => ({
      id: p.id,
      raisonSociale: p.raisonSociale,
      couvre: p.domaines.some((d) => domainesAttendus.includes(d)),
    }))
    .sort((a, b) => Number(b.couvre) - Number(a.couvre));
}

/**
 * Les contrôles ouverts dont ce prestataire est attitré (ADR-049), pour sa
 * fiche : le prochain rendez-vous d'abord.
 */
export async function controlesSuivisPar(etablissementId: string, prestataireId: string) {
  const user = await requireUser();
  return prisma.verification.findMany({
    where: {
      prestataireId,
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
      archiveLe: null,
    },
    select: {
      id: true,
      equipementId: true,
      libelleObligation: true,
      rendezVousLe: true,
      equipement: { select: { libelle: true } },
    },
    orderBy: [{ rendezVousLe: { sort: "asc", nulls: "last" } }, { libelleObligation: "asc" }],
  });
}
