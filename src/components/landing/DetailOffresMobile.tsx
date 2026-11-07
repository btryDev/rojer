"use client";

// Le détail des offres au téléphone : le tableau à cinq colonnes ne tient
// pas sous `md`. Une fenêtre, une offre choisie en haut, ses lignes en
// liste — libellé à gauche, valeur à droite. Sur ordinateur, `Tarif` garde
// le tableau.

import { useState } from "react";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { ChevronRepli, LIEN_REPLI } from "@/components/ui/repli";
import { cn } from "@/lib/utils";
import { COLONNES_GRILLE, INCLUS, NON_INCLUS, NOTE_GRILLE, TON_CASE, type GroupeGrille } from "./tarif-grille";

/** Lue à voix haute, une coche ne dit rien : son sens en toutes lettres. */
const SENS: Record<string, string> = { [INCLUS]: "Inclus", [NON_INCLUS]: "Non inclus" };

export function DetailOffresMobile({ grille }: { grille: GroupeGrille[] }) {
  const [ouvert, setOuvert] = useState(false);
  // Essentiel d'abord : c'est l'offre de l'essai, et la plus demandée.
  const [offre, setOffre] = useState(1);

  return (
    <div className="mt-10 md:hidden">
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={cn(LIEN_REPLI, "mx-auto flex w-max text-[0.92rem] text-[color:var(--board-ink)]")}
      >
        <ChevronRepli />
        Voir le détail des offres
      </button>

      <PanneauModal ouvert={ouvert} surFermer={() => setOuvert(false)} surtitre="Tarif" titre="Le détail des offres">
        {/* Le choix d'offre reste en haut pendant qu'on fait défiler la liste. */}
        <div className="sticky -top-6 z-[1] -mx-5 bg-[color:var(--board-card)] px-5 pb-2 pt-1">
        <div role="group" aria-label="Offre" className="grid grid-cols-4 gap-1 rounded-full bg-[color:var(--board-slate-pale)] p-1">
          {COLONNES_GRILLE.map((c, i) => (
            <button
              key={c.nom}
              type="button"
              aria-pressed={offre === i}
              onClick={() => setOffre(i)}
              className="rounded-full px-1 py-2 text-[0.78rem] font-semibold text-[color:var(--board-slate-mid)] transition-colors aria-pressed:bg-[color:var(--board-card)] aria-pressed:text-[color:var(--board-ink)] aria-pressed:shadow-[0_1px_2px_rgba(13,18,36,0.08),0_0_0_1px_rgba(13,18,36,0.04)]"
            >
              {c.nom}
            </button>
          ))}
        </div>
        </div>
        {"detail" in COLONNES_GRILLE[offre] ? (
          <p className="m-0 text-center text-[0.78rem] text-[color:var(--board-slate-soft)]">
            {(COLONNES_GRILLE[offre] as { detail: string }).detail}
          </p>
        ) : null}

        {grille.map((g) => (
          <section key={g.titre}>
            <h3 className="m-0 rounded-[10px] bg-[color:var(--board-blue-pale)] px-3 py-2 text-[0.78rem] font-semibold text-[color:var(--board-blue-ink)]">
              {g.titre}
            </h3>
            <dl className="m-0 mt-1">
              {g.lignes.map((l) => {
                const v = l.cases[offre];
                return (
                  <div
                    key={l.libelle}
                    className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-pale)] px-1 py-2.5 last:border-b-0"
                  >
                    <dt className="text-[0.86rem] text-[color:var(--board-ink)]">{l.libelle}</dt>
                    <dd className={cn("m-0 flex-none text-right text-[0.86rem]", TON_CASE[v])}>
                      {SENS[v] ? (
                        <>
                          <span aria-hidden>{v}</span>
                          <span className="sr-only">{SENS[v]}</span>
                        </>
                      ) : (
                        v
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}

        <p className="m-0 text-[0.78rem] leading-[1.55] text-[color:var(--board-slate-soft)]">{NOTE_GRILLE}</p>
      </PanneauModal>
    </div>
  );
}
