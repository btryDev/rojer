/**
 * La mention d'un rythme retenu (ADR-039), séparée de `rythme-retenu.ts` pour
 * que le générateur, qui ne lit que `periodiciteEffective`, n'embarque pas la
 * table des libellés (et, par elle, le module des échéances et la base :
 * `passage-a-blanc.test.ts` tient cette fermeture).
 */

import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import type { Periodicite } from "../types-communs";
import type { MotifRythmeRetenu, RythmeRetenu } from "./types";

type AvecRythme = { periodicite: Periodicite; rythmeRetenu?: RythmeRetenu };

// -----------------------------------------------------------------------------
// La mention
// -----------------------------------------------------------------------------

/**
 * Ce qui s'affiche sous un rythme retenu. Écrit une fois, ici : le composant
 * `MentionRythmeRetenu`, le registre et le dossier PDF, le README du ZIP, la
 * grille, l'export de relecture et le MCP lisent tous ces deux chaînes.
 *
 * Elle ne qualifie rien — ni « opposable », ni « valeur légale »
 * (`sans-qualification.test.ts`). Elle dit d'où vient le rythme.
 */
export type MentionRythme = {
  motif: MotifRythmeRetenu;
  /** Pastille, colonne étroite : « Rythme de la norme NF S 61-919 ». */
  court: string;
  /** Phrase entière : la référence de la norme, ou le mot du texte. */
  long: string;
};

/** Libellé court du défaut, pour les pastilles. */
export const PASTILLE_DEFAUT_ANNUEL = "Rythme retenu par défaut";

/** Le libellé court d'une norme : « Rythme de la norme NF S 61-919 ». */
export function pastilleNorme(norme: string): string {
  return `Rythme de la norme ${norme}`;
}

export function mentionRythmeRetenu(o: AvecRythme): MentionRythme | null {
  const r = o.rythmeRetenu;
  if (!r) return null;
  if (r.motif === "norme") {
    const vague = r.texteVague ? `Le texte dit « ${r.texteVague} » ; ` : "";
    return {
      motif: "norme",
      court: pastilleNorme(r.norme),
      long: `${vague}Rythme de la norme ${r.reference.reference} — périodicité ${LABEL_PERIODICITE[r.periodicite]}. C'est une norme, citée comme norme, pas un article de loi.`,
    };
  }
  return {
    motif: "defaut_annuel",
    court: PASTILLE_DEFAUT_ANNUEL,
    long: `Le texte dit « ${r.texteVague} » ; rythme retenu par défaut : annuel.`,
  };
}

/**
 * La mention d'une LIGNE de calendrier, ou `null`.
 *
 * Une ligne surchargée par une prescription particulière ne la porte pas : son
 * rythme est celui de la prescription, qui a son propre marquage (ADR-032,
 * ADR-039 § 3, préséance). Une ligne sur mesure (`prescription:…`) n'a pas
 * d'obligation au référentiel, donc rien à dire ici.
 */
export function mentionRythmeDeLigne(
  o: AvecRythme | undefined,
  ligne: { prescriptionId?: string | null },
): MentionRythme | null {
  if (!o || ligne.prescriptionId) return null;
  return mentionRythmeRetenu(o);
}
