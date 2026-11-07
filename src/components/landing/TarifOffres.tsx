"use client";

// Les trois cartes d'offres et la bascule mensuel / annuel. Seul l'état de la
// bascule vit ici ; les offres viennent de `tarif-donnees.ts`.

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CompteLanding } from "./compte";
import { BoutonContact } from "./BoutonContact";
import { enEuros, OFFRES, parMoisSurUnAn, type Offre, type Periode } from "./tarif-donnees";

/** Les deux teintes d'une carte : claire, ou d'encre pour l'offre mise en avant. */
const TEINTE = {
  claire: {
    carte: "bg-[color:var(--board-canvas)] shadow-[0_0_0_1px_rgba(13,18,36,0.05)]",
    badge: "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]",
    discret: "text-[color:var(--board-slate-mid)]",
    tresDiscret: "text-[color:var(--board-slate-soft)]",
    coche: "text-[color:var(--board-blue-ink)]",
    bouton: "lp-btn-ink",
  },
  encre: {
    carte: "lp-fiche-carte lp-fiche-carte-encre",
    badge: "bg-[color:var(--board-sky)] text-[color:var(--board-ink)]",
    discret: "text-white/60",
    tresDiscret: "text-white/50",
    coche: "text-[color:var(--board-sky)]",
    bouton: "lp-btn-blanc",
  },
};

function Prix({ offre, periode, t }: { offre: Offre; periode: Periode; t: (typeof TEINTE)["claire"] }) {
  if (!offre.prix)
    return (
      <div>
        <p className="lp-titre text-[2.9rem] leading-none tracking-[-0.05em] text-current">Sur devis</p>
        <p className={cn("mt-1 text-[0.8rem]", t.tresDiscret)}>Au contrat</p>
      </div>
    );
  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className="lp-titre text-[2.9rem] leading-none tracking-[-0.05em] text-current tabular-nums">
          {enEuros(offre.prix[periode])}
        </span>
        <span className={cn("text-[0.85rem]", t.discret)}>HT / {periode}</span>
      </p>
      <p className={cn("mt-1 text-[0.8rem]", t.tresDiscret)}>
        {periode === "mois" ? "Sans engagement" : `Soit ≈ ${parMoisSurUnAn(offre.prix.an)} par mois`}
      </p>
    </div>
  );
}

export function TarifOffres({
  compte,
}: {
  /** Connecté, le bouton mène au dossier et le dit (« Reprendre mon dossier »), pas l'offre. */
  compte?: CompteLanding;
}) {
  const [periode, setPeriode] = useState<Periode>("mois");

  return (
    <>
      <div role="group" aria-label="Période de facturation" className="mx-auto mt-9 flex w-max gap-1 rounded-full bg-[color:var(--board-slate-pale)] p-1">
        {(["mois", "an"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={periode === p}
            onClick={() => setPeriode(p)}
            className="inline-flex items-center gap-2 rounded-full px-[18px] py-[9px] text-[0.85rem] font-semibold text-[color:var(--board-slate-mid)] transition-colors aria-pressed:bg-[color:var(--board-card)] aria-pressed:text-[color:var(--board-ink)] aria-pressed:shadow-[0_1px_2px_rgba(13,18,36,0.08),0_0_0_1px_rgba(13,18,36,0.04)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-ink)]"
          >
            {p === "mois" ? "Mensuel" : "Annuel"}
            {p === "an" ? (
              <span className="lp-pill bg-[color:var(--board-green)] px-[7px] py-[3px] font-mono text-[0.62rem] tracking-[0.06em] text-[color:var(--board-green-ink)]">
                −15&nbsp;%
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {OFFRES.map((o) => {
          const t = TEINTE[o.misEnAvant ? "encre" : "claire"];
          return (
            <article
              key={o.nom}
              className={cn(
                "flex flex-col gap-[22px] rounded-[26px] px-7 py-[30px]",
                // Sur tablette, deux cartes côte à côte ; « Sur mesure » dessous, en largeur.
                !o.prix && "md:col-span-2 lg:col-span-1",
                t.carte,
              )}
            >
              <div className="grid gap-1.5">
                <h3 className="lp-titre flex items-center justify-between gap-2.5 text-[1.35rem] text-current">
                  {o.nom}
                  {o.badge ? (
                    <span className={cn("lp-pill whitespace-nowrap px-[9px] py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em]", t.badge)}>
                      {o.badge}
                    </span>
                  ) : null}
                </h3>
                <p className={cn("text-[0.9rem]", t.discret)}>{o.pourQui}</p>
              </div>

              <Prix offre={o} periode={periode} t={t} />

              <ul className="m-0 grid list-none gap-[11px] p-0 text-[0.92rem] leading-[1.45]">
                {o.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <Check aria-hidden size={16} strokeWidth={2.4} className={cn("mt-[3px] flex-none", t.coche)} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {o.prix ? (
                <Link href={compte?.href ?? "/signup"} className={cn("lp-btn mt-auto justify-center", t.bouton)}>
                  {compte?.label ?? o.cta}
                </Link>
              ) : (
                <BoutonContact sujet="Rojer sur mesure" className="lp-btn-clair mt-auto justify-center">
                  {o.cta}
                </BoutonContact>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
