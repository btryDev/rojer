"use client";

// Les trois cartes d'offres et la bascule mensuel / annuel. Seul l'état de la
// bascule vit ici ; les offres viennent de `tarif-donnees.ts`.

import Link from "next/link";
import { useState } from "react";
import { lienContact } from "./contact";
import { OFFRES, parMoisSurUnAn, type Periode } from "./tarif-donnees";

function Coche() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] flex-none">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function TarifOffres({ ctaHref }: { ctaHref: string }) {
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
              <span className="rounded-full bg-[color:var(--board-green)] px-[7px] py-[3px] font-mono text-[0.62rem] tracking-[0.06em] text-[color:var(--board-green-ink)]">
                −15 %
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {OFFRES.map((o) => {
          const sombre = o.cle === "pro";
          return (
            <article
              key={o.cle}
              className={
                "flex flex-col gap-[22px] rounded-[26px] px-7 py-[30px] " +
                (sombre
                  ? "bg-[color:var(--board-ink)] text-white shadow-[0_16px_32px_-18px_rgba(13,18,36,0.3),0_56px_90px_-56px_rgba(13,18,36,0.5)]"
                  : "bg-[color:var(--board-canvas)] shadow-[0_0_0_1px_rgba(13,18,36,0.05)]")
              }
            >
              <div className="grid gap-1.5">
                <h3 className="lp-titre flex items-center justify-between gap-2.5 text-[1.35rem] text-current">
                  {o.nom}
                  {o.badge ? (
                    <span
                      className={
                        "whitespace-nowrap rounded-full px-[9px] py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] " +
                        (sombre
                          ? "bg-[color:var(--board-sky)] text-[color:var(--board-ink)]"
                          : "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]")
                      }
                    >
                      {o.badge}
                    </span>
                  ) : null}
                </h3>
                <p className={"text-[0.9rem] " + (sombre ? "text-white/60" : "text-[color:var(--board-slate-mid)]")}>
                  {o.pourQui}
                </p>
              </div>

              <div>
                <p className="flex items-baseline gap-1.5">
                  <span className="lp-titre text-[2.9rem] leading-none tracking-[-0.05em] text-current tabular-nums">
                    {o.prix ? `${o.prix[periode]} €` : "Sur devis"}
                  </span>
                  {o.prix ? (
                    <span className={"text-[0.85rem] " + (sombre ? "text-white/60" : "text-[color:var(--board-slate-mid)]")}>
                      HT / {periode}
                    </span>
                  ) : null}
                </p>
                <p className={"mt-1 min-h-[1.2em] text-[0.8rem] " + (sombre ? "text-white/50" : "text-[color:var(--board-slate-soft)]")}>
                  {!o.prix ? "Au contrat" : periode === "mois" ? "Sans engagement" : `Soit ≈ ${parMoisSurUnAn(o.prix.an)} € par mois`}
                </p>
              </div>

              <ul className="m-0 grid list-none gap-[11px] p-0 text-[0.92rem] leading-[1.45]">
                {o.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span className={sombre ? "text-[color:var(--board-sky)]" : "text-[color:var(--board-blue-ink)]"}>
                      <Coche />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {o.prix ? (
                <Link
                  href={ctaHref}
                  className={"lp-btn mt-auto justify-center " + (sombre ? "lp-btn-blanc" : "lp-btn-ink")}
                >
                  {o.cta}
                </Link>
              ) : (
                <a href={lienContact("Rojer sur mesure")} className="lp-btn lp-btn-clair mt-auto justify-center">
                  {o.cta}
                </a>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
