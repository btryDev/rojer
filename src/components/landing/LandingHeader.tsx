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

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
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
  // Le menu du téléphone : sous `md`, les liens et la connexion y vont, la
  // barre ne garde que la marque, le bouton principal et ce bouton.
  const [menuOuvert, setMenuOuvert] = useState(false);
  const idMenu = useId();
  const blanc = surPhoto && !pose && !menuOuvert;
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

  // Échap referme le menu ; passer en largeur `md` aussi (il n'y a plus de
  // bouton pour le fermer).
  useEffect(() => {
    if (!menuOuvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setMenuOuvert(false);
    const mq = window.matchMedia("(min-width: 48rem)");
    const surLargeur = () => mq.matches && setMenuOuvert(false);
    window.addEventListener("keydown", surTouche);
    mq.addEventListener("change", surLargeur);
    return () => {
      window.removeEventListener("keydown", surTouche);
      mq.removeEventListener("change", surLargeur);
    };
  }, [menuOuvert]);

  return (
    // pointer-events : l'enveloppe couvre toute la largeur, mais seule
    // l'îlot doit intercepter les clics — sinon les gouttières de part et
    // d'autre avaleraient ceux destinés à la page.
    <header className="pointer-events-none sticky top-0 z-50 h-[var(--lp-entete)]">
      <div
        className={
          "lp-nav pointer-events-auto absolute inset-x-0 top-0" +
          (pose || menuOuvert ? " lp-nav--ilot" : "") +
          (menuOuvert ? " lp-nav--menu" : "")
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

          <div className="flex items-center gap-2 sm:gap-5">
            {!connecte ? (
              <Link
                href="/login"
                className={lien + " hidden md:inline"}
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
              <form action={signOutAction} className="hidden md:block">
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
                "lp-btn px-3.5 py-[9px] text-[0.8125rem] sm:px-[18px] sm:py-[10px] sm:text-[0.875rem] " +
                (blanc ? "lp-btn-blanc" : "lp-btn-ink")
              }
            >
              {ctaLabel}
            </Link>
            <button
              type="button"
              aria-expanded={menuOuvert}
              aria-controls={idMenu}
              aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMenuOuvert((o) => !o)}
              className={
                "flex size-10 items-center justify-center rounded-full transition-colors md:hidden focus-visible:outline-2 focus-visible:outline-offset-2 " +
                (blanc
                  ? "text-white hover:bg-white/10 focus-visible:outline-white"
                  : "text-[color:var(--board-ink)] hover:bg-[color:var(--board-slate-pale)] focus-visible:outline-[color:var(--board-ink)]")
              }
            >
              {menuOuvert ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
            </button>
          </div>
        </div>

        {/* Le menu du téléphone, déplié sous la barre dans le même îlot. */}
        {menuOuvert ? (
          <nav id={idMenu} aria-label="Menu" className="relative z-[1] border-t border-[rgba(10,10,10,0.06)] pb-3 pt-2 md:hidden">
            <ul className="m-0 flex list-none flex-col p-0">
              {LIENS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setMenuOuvert(false)}
                    className="flex min-h-12 items-center text-[1rem] font-medium text-[color:var(--board-ink)]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                {!connecte ? (
                  <Link href="/login" className="flex min-h-12 items-center text-[1rem] font-medium text-[color:var(--board-ink)]">
                    Se connecter
                  </Link>
                ) : (
                  <form action={signOutAction}>
                    <button type="submit" className="flex min-h-12 w-full items-center text-left text-[1rem] font-medium text-[color:var(--board-ink)]">
                      Déconnexion
                    </button>
                  </form>
                )}
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
