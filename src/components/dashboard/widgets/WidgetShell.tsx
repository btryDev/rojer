"use client";

// Enveloppe d'un widget en mode édition.
// Hors édition : transparent, laisse passer le rendu d'origine.
// En édition : ring dashed + bandeau flottant (drag handle · retirer ·
// variant). Le drag-handle est le seul moyen de déplacer — les autres
// boutons ne déclenchent PAS de drag (pointerDown s'arrête là).

import { useState } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Shuffle, X } from "lucide-react";
import { categorieDeItem } from "@/components/layout/sidebar-nav";
import { REGISTRY } from "./registry";
import { FournisseurSectionDuWidget } from "./section-du-widget";
import type { WidgetId } from "./types";

export function WidgetShell({
  widgetId,
  variant,
  enEdition,
  onRetirer,
  onChangerVariant,
  classePortee,
  children,
}: {
  widgetId: WidgetId;
  variant: string;
  enEdition: boolean;
  onRetirer: () => void;
  onChangerVariant: (variant: string) => void;
  classePortee: string;
  children: React.ReactNode;
}) {
  const def = REGISTRY[widgetId];
  const aVariants = def.variants.length > 1;
  // Un widget obligatoire est épinglé : ni retirable, ni déplaçable —
  // sa position est recalculée par `epingler` (useLayoutPerso).
  const epingle = Boolean(def.obligatoire);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widgetId,
    disabled: !enEdition || epingle,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        // La portée vient d'une classe et non du style inline : elle change
        // au point de rupture (cf. `classePortee`), et un style inline
        // gagnerait sur la règle CSS.
        "@container relative " +
        classePortee +
        " " +
        (enEdition
          ? "rounded-[30px] ring-1 ring-dashed ring-[color:var(--board-blue-strong)]/60 ring-offset-4 ring-offset-[color:var(--board-canvas)]"
          : "")
      }
    >
      <FournisseurSectionDuWidget value={categorieDeItem(def.page)}>
        {children}
      </FournisseurSectionDuWidget>

      {enEdition ? (
        <ShellOverlay
          titre={def.titre}
          variant={variant}
          variants={def.variants}
          aVariants={aVariants}
          onRetirer={onRetirer}
          retirable={!epingle}
          deplacable={!epingle}
          onChangerVariant={onChangerVariant}
          dragAttributes={attributes}
          dragListeners={listeners}
          setDragActivator={setActivatorNodeRef}
        />
      ) : null}
    </div>
  );
}

type DragActivator = (element: HTMLElement | null) => void;

function ShellOverlay({
  titre,
  variant,
  variants,
  aVariants,
  onRetirer,
  retirable,
  deplacable,
  onChangerVariant,
  dragAttributes,
  dragListeners,
  setDragActivator,
}: {
  titre: string;
  variant: string;
  variants: readonly { id: string; label: string }[];
  aVariants: boolean;
  onRetirer: () => void;
  retirable: boolean;
  deplacable: boolean;
  onChangerVariant: (variant: string) => void;
  dragAttributes: DraggableAttributes;
  dragListeners: SyntheticListenerMap | undefined;
  setDragActivator: DragActivator;
}) {
  const [ouvertVariants, setOuvertVariants] = useState(false);

  return (
    <>
      <div className="absolute -right-2 -top-2 z-10 flex items-center gap-1 rounded-full bg-[color:var(--board-card)] px-1.5 py-1 shadow-[0_0_0_1px_rgba(13,18,36,.08),0_6px_18px_-10px_rgba(13,18,36,.35)]">
        {deplacable ? (
          <button
            ref={setDragActivator}
            type="button"
            title="Glisser pour déplacer"
            aria-label={`Déplacer ${titre}`}
            {...dragAttributes}
            {...dragListeners}
            className="flex size-6 cursor-grab items-center justify-center rounded-full text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)] active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : null}
        <span className="truncate px-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
          {titre}
        </span>
        {aVariants ? (
          <BoutonCtrl
            onClick={() => setOuvertVariants((v) => !v)}
            titre="Changer de visualisation"
            actif={ouvertVariants}
          >
            <Shuffle className="size-3" />
          </BoutonCtrl>
        ) : null}
        {retirable ? (
          <BoutonCtrl
            onClick={onRetirer}
            titre="Retirer du tableau de bord"
            variant="destructive"
          >
            <X className="size-3" />
          </BoutonCtrl>
        ) : (
          <span
            title="Widget épinglé"
            aria-label="Widget épinglé : toujours affiché, ni retirable ni déplaçable"
            className="flex size-6 items-center justify-center rounded-full font-mono text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--board-slate-soft)]"
          >
            §
          </span>
        )}
      </div>

      {aVariants && ouvertVariants ? (
        <div className="absolute right-0 top-8 z-20 min-w-[180px] rounded-[18px] bg-[color:var(--board-card)] p-2 shadow-[0_0_0_1px_rgba(13,18,36,.08),0_18px_40px_-20px_rgba(13,18,36,.35)]">
          <p className="px-2 pb-1.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Visualisation
          </p>
          {variants.map((v) => {
            const actif = v.id === variant;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChangerVariant(v.id);
                  setOuvertVariants(false);
                }}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-[0.82rem] transition-colors " +
                  (actif
                    ? "bg-[color:var(--board-blue-pale)] font-semibold text-[color:var(--board-blue-ink)]"
                    : "text-[color:var(--board-slate-ink)] hover:bg-[color:var(--board-slate-pale)]")
                }
              >
                {v.label}
                {actif ? <Check className="size-3.5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function BoutonCtrl({
  children,
  onClick,
  titre,
  variant,
  actif,
}: {
  children: React.ReactNode;
  onClick: () => void;
  titre: string;
  variant?: "destructive";
  actif?: boolean;
}) {
  const classes =
    "flex size-6 items-center justify-center rounded-full transition-colors " +
    (variant === "destructive"
      ? "text-[color:var(--board-signal-ink)] hover:bg-[color:var(--board-signal-pale)]"
      : actif
        ? "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
        : "text-[color:var(--board-slate-mid)] hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]");
  return (
    <button
      type="button"
      onClick={onClick}
      title={titre}
      aria-label={titre}
      className={classes}
    >
      {children}
    </button>
  );
}
