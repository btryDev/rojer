import Link from "next/link";

/**
 * Où l'on est dans une unité du DUERP (2026-11-12, demande de la
 * propriétaire) : « Toutes les unités / Plonge / Chute de plain-pied ». Le
 * bouton « ← Plonge » seul ne disait pas d'où l'on venait, en entrant dans
 * la cotation puis dans les mesures. Chaque niveau se clique ; le dernier
 * est la page ouverte.
 */
export function FilUnite({
  niveaux,
}: {
  niveaux: { libelle: string; href?: string }[];
}) {
  return (
    <nav aria-label="Vous êtes ici">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-[13px]">
        {niveaux.map((n, i) => {
          const dernier = i === niveaux.length - 1;
          return (
            <li key={`${i}-${n.libelle}`} className="flex min-w-0 items-center gap-2">
              {i > 0 && (
                <span aria-hidden className="text-[color:var(--board-slate-soft)]">
                  /
                </span>
              )}
              {dernier || !n.href ? (
                <span
                  aria-current={dernier ? "page" : undefined}
                  className="truncate font-semibold text-[color:var(--board-ink)]"
                >
                  {n.libelle}
                </span>
              ) : (
                <Link
                  href={n.href}
                  className="truncate font-medium text-[color:var(--board-slate-mid)] underline-offset-4 hover:text-[color:var(--board-ink)] hover:underline"
                >
                  {n.libelle}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
