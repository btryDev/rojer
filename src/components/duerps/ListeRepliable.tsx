"use client";

import { Children, useState } from "react";

/**
 * Une liste dont on ne montre que les premiers éléments (2026-11-12) : les
 * risques types du secteur se passent en revue, ils n'ont pas à remplir
 * l'écran d'emblée. Les éléments masqués sont rendus au dépliage, pas
 * supprimés : rien ne change de ce qu'ils font.
 */
export function ListeRepliable({
  visibles = 3,
  children,
}: {
  visibles?: number;
  children: React.ReactNode;
}) {
  const [deplie, setDeplie] = useState(false);
  const elements = Children.toArray(children);
  const caches = elements.length - visibles;
  return (
    <>
      <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
        {deplie || caches <= 0 ? elements : elements.slice(0, visibles)}
      </ul>
      {caches > 0 && (
        <button
          type="button"
          aria-expanded={deplie}
          onClick={() => setDeplie((d) => !d)}
          className="w-full border-t border-[color:var(--board-slate-line)] px-7 py-4 text-left text-[13px] font-semibold text-[color:var(--board-blue-ink)] hover:underline sm:px-8"
        >
          {deplie ? "Replier ↑" : `Afficher les ${caches} autres ↓`}
        </button>
      )}
    </>
  );
}
