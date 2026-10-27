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

import { comptesParcDuRendu } from "@/lib/equipements/queries";
import type { SidebarCounts } from "@/components/layout/sidebar-nav";
import { compterEnRetardParFamille } from "@/lib/calendrier/retards";
import { compterActions } from "@/lib/actions/queries";
import { instantDuRendu } from "@/lib/dates/instant-du-rendu";
import { compterVigilanceParGravite } from "@/lib/prestataires/queries";
import { compterTitresEnRetard } from "@/lib/salaries/queries";
import {
  calendrierIncertain,
  fraicheurCalendrier,
} from "@/lib/calendrier/fraicheur";

export async function chargerSidebarCounts(
  etablissementId: string,
): Promise<SidebarCounts> {
  // L'instant du RENDU, et non un `new Date()` à soi : la page qui tourne en
  // parallèle lit le même, et les lectures qui ne dépendent pas des lignes du
  // calendrier — le registre des autres échéances, les compteurs d'actions —
  // ne partent qu'une fois pour les deux (audit Next.js du 2026-10-14, H2).
  // Le compte des lignes, lui, n'est jamais partagé avec la page : il n'est pas
  // mémoïsé, parce que la page répare avant de lire et que la barre lit sans
  // attendre (`regeneration-sure.ts`).
  const now = instantDuRendu();
  const [retards, actions, vigilance, equipements, titresEnRetard, fraicheur] =
    await Promise.all([
      compterEnRetardParFamille(etablissementId, now),
      // Le plan d'actions, ce sont les mesures du DUERP (ADR-048, lot 3).
      compterActions(etablissementId, now, { origine: "duerp" }),
      compterVigilanceParGravite(etablissementId),
      // `actif: true`, comme `listerEquipementsDeLEtablissement` : c'est le
      // parc en service que l'écran Équipements montre. Sans ce filtre, un
      // appareil retiré du parc restait dans la pastille — badge à 13,
      // page à 12.
      comptesParcDuRendu(etablissementId).then((c) => c.enService),
      compterTitresEnRetard(etablissementId, now),
      // L'âge des lignes que la pastille « en retard » compte. Le layout qui
      // nous appelle ne répare pas — il tourne EN PARALLÈLE de la page, et
      // seuls le tableau de bord et le calendrier réparent
      // (`regeneration-sure.ts`). Une lecture du repère, bornée au
      // propriétaire par `requireUser`, aucune écriture.
      fraicheurCalendrier(etablissementId),
    ]);

  // UNE PASTILLE NE DIT JAMAIS UN COMPTE FAUX (2026-10-13). Calendrier
  // périmé, jamais calculé ou dont le dernier calcul a échoué : le nombre de
  // retards serait celui d'avant. La pastille se tait sur le nombre et dit
  // que le calendrier est à mettre à jour (`docs/chantiers-ouverts.md` § 12).
  const aMettreAJour = calendrierIncertain(fraicheur);

  return {
    equipements,
    enRetardTotal: aMettreAJour ? undefined : retards.total,
    calendrierAMettreAJour: aMettreAJour,
    actions: actions.totalACouvrir,
    prestatairesAlertes: vigilance.total,
    prestatairesEnRetard: vigilance.enRetard,
    titresEnRetard,
  };
}
