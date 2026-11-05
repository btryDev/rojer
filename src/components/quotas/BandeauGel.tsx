// Un site ou un prestataire gelé (ADR-053 § 14) le dit dès l'ouverture de sa
// page, plutôt qu'au refus d'un formulaire rempli. Rien tant que l'offre
// n'est pas lancée, ni pour ce qui n'est pas gelé. À rendre sous
// `<Suspense fallback={null}>` : la page ne l'attend pas.

import { getOptionalCompte } from "@/lib/auth/compte";
import { motifDuGel } from "@/lib/abonnements/quotas";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";

export async function BandeauGel({
  cible,
  className = "",
}: {
  /** Un site (en tête de ses pages) ou un prestataire (sur sa fiche). */
  cible: { etablissementId: string } | { prestataireId: string };
  /** La place, donnée par l'appelant. */
  className?: string;
}) {
  const compte = await getOptionalCompte();
  if (!compte || compte.compte.role === "lecture") return null;
  const message = await motifDuGel(compte.db, compte.compte.compteId, cible);
  if (!message) return null;
  return (
    <BandeauAbonnement
      bandeau={{ ton: "ferme", message }}
      className={className}
    />
  );
}
