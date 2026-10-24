/**
 * Les règles d'un point à corriger (ADR-048). Module pur, sans base ni
 * horloge : les gardes de l'action serveur et les choix de l'écran lisent les
 * mêmes fonctions.
 */

import type { Obligation } from "@/lib/referentiels/conformite";
import type { Resultat } from "@/lib/rapports/resultats";

/** Le porteur d'une ligne de suivi, tel que la base le dit. */
type PorteurLigne = { equipementId: string | null; salarieId: string | null };

/**
 * Un contrôle d'ensemble : une ligne portée par l'établissement (ni appareil,
 * ni personne). C'est le seul cas où un point peut désigner un appareil —
 * pour le contrôle d'un appareil, l'appareil se lit par la ligne.
 */
export function estControleDEnsemble(v: PorteurLigne): boolean {
  return v.equipementId === null && v.salarieId === null;
}

/**
 * Une ligne reçoit-elle des points à corriger ? Pas celle d'un titre de
 * salarié (rien ne s'y dépose, ADR-023), pas une ligne éteinte, pas celle
 * d'un appareil retiré du parc.
 */
export function recoitDesPoints(
  v: PorteurLigne & {
    archiveLe: Date | null;
    /** L'appareil de la ligne est-il au parc ? `null` sans appareil. */
    appareilActif: boolean | null;
  },
): boolean {
  if (v.salarieId !== null) return false;
  if (v.archiveLe !== null) return false;
  if (v.appareilActif === false) return false;
  return true;
}

/**
 * Les catégories d'appareils qu'un contrôle d'ensemble couvre — la liste que
 * le référentiel porte déjà (`equipementsEnContexte`, indicative). Vide pour
 * un contrôle qui ne cite aucun appareil (la commission de sécurité).
 */
export function categoriesCouvertes(o: Pick<Obligation, "equipementsEnContexte">): readonly string[] {
  return o.equipementsEnContexte ?? [];
}

/** Un appareil peut-il être désigné par un point de ce contrôle d'ensemble ? */
export function appareilDesignable(
  o: Pick<Obligation, "equipementsEnContexte">,
  appareil: { categorie: string; actif: boolean },
): boolean {
  return appareil.actif && categoriesCouvertes(o).includes(appareil.categorie);
}

/**
 * Un rapport dont le résultat relève des points à corriger : ni conforme, ni
 * non vérifiable (le contrôle n'a pas eu lieu). Il invite à les noter.
 */
export function resultatRelevePoints(r: Resultat): boolean {
  return r === "observations_mineures" || r === "ecart_majeur";
}
