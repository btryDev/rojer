import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIVRE } from "./livre";

/**
 * Le livre : « Ce que dit le texte », replié par défaut (2026-10-20).
 *
 * Le motif commun pour ranger le droit DERRIÈRE la phrase simple. L'écran dit
 * en clair ce qu'il faut faire ; la citation et les articles restent à un
 * clic — on garde la traçabilité, on retire la lecture imposée.
 *
 * `<details>` natif : pas de JavaScript, clavier et lecteurs d'écran gérés
 * par le navigateur, et le texte reste dans la page (recherche, impression).
 *
 * Charte board seulement, et c'est voulu : le papier est de la dette
 * (`docs/charte-board.md`), un écran qui allège son texte passe au board.
 * `LegalBadge` garde ses deux chartes parce que des écrans papier l'appellent.
 */
export function TexteSource({
  articles,
  children,
  libelle = "Ce que dit le texte",
  className = "",
}: {
  /** Les références, fondatrice en tête. Affichées sous la citation. */
  articles: readonly string[];
  /** La citation ou le détail juridique. */
  children?: ReactNode;
  libelle?: string;
  className?: string;
}) {
  return (
    <details className={className}>
      {/* `-ml-2` : le livre ouvre la ligne, l'icône s'aligne sur le texte. */}
      <summary
        className={cn(
          LIVRE.board,
          "-ml-2 list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <BookOpen aria-hidden className="size-3.5" />
        {libelle}
      </summary>
      <div className="mt-2 max-w-[var(--board-mesure)] border-l-2 border-[color:var(--board-slate-line)] pl-4">
        {children ? (
          <div className="text-[12.5px] leading-[1.6] text-[color:var(--board-slate-mid)] [&>p]:m-0 [&>p+p]:mt-2">
            {children}
          </div>
        ) : null}
        <p className="m-0 mt-2 text-[11.5px] leading-[1.5] text-[color:var(--board-slate-soft)]">
          {articles.join(" · ")}
        </p>
      </div>
    </details>
  );
}
