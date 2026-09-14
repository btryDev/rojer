"use client";

// Carte-mois repliable de la liste du calendrier. Le détail d'un mois
// reste ce qu'il était — une carte qu'on déplie — mais l'ouverture n'est
// plus une affaire locale : la règle annuelle vise un mois, et c'est ce
// mois-là qui s'ouvre. L'état vit donc chez le parent (`AnneeCalendrier`)
// et descend ici en propriété.
//
// L'ancre permet à la règle de faire défiler jusqu'à la carte : sans
// elle, un clic sur « décembre » ouvrirait une carte hors écran, et
// l'instrument aurait l'air cassé.

import { ChevronDown } from "lucide-react";

export function SectionMois({
  titre,
  nb,
  nbEnRetard = 0,
  nbSansDate = 0,
  ouvert,
  onToggle,
  ancre,
  children,
}: {
  titre: string;
  nb: number;
  /** Lignes en alerte du mois — affichées sur l'en-tête même replié. */
  nbEnRetard?: number;
  /**
   * Lignes du mois SANS ÉCHÉANCE CONNUE — « à planifier », et retards dont la
   * date n'est qu'une date de génération. La règle annuelle les écarte de ses
   * barres. Sans cette pilule, la carte annoncerait vingt échéances là où
   * l'instrument en compte dix-neuf, et l'écart resterait une énigme. Elle
   * disait « à planifier » et ne comptait que ceux-là : un retard sans date
   * quittait les barres sans entrer dans aucun compte (relecture du lot C).
   */
  nbSansDate?: number;
  ouvert: boolean;
  onToggle: () => void;
  /** `id` HTML de la carte, cible du défilement depuis la règle. */
  ancre: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={ancre}
      // `scroll-mt` : la carte visée s'arrête sous la barre haute
      // collante au lieu de se glisser dessous.
      className="scroll-mt-24 rounded-[30px] bg-[color:var(--board-card)] px-7 py-[26px] shadow-[0_1px_2px_rgba(13,18,36,.04),0_12px_32px_-14px_rgba(13,18,36,.10)] ring-1 ring-[color:rgba(13,18,36,.06)]"
    >
      {/* Le bouton vit DANS le h2 (l'inverse est du HTML invalide — un
          bouton n'accepte que du contenu phrasé) : le plan de titres
          reste propre, et tout l'en-tête est cliquable au clavier. */}
      <h2 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={ouvert}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="board-titre text-[22px] capitalize">{titre}</span>
          <span className="inline-block rounded-full bg-[color:var(--board-blue-pale)] px-[13px] py-[6px] text-[12px] font-semibold text-[color:var(--board-blue-ink)]">
            {nb} ce mois-ci
          </span>
          {nbEnRetard > 0 ? (
            <span className="inline-block rounded-full bg-[color:var(--board-signal)] px-[13px] py-[6px] text-[12px] font-semibold text-[color:var(--board-signal-ink)]">
              {nbEnRetard} en retard
            </span>
          ) : null}
          {nbSansDate > 0 ? (
            <span className="inline-block rounded-full bg-[color:var(--board-slate-pale)] px-[13px] py-[6px] text-[12px] font-semibold text-[color:var(--board-slate-mid)]">
              {nbSansDate} sans date
            </span>
          ) : null}
          <span
            aria-hidden
            className={
              "ml-auto flex size-8 flex-none items-center justify-center rounded-full border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)] transition-transform " +
              (ouvert ? "rotate-180" : "")
            }
          >
            <ChevronDown className="size-4" />
          </span>
        </button>
      </h2>

      {ouvert ? children : null}
    </section>
  );
}
