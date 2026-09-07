"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Charte } from "./charte";

/**
 * Pastille réglementaire. Cliquable : déploie un bloc citant
 * l'article et pointe vers Légifrance. Chaque obligation du produit
 * doit s'afficher avec son LegalBadge pour rappeler au dirigeant
 * d'où vient la contrainte. Argument d'auditabilité.
 */

// Les deux voix vivent côte à côte plutôt que dans deux fichiers : le
// balisage est le même des deux côtés — un bouton, un panneau, une
// citation, un lien — seules les teintes et les rayons changent. Deux
// composants auraient dupliqué la logique d'ouverture, qui est la seule
// chose fragile ici.

const BOUTON: Record<Charte, string> = {
  papier:
    "border border-[color:var(--rule)] bg-[color:var(--paper-sunk)] px-3 py-1 font-mono text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[color:var(--seal)]",
  // Pas de contour : dans le board une pastille est un champ, pas un
  // encadré (cf. `.pastille-board`). Le mono capitales reste — une
  // référence d'article est une chaîne de code, et c'est le registre que
  // le board garde pour les sur-titres et les dates.
  board:
    "bg-[color:var(--board-slate-pale)] px-3 py-[5px] font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--board-blue-strong)]",
};

const BOUTON_DEPLIABLE: Record<Charte, string> = {
  papier:
    "cursor-pointer hover:border-[color:var(--warm)] hover:text-[color:var(--warm)]",
  board:
    "cursor-pointer hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)]",
};

const PANNEAU: Record<Charte, string> = {
  papier:
    "rounded-lg border border-[color:var(--rule-soft)] bg-[color:var(--paper-elevated)] p-4 text-[0.8rem] leading-relaxed text-[color:var(--ink)] shadow-[0_1px_0_0_var(--rule-soft)]",
  // Bloc interne creux, rayon 18 : le badge se déplie presque toujours
  // dans une `carte-board` blanche, où un second fond blanc cerné d'un
  // filet ne se lit pas. Le creux ardoise, lui, est l'idiome du board
  // pour « un cran en dessous » (cf. `BlocCreux`).
  board:
    "rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4 text-[13px] leading-[1.6] text-[color:var(--board-slate-ink)]",
};

const CITATION: Record<Charte, string> = {
  papier:
    "border-l-2 border-[color:var(--warm)] pl-3 text-[color:var(--foreground)] italic",
  // Le filet de citation est une structure, pas une encre : c'est
  // exactement l'emploi de `--board-slate`, qui ne tient pas 1,6:1 en
  // texte mais fait très bien une graduation.
  board:
    "border-l-2 border-[color:var(--board-slate)] pl-3.5 text-[color:var(--board-slate-ink)] italic",
};

const COMPLEMENT: Record<Charte, string> = {
  papier: "mt-3 text-[color:var(--muted-foreground)]",
  board: "mt-3 text-[color:var(--board-slate-mid)]",
};

const LIEN: Record<Charte, string> = {
  papier:
    "mt-3 inline-flex items-center gap-1 font-mono text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--warm)] hover:underline",
  board:
    "mt-3 inline-flex items-center gap-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-blue-ink)] hover:underline",
};

type SocleLegalBadge = {
  /** Référence courte, ex: "Art. R. 4224-17 CT" */
  reference: string;
  className?: string;
  defaultOpen?: boolean;
  /** La grammaire visuelle de l'écran qui porte la pastille. */
  charte?: Charte;
};

/**
 * Ce qu'une pastille doit porter pour avoir le droit d'exister.
 *
 * Le type n'exigeait que `reference`. Une pastille sans `href`, sans
 * `extrait` et sans enfant compilait donc — et rendait un BOUTON MORT : même
 * fond, même graisse, même capitales que ses voisines cliquables, mais rien
 * dessous. Six ont été écrites ainsi, dont quatre sur l'écran qu'on ouvre
 * devant un inspecteur, sous un bandeau qui promet « références sourcées
 * Légifrance et INRS ».
 *
 * L'union impose donc AU MOINS une des trois. Ce n'est pas une préférence de
 * rédaction : c'est la seule forme qui empêche d'écrire à nouveau le défaut.
 * Un test n'y suffirait pas — il faudrait qu'il tourne, et le défaut se
 * fabrique à l'écriture.
 *
 * Corollaire assumé : une référence dont on n'a pas l'URL ne s'affiche plus
 * en pastille. Elle s'écrit en texte, comme `controle/page.tsx` le fait déjà
 * pour les éléments de sa check-list. Une source qu'on ne peut pas ouvrir
 * n'est pas une source dégradée, c'est autre chose.
 */
type SourceLegalBadge =
  | { href: string; extrait?: string; children?: ReactNode }
  | { href?: string; extrait: string; children?: ReactNode }
  | { href?: string; extrait?: string; children: ReactNode };

export function LegalBadge(props: SocleLegalBadge & SourceLegalBadge) {
  const {
    reference,
    href,
    extrait,
    children,
    className,
    defaultOpen = false,
    charte = "papier",
  } = props;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("inline-flex flex-col gap-2 align-top", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group inline-flex items-center gap-2 self-start rounded-full transition",
          BOUTON[charte],
          BOUTON_DEPLIABLE[charte],
        )}
        aria-expanded={open}
      >
        <span aria-hidden className="text-[0.75rem] leading-none">§</span>
        <span>{reference}</span>
        <span
          aria-hidden
          className={cn(
            "inline-block text-[0.6rem] transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className={PANNEAU[charte]}>
          {extrait && (
            <blockquote className={CITATION[charte]}>
              «&nbsp;{extrait}&nbsp;»
            </blockquote>
          )}
          {children && <div className={COMPLEMENT[charte]}>{children}</div>}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={LIEN[charte]}
            >
              Lire la source officielle →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
