"use client";

import { usePathname } from "next/navigation";

import { ChargementSection } from "@/components/entete-page/ChargementSection";
import { repliDeChargement } from "@/components/entete-page/repli-de-chargement";
import { ChargementNeutre } from "@/components/layout/ChargementNeutre";

/**
 * L'attente d'un écran de l'établissement (audit Next.js du 2026-10-14, M1).
 *
 * Toutes les routes sont dynamiques : sans ce fichier, un clic dans la barre
 * latérale ne donnait AUCUN retour tant que la réponse entière n'était pas
 * arrivée — le tableau de bord en attendait une centaine de requêtes. Next
 * enveloppe la page de ce segment dans un `<Suspense>` dont ceci est le
 * repli : le layout — barre latérale et barre de compte — reste en place, et
 * seule la colonne de droite attend.
 *
 * [2026-10-28, plan performance, lot 3] Le repli annonce l'en-tête de la
 * page demandée (`ChargementSection`), lu sur l'adresse ; le tableau de bord,
 * les fiches et les formulaires gardent le repli neutre.
 *
 * **Un seul fichier, ici, et pas un par dossier de page.** Next rattache le
 * repli d'un dossier à une clé qui contient les paramètres d'URL de la page
 * (`addSearchParamsIfPageSegment`, puis `stateKey` dans `layout-router`) :
 * un `calendrier/loading.tsx` remplaçait la page par son squelette à chaque
 * filtre, chaque année, chaque bascule de vue — ce que `FiltresCalendrier`
 * évite exprès par une transition. Posé ici, le repli n'est rattaché qu'au
 * premier dossier sous l'établissement (« calendrier ») : il se montre en
 * changeant de section, jamais en changeant de paramètre. Même effet dans
 * une section (d'une liste à sa fiche) : pas de repli, l'écran précédent
 * reste jusqu'à l'arrivée du suivant, comme avant ce lot.
 *
 * Un `notFound()` levé par une page imbriquée arrive désormais APRÈS le début
 * du flux : la réponse garde le statut 200, avec la page introuvable et un
 * `noindex` (documentation de Next, `loading.js` § « Status Codes »). La garde
 * de l'établissement, elle, vit dans le layout, au-dessus de ce repli : un
 * dossier étranger répond toujours 404.
 */
export default function ChargementEtablissement() {
  const repli = repliDeChargement(usePathname());
  return repli ? <ChargementSection {...repli} /> : <ChargementNeutre />;
}
