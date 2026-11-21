import Link from "next/link";
import type { ReactNode } from "react";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";

/**
 * Les onglets d'un écran (2026-10-24) : des liens, l'actif porte
 * `aria-current`. Le patron de la découpe de « Ce qui doit être en place »,
 * partagé par Équipe (Personnes / Formations) et « Ce qui doit être en
 * place » (En permanence / En cas de…).
 *
 * `alerte` : un nombre à signaler sur l'onglet, dans la couleur du retard ;
 * rien n'est affiché à zéro. `tonAlerte: "proche"` (2026-11-21, fiche du
 * plan de prévention) : un geste attendu qui n'est pas un retard, en ambre.
 *
 * `variante: "soulignee"` (2026-11-21, fiche du plan, maquette « Switch A »
 * choisie par la propriétaire) : des intercalaires posés en haut d'une carte
 * — un trait sous l'onglet actif, une ligne sous la rangée —, avec à droite
 * ce que la carte propose (`droite`). Rôles `tablist` / `tab`, l'actif
 * `aria-selected` ; chaque onglet reste un lien, atteint au clavier par
 * Tabulation. L'appelant pose la carte autour, et le panneau (`idPanneau`).
 */
export type Onglet = {
  href: string;
  label: string;
  actif: boolean;
  alerte?: number;
  libelleAlerte?: string;
  tonAlerte?: "enRetard" | "proche";
};

function Alerte({ o }: { o: Onglet }) {
  if (o.alerte === undefined || o.alerte <= 0) return null;
  return (
    <span
      className="rounded-full px-1.5 text-[11px] tabular-nums"
      style={{ background: CHAMP_ETAT[o.tonAlerte ?? "enRetard"], color: ENCRE_ETAT[o.tonAlerte ?? "enRetard"] }}
      aria-label={o.libelleAlerte}
    >
      {o.alerte}
    </span>
  );
}

export function OngletsPage({
  libelle,
  onglets,
  variante = "pilules",
  droite,
  idPanneau,
}: {
  libelle: string;
  onglets: readonly Onglet[];
  variante?: "pilules" | "soulignee";
  /** Variante soulignée : à droite de la rangée (« Télécharger le PDF »). */
  droite?: ReactNode;
  /** Variante soulignée : l'identifiant du panneau que les onglets commandent. */
  idPanneau?: string;
}) {
  if (variante === "soulignee") {
    return (
      <div className="flex flex-wrap items-end gap-x-7 gap-y-2 border-b border-[color:var(--board-slate-line)] px-6 md:px-9">
        <div role="tablist" aria-label={libelle} className="flex gap-7">
          {onglets.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              role="tab"
              aria-selected={o.actif}
              aria-controls={idPanneau}
              scroll={false}
              className={
                "-mb-px inline-flex items-center gap-2 border-b-[3px] pb-3.5 pt-5 font-display text-[17px] font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)] " +
                (o.actif
                  ? "border-[color:var(--board-ink)] text-[color:var(--board-ink)]"
                  : "border-transparent text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
              }
            >
              {o.label}
              <Alerte o={o} />
            </Link>
          ))}
        </div>
        {/* Sur téléphone, sous les onglets, sur toute la largeur ; à droite
            sur la même ligne au-delà (2026-11-21). */}
        {droite && (
          <div className="flex w-full flex-wrap items-center gap-2 pb-3.5 md:ml-auto md:w-auto md:justify-end">{droite}</div>
        )}
      </div>
    );
  }
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
            <Alerte o={o} />
          </Link>
        ))}
      </div>
    </nav>
  );
}
