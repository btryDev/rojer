"use client";

// Le panneau modal du board : fond qui ferme, Échap qui ferme, focus posé
// sur le panneau. Volontairement simple (pas de pile) — sorti d'`AideEcran`
// le 2026-10-24 pour servir aussi « Besoin d'aide ? ». Rendu en portail
// (posé dans un formulaire, il y aurait imbriqué le sien) : dans un
// `<dialog>` ouvert s'il y en a un — `showModal()` rend inerte tout ce qui
// est hors de lui, top layer compris —, sinon dans `body`.

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const LARGEUR = {
  normale: "max-w-[600px]",
  large: "max-w-[880px]",
} as const;

export function PanneauModal({
  ouvert,
  surFermer,
  surtitre,
  titre,
  largeur = "normale",
  children,
}: {
  ouvert: boolean;
  surFermer: () => void;
  surtitre: string;
  titre: string;
  /**
   * `normale` (600 px) pour un texte ou un court formulaire ; `large`
   * (880 px) pour un formulaire de page, à deux colonnes, qu'on ouvre en
   * modal — la prescription.
   */
  largeur?: "normale" | "large";
  children: React.ReactNode;
}) {
  const titreId = useId();
  const panneau = useRef<HTMLDivElement | null>(null);
  // La fermeture passe par une ref : un appelant qui la recrée à chaque rendu
  // (une fonction en ligne) relancerait sinon l'effet ci-dessous, qui remet
  // le focus sur le panneau — cocher une case le lui volait.
  const fermer = useRef(surFermer);
  useEffect(() => {
    fermer.current = surFermer;
  });

  useEffect(() => {
    if (!ouvert) return;
    panneau.current?.focus();
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Échap ferme CE panneau, et lui seul : sans quoi le `<dialog>` qui le
      // porte se fermerait aussi (son annulation est l'action par défaut de
      // la touche), avec ce qui y a été saisi.
      e.preventDefault();
      e.stopPropagation();
      fermer.current();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouvert]);

  if (!ouvert) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      // Repère des raccourcis clavier d'un écran sous-jacent (RevueEnPlace) :
      // une touche frappée dans le panneau ne leur appartient pas.
      data-panneau-modal=""
      aria-labelledby={titreId}
      // Au-dessus des autres couches fixes (revue « en place », z-50) : un
      // panneau s'ouvre souvent depuis l'une d'elles.
      // Sur téléphone, le panneau monte du bas, pleine largeur (2026-10-29).
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4"
    >
      <div aria-hidden onClick={surFermer} className="absolute inset-0 bg-[rgba(10,10,10,.35)]" />
      <div
        ref={panneau}
        tabIndex={-1}
        data-largeur={largeur}
        className={`relative max-h-[92dvh] w-full ${LARGEUR[largeur]} overflow-y-auto overscroll-contain rounded-t-[26px] bg-[color:var(--board-card)] px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-6 md:max-h-[85vh] md:rounded-[26px] md:p-7 shadow-[0_0_0_1px_rgba(13,18,36,.06),0_24px_60px_-24px_rgba(13,18,36,.45)] outline-none`}
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
            className="flex size-10 flex-none items-center md:size-8 justify-center rounded-full text-[color:var(--board-slate-mid)] shadow-[inset_0_0_0_1px_rgba(10,10,10,.14)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-4 text-[13.5px] leading-[1.65] text-[color:var(--board-slate-ink)]">
          {children}
        </div>
      </div>
    </div>,
    // Le dernier `<dialog>` ouvert : le plus haut de la pile.
    [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].at(-1) ?? document.body,
  );
}
