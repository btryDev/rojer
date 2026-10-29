"use client";

// La navigation du téléphone (sous 768 px) — décision de la propriétaire du
// 2026-10-29, option « le rail passe en bas ».
//
// Les cinq mêmes entrées que le rail, sous le pouce, et le même geste : un
// appui ouvre le panneau de la catégorie — ici une feuille qui monte du bas —
// sans naviguer ; c'est l'entrée choisie dans la feuille qui mène à la page
// (ADR-030 amendée le 2026-10-28). Mêmes entrées, mêmes liens que le rail
// (`entrees-navigation`), sur la même encre.
//
// La marque, retour au tableau de bord, flotte en haut à gauche comme la
// gélule flotte en haut à droite : pas de bande (décision du 2026-10-25).
//
// L'état ouvert/fermé et le voile appartiennent à `AppSidebar`, qui les
// partage avec le rail : une seule source, refermée à chaque navigation.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { DemandeAide } from "@/components/assistance/DemandeAide";
import { unPanneauModalEstOuvert } from "@/components/ui-kit/PanneauModal";
import { NavLink, RailEntree } from "./entrees-navigation";
import { useEstTelephone } from "./useEstTelephone";
import {
  LABEL_ITEM,
  type RailCategorie,
  type RailCategorieId,
  type SidebarItemId,
} from "./sidebar-nav";

export function NavigationMobile({
  etablissementId,
  raisonDisplay,
  rail,
  catActive,
  actif,
  ouverte,
  surChoisir,
  enAttente,
}: {
  etablissementId: string;
  raisonDisplay: string;
  rail: RailCategorie[];
  /** Catégorie de la page courante. */
  catActive: RailCategorieId | null;
  /** Entrée de la page courante. */
  actif: SidebarItemId;
  /** Catégorie dont la feuille est ouverte. */
  ouverte: RailCategorieId | null;
  surChoisir: (id: RailCategorieId | null) => void;
  enAttente: boolean;
}) {
  // La feuille n'existe que sur téléphone : ailleurs, l'état `ouverte` est
  // celui du panneau du rail, et une copie cachée de ses liens — avec son
  // focus et son Échap — n'aurait rien à faire dans la page.
  const telephone = useEstTelephone();
  const feuille = telephone ? (rail.find((c) => c.id === ouverte) ?? null) : null;
  const zoneFeuille = useRef<HTMLDivElement>(null);
  const barre = useRef<HTMLElement>(null);

  // À l'ouverture, le focus entre dans la feuille ; Échap la referme et le
  // rend à l'onglet qui l'a ouverte. Même contrat que le menu de la gélule.
  useEffect(() => {
    // Sur l'identifiant, pas sur l'objet `feuille`, recréé à chaque rendu : chaque
    // rendu du parent ramenait sinon le focus en tête de la feuille.
    if (!ouverte || !telephone) return;
    zoneFeuille.current?.querySelector<HTMLElement>("a, button")?.focus();
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Une fenêtre ouverte depuis la feuille (« Besoin d'aide ? ») a son
      // propre Échap : refermer la feuille sous elle la démonterait, et le
      // message en cours de saisie avec.
      if (unPanneauModalEstOuvert()) return;
      const onglet = barre.current?.querySelector<HTMLElement>('[aria-expanded="true"]');
      surChoisir(null);
      onglet?.focus();
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [ouverte, telephone, surChoisir]);

  return (
    <div className="md:hidden">
      {/* Marque et établissement, en haut à gauche — dans la réserve de la
          gélule (`--reserve-gelule`), qui reste libre sur toutes les pages. */}
      <div className="absolute left-[var(--board-gutter)] right-[168px] top-3 z-50 flex h-12 min-w-0 items-center">
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

      {feuille ? (
        <div
          ref={zoneFeuille}
          role="dialog"
          aria-modal="false"
          aria-label={feuille.label}
          className="fixed inset-x-0 bottom-[var(--reserve-nav-bas)] z-50 max-h-[70dvh] overflow-y-auto overscroll-contain rounded-t-[26px] bg-[color:var(--board-ink)] px-3 pb-3 pt-2 text-white"
        >
          <span aria-hidden className="mx-auto mb-2 block h-1 w-9 rounded-full bg-white/20" />
          <p className="px-4 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
            {feuille.label}
          </p>
          <nav aria-label={feuille.label}>
            {feuille.items.map((it) => (
              <NavLink key={it.id} item={it} actif={actif} auChoix={() => surChoisir(null)} />
            ))}
          </nav>
          <div className="mt-2 border-t border-white/10 pt-2">
            <DemandeAide variante="feuille" etablissementId={etablissementId} />
          </div>
        </div>
      ) : null}

      {/* Sa hauteur EST la réserve (`--reserve-nav-bas`) : un seul nombre,
          que le contenu, la feuille et l'îlot de visite lisent aussi. */}
      <nav
        ref={barre}
        aria-label="Navigation principale"
        inert={enAttente}
        aria-busy={enAttente || undefined}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[var(--reserve-nav-bas)] items-start bg-[color:var(--board-ink)] px-1 pt-1.5 pb-[env(safe-area-inset-bottom,0px)] text-white"
      >
        {rail.map((c) => (
          <RailEntree
            key={c.id}
            cat={c}
            variante="bas"
            surPage={catActive === c.id}
            ouverte={ouverte === c.id}
            onClick={() => surChoisir(ouverte === c.id ? null : c.id)}
          />
        ))}
      </nav>
    </div>
  );
}
