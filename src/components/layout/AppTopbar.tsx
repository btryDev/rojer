// Barre haute collante des écrans qui ne portent pas encore leur propre
// bandeau (préparer un contrôle, guide, carnet sanitaire, permis de feu,
// plans de prévention, accessibilité, import DUERP).
//
// Elle était réglée sur le mockup « Tableau de bord V2 » : surface, filet
// et gris de la charte papier, titre de 32 px. Une famille de gris et un
// barème que le board ne connaît pas — or le chrome
// coiffe TOUS les écrans, y compris ceux déjà passés au board. Tant qu'il
// restait papier, un écran board se lisait encadré d'une autre charte.
//
// Le gabarit repris est celui des bandeaux déjà migrés (`BandeauParc`,
// l'annuaire des prestataires) : gouttière du board, surface de carte,
// filet plein, barème de titre de liste.

import Link from "next/link";
import type { ReactNode } from "react";

import { FilAriane, type Crumb } from "@/components/navigation/FilAriane";

export type { Crumb };

export function AppTopbar({
  title,
  subtitle,
  subtitleSegments,
  kicker,
  statut,
  crumbs,
  retour,
  actions,
}: {
  title: string;
  /** Sous-titre en texte libre — fallback quand `subtitleSegments` n'est pas fourni. */
  subtitle?: string;
  /** Segments du sous-titre : chaque entrée est soit une chaîne affichée en
   *  texte, soit un objet `{ pill: string }` rendu en pastille bleue.
   *  Les segments sont séparés par un point médian discret. */
  subtitleSegments?: Array<string | { pill: string }>;
  /** Libellé mono-kicker affiché au-dessus du titre — ex. "Établissements / Boulangerie…". */
  kicker?: string;
  /** Pastille de statut à droite du kicker (ex. « ● Actif »). */
  statut?: { label: string; tone: "ok" | "warn" | "alerte" };
  crumbs?: Crumb[];
  /** D'où l'on vient — la provenance, cf. `src/lib/navigation/provenance.ts`.
   *  Distinct du fil d'Ariane : celui-ci dit où la fiche *vit*, celui-là
   *  d'où l'on *arrive*. Une fiche ouverte depuis le calendrier doit pouvoir
   *  y revenir sans que son arborescence en soit réécrite. */
  retour?: Crumb & { href: string };
  actions?: ReactNode;
}) {
  // Les trois tons des `.pill-v2` reprennent déjà les couples champ/encre
  // des jetons d'état : rien à requalifier ici.
  const toneToPill =
    statut?.tone === "ok"
      ? "pill-v2 pill-v2-green"
      : statut?.tone === "warn"
        ? "pill-v2 pill-v2-amber"
        : "pill-v2 pill-v2-alert";

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
      <div className="min-w-0">
        {kicker || statut ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            {kicker ? (
              <span className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                {kicker}
              </span>
            ) : null}
            {statut ? (
              <span className={toneToPill}>
                <span aria-hidden>●</span>
                {statut.label}
              </span>
            ) : null}
          </div>
        ) : null}

        {retour ? (
          <nav aria-label="Retour" className="mb-1.5">
            <Link
              href={retour.href}
              className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
            >
              ← {retour.label}
            </Link>
          </nav>
        ) : null}

        {crumbs && crumbs.length > 0 ? <FilAriane crumbs={crumbs} /> : null}

        <h1 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">
          {title}
        </h1>

        {subtitleSegments && subtitleSegments.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {subtitleSegments.map((seg, i) => {
              const isPill = typeof seg !== "string";
              return (
                <span key={i} className="flex items-center gap-2.5">
                  {i > 0 ? (
                    <span aria-hidden className="text-[color:var(--board-slate)]">
                      ·
                    </span>
                  ) : null}
                  {isPill ? (
                    <span className="pill-v2 pill-v2-navy-soft">{seg.pill}</span>
                  ) : (
                    <span>{seg}</span>
                  )}
                </span>
              );
            })}
          </div>
        ) : subtitle ? (
          <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}
