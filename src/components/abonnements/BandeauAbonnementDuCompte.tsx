// Le bandeau du compte connecté, en tête du dossier : ne lit rien tant que
// l'offre n'est pas lancée (`abonnementDuCompte`). À rendre sous
// `<Suspense fallback={null}>` : la page ne l'attend pas.
//
// En gélule : à partir de la tablette, dans la bande du haut, à gauche de
// celle du compte — le seul endroit que l'en-tête de page ne recouvre pas (il
// remonte sous la bande, `.sous-la-gelule`). Sur téléphone, en bas, au-dessus
// de la barre de navigation [responsive à reprendre : la visite guidée peut le
// recouvrir — notes du chantier, lot 3].

import { getOptionalCompte } from "@/lib/auth/compte";
import { droitsDuCompte } from "@/lib/abonnements/saisie";
import { BandeauAbonnement } from "./BandeauAbonnement";

const DANS_LA_BANDE =
  "fixed inset-x-3 bottom-[calc(var(--reserve-nav-bas)+0.75rem)] z-40 " +
  "md:absolute md:inset-x-auto md:bottom-auto md:left-[var(--board-gutter)] md:top-[19px] md:w-fit " +
  "md:max-w-[calc(100%-var(--board-gutter)*2-9rem)]";

export async function BandeauAbonnementDuCompte({ dansLeContenu }: { dansLeContenu?: string }) {
  const compte = await getOptionalCompte();
  if (!compte) return null;
  const { bandeau } = await droitsDuCompte(compte.db, compte.user.id);
  if (!bandeau) return null;
  return dansLeContenu ? (
    <BandeauAbonnement bandeau={bandeau} className={dansLeContenu} />
  ) : (
    <BandeauAbonnement bandeau={bandeau} compact className={DANS_LA_BANDE} />
  );
}
