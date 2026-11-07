/**
 * Un bouton d'un choix segmenté de la page publique (période de facturation,
 * offre du détail au téléphone) : pilule blanche sur le bouton pressé, focus
 * visible au clavier. Le conteneur porte `SEGMENTS`.
 */
export const SEGMENTS = "rounded-full bg-[color:var(--board-slate-pale)] p-1";
export const SEGMENT =
  "rounded-full font-semibold text-[color:var(--board-slate-mid)] transition-colors aria-pressed:bg-[color:var(--board-card)] aria-pressed:text-[color:var(--board-ink)] aria-pressed:shadow-[0_1px_2px_rgba(13,18,36,0.08),0_0_0_1px_rgba(13,18,36,0.04)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-ink)]";
