"use client";
// Le menu interne de l'abonnement (2026-11-17, décision de la propriétaire) :
// quatre sous-pages. Sur grand écran, une carte blanche à gauche — le menu se
// détache du contenu (retour de test du même jour : « pas assez séparés ») —,
// l'entrée ouverte en creux. Sur tablette et téléphone, une rangée de
// pastilles au-dessus. Seul l'abonnement en a un : Membres et Sécurité
// s'ouvrent depuis la gélule, qui est déjà le menu du compte.
//
// Deux `nav` et non une : `carte-board` ne se pose pas sous un préfixe
// `lg:`. Une seule est affichée à la fois, l'autre est masquée (`hidden`).

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SOUS_PAGES_ABONNEMENT } from "@/lib/abonnements/sous-pages";

const STYLES = {
  carte: {
    nav: "carte-board sticky top-6 hidden flex-col gap-1 p-2.5 lg:flex",
    lien: "rounded-[18px] px-4 py-2.5 text-[14.5px]",
    actif: "bg-[color:var(--board-slate-pale)] font-semibold text-[color:var(--board-ink)]",
    repos: "text-[color:var(--board-slate-ink)] hover:bg-[color:var(--board-slate-pale)]",
  },
  pastilles: {
    nav: "-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden",
    lien: "whitespace-nowrap rounded-full px-4 py-2 text-[14px]",
    actif: "bg-[color:var(--board-ink)] font-semibold text-white",
    repos:
      "bg-[color:var(--board-card)] text-[color:var(--board-slate-ink)] shadow-[0_0_0_1px_var(--board-slate-line)] hover:bg-[color:var(--board-slate-pale)]",
  },
} as const;

export function MenuAbonnement() {
  const chemin = usePathname();
  return (
    <>
      {(["carte", "pastilles"] as const).map((forme) => {
        const s = STYLES[forme];
        return (
          <nav key={forme} aria-label="Abonnement" className={s.nav}>
            {SOUS_PAGES_ABONNEMENT.map((p) => (
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
