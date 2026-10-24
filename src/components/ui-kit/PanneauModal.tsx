"use client";

// Le panneau modal du board : fond qui ferme, Échap qui ferme, focus posé
// sur le panneau. Volontairement simple (pas de pile) — sorti d'`AideEcran`
// le 2026-10-24 pour servir aussi « Besoin d'aide ? ». Rendu dans `body`
// (portail) : posé dans un formulaire, il y aurait imbriqué le sien.

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function PanneauModal({
  ouvert,
  surFermer,
  surtitre,
  titre,
  children,
}: {
  ouvert: boolean;
  surFermer: () => void;
  surtitre: string;
  titre: string;
  children: React.ReactNode;
}) {
  const titreId = useId();
  const panneau = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    panneau.current?.focus();
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") surFermer();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouvert, surFermer]);

  if (!ouvert) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titreId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div aria-hidden onClick={surFermer} className="absolute inset-0 bg-[rgba(10,10,10,.35)]" />
      <div
        ref={panneau}
        tabIndex={-1}
        className="relative max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-[26px] bg-[color:var(--board-card)] p-7 shadow-[0_0_0_1px_rgba(13,18,36,.06),0_24px_60px_-24px_rgba(13,18,36,.45)] outline-none"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="board-eyebrow m-0">{surtitre}</p>
            <h2 id={titreId} className="board-titre m-0 mt-2 text-[22px]">
              {titre}
            </h2>
          </div>
          <button
            type="button"
            onClick={surFermer}
            aria-label="Fermer"
            className="flex size-8 flex-none items-center justify-center rounded-full text-[color:var(--board-slate-mid)] shadow-[inset_0_0_0_1px_rgba(10,10,10,.14)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-4 text-[13.5px] leading-[1.65] text-[color:var(--board-slate-ink)]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
