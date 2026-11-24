"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { NavLink } from "@/components/layout/entrees-navigation";
import { LABEL_ITEM, type SidebarItemId } from "@/components/layout/sidebar-nav";
import { useOrigine } from "@/components/navigation/LienProvenance";
import { cheminAssistance } from "@/lib/assistance/libelles";
import { avecProvenance } from "@/lib/navigation/provenance";

/**
 * L'entrée permanente de l'assistance, au pied du rail et des feuilles du
 * téléphone (décision de la propriétaire du 2026-10-24). [2026-11-24, ADR-050
 * amendée : une page, la même pour toutes les formules, au lieu du panneau
 * « Aide ».] Elle emporte l'écran d'où l'on vient (la provenance du dépôt,
 * `?de=`) : un problème technique se signale avec l'écran où il est né.
 *
 * La tuile garde la forme de l'ancienne « Aide », un geste à part des axes
 * du rail ; la ligne de feuille est une entrée de navigation comme les autres.
 */
export function LienAssistance({
  variante,
  etablissementId,
  actif,
  auChoix,
}: {
  variante: "rail" | "feuille";
  etablissementId: string;
  /** L'entrée active de la navigation (`deduireActif`) : « assistance » allume la tuile. */
  actif: SidebarItemId | null;
  /** Referme le panneau ou la feuille ouverts. */
  auChoix?: () => void;
}) {
  const href = avecProvenance(cheminAssistance(etablissementId), useOrigine());

  if (variante === "feuille") {
    return (
      <NavLink
        item={{ id: "assistance", label: LABEL_ITEM.assistance, href, Icon: LifeBuoy }}
        actif={actif}
        auChoix={auChoix}
      />
    );
  }

  const surPage = actif === "assistance";
  return (
    <Link
      href={href}
      // L'adresse change à chaque écran (sa provenance) : pas de préchargement
      // d'une page rarement ouverte à chaque navigation (revue du 2026-11-24).
      prefetch={false}
      onClick={(e) => {
        // Comme `NavLink` : un clic qui ouvre un nouvel onglet laisse le
        // panneau ouvert.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        auChoix?.();
      }}
      aria-current={surPage ? "page" : undefined}
      className="group flex w-full flex-col items-center gap-1.5 rounded-xl py-2 transition-colors hover:bg-white/10"
    >
      <span
        className={
          "grid size-9 place-items-center rounded-xl transition-colors " +
          (surPage ? "bg-white text-[color:var(--board-ink)]" : "bg-white/[0.06] text-white/70 group-hover:text-white")
        }
      >
        <LifeBuoy aria-hidden className="size-[18px]" />
      </span>
      <span
        className={
          "text-[10.5px] font-semibold leading-none " + (surPage ? "text-white" : "text-white/70 group-hover:text-white")
        }
      >
        {LABEL_ITEM.assistance}
      </span>
    </Link>
  );
}
