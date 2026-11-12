"use client";

import { useTransition } from "react";
import { choisirSecteur } from "@/lib/duerps/actions";

type Props = {
  duerpId: string;
  secteurId: string;
  nom: string;
  description: string;
  nombreUnites: number;
  nombreRisques: number;
  codesNaf: string[];
  recommande: boolean;
  dejaChoisi: boolean;
};

export function SecteurCard({
  duerpId,
  secteurId,
  nom,
  description,
  nombreUnites,
  nombreRisques,
  codesNaf,
  dejaChoisi,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    // La carte board porte déjà sa surface, son rayon et son ombre : le
    // choix courant se marque par un liseré d'encre en plus, pas par une
    // seconde ombre recopiée en littéral (interdit 26).
    <button
      data-ecriture-inerte
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await choisirSecteur(duerpId, secteurId);
        });
      }}
      className={`carte-board group flex h-full flex-col px-7 py-6 text-left transition-all sm:px-8 ${
        dejaChoisi
          ? "ring-1 ring-[color:var(--board-ink)] ring-offset-2 ring-offset-[color:var(--board-canvas)]"
          : ""
      } ${pending ? "opacity-60" : ""}`}
    >
      <p className="board-surtitre m-0 text-[color:var(--board-slate-soft)]">
        Secteur
      </p>
      <h3 className="board-titre m-0 mt-2.5 text-[22px]">{nom}</h3>
      <p className="m-0 mt-2.5 text-[12.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        {description}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-y-2 border-t border-[color:var(--board-slate-line)] pt-4">
        <dt className="board-surtitre m-0 text-[color:var(--board-slate-soft)]">
          Unités
        </dt>
        <dd className="m-0 text-right text-[13.5px] tabular-nums text-[color:var(--board-ink)]">
          {nombreUnites}
        </dd>
        <dt className="board-surtitre m-0 text-[color:var(--board-slate-soft)]">
          Risques
        </dt>
        <dd className="m-0 text-right text-[13.5px] tabular-nums text-[color:var(--board-ink)]">
          {nombreRisques}
        </dd>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
        {codesNaf.slice(0, 4).map((n) => (
          <span
            key={n}
            className="board-surtitre rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-0.5 tabular-nums text-[color:var(--board-slate-mid)]"
          >
            {n}
          </span>
        ))}
        {codesNaf.length > 4 && (
          <span className="board-surtitre self-center tabular-nums text-[color:var(--board-slate-soft)]">
            +{codesNaf.length - 4}
          </span>
        )}
      </div>

      <span className="board-surtitre mt-6 text-[color:var(--board-ink)] transition-transform group-hover:translate-x-1">
        {pending
          ? "Application…"
          : dejaChoisi
            ? "Confirmer →"
            : "Choisir ce secteur →"}
      </span>
    </button>
  );
}
