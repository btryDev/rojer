"use client";

// Orchestrateur du tableau de bord configurable.
// Grille bento 6 colonnes + grid-auto-flow dense pour remplir les
// interstices. Drag-and-drop via @dnd-kit — seul le handle GripVertical
// dans l'overlay d'édition est « activable », les autres contrôles ne
// déclenchent pas de drag. Aucun modificateur d'axe n'est appliqué.
// Animation smooth des voisins par CSS.Transform.toString.

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { EditToolbar } from "./EditToolbar";
import { WidgetShell } from "./WidgetShell";
import { REGISTRY, classePortee } from "./registry";
import { useLayoutPerso } from "./useLayoutPerso";
import type { DashboardBundle, WidgetId } from "./types";

export function DashboardGridClient({
  bundle,
  layoutCookie,
  entete,
}: {
  bundle: DashboardBundle;
  /** Valeur du cookie de disposition, lue au serveur (`DashboardGrid`). */
  layoutCookie: string | null;
  /**
   * Un bloc hors registre posé en tête de grille, pleine largeur — le guide
   * de mise en place. Dans la grille et non au-dessus (2026-10-25) : posé
   * à part, il gardait ses propres marges et la rangée « Personnaliser »
   * entre lui et les widgets, et se lisait détaché du board. Ici il prend
   * l'espacement des cartes. Ni déplaçable ni retirable : il disparaît de
   * lui-même quand ses étapes sont faites.
   */
  entete?: React.ReactNode;
}) {
  const {
    layout,
    actif,
    ajouter,
    retirer,
    changerVariant,
    reordonner,
    reinitialiser,
  } = useLayoutPerso(bundle.etablissementId, layoutCookie);

  const [enEdition, setEnEdition] = useState(false);

  // Sensors : pointer avec distance d'activation (évite les drags
  // accidentels sur les clics boutons) + clavier pour a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = layout.items.findIndex((i) => i.widgetId === active.id);
    const newIdx = layout.items.findIndex((i) => i.widgetId === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reordonner(arrayMove(layout.items, oldIdx, newIdx));
  };

  const ids = layout.items.map((i) => i.widgetId as WidgetId);

  const toolbar = (
    <EditToolbar
      enEdition={enEdition}
      onToggle={() => setEnEdition((e) => !e)}
      actif={actif}
      onAjouter={ajouter}
      onReinitialiser={reinitialiser}
    />
  );

  return (
    <div className="flex flex-col">
      {/* Le contrôle occupe sa propre rangée en tête du board : posé en
          flottant il chevauchait le premier widget. Hors édition il se
          range à droite ; en édition il prend la pleine largeur — le
          tiroir « Ajouter un widget » en a besoin. */}
      <div
        className={
          "px-[var(--board-gutter)] pt-6 " +
          (enEdition ? "" : "flex justify-end")
        }
      >
        {toolbar}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-5 px-[var(--board-gutter)] pb-[var(--board-gutter)] pt-3 sm:grid-cols-2 lg:grid-cols-6 [grid-auto-flow:dense]">
            {entete ? <div className="col-span-full">{entete}</div> : null}
            {layout.items.map((item) => {
              const def = REGISTRY[item.widgetId];
              if (!def) return null;
              if (def.visibleQuand && !def.visibleQuand(bundle)) return null;

              const Component = def.Component;
              const portee = classePortee(def.taille);

              return (
                <WidgetShell
                  key={item.widgetId}
                  widgetId={item.widgetId}
                  variant={item.variant}
                  enEdition={enEdition}
                  onRetirer={() => retirer(item.widgetId)}
                  onChangerVariant={(v) => changerVariant(item.widgetId, v)}
                  classePortee={portee}
                >
                  <Component bundle={bundle} variant={item.variant} />
                </WidgetShell>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
