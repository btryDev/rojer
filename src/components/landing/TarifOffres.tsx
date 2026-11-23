"use client";

// Les trois cartes d'offres et la bascule mensuel / annuel. Seul l'état de la
// bascule vit ici ; les offres viennent de `tarif-donnees.ts`.

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CompteLanding } from "./compte";
import { BoutonContact } from "./BoutonContact";
import { SEGMENT, SEGMENTS } from "./segment";
import { enEuros, OFFRES, parMoisSurUnAn, PERIODICITE_DE, type Offre, type Periode } from "./tarif-donnees";
import { formuleDeLookupKey, lookupKey, type CleFormule } from "@/lib/abonnements/formules";
import { lienInscription } from "@/lib/ouverture";

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
        <span className={cn("text-[0.85rem]", t.discret)}>TTC / {periode}</span>
      </p>
      <p className={cn("mt-1 text-[0.8rem]", t.tresDiscret)}>
        {periode === "mois" ? "Sans engagement" : `Soit ≈ ${parMoisSurUnAn(offre.prix.an)} par mois`}
      </p>
    </div>
  );
}

/**
 * Les cartes dans l'application, page Formules de l'abonnement (2026-11-17,
 * décision de la propriétaire : « comme sur la landing ») : mêmes cartes,
 * mais le geste de chaque carte est rendu par la page (s'abonner, changer de
 * formule) et les prix sont ceux de Stripe, qui les facture.
 */
export type CartesDansLApp = {
  /** Le geste de chaque formule et rythme (clé : `lookupKey`) ; absent, la carte n'en propose pas. */
  gestes: Partial<Record<string, ReactNode>>;
  /** Les prix lus chez Stripe, en centimes (clé : `lookupKey`) ; ils priment sur ceux de la page publique. */
  prix: Partial<Record<string, number | null>>;
  /** La formule et le rythme du compte (`lookupKey`) : leur carte porte « Votre formule ». */
  actuelle: string | null;
  /** La formule de l'essai en cours : sa carte porte « Votre formule », quel que soit le rythme. */
  enEssai?: CleFormule | null;
  periodeInitiale: Periode;
};

export function TarifOffres({
  compte,
  app,
}: {
  /** Connecté, le bouton mène au dossier et le dit (« Reprendre mon dossier »), pas l'offre. */
  compte?: CompteLanding;
  app?: CartesDansLApp;
}) {
  const [periode, setPeriode] = useState<Periode>(app?.periodeInitiale ?? "mois");

  return (
    <>
      <div role="group" aria-label="Période de facturation" className={cn(SEGMENTS, "mx-auto mt-9 flex w-max gap-1")}>
        {(["mois", "an"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={periode === p}
            onClick={() => setPeriode(p)}
            className={cn(SEGMENT, "inline-flex items-center gap-2 px-[18px] py-[9px] text-[0.85rem]")}
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

      <div className={cn("grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3", app ? "mt-8" : "mt-14")}>
        {OFFRES.map((o) => {
          const t = TEINTE[o.misEnAvant ? "encre" : "claire"];
          const cle = o.formule ? lookupKey(o.formule, PERIODICITE_DE[periode]) : null;
          // Dans l'app : « Votre formule » à la place des étiquettes de la page
          // publique — l'essai compris : le dirigeant se voit sur sa formule
          // (retour de test du 2026-11-17) ; sa carte dit jusqu'à quand elle
          // est gratuite.
          const badge = app
            ? (app.enEssai && o.formule === app.enEssai) || (cle && cle === app.actuelle)
              ? "Votre formule"
              : undefined
            : o.badge;
          const centimes = app && cle ? app.prix[cle] : undefined;
          const offre = typeof centimes === "number" && o.prix ? { ...o, prix: { ...o.prix, [periode]: centimes / 100 } } : o;
          // Dans l'app, la carte de l'offre du compte (ou de l'essai) est mise
          // en avant, quel que soit le rythme affiché (2026-11-17).
          const sienne =
            !!app && !!o.formule && (o.formule === app.enEssai || o.formule === formuleDeLookupKey(app.actuelle)?.formule);
          return (
            <article
              key={o.nom}
              aria-current={sienne ? "true" : undefined}
              className={cn(
                "flex flex-col gap-[22px] rounded-[26px] px-7 py-[30px]",
                // Sur tablette, deux cartes côte à côte ; « Sur mesure » dessous, en largeur.
                !o.prix && "md:col-span-2 lg:col-span-1",
                t.carte,
                sienne && "outline outline-[3px] outline-offset-4 outline-[color:var(--board-blue-strong)]",
              )}
            >
              <div className="grid gap-1.5">
                <h3 className="lp-titre flex items-center justify-between gap-2.5 text-[1.35rem] text-current">
                  {o.nom}
                  {badge ? (
                    <span className={cn("lp-pill whitespace-nowrap px-[9px] py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em]", t.badge)}>
                      {badge}
                    </span>
                  ) : null}
                </h3>
                <p className={cn("text-[0.9rem]", t.discret)}>{o.pourQui}</p>
              </div>

              <Prix offre={offre} periode={periode} t={t} />

              <ul className="m-0 grid list-none gap-[11px] p-0 text-[0.92rem] leading-[1.45]">
                {o.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <Check aria-hidden size={16} strokeWidth={2.4} className={cn("mt-[3px] flex-none", t.coche)} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {app && o.prix ? (
                cle && app.gestes[cle] ? (
                  <div className="mt-auto">{app.gestes[cle]}</div>
                ) : null
              ) : o.prix ? (
                <Link
                  // Inscriptions fermées (`lib/ouverture.ts`) : /bientot, même
                  // libellé ; un compte connecté garde son dossier.
                  href={
                    compte?.href ??
                    lienInscription(
                      o.formule ? `/signup?offre=${lookupKey(o.formule, PERIODICITE_DE[periode])}` : "/signup",
                    )
                  }
                  className={cn("lp-btn mt-auto justify-center", t.bouton)}
                >
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
