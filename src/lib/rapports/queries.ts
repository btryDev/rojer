import "server-only";
import { prisma } from "@/lib/prisma";
import { ORDRE_RAPPORT_PLUS_RECENT } from "./derniere-realisation";
import { requireUser } from "@/lib/auth/require-user";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { libellePorteur } from "@/lib/calendrier/labels";

export type FiltresRegistre = {
  domaine?: DomaineObligation;
  recherche?: string; // sur libelleObligation + organismeVerif + equipement.libelle
};

/** Ce que le registre lit d'un point à corriger (ADR-048, lot 3). */
const SELECTION_POINT_DU_RAPPORT = {
  id: true,
  libelle: true,
  statut: true,
  leveeLe: true,
  leveeCommentaire: true,
  leveeFichierNom: true,
} as const;

export async function listerRapportsDeLEtablissement(
  etablissementId: string,
  filtres: FiltresRegistre = {},
) {
  const user = await requireUser();
  const rapports = await prisma.rapportVerification.findMany({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
    include: {
      verification: {
        include: {
          equipement: {
            include: { batiment: { select: { id: true, nom: true } } },
          },
          salarie: { select: { nom: true, prenom: true } },
        },
      },
      // Les points que ce rapport a relevés, et leur correction (ADR-048,
      // lot 3) : le registre les reprend sous le rapport.
      pointsACorriger: { select: SELECTION_POINT_DU_RAPPORT, orderBy: { createdAt: "asc" } },
    },
    orderBy: ORDRE_RAPPORT_PLUS_RECENT,
  });

  // Les points SANS rapport d'origine (antérieurs à l'ADR-048, ou dont le
  // rapport a été retiré) se disent sous le rapport le plus récent de leur
  // contrôle — la règle de la fiche d'un appareil (`fiche.ts`) : sans elle,
  // ils manqueraient au registre (revue du 2026-10-24).
  const sansOrigine = rapports.length
    ? await prisma.action.findMany({
        where: {
          etablissementId,
          etablissement: { entreprise: { userId: user.id } },
          rapportOrigineId: null,
          verificationId: { in: [...new Set(rapports.map((r) => r.verificationId))] },
        },
        select: { ...SELECTION_POINT_DU_RAPPORT, verificationId: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const dejaPose = new Set<string>();
  let out = rapports.map((r) => {
    // Les rapports arrivent du plus récent au plus ancien : le premier de
    // chaque contrôle reçoit ses points sans origine.
    if (dejaPose.has(r.verificationId)) return r;
    dejaPose.add(r.verificationId);
    const siens = sansOrigine.filter((p) => p.verificationId === r.verificationId);
    return siens.length ? { ...r, pointsACorriger: [...r.pointsACorriger, ...siens] } : r;
  });

  if (filtres.domaine) {
    out = out.filter(
      (r) =>
        obligationParId(r.verification.obligationId)?.domaine ===
        filtres.domaine,
    );
  }

  if (filtres.recherche) {
    const q = filtres.recherche.toLowerCase().trim();
    if (q.length > 0) {
      out = out.filter((r) => {
        const hay = [
          r.verification.libelleObligation,
          r.organismeVerif ?? "",
          // Le porteur, quel qu'il soit : chercher « Dupont » doit trouver
          // le rapport rattaché à l'échéance de Dupont. Le repli sur la chaîne
          // vide rendait ces rapports introuvables par le nom.
          libellePorteur(r.verification),
          r.commentaires ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
  }

  return out;
}

export type RapportListe = Awaited<
  ReturnType<typeof listerRapportsDeLEtablissement>
>[number];

export async function getRapport(id: string) {
  const user = await requireUser();
  return prisma.rapportVerification.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    include: {
      verification: {
        include: {
          equipement: true,
          etablissement: {
            select: { id: true, raisonDisplay: true },
          },
        },
      },
    },
  });
}

export async function listerRapportsDUneVerification(verificationId: string) {
  const user = await requireUser();
  return prisma.rapportVerification.findMany({
    where: {
      verificationId,
      etablissement: { entreprise: { userId: user.id } },
    },
    orderBy: ORDRE_RAPPORT_PLUS_RECENT,
  });
}

/** Tableau de bord : combien de rapports sont archivés (audit Next.js du 2026-10-14, B6). */
export async function compterRapportsDuDossier(etablissementId: string) {
  const user = await requireUser();
  return prisma.rapportVerification.count({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
  });
}

/** Tableau de bord : les derniers rapports, du plus récent au plus ancien (B6). */
export async function listerRapportsRecents(etablissementId: string, nombre: number) {
  const user = await requireUser();
  return prisma.rapportVerification.findMany({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
    include: { verification: true },
    orderBy: ORDRE_RAPPORT_PLUS_RECENT,
    take: nombre,
  });
}
