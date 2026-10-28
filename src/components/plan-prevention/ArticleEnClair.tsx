import type { ReactNode } from "react";

/**
 * Un article dit en clair : la phrase, le constat de Rojer s'il y en a un,
 * puis le livre. Le `LegalBadge` arrive en `children`, écrit littéralement à
 * l'appel : `extraits-affiches.test.ts` lit la balise du livre dans le
 * source de l'écran, pas ici.
 */
export function ArticleEnClair({
  titre,
  texte,
  constat,
  className,
  children,
}: {
  titre?: string;
  texte: string;
  constat?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {titre && (
        <p className="board-eyebrow m-0 mb-1.5 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          {titre}
        </p>
      )}
      <p className="m-0 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6]">{texte}</p>
      {constat && (
        <p className="m-0 mt-1 max-w-[var(--board-mesure)] text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {constat}
        </p>
      )}
      {children}
    </div>
  );
}
