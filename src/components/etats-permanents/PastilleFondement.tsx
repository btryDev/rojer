"use client";

import { LegalBadge, ReferenceSansLien } from "@/components/ui-kit";
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
    // Fragment : dans une rangée flexible (la ligne de l'écran), la mention
    // passe à la ligne et repart du bord gauche (`basis-full`) ; ailleurs,
    // elle se pose simplement sous la pastille.
    return (
      <>
        <PastillesDeLaLigne fondement={fondement} />
        <div className="mt-1 basis-full">
          <MentionGn10 />
        </div>
      </>
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
    <div className="flex max-w-[var(--board-mesure)] flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
      <p className="m-0">{MENTION_GN_10_COURTE}</p>
      <div>
        <LegalBadge
          charte="board"
          reference="GN 10"
          libelle="GN 10"
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
        {/* Chaque livre de contexte porte sa référence (« N 20 », « O 18 ») :
            plusieurs « Texte » identiques ne se distinguaient pas. */}
        {fondement.complement.map((c) => (
          <PastilleSeule
            key={c.reference}
            fondement={c}
            libelle={c.article ?? c.reference}
          />
        ))}
      </span>
    );
  return <PastilleSeule fondement={fondement} />;
}

function PastilleSeule({
  fondement,
  libelle,
}: {
  fondement: FondementLigne;
  /** Le mot du livre ; « Texte » par défaut. */
  libelle?: string;
}) {
  const { reference, href, extrait } = fondement;
  // Ce que le livre déplie : l'extrait (et la source s'il y en a une), sinon
  // la seule source. Ni l'un ni l'autre : la référence s'écrit en texte.
  const source =
    extrait !== null
      ? { extrait, href: href ?? undefined }
      : href !== null
        ? { href }
        : null;
  if (source)
    return (
      <LegalBadge
        charte="board"
        reference={reference}
        {...source}
        libelle={libelle}
      />
    );
  return <ReferenceSansLien reference={reference} />;
}
