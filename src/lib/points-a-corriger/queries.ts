import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { obligationParId } from "@/lib/referentiels/conformite";
import { ORDRE_RAPPORT_PLUS_RECENT } from "@/lib/rapports/derniere-realisation";
import type { Resultat } from "@/lib/rapports/resultats";
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

/** Un rapport qu'on peut désigner comme celui qui a relevé le point. */
export type RapportPourUnPoint = { id: string; dateRapport: Date; resultat: Resultat };

/**
 * Combien de rapports récents le formulaire propose. Un point se note dans
 * les jours qui suivent le contrôle ; au-delà, « pas de rapport précis ».
 */
export const RAPPORTS_PROPOSES = 5;

/** Un contrôle auquel on peut rattacher un point, et ses rapports récents. */
export type ControlePourUnPoint = {
  verificationId: string;
  libelle: string;
  ensemble: boolean;
  rapports: RapportPourUnPoint[];
};

/**
 * Les contrôles auxquels un point de cet appareil peut se rattacher : ses
 * propres lignes, et les contrôles d'ensemble qui couvrent sa catégorie. Ni
 * ligne éteinte, ni appareil retiré (`recoitDesPoints`).
 */
export async function controlesPourUnPoint(eq: {
  /** L'appareil déjà lu par la page : la portée est rétablie dans la requête. */
  id: string;
  etablissementId: string;
  categorie: Parameters<typeof appareilDesignable>[1]["categorie"];
  actif: boolean;
}): Promise<ControlePourUnPoint[]> {
  if (!eq.actif) return [];
  // La portée reste DANS la requête (`tenancy-lectures.test.ts`) : l'appareil
  // reçu n'en dispense pas. `requireUser` est mémoïsé par requête.
  const user = await requireUser();
  const lignes = await prisma.verification.findMany({
    where: {
      etablissementId: eq.etablissementId,
      etablissement: { entreprise: { userId: user.id } },
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
      rapports: {
        orderBy: ORDRE_RAPPORT_PLUS_RECENT,
        take: RAPPORTS_PROPOSES,
        select: { id: true, dateRapport: true, resultat: true },
      },
    },
    orderBy: { libelleObligation: "asc" },
  });
  // Les contrôles de l'appareil d'abord, puis les contrôles d'ensemble.
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
      rapports: v.rapports,
    }))
    .sort((a, b) => Number(a.ensemble) - Number(b.ensemble));
}

/**
 * Les appareils qu'un point de ce contrôle d'ensemble peut désigner : actifs,
 * de l'établissement, d'une catégorie que le contrôle couvre. Vide pour le
 * contrôle d'un appareil.
 */
export async function appareilsDesignables(v: {
  /** La ligne déjà lue par la page : la portée est rétablie dans la requête. */
  etablissementId: string;
  obligationId: string;
  equipementId: string | null;
  salarieId: string | null;
}) {
  if (!estControleDEnsemble(v)) return [];
  const o = obligationParId(v.obligationId);
  if (!o) return [];
  const user = await requireUser();
  const appareils = await prisma.equipement.findMany({
    where: {
      etablissementId: v.etablissementId,
      etablissement: { entreprise: { userId: user.id } },
      actif: true,
    },
    select: { id: true, libelle: true, categorie: true, actif: true },
    orderBy: { libelle: "asc" },
  });
  return appareils.filter((a) => appareilDesignable(o, a)).map(({ id, libelle }) => ({ id, libelle }));
}
