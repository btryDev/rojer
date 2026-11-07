"use client";

// En-tête de la page publique. Volontairement pas de bandeau bleu : le
// ciel est réservé aux grands aplats du milieu et du pied de page. En
// tête de page la barre ne se voit pas ; au défilement, elle se resserre en
// un îlot flottant en verre (voir .lp-nav dans globals.css).
//
// Un seul bouton de compte, au téléphone comme au bureau (décision de la
// propriétaire, 2026-11-07) : « Se connecter », ou « Mon espace » une fois
// connecté. L'inscription reste portée par le hero et le tarif ; la
// déconnexion, par l'application et la mise en place (`WizardShell`).
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
import { cn } from "@/lib/utils";
import type { CompteLanding } from "./compte";
import { Marque } from "./Marque";

// « Tarif » mène à la section du même nom (`/#tarif` : depuis la racine,
// l'en-tête sert aussi aux pages légales). « Comprendre » n'a
// pas encore de destination : `#comprendre` ne correspond à aucune ancre,
// le clic mène en haut de l'accueil, sans rien casser. À rebrancher sur /comprendre le
// jour où la page existe. Sous `md`, la barre ne garde que la marque et le
// bouton : la page se parcourt en défilant.
const LIENS = [
  { href: "/#comprendre", label: "Comprendre" },
  { href: "/#tarif", label: "Tarif" },
];

export function LandingHeader({
  compte,
  surPhoto = false,
}: {
  /** Le compte connecté : « Mon espace » mène à son dossier. */
  compte?: CompteLanding;
  surPhoto?: boolean;
}) {
  const [pose, setPose] = useState(false);
  const blanc = surPhoto && !pose;

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
      <div className={cn("lp-nav pointer-events-auto absolute inset-x-0 top-0", pose && "lp-nav--ilot")}>
        <div className="lp-nav-barre flex items-center justify-between gap-4 sm:gap-6">
          <Marque />

          <div className="flex items-center gap-8">
            <nav className="hidden items-center gap-8 md:flex">
              {LIENS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "text-[0.875rem] transition-colors",
                    blanc
                      ? "text-white/80 hover:text-white"
                      : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]",
                  )}
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <Link
              href={compte?.href ?? "/login"}
              className={cn(
                "lp-btn whitespace-nowrap px-4 py-[9px] text-[0.8125rem] sm:px-[18px] sm:py-[10px] sm:text-[0.875rem]",
                blanc ? "lp-btn-blanc" : "lp-btn-ink",
              )}
            >
              {compte ? "Mon espace" : "Se connecter"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
