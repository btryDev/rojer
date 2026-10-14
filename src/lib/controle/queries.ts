import "server-only";
import { requireEtablissement } from "@/lib/auth/scope";
import { prisma } from "@/lib/prisma";
import { NB_RELEVES_DU_DOSSIER } from "@/lib/carnet-sanitaire/export";
import {
  NB_ANALYSES_DU_DOSSIER,
  filtreActesDuDossier,
  filtreRapportsDuDossier,
} from "./pieces-zip";

/**
 * Les lectures du dossier de contrôle : l'écran « Préparer un contrôle » et le
 * ZIP qu'il fait télécharger (audit Next.js du 2026-10-14, B6). Elles vivaient
 * dans la page et dans la route, appel Prisma par appel Prisma, bornées par
 * l'`etablissementId` d'une garde posée plus haut.
 *
 * Deux formes de portée, selon l'appelant :
 *
 *  - l'écran passe par `requireEtablissement`, mémoïsée sur le rendu — la
 *    page l'a déjà appelée, la garde ne coûte rien de plus ;
 *  - le ZIP est un route handler, où rien n'est mémoïsé : chaque garde serait
 *    un `getUser()` réseau de plus (M7). Ses lectures reçoivent l'identifiant
 *    de l'utilisateur que la route tient de `requireEtablissement`, et le
 *    prédicat propriétaire est DANS chaque requête — plus strict qu'avant, où
 *    elles ne portaient que l'`etablissementId`.
 */

/* ─── L'écran ─────────────────────────────────────────────────────────── */

/** Ce que l'écran compte des pièces du dossier, par les filtres du ZIP. */
export async function etatDesPiecesDuDossier(etablissementId: string, maintenant: Date) {
  const { etablissement } = await requireEtablissement(etablissementId);
  const id = etablissement.id;
  const [
    nbPrestataires,
    duerpVersion,
    nbRapports,
    registreAccessibilite,
    nbRapportsDuDossier,
    nbPermisFeu,
    nbPlansPrevention,
    carnet,
  ] = await Promise.all([
    prisma.prestataire.count({ where: { etablissementId: id } }),
    prisma.duerpVersion.findFirst({
      where: { duerp: { etablissementId: id } },
      orderBy: { numero: "desc" },
      select: { numero: true, createdAt: true },
    }),
    prisma.rapportVerification.count({ where: { etablissementId: id } }),
    prisma.registreAccessibilite.findUnique({
      where: { etablissementId: id },
      select: { publie: true },
    }),
    // Ce que le ZIP met dans ses autres pièces, par les filtres de la route
    // (`controle/pieces-zip.ts`) : l'écran annonce ce que le ZIP contient.
    prisma.rapportVerification.count({ where: filtreRapportsDuDossier(id) }),
    prisma.permisFeu.count({ where: filtreActesDuDossier(id, maintenant) }),
    prisma.planPrevention.count({ where: filtreActesDuDossier(id, maintenant) }),
    prisma.carnetSanitaire.findUnique({
      where: { etablissementId: id },
      select: {
        _count: {
          select: { pointsReleve: { where: { actif: true } }, analyses: true },
        },
        analyses: {
          orderBy: { dateAnalyse: "desc" },
          take: NB_ANALYSES_DU_DOSSIER,
          select: { rapportCle: true },
        },
      },
    }),
  ]);
  return {
    nbPrestataires,
    duerpVersion,
    nbRapports,
    registreAccessibilite,
    nbRapportsDuDossier,
    nbPermisFeu,
    nbPlansPrevention,
    carnet,
  };
}

/* ─── Le ZIP ──────────────────────────────────────────────────────────── */

/** Les versions figées du DUERP, la plus récente d'abord. */
export async function versionsDuDuerpDuDossier(etablissementId: string, userId: string) {
  return prisma.duerpVersion.findMany({
    where: { duerp: { etablissementId, etablissement: { entreprise: { userId } } } },
    orderBy: { numero: "desc" },
    select: { numero: true, snapshot: true, motif: true, createdAt: true },
  });
}

/** Le registre d'accessibilité : son adresse publique, et s'il est publié. */
export async function registreAccessibiliteDuDossier(etablissementId: string, userId: string) {
  return prisma.registreAccessibilite.findFirst({
    where: { etablissementId, etablissement: { entreprise: { userId } } },
    select: { slugPublic: true, publie: true },
  });
}

/** Les prestataires, avec les pièces qu'ils ont remplacées. */
export async function prestatairesDuDossier(etablissementId: string, userId: string) {
  return prisma.prestataire.findMany({
    where: { etablissementId, etablissement: { entreprise: { userId } } },
    orderBy: { raisonSociale: "asc" },
    // Les pièces remplacées (2026-10-12) : le ZIP joint les pièces en cours,
    // il joint donc aussi celles qu'elles ont remplacées — l'attestation d'un
    // semestre passé est la preuve de la vigilance à ce moment-là.
    include: {
      piecesPrecedentes: {
        orderBy: { remplaceeLe: "asc" },
        select: { id: true, type: true, fichierCle: true, fichierNom: true },
      },
    },
  });
}

/** Les rapports dont le fichier entre au ZIP (`filtreRapportsDuDossier`). */
export async function rapportsDeposesDuDossier(etablissementId: string, userId: string) {
  return prisma.rapportVerification.findMany({
    // PAS LES RAPPORTS DES LIGNES DE SALARIÉ (contre-lecture du 2026-09-27,
    // M1). Depuis `bb03cdd` aucun dépôt n'y est possible, mais des rapports
    // antérieurs peuvent exister : documents nominatifs, parfois médicaux,
    // dans un ZIP remis à un tiers. Ils n'y entrent pas ; le README le dit.
    where: { ...filtreRapportsDuDossier(etablissementId), etablissement: { entreprise: { userId } } },
    // Pas d'`orderBy` : l'ordre des rapports vit dans
    // `ORDRE_RAPPORT_PLUS_RECENT` (garde de `derniere-realisation.test.ts`),
    // et les entrées portent leur date en tête de nom — l'archive les range.
    select: {
      id: true,
      fichierCle: true,
      fichierNomOriginal: true,
      dateRapport: true,
      verification: {
        select: { libelleObligation: true, equipement: { select: { libelle: true } } },
      },
    },
  });
}

/** Combien de rapports de lignes de salarié le ZIP écarte, pour le dire. */
export async function compterRapportsSalariesEcartes(etablissementId: string, userId: string) {
  return prisma.rapportVerification.count({
    where: {
      etablissementId,
      verification: { salarieId: { not: null } },
      etablissement: { entreprise: { userId } },
    },
  });
}

/** Les permis de feu des douze derniers mois (`filtreActesDuDossier`). */
export async function permisFeuDuDossier(etablissementId: string, userId: string, maintenant: Date) {
  return prisma.permisFeu.findMany({
    where: { ...filtreActesDuDossier(etablissementId, maintenant), etablissement: { entreprise: { userId } } },
    orderBy: { numero: "desc" },
  });
}

/** Les plans de prévention des douze derniers mois, lignes et phases comprises. */
export async function plansPreventionDuDossier(
  etablissementId: string,
  userId: string,
  maintenant: Date,
) {
  return prisma.planPrevention.findMany({
    where: { ...filtreActesDuDossier(etablissementId, maintenant), etablissement: { entreprise: { userId } } },
    include: {
      lignes: { orderBy: { ordre: "asc" } },
      phasesDangereuses: { orderBy: { ordre: "asc" } },
    },
    orderBy: { numero: "desc" },
  });
}

/** Le carnet sanitaire : points actifs, derniers relevés, dernières analyses. */
export async function carnetSanitaireDuDossier(etablissementId: string, userId: string) {
  return prisma.carnetSanitaire.findFirst({
    where: { etablissementId, etablissement: { entreprise: { userId } } },
    include: {
      pointsReleve: {
        where: { actif: true },
        include: {
          // `select` et non `include` : `ReleveTemperature.operateur` est un
          // champ de texte libre où l'exploitant écrit qui a relevé, et ce ZIP
          // est remis « à un inspecteur, un assureur, un bailleur ou un
          // acquéreur ». Aucun texte n'exige ce nom : l'article 3 de l'arrêté
          // du 1er février 2010 demande de consigner « les modalités et les
          // résultats » de la surveillance dans un fichier sanitaire tenu à
          // disposition de l'ARS — pas l'identité de qui relève, et pas pour
          // ces destinataires-là. `D. 4711-2`, qui exige l'identité du
          // vérificateur, ne vise que la santé-sécurité AU TRAVAIL ; un relevé
          // d'eau chaude sanitaire relève du code de la santé publique.
          //
          // La retenue est dans la requête et non dans le formateur : ce qui
          // n'est pas lu ne peut pas ressortir par une colonne qu'on
          // ajouterait plus tard.
          //
          // Ce ZIP en était le seul lecteur, et le retirer d'ici a d'abord
          // laissé un champ que le formulaire demande, que le zod valide, que
          // la base garde, et que plus rien ne lisait — une donnée sans
          // finalité, qui tient plus mal sous la minimisation que l'usage
          // interne auquel elle était destinée. Le champ s'affiche donc
          // désormais sur la carte du point de relevé
          // (`carnet-sanitaire/page.tsx`), où l'exploitant sait à qui
          // demander quand une mesure surprend. Il ne ressort pas de
          // l'établissement pour autant : la retenue posée ici tient
          // (docs/rgpd.md § 2.5).
          releves: {
            orderBy: { dateReleve: "desc" },
            take: NB_RELEVES_DU_DOSSIER,
            select: {
              dateReleve: true,
              temperatureCelsius: true,
              conforme: true,
            },
          },
        },
      },
      analyses: { orderBy: { dateAnalyse: "desc" }, take: NB_ANALYSES_DU_DOSSIER },
    },
  });
}
