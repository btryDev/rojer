"use client";
// Le menu interne de l'abonnement (2026-11-17, décision de la propriétaire) :
// quatre sous-pages, à gauche sur grand écran, en rangée de pastilles au-dessus
// sur tablette et téléphone. Seul l'abonnement en a un : Membres et Sécurité
// s'ouvrent depuis la gélule, qui est déjà le menu du compte.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SOUS_PAGES_ABONNEMENT } from "@/lib/abonnements/sous-pages";

export function MenuAbonnement() {
  const chemin = usePathname();
  return (
    <nav
      aria-label="Abonnement"
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {SOUS_PAGES_ABONNEMENT.map((p) => {
        const actif = chemin === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={actif ? "page" : undefined}
            className={
              "whitespace-nowrap rounded-full px-4 py-2 text-[14px] transition-colors lg:rounded-[16px] lg:px-3.5 lg:py-2.5 lg:text-[14.5px] " +
              (actif
                ? "bg-[color:var(--board-ink)] font-semibold text-white lg:bg-[color:var(--board-card)] lg:text-[color:var(--board-ink)] lg:shadow-[0_0_0_1px_rgba(13,18,36,0.06),0_1px_2px_rgba(13,18,36,0.04),0_12px_32px_-14px_rgba(13,18,36,0.1)]"
                : "bg-[color:var(--board-card)] text-[color:var(--board-slate-ink)] shadow-[0_0_0_1px_var(--board-slate-line)] hover:bg-[color:var(--board-slate-pale)] lg:bg-transparent lg:shadow-none")
            }
          >
            {p.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
