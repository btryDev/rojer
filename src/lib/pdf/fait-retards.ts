// Ce qu'une pièce remise en contrôle a le droit de dire des retards, UNE fois,
// pour les trois qui le disent : la checklist du README du ZIP, le dossier de
// conformité et le registre de sécurité.
//
// LE DÉFAUT (relecture du 2026-09-26). « [x] Aucune vérification en retard à
// ce jour » se cochait sur une liste VIDE — et une liste vide, c'est aussi un
// calendrier jamais calculé, ou un établissement sans aucun équipement
// déclaré. Le README avait déjà appris à ne pas cocher un compteur inconnu
// (`checklist-controle.ts`, `null` n'est pas `0`) ; il cochait encore un
// comptage fait sur un ensemble qu'on sait vide. Le dossier de conformité
// écrivait « Aucune vérification en retard. » et le registre « Déclarez vos
// équipements pour peupler le calendrier », sur la même liste vide, sans
// savoir pourquoi elle l'était.
//
// LE PATRON est celui de `calendrier/etat-affiche.ts` : la question « sait-on
// sur quoi l'on compte ? » se tranche AVANT le comptage. Un retard constaté
// reste un retard, quel que soit l'état du calendrier ; une absence de retard
// ne s'affirme que sur un calendrier à jour, qui suit au moins un équipement.
//
// Module pur : il ne lit rien, il reçoit ce que l'appelant a lu.

import { calendrierIncertain, type FraicheurCalendrier } from "@/lib/calendrier/fraicheur";

export type LectureRetards = {
  /** Le nombre de vérifications en retard, ou `null` s'il n'a pas pu être lu. */
  nbEnRetard: number | null;
  /** L'état du calendrier, ou `null` s'il n'a pas pu être lu. */
  calendrier: FraicheurCalendrier | null;
  /** `true` quand l'inventaire est lu ET vide (axe `inventaire` de la couverture). */
  aucunEquipement: boolean;
};

export type FaitRetards = {
  /** `x` : fait favorable établi ; `!` : retard constaté ; ` ` : rien à cocher. */
  coche: "x" | "!" | " ";
  texte: string;
};

export function faitRetards(l: LectureRetards): FaitRetards {
  if (l.nbEnRetard === null || l.calendrier === null) {
    return { coche: " ", texte: "Vérifications en retard : non déterminé" };
  }
  if (l.calendrier.etat === "jamais_genere") {
    return {
      coche: " ",
      texte: "Calendrier jamais calculé : aucun retard ne peut y être compté",
    };
  }
  if (l.nbEnRetard > 0) {
    return { coche: "!", texte: `${l.nbEnRetard} vérification(s) en retard` };
  }
  if (calendrierIncertain(l.calendrier)) {
    return {
      coche: " ",
      texte: "Aucune vérification en retard sur un calendrier à recalculer",
    };
  }
  if (l.aucunEquipement) {
    return {
      coche: " ",
      texte:
        "Aucun équipement déclaré : aucune vérification d'équipement n'est inscrite au calendrier",
    };
  }
  return { coche: "x", texte: "Aucune vérification en retard à ce jour" };
}

/**
 * La phrase d'une liste de vérifications en attente VIDE. Même partage : un
 * calendrier jamais calculé, un inventaire vide et une liste vraiment vide ne
 * disent pas la même chose.
 */
export function faitAttenteVide(l: Omit<LectureRetards, "nbEnRetard">): string {
  if (l.calendrier === null) return "Vérifications en attente : non déterminé.";
  if (l.calendrier.etat === "jamais_genere") {
    return "Calendrier jamais calculé : aucune vérification n'y est encore inscrite.";
  }
  if (l.aucunEquipement) {
    return "Aucun équipement déclaré : aucune vérification d'équipement n'est inscrite au calendrier.";
  }
  if (calendrierIncertain(l.calendrier)) {
    return "Aucune vérification en attente sur un calendrier à recalculer.";
  }
  return "Aucune vérification en attente ou programmée.";
}
