import { redirect } from "next/navigation";

/**
 * ~~« Quand ça arrive »~~ est devenu l'onglet « En cas de… » de « Ce qui doit
 * être en place » (décision de la propriétaire du 2026-10-24, ADR-037
 * amendée). L'adresse reste pour les liens déjà partagés.
 */
export default async function AncienneAdresse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Temporaire (307) et non 308 : la place vient d'être tranchée, un
  // navigateur ne doit pas mettre la redirection en cache (revue du 2026-10-24).
  redirect(`/etablissements/${id}/etats-permanents/en-cas-de`);
}
