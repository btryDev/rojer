"use client";

import { LegalBadge } from "@/components/ui-kit";
import type { FondementLigne } from "@/lib/etats-permanents/fondement";

/**
 * L'article d'une ligne « Ce qui doit être en place », en pastille.
 *
 * Un seul composant pour l'écran et pour le widget du tableau de bord : la
 * forme de la citation ne se décide qu'ici, et les deux surfaces ne peuvent
 * pas en montrer deux.
 *
 * `LegalBadge` exige une adresse, un extrait ou un enfant — une pastille qui
 * ne déplie rien est un bouton mort. Une référence sans aucun des deux s'écrit
 * donc en texte, comme sur la fiche d'un salarié.
 */
export function PastilleFondement({
  fondement,
}: {
  fondement: FondementLigne;
}) {
  // 2026-10-14 : un article de contexte propre au type de l'établissement
  // (N 20 pour un restaurant des catégories 1 à 4) suit le fondement.
  if (fondement.complement)
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <PastilleSeule fondement={fondement} />
        <PastilleSeule fondement={fondement.complement} />
      </span>
    );
  return <PastilleSeule fondement={fondement} />;
}

function PastilleSeule({ fondement }: { fondement: FondementLigne }) {
  const { reference, href } = fondement;
  if (fondement.extrait !== null)
    return (
      <LegalBadge
        charte="board"
        reference={reference}
        href={href ?? undefined}
        extrait={fondement.extrait}
      />
    );
  if (href !== null)
    return <LegalBadge charte="board" reference={reference} href={href} />;
  return (
    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]">
      {reference}
    </span>
  );
}
