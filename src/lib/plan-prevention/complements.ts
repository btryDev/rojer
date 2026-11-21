import { libelleFamille } from "./familles-risque";

/**
 * Les champs du plan repris du formulaire de RiskBoard (2026-11-21, décision
 * de la propriétaire) — une seule lecture pour la fiche, la page du lien de
 * signature, le PDF et le dossier de contrôle.
 *
 * Tous facultatifs, et hors du minimum de `R. 4512-8` : aucune surface ne les
 * signale comme manquants. Ce qui est vide ne s'affiche pas — un plan d'avant
 * ce lot se lit exactement comme avant.
 */

export type ComplementsPlan = {
  horaires: string | null;
  cseAssocie: boolean | null;
  qualificationsRequises: string | null;
  moyensFournis: string | null;
  autresObservations: string | null;
};

/** Les libellés, dans l'ordre d'affichage. Repris de RiskBoard, abréviations dépliées. */
export const LIBELLES_COMPLEMENTS: Record<keyof ComplementsPlan, string> = {
  horaires: "Horaires de travail",
  cseAssocie: "CSE associé à l'opération",
  qualificationsRequises: "Qualifications, habilitations, aptitudes médicales requises",
  moyensFournis: "Moyens matériels mis à disposition de l'entreprise extérieure",
  autresObservations: "Observations particulières",
};

export type Complement = { cle: keyof ComplementsPlan; libelle: string; texte: string };

/** Les compléments renseignés, dans l'ordre des libellés ; les vides sont omis. */
export function complementsRemplis(p: ComplementsPlan): Complement[] {
  const out: Complement[] = [];
  for (const cle of Object.keys(LIBELLES_COMPLEMENTS) as (keyof ComplementsPlan)[]) {
    const v = p[cle];
    if (v === null || v === undefined) continue;
    const texte = typeof v === "boolean" ? (v ? "Oui" : "Non") : v.trim();
    if (!texte) continue;
    out.push({ cle, libelle: LIBELLES_COMPLEMENTS[cle], texte });
  }
  return out;
}

export type PrecisionsLigne = {
  risque: string;
  famille?: string | null;
  lieu?: string | null;
  frequence?: string | null;
};

/**
 * Ce qu'une ligne de risque porte en plus de son risque et de ses deux
 * mesures : la famille (seulement si le risque ne la répète pas déjà mot pour
 * mot — elle le préremplit), le lieu, la fréquence. Vide : `[]`.
 */
export function precisionsLigne(l: PrecisionsLigne): string[] {
  const out: string[] = [];
  if (l.famille) {
    const libelle = libelleFamille(l.famille);
    if (libelle.trim().toLowerCase() !== l.risque.trim().toLowerCase()) out.push(`Famille : ${libelle}`);
  }
  if (l.lieu?.trim()) out.push(`Lieu : ${l.lieu.trim()}`);
  if (l.frequence?.trim()) out.push(`Fréquence : ${l.frequence.trim()}`);
  return out;
}
