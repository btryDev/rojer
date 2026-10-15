import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";
import { trierParCategorie } from "./labels";

/**
 * Lectures du parc d'équipements.
 *
 * `Equipement.actif` matérialise la **suppression logique** (ADR-012) : un
 * équipement retiré du parc mais porteur d'historique (rapports de
 * vérification, actions correctives) n'est pas détruit, il est désactivé.
 * Toute liste destinée à l'utilisateur ou au moteur de matching ne doit donc
 * voir que les équipements `actif: true` — sans quoi un équipement retiré
 * continuerait de générer des échéances.
 */

/**
 * Fiche d'un équipement, actif ou non : la page de détail et le formulaire de
 * modification doivent rester atteignables pour un équipement désactivé,
 * ~~ne serait-ce que pour le remettre en service~~ [2026-10-12 : il ne se
 * remet plus en service ; l'écran de modification d'un appareil retiré dit
 * pourquoi il ne propose rien (`retrait.ts`)].
 */
export async function getEquipement(id: string) {
  const user = await requireUser();
  return prisma.equipement.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    include: {
      // Le régime et la réponse au SSI A/B : la fiche de modification en tire
      // les réponses exigées (DF 10 § 3, décision du 2026-10-08).
      etablissement: {
        select: {
          id: true,
          raisonDisplay: true,
          estERP: true,
          typeErp: true,
          categorieErp: true,
          ssiCategorieAouB: true,
        },
      },
    },
  });
}

/** Le parc en service — la liste de référence du produit. */
export async function listerEquipementsDeLEtablissement(
  etablissementId: string,
) {
  const user = await requireUser();
  return trierParCategorie(
    await prisma.equipement.findMany({
    where: {
      etablissementId,
      actif: true,
      etablissement: { entreprise: { userId: user.id } },
    },
    // Le tri par catégorie se fait après la lecture, sur `ordreCategorie` :
    // en SQL, `categorie: "asc"` suit l'ordre de l'ENUM PostgreSQL, qui a
    // divergé de la liste TypeScript le 2026-08-25. Cf. `labels.ts`.
    orderBy: [{ createdAt: "asc" }],
    // Le bâtiment voyage avec l'équipement (ADR-019) : le parc, le calendrier
    // et le tableau de bord en ont besoin pour regrouper ou filtrer, sans
    // refaire une jointure chacun de leur côté.
    include: { batiment: { select: { id: true, nom: true, ordre: true } } },
    }),
  );
}

export type EquipementListe = Awaited<
  ReturnType<typeof listerEquipementsDeLEtablissement>
>[number];

/**
 * Regroupe les équipements par catégorie pour la vue synthétique.
 * L'ordre des catégories retournées suit l'ordre de la Map renvoyée par
 * `listerEquipementsDeLEtablissement` (categorie asc).
 */
export function grouperParCategorie(
  equipements: EquipementListe[],
): Map<CategorieEquipement, EquipementListe[]> {
  const out = new Map<CategorieEquipement, EquipementListe[]>();
  for (const eq of equipements) {
    const bucket = out.get(eq.categorie) ?? [];
    bucket.push(eq);
    out.set(eq.categorie, bucket);
  }
  return out;
}
