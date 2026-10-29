"use client";

// La navigation du téléphone (sous 768 px) — décision de la propriétaire du
// 2026-10-29, option « le rail passe en bas ».
//
// Les cinq mêmes entrées que le rail, sous le pouce, et le même geste : un
// appui ouvre le panneau de la catégorie — ici une feuille qui monte du bas —
// sans naviguer ; c'est l'entrée choisie dans la feuille qui mène à la page
// (ADR-030 amendée le 2026-10-28). Rien de neuf à apprendre en passant de
// l'ordinateur au téléphone : même carte du produit, même encre.
//
// La marque, retour au tableau de bord, flotte en haut à gauche comme la
// gélule flotte en haut à droite : pas de bande (décision du 2026-10-25).
//
// L'état ouvert/fermé appartient à `AppSidebar`, qui le partage avec le rail :
// une seule source, refermée à chaque navigation.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { DemandeAide } from "@/components/assistance/DemandeAide";
import {
  LABEL_ITEM,
  type RailCategorie,
  type RailCategorieId,
} from "./sidebar-nav";

export function NavigationMobile({
  etablissementId,
  raisonDisplay,
  rail,
  catActive,
  ouverte,
  surChoisir,
  enAttente,
  rendreItem,
}: {
  etablissementId: string;
  raisonDisplay: string;
  rail: RailCategorie[];
  /** Catégorie de la page courante. */
  catActive: RailCategorieId | null;
  /** Catégorie dont la feuille est ouverte. */
  ouverte: RailCategorieId | null;
  surChoisir: (id: RailCategorieId | null) => void;
  enAttente: boolean;
  /** Le rendu d'une entrée de panneau, partagé avec le rail. */
  rendreItem: (item: RailCategorie["items"][number]) => React.ReactNode;
}) {
  const feuille = rail.find((c) => c.id === ouverte) ?? null;
  const zoneFeuille = useRef<HTMLDivElement>(null);
  const boutons = useRef<Partial<Record<RailCategorieId, HTMLButtonElement | null>>>({});

  // À l'ouverture, le focus entre dans la feuille ; Échap la referme et le
  // rend à l'onglet qui l'a ouverte. Même contrat que le menu de la gélule.
  useEffect(() => {
    if (!ouverte) return;
    zoneFeuille.current?.querySelector<HTMLElement>("a, button")?.focus();
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      surChoisir(null);
      boutons.current[ouverte]?.focus();
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [ouverte, surChoisir]);

  return (
    <>
      {/* Marque et établissement, en haut à gauche — dans la réserve de la
          gélule (`--reserve-gelule`), qui reste libre sur toutes les pages. */}
      <div className="absolute left-[var(--board-gutter)] right-[168px] top-3 z-50 flex h-12 min-w-0 items-center md:hidden">
        <Link
          href={`/etablissements/${etablissementId}`}
          onClick={() => surChoisir(null)}
          aria-current={catActive === "tableau" ? "page" : undefined}
          aria-label={`${LABEL_ITEM.tableau} — Rojer, ${raisonDisplay}`}
          className="flex min-w-0 flex-col rounded-lg py-1 pr-2 leading-none"
        >
          <span className="font-[family-name:var(--font-titre)] text-[18px] font-semibold tracking-[-0.025em] text-[color:var(--board-ink)]">
            Rojer
          </span>
          <span className="mt-1 truncate text-[11.5px] text-[color:var(--board-slate-mid)]">
            {raisonDisplay}
          </span>
        </Link>
      </div>

      {/* Le voile : un appui hors de la feuille la referme. Pas un bouton —
          Échap et l'onglet actif font la même chose au clavier. */}
      {feuille ? (
        <div
          aria-hidden
          onClick={() => surChoisir(null)}
          className="fixed inset-0 z-40 bg-[color:rgba(10,10,10,.38)] md:hidden"
        />
      ) : null}

      {feuille ? (
        <div
          ref={zoneFeuille}
          role="dialog"
          aria-modal="false"
          aria-label={feuille.label}
          className="fixed inset-x-0 bottom-[var(--reserve-nav-bas)] z-50 max-h-[70dvh] overflow-y-auto overscroll-contain rounded-t-[26px] bg-[color:var(--board-ink)] px-3 pb-3 pt-2 text-white md:hidden"
        >
          <span aria-hidden className="mx-auto mb-2 block h-1 w-9 rounded-full bg-white/20" />
          <p className="px-4 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
            {feuille.label}
          </p>
          <nav aria-label={feuille.label}>
            {feuille.items.map((it) => (
              <div key={it.id}>{rendreItem(it)}</div>
            ))}
          </nav>
          <div className="mt-2 border-t border-white/10 pt-2">
            <DemandeAide variante="feuille" etablissementId={etablissementId} />
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Navigation principale"
        inert={enAttente}
        aria-busy={enAttente || undefined}
        className="fixed inset-x-0 bottom-0 z-50 flex bg-[color:var(--board-ink)] px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] text-white md:hidden"
      >
        {rail.map((c) => {
          const surPage = catActive === c.id;
          const estOuverte = ouverte === c.id;
          const allume = surPage || estOuverte;
          return (
            <button
              key={c.id}
              ref={(el) => {
                boutons.current[c.id] = el;
              }}
              type="button"
              onClick={() => surChoisir(estOuverte ? null : c.id)}
              aria-expanded={estOuverte}
              aria-current={surPage ? "page" : undefined}
              className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl"
            >
              <span
                className={
                  "relative grid h-8 w-11 place-items-center rounded-xl transition-colors " +
                  (allume ? "bg-white text-[color:var(--board-ink)]" : "text-white/60")
                }
              >
                <c.Icon aria-hidden className="size-[18px]" />
                {c.alert ? (
                  <span
                    aria-hidden
                    className="absolute right-1 top-0.5 size-2 rounded-full bg-[color:var(--board-signal-mark)] ring-2 ring-[color:var(--board-ink)]"
                  />
                ) : null}
              </span>
              <span
                className={
                  "max-w-full truncate px-0.5 text-[10.5px] leading-[1.35] " +
                  (allume ? "font-semibold text-white" : "text-white/55")
                }
              >
                {c.labelCourt}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
