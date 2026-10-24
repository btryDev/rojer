import type { Obligation } from "@/lib/referentiels/conformite";
import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import { mentionRythmeRetenu } from "@/lib/referentiels/conformite/mention-rythme";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";

/**
 * Le rythme d'un titre en quelques mots, sous son libellé dans la modale de
 * déclaration (refonte de la fiche, 2026-10-24). Un rythme que le texte
 * n'écrit pas se dit comme tel, même en bref (ADR-039) : « Tous les 3 ans »
 * seul se lirait comme le Code.
 */
export function rythmeEnBref(o: Obligation): string {
  const mot = LABEL_PERIODICITE[periodiciteEffective(o)];
  const phrase = mot.charAt(0).toUpperCase() + mot.slice(1);
  const mention = mentionRythmeRetenu(o);
  return mention ? `${phrase} — ${mention.court}` : phrase;
}
