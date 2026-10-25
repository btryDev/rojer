import type { RailCategorieId } from "@/components/layout/sidebar-nav";

/**
 * La teinte de chaque section du rail (décision de la propriétaire du
 * 2026-10-25). Elle dit OÙ l'on est : deux pages d'une même section portent
 * la même.
 *
 * ~~**Un seul endroit la porte : le fond de l'en-tête de page.** Ni carte, ni
 * bouton, ni pastille~~ [2026-10-25, décision de la propriétaire : **deux
 * endroits** — le fond de l'en-tête de page, et la coiffe des cartes du
 * tableau de bord (`CarteBoard`), qui dit de quelle section chaque carte est
 * l'extrait. Toujours ni bouton ni pastille] — la couleur dans le corps de
 * page reste aux états (`src/lib/calendrier/etats.ts`). C'est ce qui empêche
 * la teinte de section de devenir un troisième code couleur concurrent.
 *
 * **Hors de la famille des états, par construction.** Pas de jaune (le
 * « proche » est paille), pas de rose ~~ni de pêche~~ (le « en retard » est
 * saumon), pas de vert franc (« à jour »). Une section jaune se lirait
 * « bientôt dû ». [2026-10-25 : le pêche est admis pour « À faire », choix
 * de la propriétaire — à 24° du rose comme du paille, au-delà de l'écart
 * minimal que la garde exige (`EnTetePage.test.tsx`). ~~Rien ne le place à
 * côté du rose qu'un retard affiche : la teinte ne vit que dans le panneau
 * de l'illustration.~~ [2026-10-25 : faux depuis la coiffe des cartes du
 * tableau de bord — le pêche y voisine le rose d'un retard, sur la même
 * carte. Les 24° d'écart sont ce qui les sépare ; la garde ne mesure que
 * l'en-tête.]]
 *
 * Le tableau de bord n'a pas de section : il les résume toutes.
 *
 * En valeurs et non en variables CSS, comme `FOND_TEINTE`
 * (`src/lib/etats-permanents/illustrations.ts`) : posées en style en ligne,
 * une variable que nulle classe n'emploie serait retirée du CSS servi.
 */
//
// Trois sections thématiques portent une teinte ; Documentation et Paramètres
// n'en sont pas vraiment (décision de la propriétaire du 2026-10-25) : elles
// partagent le même gris neutre. La lavande d'« À faire » a été retirée le
// même jour (trop présente) au profit du pêche, qui était celui de
// Documentation.
const GRIS_NEUTRE = "#ebebea";

export const TEINTE_SECTION: Record<RailCategorieId, string | null> = {
  tableau: null,
  "a-faire": "#fde2d0", // pêche
  "sante-securite": "#d5f0ec", // eau
  "equipement-batiment": "#dceaf6", // glacier
  documentation: GRIS_NEUTRE,
  parametres: GRIS_NEUTRE,
};

/** Les sections qui ont une teinte propre — les autres prennent le gris. */
export const SECTIONS_TEINTEES = ["a-faire", "sante-securite", "equipement-batiment"] as const;
