import type { RailCategorieId } from "@/components/layout/sidebar-nav";

/**
 * La teinte de chaque section du rail (décision de la propriétaire du
 * 2026-10-25). Elle dit OÙ l'on est : deux pages d'une même section portent
 * la même.
 *
 * **Un seul endroit la porte : le fond de l'en-tête de page.** Ni carte, ni
 * bouton, ni pastille — la couleur dans le corps de page reste aux états
 * (`src/lib/calendrier/etats.ts`). C'est ce qui empêche la teinte de section
 * de devenir un troisième code couleur concurrent.
 *
 * **Hors de la famille des états, par construction.** Pas de jaune (le
 * « proche » est paille), pas de rose ni de pêche (le « en retard » est
 * saumon), pas de vert franc (« à jour »). Une section jaune se lirait
 * « bientôt dû ».
 *
 * Le tableau de bord n'a pas de section : il les résume toutes.
 *
 * En valeurs et non en variables CSS, comme `FOND_TEINTE`
 * (`src/lib/etats-permanents/illustrations.ts`) : posées en style en ligne,
 * une variable que nulle classe n'emploie serait retirée du CSS servi.
 */
export const TEINTE_SECTION: Record<RailCategorieId, string | null> = {
  tableau: null,
  "a-faire": "#e6e1fa", // lavande
  "sante-securite": "#d5f0ec", // eau
  "equipement-batiment": "#dceaf6", // glacier
  documentation: "#efe6d8", // sable
  parametres: "#e9eef2", // ardoise
};
