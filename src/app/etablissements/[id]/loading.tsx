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
 * [2026-10-28, plan performance, lot 3] Il ne sert plus que le tableau de
 * bord et les pages sans dossier propre : chaque page d'entrée a son repli,
 * à son en-tête (`ChargementSection`), chaque fiche le repli neutre.
 *
 * Un `notFound()` levé par une page imbriquée arrive désormais APRÈS le début
 * du flux : la réponse garde le statut 200, avec la page introuvable et un
 * `noindex` (documentation de Next, `loading.js` § « Status Codes »). La garde
 * de l'établissement, elle, vit dans le layout, au-dessus de ce repli : un
 * dossier étranger répond toujours 404.
 */
export default function ChargementEtablissement() {
  return <ChargementNeutre />;
}
