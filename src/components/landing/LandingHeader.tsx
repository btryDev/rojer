"use client";

// En-tête de la page publique. Volontairement pas de bandeau bleu : le
// ciel est réservé aux grands aplats du milieu et du pied de page. En
// tête de page la barre ne se voit pas ; au défilement, elle se resserre
// en un îlot flottant en verre (voir .lp-nav dans globals.css).
//
// `surPhoto` : la page s'ouvre sur une photo sombre qui passe sous la
// barre (`Hero`). Tant qu'elle n'a pas défilé, la barre passe en blanc ;
// l'îlot, lui, garde ses couleurs sur son verre clair.
//
// L'enveloppe garde une hauteur fixe (`--lp-entete`, 68 px) et l'îlot est posé en
// absolu dedans : si l'en-tête lui-même rétrécissait, il entraînerait
// toute la page de quelques pixels vers le haut pendant l'animation.

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOutAction } from "@/lib/auth/actions";

// « Tarif » mène à la section du même nom (`#tarif`). « Comprendre » n'a
// pas encore de destination : `#comprendre` ne correspond à aucune ancre,
// le clic ne fait rien et ne casse rien. À rebrancher sur /comprendre le
// jour où la page existe.
const LIENS = [
  { href: "#comprendre", label: "Comprendre" },
  { href: "#tarif", label: "Tarif" },
];

export function LandingHeader({
  ctaHref,
  ctaLabel,
  connecte,
  surPhoto = false,
}: {
  ctaHref: string;
  ctaLabel: string;
  connecte: boolean;
  surPhoto?: boolean;
}) {
  const [pose, setPose] = useState(false);
  const blanc = surPhoto && !pose;
  const lien =
    "text-[0.875rem] transition-colors " +
    (blanc
      ? "text-white/80 hover:text-white"
      : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]");

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
    <header className="pointer-events-none sticky top-0 z-50 h-[var(--lp-entete)]">
      <div
        className={
          "lp-nav pointer-events-auto absolute inset-x-0 top-0" +
          (pose ? " lp-nav--ilot" : "")
        }
      >
        <div className="lp-nav-barre flex items-center justify-between gap-6">
          <Link
            href="/"
            className={
              "flex items-baseline gap-[3px] text-[1.3rem] font-semibold tracking-[-0.03em] transition-colors " +
              (blanc ? "text-white" : "text-[color:var(--board-ink)]")
            }
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
                className={lien}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5">
            {!connecte ? (
              <Link
                href="/login"
                className={lien}
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
                  className={lien}
                >
                  Déconnexion
                </button>
              </form>
            )}
            <Link
              href={ctaHref}
              className={
                "lp-btn px-[18px] py-[10px] text-[0.875rem] " +
                (blanc ? "lp-btn-blanc" : "lp-btn-ink")
              }
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
