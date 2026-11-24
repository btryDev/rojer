// Les classes partagées par les écrans du rendez-vous annuel (maquette
// « Réserver le rendez-vous de l'année », 2026-11-24) — tables statiques,
// sur les jetons de la charte board.

export const SURTITRE = "m-0 text-[12.5px] font-semibold text-[color:var(--board-slate-soft)]";
export const CORPS = "m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]";
export const PETIT = "m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]";
export const CREUX = "rounded-[22px] bg-[color:var(--board-slate-pale)]";
export const LIEN = "text-[color:var(--board-blue-ink)] underline underline-offset-2 hover:text-[color:var(--board-ink)]";

export const TONS_PASTILLE = {
  bleu: "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]",
  vert: "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]",
  ambre: "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]",
} as const;

export const PASTILLE = "inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full px-3 py-[5px] text-[12px] font-semibold";
