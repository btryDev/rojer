"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

/**
 * Ce qu'un geste de la fiche du plan annonce APRÈS qu'il a fait disparaître
 * son bouton (2026-11-19, vu au test de PP-002 : après « Refuser », le
 * bandeau de la proposition disparaissait avec son message, et rien ne
 * disait que le refus avait eu lieu). L'annonce vit dans un composant posé
 * une fois sur la page, au-dessus des blocs que le rafraîchissement retire :
 * son état survit au rendu serveur qui suit le geste.
 */

type Annonce = { ton: "succes" | "erreur"; message: string };

const Contexte = createContext<(a: Annonce | null) => void>(() => {});

export function useAnnonceFiche() {
  return useContext(Contexte);
}

export function AnnonceFiche({ children }: { children: ReactNode }) {
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const annoncer = useCallback((a: Annonce | null) => setAnnonce(a), []);
  return (
    <Contexte.Provider value={annoncer}>
      <div role="status" aria-live="polite" className="empty:hidden">
        {annonce && (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-6 py-4 text-[14px] leading-[1.55] ${
              annonce.ton === "succes"
                ? "bg-[color:var(--board-card)] text-[color:var(--board-ink)] shadow-[inset_4px_0_0_var(--board-green-ink)]"
                : "bg-[color:var(--board-card)] text-[color:var(--board-signal-ink)] shadow-[inset_4px_0_0_var(--board-signal-ink)]"
            }`}
          >
            <span>{annonce.message}</span>
            <button
              type="button"
              onClick={() => setAnnonce(null)}
              className="text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
      {children}
    </Contexte.Provider>
  );
}
