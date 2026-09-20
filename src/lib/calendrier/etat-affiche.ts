// Ce qu'un écran a le droit d'affirmer quand il ne sait pas sur quoi.
//
// LE DÉFAUT. L'écran « Préparer un contrôle » — celui qu'on ouvre devant un
// inspecteur — tirait ses pastilles de compteurs de retard. Un compteur de
// retard ne compte que des lignes DÉPASSÉES : un dossier dont le calendrier
// n'a jamais été calculé n'en a aucune, donc zéro retard, donc « À jour » sur
// toute la colonne. Le silence était rendu comme une conformité, à la seule
// personne qui n'a aucun moyen de le recouper.
//
// LE PATRON EST CELUI DE `src/lib/batiments/etat-charge.ts` : la question
// « sait-on ? » se tranche AVANT tout comptage. Là-bas, une zone sans
// équipement est `sansObjet` quoi que dise le comptage de retard ; ici, un
// calendrier incertain interdit d'affirmer « à jour » quoi que dise le
// compteur. Même ordre, même raison — un comptage n'a de sens que sur un
// ensemble qu'on sait complet.
//
// POURQUOI « À PLANIFIER » ET NON UN ÉTAT NEUF. `StatusKind`
// (`src/components/ui-kit/StatusPill.tsx`) n'a pas de cas « indéterminé », et
// en ajouter un touche un composant partagé par tout le produit — hors de ce
// lot. « À planifier » est par ailleurs VRAI dans les deux cas que cette règle
// couvre : si le calendrier n'a jamais été calculé, tout reste à planifier ;
// s'il est périmé, ce qu'on croyait à jour peut ne plus l'être. Ce n'est pas
// un pis-aller qui ment, c'est le plus prudent des états existants.
//
// CE QU'ELLE NE FAIT PAS : elle ne touche ni « en retard » ni « écart relevé ».
// Un retard constaté sur un calendrier périmé reste un retard — la péremption
// peut en ajouter, elle n'en retire pas. La règle ne va que dans un sens, du
// rassurant vers le prudent, jamais l'inverse.

import type { FraicheurCalendrier } from "./fraicheur";
import { calendrierIncertain } from "./fraicheur";

/** Les états qu'une pièce adossée au calendrier peut porter à l'écran. */
export type EtatPiece = "a_jour" | "a_planifier" | "en_retard";

/**
 * Rabat « à jour » sur « à planifier » tant que le calendrier est incertain.
 *
 * L'appelant passe l'état qu'il aurait affiché ; il reçoit celui qu'il peut
 * défendre.
 */
export function etatSelonCalendrier(
  fraicheur: FraicheurCalendrier,
  etat: EtatPiece,
): EtatPiece {
  if (!calendrierIncertain(fraicheur)) return etat;
  return etat === "a_jour" ? "a_planifier" : etat;
}
