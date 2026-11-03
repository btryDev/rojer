import { notFound, redirect } from "next/navigation";
import { requireCompte } from "@/lib/auth/compte";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";

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
  const actif = await getOptionalUserEtablissement();
  if (actif?.entrepriseId === id) redirect(`/etablissements/${actif.id}/equipe#effectif`);
  const { db } = await requireCompte();
  const premier = await db.etablissement.findFirst({
    where: { entrepriseId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!premier) notFound();
  redirect(`/etablissements/${premier.id}/equipe#effectif`);
}
