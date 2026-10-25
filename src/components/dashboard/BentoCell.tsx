// Cellule du tableau de bord — en-tête (sur-titre + méta-droite) + corps.
//
// Elle portait `.bento-cell`, la boîte de la charte papier : rayon 14 sur
// `--paper-elevated`, cernée d'un `--rule-soft`. Elle passe à `.carte-board`,
// la même carte que partout ailleurs [2026-10-25 : `CarteBoard`, qui porte la
// coiffe de section sur le tableau de bord] — un tableau de bord fait de boîtes d'une
// autre famille au milieu d'un produit board se remarque immédiatement.
//
// Le compteur ne porte plus le vert : ce n'est pas un « fait », c'est un
// volume. Le vert du board dit qu'un geste a eu lieu (interdits 16-17), et un
// nombre d'éléments n'est le geste de personne.

import Link from "next/link";
import { CarteBoard } from "./CarteBoard";
import type { ReactNode } from "react";

export function BentoCell({
  kicker,
  sub,
  count,
  more,
  legend,
  children,
  className = "",
}: {
  kicker: ReactNode;
  sub?: ReactNode;
  count?: number | string;
  more?: { href: string; label: string };
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <CarteBoard className={"px-7 py-6 sm:px-8 " + className}>
      <div className="flex items-center justify-between gap-3">
        <span className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          {kicker}
        </span>
        <div className="flex items-center gap-3">
          {typeof count !== "undefined" ? (
            <span className="pastille-board bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]">
              {count}
            </span>
          ) : null}
          {sub ? (
            <span className="text-[12.5px] text-[color:var(--board-slate-mid)]">
              {sub}
            </span>
          ) : null}
          {legend ? <span className="text-[12px]">{legend}</span> : null}
          {more ? (
            <Link
              href={more.href}
              className="text-[12.5px] text-[color:var(--board-blue-ink)] transition-colors hover:text-[color:var(--board-ink)]"
            >
              {more.label} →
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </CarteBoard>
  );
}
