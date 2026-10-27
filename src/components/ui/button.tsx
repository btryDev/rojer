import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Le calcul brut des classes. Ne pas l'exporter tel quel — cf.
 * `buttonVariants` juste en dessous.
 */
const classesBrutes = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-[0.78rem] font-medium tracking-[0.08em] uppercase whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 [font-family:var(--font-mono)]",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-paper-elevated [a]:hover:bg-ink/85 shadow-[inset_0_1px_0_0_oklch(from_var(--paper-elevated)_l_c_h_/_0.18),0_1px_0_0_oklch(from_var(--ink)_l_c_h_/_0.06)]",
        outline:
          "border-rule bg-transparent text-ink hover:bg-paper-elevated hover:border-ink/60 aria-expanded:bg-paper-elevated",
        secondary:
          "bg-paper-sunk text-ink hover:bg-paper-sunk/70 aria-expanded:bg-paper-sunk",
        ghost:
          "hover:bg-paper-sunk/60 hover:text-ink aria-expanded:bg-paper-sunk/60",
        destructive:
          "bg-transparent text-minium hover:bg-minium/8 border-minium/40 border-dashed focus-visible:border-minium/60 focus-visible:ring-minium/20",
        link:
          "normal-case tracking-normal [font-family:var(--font-body)] text-ink underline decoration-rule decoration-dotted underline-offset-4 hover:decoration-ink",
        // Voix du board : pilule d'encre, sans mono ni capitales. Les
        // variantes historiques parlent en petites capitales monospacées
        // — le registre « document administratif » ; le board, lui, pose
        // des pilules en Plex semi-gras (cf. les appels à l'action du
        // calendrier et du tableau de bord). Les deux cohabitent le temps
        // que les écrans passent au board, d'où deux variantes plutôt
        // qu'une réécriture des existantes.
        board:
          "normal-case tracking-[-0.01em] [font-family:var(--font-body)] font-semibold bg-[color:var(--board-ink)] text-white hover:opacity-85",
        boardClair:
          "normal-case tracking-[-0.01em] [font-family:var(--font-body)] font-semibold bg-transparent text-[color:var(--board-ink)] shadow-[inset_0_0_0_1px_rgba(10,10,10,.18)] hover:bg-[color:var(--board-slate-pale)]",
        // L'attention, pas le retard (charte § 1.5 et § 7, règles 3 et 4) :
        // champ et encre ambre, jamais l'un sans l'autre. Pour ce qui reste à
        // faire sans échéance — une fiche à compléter n'est pas en retard, le
        // rose lui est interdit (décision de la propriétaire du 2026-10-27).
        boardAttention:
          "normal-case tracking-[-0.01em] [font-family:var(--font-body)] font-semibold bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)] shadow-[inset_0_0_0_1px_rgba(117,77,10,.22)] hover:brightness-[.97]",
      },
      size: {
        default: "h-9 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 px-2.5 text-[0.62rem] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 px-3 text-[0.68rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-11 gap-2 px-6 text-[0.82rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        // Gabarit des pilules du board : 40 px de haut, 12,5 px de texte.
        board:
          "h-10 gap-2 px-[18px] text-[12.5px] [&_svg:not([class*='size-'])]:size-4",
        boardSm: "h-8 gap-1.5 px-3.5 text-[12px]",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Les classes d'un bouton, **conflits déjà tranchés**.
 *
 * `cva` concatène, il ne remplace pas : les variantes `board` ne peuvent
 * qu'ajouter `normal-case` et `[font-family:var(--font-body)]` par-dessus le
 * `uppercase` et le `[font-family:var(--font-mono)]` du socle, qui restent
 * dans la chaîne. Lequel gagne ? L'ordre du CSS produit — pas celui de la
 * chaîne, ni celui du code. C'est-à-dire personne.
 *
 * Sur `/equipements`, la même action portait ainsi deux styles : « + Ajouter
 * un équipement » depuis le bandeau, qui passait par `cn(…)` et perdait donc
 * le `uppercase`, et « AJOUTER UN ÉQUIPEMENT » en petites capitales
 * monospacées depuis l'état vide, qui appelait `buttonVariants` nu. Le bon
 * des deux est le premier : le board pose des pilules en Plex semi-gras, les
 * petites capitales monospacées sont la voix des écrans restés en papier.
 *
 * Le conflit se tranche donc ici, une fois, plutôt qu'à quarante appels : ce
 * n'est pas à l'appelant de savoir qu'une variante de ce fichier a besoin
 * d'être démêlée. `cn(buttonVariants(…))` reste sans effet ni danger —
 * `twMerge` est idempotent —, et les appels nus deviennent justes.
 */
function buttonVariants(
  options?: Parameters<typeof classesBrutes>[0],
): string {
  return cn(classesBrutes(options))
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof classesBrutes>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
