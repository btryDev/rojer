// Le bandeau du compte connecté : ne lit rien tant que l'offre n'est pas
// lancée (`droitsDuCompte`).

import { getOptionalCompte } from "@/lib/auth/compte";
import { droitsDuCompte } from "@/lib/abonnements/saisie";
import { BandeauAbonnement } from "./BandeauAbonnement";

export async function BandeauAbonnementDuCompte() {
  const compte = await getOptionalCompte();
  if (!compte) return null;
  const { bandeau } = await droitsDuCompte(compte.db, compte.user.id);
  return bandeau ? <BandeauAbonnement bandeau={bandeau} /> : null;
}
