import "server-only";
import { prisma } from "@/lib/prisma";
import { requireEtablissement } from "@/lib/auth/scope";
import { registreServiAuPublic } from "./publication";

export async function getRegistreAccessibilite(etablissementId: string) {
  const { db, etablissement } = await requireEtablissement(etablissementId);
  return db.registreAccessibilite.findUnique({
    where: { etablissementId: etablissement.id },
  });
}

/**
 * Lecture publique via slug, sans auth. Ne retourne que les champs
 * publiables. Si le registre n'est pas publié, renvoie `null` pour que
 * la page publique affiche une 404.
 *
 * `siret` a quitté ce `select` le 2026-09-04, et il n'y revient pas. C'est
 * celui de l'ENTREPRISE : publié tel quel sur le registre d'un établissement,
 * il était faux pour tous les sites sauf un (le NIC désigne un site, pas une
 * société), et l'arrêté du 19 avril 2017 ne le réclame nulle part. Ne pas le
 * lire ici est ce qui empêche une surface de le réafficher par mégarde —
 * `identite.ts` porte l'argument, `sujet-public.test.ts` le tient.
 */
export async function getRegistrePublicParSlug(slug: string) {
  const r = await prisma.registreAccessibilite.findUnique({
    where: { slugPublic: slug },
    include: {
      etablissement: {
        select: {
          raisonDisplay: true,
          estERP: true,
          adresse: true,
          categorieErp: true,
          entreprise: {
            select: { raisonSociale: true },
          },
        },
      },
    },
  });
  // ~~`!r.publie`~~ seul jusqu'au 2026-10-12 : un établissement repassé
  // non-ERP gardait sa page publique (`registreServiAuPublic`).
  if (!r || !registreServiAuPublic({ publie: r.publie, estERP: r.etablissement.estERP })) {
    return null;
  }
  return r;
}

/**
 * Progression de remplissage (0-100%) — utilisée dans le dashboard pour
 * décider si on relance l'utilisateur.
 */
export function calculerProgression(
  r: Awaited<ReturnType<typeof getRegistreAccessibilite>>,
): number {
  if (!r) return 0;
  let points = 0;
  if (r.prestationsFournies && r.handicapsAccueillis.length > 0) points += 25;
  if (r.conformiteRegime) points += 25;
  if (r.personnelForme || r.dateDerniereFormation) points += 25;
  if (r.equipementsAccessibilite && r.modalitesMaintenance) points += 25;
  return points;
}
