/**
 * La jauge d'un titre (refonte de la fiche salarié, 2026-10-24).
 *
 * ~~Une frise commune à tous les titres~~ [même jour, retour de la
 * propriétaire : sur un axe partagé, les années et les repères se serraient,
 * et un téléphone n'en laissait rien.] Chaque titre porte sa propre barre :
 * de la délivrance à l'échéance, remplie jusqu'à aujourd'hui, et le temps
 * restant en clair. Rien à aligner d'une ligne à l'autre.
 *
 * L'échéance est celle de `echeanceDuTitre`, la même que le calendrier. Un
 * titre sans échéance n'a pas de jauge à remplir : la barre court sans fin,
 * et la phrase le dit. Module pur : `now` est passé.
 */
import { composantesCiviles, joursCivilsEntre } from "@/lib/dates";
import { estEnRetard } from "@/lib/dates/retard";

export type JaugeTitre = {
  /** Part écoulée, dans [0, 1] ; `null` quand le titre n'a pas d'échéance. */
  ecoule: number | null;
  /** « Encore 2 ans et 6 mois », « Dépassée depuis 49 jours », « Sans échéance ». */
  phrase: string;
};

const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) =>
  `${n} ${n > 1 ? motPluriel : mot}`;

/** Le temps qui reste, en années et mois — en jours sous un mois. */
function dureeRestante(de: Date, a: Date): string {
  const d = composantesCiviles(de);
  const f = composantesCiviles(a);
  let mois = (f.annee - d.annee) * 12 + (f.mois - d.mois);
  if (f.jour < d.jour) mois -= 1;
  if (mois < 1) return pluriel(joursCivilsEntre(de, a), "jour");
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  if (ans === 0) return `${reste} mois`;
  if (reste === 0) return pluriel(ans, "an");
  return `${pluriel(ans, "an")} et ${reste} mois`;
}

export function jaugeDuTitre(
  titre: { delivreLe: Date; echeance: Date | null },
  now: Date,
): JaugeTitre {
  if (titre.echeance === null) {
    return { ecoule: null, phrase: "Sans échéance" };
  }
  // La règle du retard est celle du calendrier (ADR-011) : jour civil.
  if (estEnRetard(titre.echeance, now)) {
    const jours = joursCivilsEntre(titre.echeance, now);
    return { ecoule: 1, phrase: `Dépassée depuis ${pluriel(jours, "jour")}` };
  }
  const total = titre.echeance.getTime() - titre.delivreLe.getTime();
  const fait = now.getTime() - titre.delivreLe.getTime();
  const ecoule = total <= 0 ? 1 : Math.min(1, Math.max(0, fait / total));
  if (joursCivilsEntre(now, titre.echeance) === 0) {
    return { ecoule, phrase: "Échéance aujourd'hui" };
  }
  return { ecoule, phrase: `Encore ${dureeRestante(now, titre.echeance)}` };
}
