"use client";

// En-tête de la page publique. Volontairement pas de bandeau bleu : le
// ciel est réservé aux grands aplats du milieu et du pied de page. En
// tête de page la barre ne se voit pas ; au défilement, elle se resserre
// en un îlot flottant en verre (voir .lp-nav dans globals.css).
//
// L'enveloppe garde une hauteur fixe de 68px et l'îlot est posé en
// absolu dedans : si l'en-tête lui-même rétrécissait, il entraînerait
// toute la page de quelques pixels vers le haut pendant l'animation.

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOutAction } from "@/lib/auth/actions";

// Deux entrées, deux destinations à venir : aucune des deux pages
// n'existe encore. On les affiche quand même — la barre doit montrer la
// forme définitive du site. `#comprendre` et `#tarif` ne correspondent à
// aucune ancre de la page : le clic ne fait donc rien, il ne casse rien
// non plus. À rebrancher sur /comprendre et /tarif le jour où ces pages
// existent.
const LIENS = [
  { href: "#comprendre", label: "Comprendre" },
  { href: "#tarif", label: "Tarif" },
];

export function LandingHeader({
  ctaHref,
  ctaLabel,
  connecte,
}: {
  ctaHref: string;
  ctaLabel: string;
  connecte: boolean;
}) {
  const [pose, setPose] = useState(false);

  useEffect(() => {
    // Deux seuils plutôt qu'un : sans cette hystérésis, un défilement qui
    // s'arrête pile sur la limite fait battre l'îlot entre ses deux états.
    const onScroll = () =>
      setPose((actuel) => (actuel ? window.scrollY > 8 : window.scrollY > 24));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // pointer-events : l'enveloppe couvre toute la largeur, mais seule
    // l'îlot doit intercepter les clics — sinon les gouttières de part et
    // d'autre avaleraient ceux destinés à la page.
    <header className="pointer-events-none sticky top-0 z-50 h-[68px]">
      <div
        className={
          "lp-nav pointer-events-auto absolute inset-x-0 top-0" +
          (pose ? " lp-nav--ilot" : "")
        }
      >
        <div className="lp-nav-barre flex items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-baseline gap-[3px] text-[1.3rem] font-semibold tracking-[-0.03em] text-[color:var(--board-ink)]"
            style={{ fontFamily: "var(--font-titre), sans-serif" }}
          >
            Rojer
            <span className="size-[7px] rounded-full bg-[color:var(--board-sky)]" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {LIENS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[0.875rem] text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5">
            {!connecte ? (
              <Link
                href="/login"
                className="text-[0.875rem] text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
              >
                Se connecter
              </Link>
            ) : (
              // L'accueil est la destination du « Quitter » de la mise en
              // place, et il n'y porte pas le header d'application
              // (`LayoutAvecEnTete` n'est pas monté sur `/`). Sans cette
              // sortie, un compte connecté sans dossier arrivait ici sur un
              // seul bouton, qui le renvoyait à l'écran qu'il venait de
              // quitter.
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-[0.875rem] text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
                >
                  Déconnexion
                </button>
              </form>
            )}
            <Link
              href={ctaHref}
              className="lp-btn lp-btn-ink px-[18px] py-[10px] text-[0.875rem]"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
