import { permanentRedirect } from "next/navigation";

/**
 * ~~~~Équipe › Formations~~ [2026-10-24 : section « Formations à organiser » d'Équipe], un onglet (ADR-047)~~ [2026-10-24, décision de la
 * propriétaire : la section « Formations à organiser » de la page Équipe].
 * L'adresse reste pour les liens et marque-pages déjà posés.
 */
export default async function AncienneAdresse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Permanente : l'adresse est retirée pour de bon (revue qualité).
  permanentRedirect(`/etablissements/${id}/equipe#formations`);
}
