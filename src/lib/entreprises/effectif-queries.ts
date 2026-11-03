import { contributionDuSite } from "./effectif-calcul";

/** Ce que la carte « Effectif » de la page Équipe affiche (2026-11-03). */
export type EffectifsDuSite = {
  effectifSurSite: number;
  apprentisSurSite: number;
  effectifHorsRojer: number;
  /** Ce que les AUTRES établissements suivis de la société apportent. */
  autresSites: number;
  /** `Entreprise.effectif`, la somme. */
  entreprise: number;
};

/**
 * Sans requête : le site et sa société sont déjà lus par la page
 * (`requireEtablissement`), et la part des autres sites se déduit de la somme
 * — `Entreprise.effectif` = ce site + les autres + les hors Rojer, tenue à
 * jour par `entreprises/effectif.ts` (budget de requêtes de la page, CI du
 * 2026-11-03).
 */
export function effectifsDuSite(site: {
  effectifSurSite: number;
  apprentisSurSite: number;
  entreprise: { effectif: number; effectifHorsRojer: number };
}): EffectifsDuSite {
  const { effectif, effectifHorsRojer } = site.entreprise;
  return {
    effectifSurSite: site.effectifSurSite,
    apprentisSurSite: site.apprentisSurSite,
    effectifHorsRojer,
    autresSites: Math.max(0, effectif - effectifHorsRojer - contributionDuSite(site)),
    entreprise: effectif,
  };
}
