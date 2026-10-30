import { requireCompte } from "@/lib/auth/compte";
import "server-only";
import { requireEtablissement } from "@/lib/auth/scope";
import { listSignatures } from "@/lib/signatures/queries";

export async function listPermisFeu(etablissementId: string) {
  const { db, etablissement } = await requireEtablissement(etablissementId);
  return db.permisFeu.findMany({
    where: { etablissementId: etablissement.id },
    orderBy: [{ numero: "desc" }],
  });
}

export async function getPermisFeu(
  etablissementId: string,
  permisFeuId: string,
) {
  const { db, etablissement } = await requireEtablissement(etablissementId);
  const permis = await db.permisFeu.findFirst({
    where: { id: permisFeuId, etablissementId: etablissement.id },
  });
  if (!permis) return null;
  const signatures = await listSignatures("permis_feu", permis.id);
  return { ...permis, signatures };
}

/**
 * Le numéro suivant de la série de l'établissement.
 *
 * Le prédicat d'appartenance est porté bien que la fonction ne rende qu'un
 * entier : sans lui, le nombre de permis d'un dossier tiers se lisait depuis
 * un identifiant deviné. Sans RLS (ADR-005), aucune lecture n'est trop petite
 * pour porter sa portée.
 */
export async function nextNumeroPermisFeu(
  etablissementId: string,
): Promise<number> {
  const { user, db } = await requireCompte();
  const last = await db.permisFeu.findFirst({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (last?.numero ?? 0) + 1;
}
