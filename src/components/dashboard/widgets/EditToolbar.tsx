"use client";

// Contrôles de mise en page du tableau de bord.
//
// Hors édition : une seule pastille « Personnaliser », rangée à droite
// de sa propre rangée en tête du board. Tout le reste (ajouter,
// réinitialiser, tiroir) n'apparaît qu'une
// fois en mode personnalisation : sur un tableau de bord qu'on consulte
// dix fois par jour et qu'on réorganise deux fois par an, exposer trois
// actions en permanence encombre le bandeau de tête pour rien.
//
// En édition : indicateur + Réinitialiser + Terminer, et le tiroir des
// widgets masqués sous la barre.

import { GripVertical, Plus, RotateCcw, Settings2, X } from "lucide-react";
import { REGISTRY, tailleEnCol, tousLesWidgetIds } from "./registry";
import type { WidgetId } from "./types";

export function EditToolbar({
  enEdition,
  onToggle,
  actif,
  onAjouter,
  onReinitialiser,
}: {
  enEdition: boolean;
  onToggle: () => void;
  actif: Set<WidgetId>;
  onAjouter: (id: WidgetId) => void;
  onReinitialiser: () => void;
}) {
  // Pastille compacte hors édition.
  if (!enEdition) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title="Personnaliser le tableau de bord"
        // Pas sur téléphone (décision 3A du 2026-10-29) : la disposition se
        // règle sur ordinateur, le téléphone montre le board en une colonne.
        className="hidden items-center md:inline-flex gap-1.5 rounded-full border border-[color:rgba(10,10,10,.14)] bg-[color:var(--board-card)]/90 px-3.5 py-2 text-[12.5px] font-medium text-[color:var(--board-ink)] shadow-sm backdrop-blur transition-colors hover:bg-[color:var(--board-card)]"
      >
        <GripVertical aria-hidden className="size-3.5 opacity-60" />
        Personnaliser
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="board-eyebrow inline-flex items-center gap-2 rounded-full bg-[color:var(--board-blue-pale)] px-3.5 py-[7px]">
            <Settings2 aria-hidden className="size-3" />
            Mode personnalisation
          </span>
          <span className="font-mono text-[11.5px] text-[color:var(--board-slate-mid)]">
            {actif.size} widgets actifs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BtnGhost onClick={onReinitialiser} title="Restaurer les widgets par défaut">
            <RotateCcw className="size-3" />
            Réinitialiser
          </BtnGhost>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-full bg-[color:var(--board-ink)] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#262626]"
          >
            <X className="size-3.5" />
            Terminer
          </button>
        </div>
      </div>

      <TiroirMasques actif={actif} onAjouter={onAjouter} />
    </div>
  );
}

function BtnGhost({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-[34px] items-center gap-1.5 rounded-full bg-transparent px-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
    >
      {children}
    </button>
  );
}

function TiroirMasques({
  actif,
  onAjouter,
}: {
  actif: Set<WidgetId>;
  onAjouter: (id: WidgetId) => void;
}) {
  const masques = tousLesWidgetIds().filter((id) => !actif.has(id));

  if (masques.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[color:rgba(10,10,10,.16)] bg-[color:var(--board-card)]/60 px-5 py-4 text-[13px] text-[color:var(--board-slate-mid)]">
        Tous les widgets disponibles sont affichés. Retirez-en pour en
        libérer de la place.
      </div>
    );
  }

  return (
    <section className="rounded-[22px] border border-dashed border-[color:rgba(10,10,10,.16)] bg-[color:var(--board-card)]/60 p-5">
      <p className="board-eyebrow m-0">
        Widgets disponibles · {masques.length}
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {masques.map((id) => {
          const def = REGISTRY[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onAjouter(id)}
                className="group flex w-full items-start gap-3 rounded-[18px] bg-[color:var(--board-card)] px-3.5 py-3 text-left shadow-[0_0_0_1px_rgba(13,18,36,.06),0_10px_24px_-18px_rgba(13,18,36,.25)] transition-colors hover:bg-[color:var(--board-blue-pale)]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)] transition-colors group-hover:bg-[color:var(--board-blue-ink)] group-hover:text-white"
                >
                  <Plus className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
                    {def.titre}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-[1.45] text-[color:var(--board-slate-mid)]">
                    {def.description}
                  </p>
                  <p className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)]">
                    {def.taille} · {tailleEnCol(def.taille)} col.
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
