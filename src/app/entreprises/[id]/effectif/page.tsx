import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireCompte } from "@/lib/auth/compte";
import { COOKIE_ETABLISSEMENT_ACTIF } from "@/lib/auth/scope";

/**
 * L'effectif de la société se règle dans Équipe (2026-11-03) : ce chemin, où
 * mènent tous les liens « Mettre à jour l'effectif », conduit à la page Équipe
 * de l'établissement actif s'il est de cette société, sinon de son premier.
 */
export default async function EffectifEntreprisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db } = await requireCompte();
  const sites = await db.etablissement.findMany({
    where: { entrepriseId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (sites.length === 0) notFound();
  const actif = (await cookies()).get(COOKIE_ETABLISSEMENT_ACTIF)?.value;
  const cible = sites.find((s) => s.id === actif) ?? sites[0];
  redirect(`/etablissements/${cible.id}/equipe#effectif`);
}
