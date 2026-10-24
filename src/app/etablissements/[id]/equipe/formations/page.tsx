import { redirect } from "next/navigation";

/**
 * ~~Équipe › Formations, un onglet (ADR-047)~~ [2026-10-24, décision de la
 * propriétaire : la section « Formations à organiser » de la page Équipe].
 * L'adresse reste pour les liens et marque-pages déjà posés.
 */
export default async function AncienneAdresse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/etablissements/${id}/equipe#formations`);
}
