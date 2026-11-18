// Le bandeau du compte connecté, en tête du dossier : la lecture seule d'un
// membre (ADR-054 § 4), sinon l'abonnement, qui ne lit rien tant que
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
import { demandeDuCompte, PAGE_SUPPRESSION } from "@/lib/compte/suppression";
import { formaterDateLongueFr } from "@/lib/dates";

const DANS_LA_BANDE =
  "fixed inset-x-3 bottom-[calc(var(--reserve-nav-bas)+0.75rem)] z-40 " +
  "md:absolute md:inset-x-auto md:bottom-auto md:left-[var(--board-gutter)] md:top-[19px] md:w-fit " +
  "md:max-w-[calc(100%-var(--board-gutter)*2-9rem)]";

/** Un membre en lecture seule (ADR-054 § 4) : son rôle passe avant l'abonnement, qu'il ne gère pas. */
const LECTURE_SEULE = {
  ton: "info",
  message: "Accès en lecture seule : vous consultez et exportez les dossiers, sans les modifier.",
} as const;

/** La suppression demandée (ADR-058 § 8) passe avant tout : c'est la fin du compte, pour tous ses membres. */
const LIEN_SUPPRESSION = { href: PAGE_SUPPRESSION, libelle: "Voir la suppression" };

export async function BandeauAbonnementDuCompte({ dansLeContenu }: { dansLeContenu?: string }) {
  const compte = await getOptionalCompte();
  if (!compte) return null;
  const lecture = compte.compte.role === "lecture";
  // Les deux lectures ensemble : la page ne les attend pas l'une après l'autre.
  const [demande, droits] = await Promise.all([
    demandeDuCompte(compte.compte.compteId),
    lecture ? null : droitsDuCompte(compte.db, compte.compte.compteId),
  ]);
  const bandeau = demande
    ? ({ ton: "ferme", message: `Ce compte sera supprimé le ${formaterDateLongueFr(demande.effacementLe)}, à la demande d'un propriétaire.` } as const)
    : lecture
      ? LECTURE_SEULE
      : (droits?.bandeau ?? null);
  if (!bandeau) return null;
  const lien = demande ? LIEN_SUPPRESSION : undefined;
  const avecLien = demande ? compte.compte.role === "owner" : !lecture;
  return dansLeContenu ? (
    <BandeauAbonnement bandeau={bandeau} avecLien={avecLien} lien={lien} className={dansLeContenu} />
  ) : (
    <BandeauAbonnement bandeau={bandeau} avecLien={avecLien} lien={lien} compact className={DANS_LA_BANDE} />
  );
}
