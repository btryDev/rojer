// Le bandeau du compte connecté, en tête du dossier : ne lit rien tant que
// l'offre n'est pas lancée (`abonnementDuCompte`). À rendre sous
// `<Suspense fallback={null}>` : la page ne l'attend pas.

import { getOptionalCompte } from "@/lib/auth/compte";
import { droitsDuCompte } from "@/lib/abonnements/saisie";
import { BandeauAbonnement } from "./BandeauAbonnement";

export async function BandeauAbonnementDuCompte({ className = "mx-[var(--board-gutter)] mt-4" }: { className?: string }) {
  const compte = await getOptionalCompte();
  if (!compte) return null;
  const { bandeau } = await droitsDuCompte(compte.db, compte.user.id);
  return bandeau ? <BandeauAbonnement bandeau={bandeau} className={className} /> : null;
}
