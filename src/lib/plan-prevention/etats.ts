import type { StatutPlanPrevention } from "@prisma/client";

/**
 * Le vocabulaire d'état d'un plan de prévention, en un seul endroit.
 *
 * Même raison que pour le permis de feu : la liste disait « Attente
 * signatures », « Clos », « Inspection faite » ; la fiche « En attente de
 * signatures », « Plan clos », « Inspection commune faite ». Trois écarts sur
 * six statuts, entre deux écrans qu'on enchaîne d'un clic.
 *
 * `inspection_faite` mérite son libellé long : l'inspection commune préalable
 * est l'étape que R. 4512-2 rend obligatoire avant toute intervention, et
 * « Inspection faite » ne dit pas laquelle.
 */
export const ETAT_PLAN: Record<
  StatutPlanPrevention,
  { ton: "fait" | "bleu" | "proche" | "neutre"; mot: string }
> = {
  brouillon: { ton: "neutre", mot: "Brouillon" },
  // Ardoise, et c'est une RESTAURATION. La table de la liste posait
  // `inspection_faite: "neutre"` sous une règle explicite : « le board ne
  // réserve ses champs colorés qu'aux états qui appellent un geste — les
  // signatures à obtenir (ambre), le plan prêt (bleu), le plan clos (vert) ».
  // L'unification liste/fiche a imposé le bleu et emporté la règle avec la
  // table, sans qu'un mot le dise : la liste a changé de couleur sur ce statut
  // sans que ce soit décidé.
  //
  // Le mot suffit à distinguer ce statut du brouillon — « Inspection commune
  // faite » ne se confond avec rien —, et les trois couleurs restent réservées
  // aux trois jalons qui commandent la suite.
  //
  // CETTE TABLE ÉTANT PARTAGÉE, LA FICHE CHANGE AUSSI, et il faut le dire.
  // Son histoire en trois temps : elle affichait « Brouillon » sur ce statut
  // (une cascade à `else` fourre-tout, corrigée depuis), puis « Inspection
  // commune faite » en bleu, et maintenant la même chose en ardoise. Le vrai
  // correctif — nommer le statut au lieu de le confondre avec un brouillon —
  // est intact ; seule la teinte s'aligne sur la règle de la liste.
  //
  // C'est le sens même de l'unification : la liste et la fiche doivent dire la
  // même chose. Les laisser diverger sur la couleur aurait reconduit le défaut
  // qu'elle corrigeait, à l'envers.
  inspection_faite: { ton: "neutre", mot: "Inspection commune faite" },
  attente_signatures: { ton: "proche", mot: "En attente de signatures" },
  // ~~« Validé »~~ (2026-11-19, cahier de reprise § 1.3) : le plan est
  // « valide » en base quand les deux parties ont signé — l'écran dit le fait.
  valide: { ton: "bleu", mot: "Signé" },
  clos: { ton: "fait", mot: "Plan clos" },
  annule: { ton: "neutre", mot: "Annulé" },
};

/**
 * Le statut AFFICHÉ, dérivé sans changer la base (2026-11-19, cahier de
 * reprise § 1.3). Rojer crée le plan directement en `attente_signatures` —
 * le statut est lu par les plafonds, le calendrier et l'état signable, il ne
 * change pas. Mais tant qu'aucun lien n'est parti et qu'aucune signature
 * n'est posée, rien n'attend personne : l'écran dit « Brouillon ».
 */
export function etatAffichePlan(
  statut: StatutPlanPrevention,
  /** Un lien de signature parti, ou une signature en vigueur. */
  lienOuSignature: boolean,
): { ton: "fait" | "bleu" | "proche" | "neutre"; mot: string } {
  if (statut === "attente_signatures" && !lienOuSignature) return ETAT_PLAN.brouillon;
  return ETAT_PLAN[statut];
}
