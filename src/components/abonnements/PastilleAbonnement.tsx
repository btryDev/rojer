import { PastilleFiche } from "@/components/ui-kit/fiche/PastilleFiche";
import type { EtatAffiche, EtatAbonnement } from "@/lib/abonnements/etat-affiche";

/** La pastille de la charte (`PastilleFiche`) pour chaque état que l'abonnement emprunte au calendrier. */
const TON_PASTILLE = {
  enRetard: "retard",
  proche: "proche",
  faite: "fait",
  lointain: "bleu",
  aPlanifier: "neutre",
} as const satisfies Record<EtatAbonnement, string>;

/** L'état de l'abonnement en une pastille (`etatAffiche`), en tête de la vue d'ensemble. */
export function PastilleAbonnement({ pastille }: { pastille: EtatAffiche["pastille"] }) {
  return <PastilleFiche ton={TON_PASTILLE[pastille.etat]}>{pastille.libelle}</PastilleFiche>;
}
