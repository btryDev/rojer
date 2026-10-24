import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { obligationParId } from "@/lib/referentiels/conformite";
import { ORDRE_RAPPORT_PLUS_RECENT } from "@/lib/rapports/derniere-realisation";
import { appareilDesignable, estControleDEnsemble, recoitDesPoints } from "./regles";

/**
 * Les lectures des points à corriger (ADR-048). Toutes bornées au compte
 * connecté par `Entreprise.userId` (ADR-005) : un identifiant venu de l'URL
 * ne lit jamais le dossier d'un autre.
 */

/** Ce qu'une ligne de point montre, partout où on la liste. */
const SELECTION_POINT = {
  id: true,
  libelle: true,
  description: true,
  type: true,
  criticite: true,
  statut: true,
  echeance: true,
  responsable: true,
  leveeLe: true,
  leveeCommentaire: true,
  leveeFichierNom: true,
  createdAt: true,
  verification: { select: { id: true, libelleObligation: true, equipementId: true } },
  rapportOrigine: { select: { id: true, dateRapport: true, resultat: true } },
  equipement: { select: { id: true, libelle: true } },
} as const;

/**
 * Les points d'un appareil : ceux de ses propres contrôles, et ceux qu'un
 * contrôle d'ensemble a désignés sur lui. Ouverts d'abord, puis par échéance.
 */
export async function listerPointsDeLEquipement(equipementId: string) {
  const user = await requireUser();
  return prisma.action.findMany({
    where: {
      etablissement: { entreprise: { userId: user.id } },
      verificationId: { not: null },
      OR: [{ verification: { equipementId } }, { equipementId }],
    },
    select: SELECTION_POINT,
    orderBy: [{ statut: "asc" }, { echeance: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

export type PointListe = Awaited<ReturnType<typeof listerPointsDeLEquipement>>[number];

/**
 * Les points d'un contrôle — la page du contrôle les liste ; pour un contrôle
 * d'ensemble, elle gère ceux qui ne désignent aucun appareil.
 */
export async function listerPointsDuControle(verificationId: string) {
  const user = await requireUser();
  return prisma.action.findMany({
    where: { verificationId, etablissement: { entreprise: { userId: user.id } } },
    select: SELECTION_POINT,
    orderBy: [{ statut: "asc" }, { echeance: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

/** Un contrôle auquel on peut rattacher un point, et son dernier rapport. */
export type ControlePourUnPoint = {
  verificationId: string;
  libelle: string;
  ensemble: boolean;
  dernierRapport: { id: string; dateRapport: Date } | null;
};

/**
 * Les contrôles auxquels un point de cet appareil peut se rattacher : ses
 * propres lignes, et les contrôles d'ensemble qui couvrent sa catégorie. Ni
 * ligne éteinte, ni appareil retiré (`recoitDesPoints`).
 */
export async function controlesPourUnPoint(equipementId: string): Promise<ControlePourUnPoint[]> {
  const user = await requireUser();
  const eq = await prisma.equipement.findFirst({
    where: { id: equipementId, etablissement: { entreprise: { userId: user.id } } },
    select: { id: true, etablissementId: true, categorie: true, actif: true },
  });
  if (!eq || !eq.actif) return [];
  const lignes = await prisma.verification.findMany({
    where: {
      etablissementId: eq.etablissementId,
      archiveLe: null,
      salarieId: null,
      OR: [{ equipementId: eq.id }, { equipementId: null }],
    },
    select: {
      id: true,
      libelleObligation: true,
      obligationId: true,
      equipementId: true,
      salarieId: true,
      archiveLe: true,
      rapports: { orderBy: ORDRE_RAPPORT_PLUS_RECENT, take: 1, select: { id: true, dateRapport: true } },
    },
    orderBy: { libelleObligation: "asc" },
  });
  return lignes
    .filter((v) => {
      // L'appareil de la fiche est actif (vérifié plus haut) ; une ligne
      // d'ensemble n'en a pas.
      if (!recoitDesPoints({ ...v, appareilActif: v.equipementId ? true : null })) return false;
      if (!estControleDEnsemble(v)) return true;
      const o = obligationParId(v.obligationId);
      return o !== undefined && appareilDesignable(o, eq);
    })
    .map((v) => ({
      verificationId: v.id,
      libelle: v.libelleObligation,
      ensemble: estControleDEnsemble(v),
      dernierRapport: v.rapports[0] ?? null,
    }));
}

/**
 * Les appareils qu'un point de ce contrôle d'ensemble peut désigner : actifs,
 * de l'établissement, d'une catégorie que le contrôle couvre. Vide pour le
 * contrôle d'un appareil.
 */
export async function appareilsDesignables(verificationId: string) {
  const user = await requireUser();
  const v = await prisma.verification.findFirst({
    where: { id: verificationId, etablissement: { entreprise: { userId: user.id } } },
    select: { etablissementId: true, obligationId: true, equipementId: true, salarieId: true },
  });
  if (!v || !estControleDEnsemble(v)) return [];
  const o = obligationParId(v.obligationId);
  if (!o) return [];
  const appareils = await prisma.equipement.findMany({
    where: { etablissementId: v.etablissementId, actif: true },
    select: { id: true, libelle: true, categorie: true, actif: true },
    orderBy: { libelle: "asc" },
  });
  return appareils.filter((a) => appareilDesignable(o, a)).map(({ id, libelle }) => ({ id, libelle }));
}
