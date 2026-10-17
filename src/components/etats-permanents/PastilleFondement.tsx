"use client";

import { LegalBadge } from "@/components/ui-kit";
import type { FondementLigne } from "@/lib/etats-permanents/fondement";
import {
  CITATION_GN_10,
  GESTE_GN_10,
  MENTION_GN_10,
  MENTION_GN_10_COURTE,
  URL_GN_10,
} from "@/lib/referentiels/conformite/texte-gn10";

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
  // 2026-10-17 (contrôle visuel de c6) : une ligne qui cite GN 10 le DIT
  // sous son article, avec le texte entier au dépli — sur l'écran, le widget
  // et la section des équipements, qui lisent tous ce composant.
  if (fondement.gn10)
    return (
      <div className="flex flex-col items-start gap-1.5">
        <PastillesDeLaLigne fondement={fondement} />
        <MentionGn10 />
      </div>
    );
  return <PastillesDeLaLigne fondement={fondement} />;
}

/**
 * La mention GN 10 : sur la ligne, la phrase COURTE et la pastille ; au
 * dépli, la phrase longue, le verbatim, puis le geste (décision de c6,
 * 2026-10-17). Texte en ardoise moyenne (`--board-slate-mid`), comme les
 * « à confirmer » de la ligne : une information, pas une alerte.
 */
function MentionGn10() {
  return (
    <div className="max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
      <p className="m-0">{MENTION_GN_10_COURTE}</p>
      <div className="mt-1">
        <LegalBadge
          charte="board"
          reference="GN 10"
          href={URL_GN_10}
          avant={<p className="m-0">{MENTION_GN_10}</p>}
          extrait={CITATION_GN_10}
        >
          <p className="m-0">{GESTE_GN_10}</p>
        </LegalBadge>
      </div>
    </div>
  );
}

function PastillesDeLaLigne({ fondement }: { fondement: FondementLigne }) {
  // 2026-10-14 : un article de contexte propre au type de l'établissement
  // (N 20 pour un restaurant des catégories 1 à 4) suit le fondement. Depuis
  // l'ADR-045, un par type déclaré (N 17 et O 18 pour un hôtel-restaurant).
  if (fondement.complement)
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <PastilleSeule fondement={fondement} />
        {fondement.complement.map((c) => (
          <PastilleSeule key={c.reference} fondement={c} />
        ))}
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
