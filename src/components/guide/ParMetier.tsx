"use client";

// « Les mêmes textes, pas les mêmes obligations » — section pédagogique
// du guide. Elle vient de la page publique, où elle servait de preuve ;
// ici elle sert à comprendre : pourquoi le restaurant d'à côté n'a pas la
// même liste que votre boutique, alors que les deux relèvent des mêmes
// codes.
//
// Elle complète « Chez vous, concrètement » sans la doubler : « Chez
// vous » projette VOS déclarations sur le référentiel, celle-ci montre
// les trois profils types du périmètre. D'où le lien de sortie vers le
// calendrier réel — la liste qui fait foi, c'est celle-là.
//
// Les lignes viennent du référentiel de conformité (ADR-003), pas d'un
// texte de vitrine : intitulé réglementaire, article cité, périodicité.

import Link from "next/link";
import { useRef, useState } from "react";
import type { Metier } from "@/lib/guide/metiers";

export function ParMetier({
  metiers,
  etablissementId,
}: {
  metiers: Metier[];
  etablissementId: string;
}) {
  const [actif, setActif] = useState(0);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);
  const metier = metiers[actif];

  const auClavier = (e: React.KeyboardEvent) => {
    const suivant =
      e.key === "ArrowRight"
        ? (actif + 1) % metiers.length
        : e.key === "ArrowLeft"
          ? (actif - 1 + metiers.length) % metiers.length
          : null;
    if (suivant === null) return;
    e.preventDefault();
    setActif(suivant);
    onglets.current[suivant]?.focus();
  };

  return (
    <section>
      <header className="mb-10 max-w-[58ch]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">§ Par métier</p>
        <h2 className="board-titre text-[clamp(22px,2.2vw,27px)] mt-3">
          Les mêmes textes,{" "}
          <span className="text-[color:var(--board-blue-ink)]">pas les mêmes obligations</span>.
        </h2>
        <p className="mt-4 text-[0.95rem] leading-[1.62] text-[color:var(--board-slate-mid)]">
          Une cuisine, une boutique et un bureau ne relèvent pas des mêmes
          articles. Voici les trois profils types du périmètre — votre liste
          réelle, elle, est celle de votre calendrier.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Choisir une activité"
        onKeyDown={auClavier}
        className="flex flex-wrap gap-2"
      >
        {metiers.map((m, i) => (
          <button
            key={m.id}
            ref={(el) => {
              onglets.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`onglet-${m.id}`}
            aria-selected={i === actif}
            aria-controls={`panneau-${m.id}`}
            tabIndex={i === actif ? 0 : -1}
            onClick={() => setActif(i)}
            className={
              "rounded-full px-4 py-2 text-[0.85rem] font-medium transition-colors " +
              (i === actif
                ? "bg-ink text-paper-elevated"
                : "border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] text-[color:var(--board-slate-mid)] hover:text-foreground")
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)]">
        <p className="border-b border-dashed border-[color:var(--board-slate-line)] px-5 py-4 text-[0.9rem] leading-[1.55] text-foreground sm:px-6">
          {metier.note}
        </p>

        <ol
          role="tabpanel"
          id={`panneau-${metier.id}`}
          aria-labelledby={`onglet-${metier.id}`}
          className="m-0 flex list-none flex-col p-0"
        >
          {metier.lignes.map((l, i) => (
            <li
              key={l.nom + i}
              className="flex items-start gap-4 border-t border-[color:var(--board-slate-line)] px-5 py-4 first:border-t-0 sm:gap-5 sm:px-6"
            >
              <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-full bg-[color:var(--board-slate-pale)] font-mono text-[0.68rem] text-[color:var(--board-slate-mid)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.95rem] font-medium tracking-[-0.015em] text-foreground">
                  {l.nom}
                </p>
                <p className="mt-1 text-[0.85rem] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  {l.libelle}
                </p>
                {l.condition ? (
                  <p className="mt-1 text-[0.8rem] leading-[1.5] text-[color:var(--board-slate-mid)]">
                    {l.condition}
                  </p>
                ) : null}
                {l.reference ? (
                  // Casse d'origine : une référence légale se cite telle
                  // qu'elle s'écrit — « art. MS 38 § 2 », pas en capitales.
                  <p className="mt-1.5 font-mono text-[0.7rem] tracking-[0.02em] text-[color:var(--board-blue-ink)]">
                    {l.reference}
                  </p>
                ) : null}
              </div>
              <span className="mt-1 flex-none font-mono text-[0.7rem] lowercase tracking-[0.04em] text-[color:var(--board-slate-mid)]">
                {l.rythme}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[52ch] font-mono text-[0.62rem] uppercase leading-[1.7] tracking-[0.16em] text-[color:var(--board-slate-mid)]">
          Périodicités indicatives — Rojer les ajuste à vos équipements réels.
        </p>
        <Link
          href={`/etablissements/${etablissementId}/calendrier`}
          className="text-[0.85rem] font-medium text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
        >
          Voir mon calendrier →
        </Link>
      </div>
    </section>
  );
}
