"use client";
// Le menu interne d'un espace du compte (2026-11-17, décisions de la
// propriétaire) : l'abonnement et ses quatre sous-pages, puis le compte
// (Membres, Sécurité) — deux espaces, le même menu. Sur grand écran, une
// carte blanche à gauche — le menu se détache du contenu (retour de test du
// même jour : « pas assez séparés ») —, l'entrée ouverte en creux. Sur
// tablette et téléphone, une rangée de pastilles au-dessus.
//
// Deux `nav` et non une : `carte-board` ne se pose pas sous un préfixe
// `lg:`. Une seule est affichée à la fois, l'autre est masquée (`hidden`).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { SOUS_PAGES_ABONNEMENT } from "@/lib/abonnements/sous-pages";
import { SOUS_PAGES_COMPTE } from "@/lib/compte/sous-pages";

type Entree = { readonly href: string; readonly libelle: string };

const STYLES = {
  carte: {
    nav: "carte-board sticky top-6 hidden flex-col gap-1 p-2.5 lg:flex",
    lien: "rounded-[18px] px-4 py-2.5 text-[14.5px]",
    actif: "bg-[color:var(--board-slate-pale)] font-semibold text-[color:var(--board-ink)]",
    repos: "text-[color:var(--board-slate-ink)] hover:bg-[color:var(--board-slate-pale)]",
  },
  pastilles: {
    // `relative` : la rangée est le repère d'`offsetLeft` (défilement vers l'entrée ouverte).
    nav: "relative -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden",
    lien: "whitespace-nowrap rounded-full px-4 py-2 text-[14px]",
    actif: "bg-[color:var(--board-ink)] font-semibold text-white",
    repos:
      "bg-[color:var(--board-card)] text-[color:var(--board-slate-ink)] shadow-[0_0_0_1px_var(--board-slate-line)] hover:bg-[color:var(--board-slate-pale)]",
  },
} as const;

/** Le menu de l'espace Abonnement. */
export const MenuAbonnement = () => <MenuInterne nom="Abonnement" entrees={SOUS_PAGES_ABONNEMENT} />;

/** Le menu de l'espace Compte : les membres, la sécurité. */
export const MenuCompte = () => <MenuInterne nom="Compte" entrees={SOUS_PAGES_COMPTE} />;

function MenuInterne({ nom, entrees }: { nom: string; entrees: readonly Entree[] }) {
  const chemin = usePathname();
  const pastilles = useRef<HTMLElement>(null);
  // Sur téléphone, la rangée défile : la pastille de la page ouverte est
  // amenée en vue, sans faire bouger la page (contrôle mobile du 2026-11-17 :
  // « Paiement et factures » restait hors de l'écran).
  useEffect(() => {
    const nav = pastilles.current;
    const actif = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && actif) nav.scrollLeft = actif.offsetLeft - (nav.clientWidth - actif.offsetWidth) / 2;
  }, [chemin]);
  return (
    <>
      {(["carte", "pastilles"] as const).map((forme) => {
        const s = STYLES[forme];
        return (
          <nav key={forme} ref={forme === "pastilles" ? pastilles : undefined} aria-label={nom} className={s.nav}>
            {entrees.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                aria-current={chemin === p.href ? "page" : undefined}
                className={`${s.lien} transition-colors ${chemin === p.href ? s.actif : s.repos}`}
              >
                {p.libelle}
              </Link>
            ))}
          </nav>
        );
      })}
    </>
  );
}
