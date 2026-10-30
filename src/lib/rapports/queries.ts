import { requireCompte } from "@/lib/auth/compte";
import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ORDRE_RAPPORT_PLUS_RECENT } from "./derniere-realisation";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { libellePorteur } from "@/lib/calendrier/labels";
import { FUSEAU_REFERENCE, instantCivil } from "@/lib/dates";
import { derniersRapportsDeLEtablissement, type DernierRapport } from "./joindre-realisations";
import { requireProprietaireSql } from "@/lib/auth/scope";

export type FiltresRegistre = {
  domaine?: DomaineObligation;
  recherche?: string; // sur libelleObligation + organismeVerif + equipement.libelle
  /** L'année civile (Paris) des rapports. Absente : tout l'historique — ce que
   *  lisent les exports, qui restent complets. L'écran du registre la pose
   *  toujours [2026-10-27, plan performance, lot 1a : il affichait dix ans de
   *  rapports d'un coup, 57 Mo de page sur le gros dossier de mesure]. */
  annee?: number;
};

/**
 * Les années (civiles, Paris) qui portent au moins un rapport, plus l'année en
 * cours, de la plus récente à la plus ancienne : ce que le sélecteur du
 * registre propose. Seulement des années réelles — un rapport isolé en 2005
 * n'ouvre pas vingt pastilles vides (revue du lot 1a).
 *
 * `anneeEnCours` vient de la page : une seule lecture de l'horloge par rendu,
 * sans quoi la page et la liste pouvaient se contredire à minuit le 31/12.
 */
export async function anneesDuRegistre(
  etablissementId: string,
  anneeEnCours: number,
): Promise<number[]> {
  const proprietaire = await requireProprietaireSql('r."etablissementId"');
  // `dateRapport` est un instant UTC sans fuseau : lu dans le fuseau de
  // référence, comme `composantesCiviles`.
  const lignes = await prisma.$queryRaw<{ annee: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM (r."dateRapport" AT TIME ZONE 'UTC') AT TIME ZONE ${FUSEAU_REFERENCE})::int AS "annee"
    FROM "RapportVerification" r
    WHERE r."etablissementId" = ${etablissementId} AND ${proprietaire}
  `;
  return [...new Set([anneeEnCours, ...lignes.map((l) => Number(l.annee))])].sort((a, b) => b - a);
}

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
  const { user, db } = await requireCompte();
  const rapports = await db.rapportVerification.findMany({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
      ...(filtres.annee === undefined
        ? {}
        : {
            dateRapport: {
              gte: instantCivil(filtres.annee, 1, 1),
              lt: instantCivil(filtres.annee + 1, 1, 1),
            },
          }),
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
  //
  // [2026-10-27, plan performance, lot 1a] « Le plus récent » se lit sur le
  // dernier rapport de chaque contrôle dans TOUT l'historique
  // (`derniersRapportsDeLEtablissement`, lu en parallèle) et non plus sur le
  // premier de la liste : filtrée sur une année, la liste ne porte pas
  // forcément le plus récent, et les points se seraient posés sous un rapport
  // de chaque année consultée.
  const [sansOrigine, derniers] = rapports.length
    ? await Promise.all([
        db.action.findMany({
          where: {
            etablissementId,
            etablissement: { entreprise: { userId: user.id } },
            rapportOrigineId: null,
            verificationId: { in: [...new Set(rapports.map((r) => r.verificationId))] },
          },
          select: { ...SELECTION_POINT_DU_RAPPORT, verificationId: true },
          orderBy: { createdAt: "asc" },
        }),
        derniersRapportsDeLEtablissement(etablissementId),
      ])
    : [[], new Map<string, DernierRapport>()];
  let out = rapports.map((r) => {
    if (derniers.get(r.verificationId)?.id !== r.id) return r;
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
  const { user, db } = await requireCompte();
  return db.rapportVerification.findFirst({
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
  const { user, db } = await requireCompte();
  return db.rapportVerification.findMany({
    where: {
      verificationId,
      etablissement: { entreprise: { userId: user.id } },
    },
    orderBy: ORDRE_RAPPORT_PLUS_RECENT,
  });
}

/** Tableau de bord : combien de rapports sont archivés (audit Next.js du 2026-10-14, B6).
 *  Mémoïsé sur le rendu : la page et `getDashboardData` le demandent (plan
 *  performance, lot 1). */
export const compterRapportsDuDossier = cache(async function compterRapportsDuDossier(
  etablissementId: string,
) {
  const { user, db } = await requireCompte();
  return db.rapportVerification.count({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
  });
});

/** Tableau de bord : les derniers rapports, du plus récent au plus ancien (B6). */
export async function listerRapportsRecents(etablissementId: string, nombre: number) {
  const { user, db } = await requireCompte();
  return db.rapportVerification.findMany({
    where: { etablissementId, etablissement: { entreprise: { userId: user.id } } },
    include: { verification: true },
    orderBy: ORDRE_RAPPORT_PLUS_RECENT,
    take: nombre,
  });
}
