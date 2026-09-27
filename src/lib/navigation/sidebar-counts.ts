// Les pastilles de la sidebar, chargées une fois pour tous les shells.
//
// Le shell établissement les calculait dans son layout ; le shell DUERP
// montait la même sidebar **sans compteurs**, si bien que les pastilles
// disparaissaient dès qu'on entrait dans le wizard — l'utilisateur y
// lisait « plus rien en retard » alors qu'il n'avait fait que changer
// d'écran. Une seule fonction, deux appelants (ADR-015).
//
// Elle remplace aussi l'appel à `getDashboardData` du layout, qui
// chargeait tout le board pour n'en lire que deux compteurs.

import { prisma } from "@/lib/prisma";
import type { SidebarCounts } from "@/components/layout/sidebar-nav";
import { compterEnRetardParFamille } from "@/lib/calendrier/retards";
import { compterActions } from "@/lib/actions/queries";
import { compterVigilanceParGravite } from "@/lib/prestataires/queries";
import { compterTitresEnRetard } from "@/lib/salaries/queries";

export async function chargerSidebarCounts(
  etablissementId: string,
): Promise<SidebarCounts> {
  const now = new Date();
  const [retards, actions, vigilance, equipements, titresEnRetard] =
    await Promise.all([
      compterEnRetardParFamille(etablissementId),
      compterActions(etablissementId),
      compterVigilanceParGravite(etablissementId),
      // `actif: true`, comme `listerEquipementsDeLEtablissement` : c'est le
      // parc en service que l'écran Équipements montre. Sans ce filtre, un
      // appareil retiré du parc restait dans la pastille — badge à 13,
      // page à 12.
      prisma.equipement.count({ where: { etablissementId, actif: true } }),
      compterTitresEnRetard(etablissementId, now),
    ]);

  return {
    equipements,
    enRetardTotal: retards.total,
    actions: actions.totalACouvrir,
    prestatairesAlertes: vigilance.total,
    prestatairesEnRetard: vigilance.enRetard,
    titresEnRetard,
  };
}
