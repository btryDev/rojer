import Link from "next/link";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";

/**
 * Les onglets d'un écran (2026-10-24) : des liens, l'actif porte
 * `aria-current`. Le patron de la découpe de « Ce qui doit être en place »,
 * partagé par Équipe (Personnes / Formations) et « Ce qui doit être en
 * place » (En permanence / En cas de…).
 *
 * `alerte` : un nombre à signaler sur l'onglet, dans la couleur du retard ;
 * rien n'est affiché à zéro.
 */
export type Onglet = { href: string; label: string; actif: boolean; alerte?: number; libelleAlerte?: string };

export function OngletsPage({ libelle, onglets }: { libelle: string; onglets: readonly Onglet[] }) {
  return (
    <nav aria-label={libelle} className="flex">
      <div className="inline-flex rounded-full bg-[color:var(--board-slate-pale)] p-1">
        {onglets.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            aria-current={o.actif ? "page" : undefined}
            className={
              "inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[13px] font-semibold transition-colors " +
              (o.actif
                ? "bg-[color:var(--board-card)] text-[color:var(--board-ink)] shadow-[0_1px_2px_rgba(13,18,36,.08)]"
                : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
            }
          >
            {o.label}
            {o.alerte !== undefined && o.alerte > 0 && (
              <span
                className="rounded-full px-1.5 text-[11px] tabular-nums"
                style={{ background: CHAMP_ETAT.enRetard, color: ENCRE_ETAT.enRetard }}
                aria-label={o.libelleAlerte}
              >
                {o.alerte}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
