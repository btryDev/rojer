import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Livre } from "./LegalBadge";

/**
 * Le livre : « Ce que dit le texte », replié par défaut (2026-10-20).
 *
 * Le motif commun pour ranger le droit DERRIÈRE la phrase simple. L'écran dit
 * en clair ce qu'il faut faire ; la citation et les articles restent à un
 * clic — on garde la traçabilité, on retire la lecture imposée.
 *
 * Même livre que `LegalBadge` (`Livre`, 2026-10-28) : `<details>` natif, même
 * panneau creux. Ici pour une citation composée, références en pied.
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
    // Un bloc à la mesure de lecture, comme avant 2026-10-28 : le livre
    // d'une citation composée ouvre sa propre ligne, et son panneau ne
    // s'étire pas sur toute la largeur d'une carte.
    <Livre
      libelle={libelle}
      ouvreLaLigne
      className={cn("block max-w-[var(--board-mesure)]", className)}
    >
      {children ? (
        <div className="[&>p]:m-0 [&>p+p]:mt-2">{children}</div>
      ) : null}
      <p className="m-0 mt-3 text-[11.5px] leading-[1.5] text-[color:var(--board-slate-soft)] first:mt-0">
        {articles.join(" · ")}
      </p>
    </Livre>
  );
}
