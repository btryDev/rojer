"use client";
// S'abonner (ADR-053 § 9, amendé le 2026-11-16) : la formule et le rythme se
// choisissent ici, puis la page sécurisée de Stripe (Checkout) prend la
// carte, la confirmation de la banque, les conditions et l'adresse. Le
// premier paiement est immédiat, et son montant est dit avant le clic.

import { useState } from "react";
import { BoutonEnvoi } from "./BoutonEnvoi";
import { sAbonnerAction } from "@/lib/abonnements/actions";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { euros } from "@/lib/abonnements/affichage";
import { LIBELLE_PERIODICITE, PERIODICITES, type CleFormule, type Periodicite } from "@/lib/abonnements/formules";

export type OffreAffichee = {
  formule: CleFormule;
  libelle: string;
  pourQui: string;
  points: string[];
  prix: Record<Periodicite, { cle: string; centimes: number | null }>;
};

const majuscule = (t: string) => t.replace(/^./, (c) => c.toUpperCase());

export function FormulaireAbonnement({
  offres,
  compteId,
  quand,
  courante = null,
}: {
  offres: OffreAffichee[];
  /** Le compte que montre la page (`ChampCompteAttendu`). */
  compteId: string | null;
  /** Ce qui se passe ensuite, en une phrase (`vueAbonnement`). */
  quand: string;
  /** La formule et le rythme présélectionnés. */
  courante?: { formule: CleFormule; periodicite: Periodicite } | null;
}) {
  const [periodicite, setPeriodicite] = useState<Periodicite>(courante?.periodicite ?? "mensuel");
  const [choisie, setChoisie] = useState<CleFormule>(
    courante && offres.some((o) => o.formule === courante.formule) ? courante.formule : offres[0].formule,
  );
  const prixChoisi = (offres.find((o) => o.formule === choisie) ?? offres[0]).prix[periodicite];
  const preleve = prixChoisi.centimes === null ? null : `${euros(prixChoisi.centimes)} TTC`;
  const premiere = LIBELLE_PERIODICITE[periodicite].premiere;

  return (
    <form action={sAbonnerAction} className="mt-5 flex flex-col gap-6">
      <input type="hidden" name="formule" value={prixChoisi.cle} />
      <ChampCompteAttendu compteId={compteId} />

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 text-[14px] font-semibold">Paiement</legend>
        <div className="inline-flex rounded-full bg-[color:var(--board-slate-pale)] p-1">
          {PERIODICITES.map((p) => (
            <label
              key={p}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${
                periodicite === p ? "bg-[color:var(--board-ink)] text-white" : "text-[color:var(--board-slate-ink)]"
              }`}
            >
              <input
                type="radio"
                // Le nom groupe les boutons (flèches du clavier) ; seul `formule` est lu.
                name="periodicite"
                value={p}
                checked={periodicite === p}
                onChange={() => setPeriodicite(p)}
                className="sr-only"
              />
              {majuscule(LIBELLE_PERIODICITE[p].adjectif)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 text-[14px] font-semibold">Formule</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {offres.map((o) => {
            const prix = o.prix[periodicite].centimes;
            const active = choisie === o.formule;
            return (
              <label
                key={o.formule}
                className={`carte-board flex cursor-pointer flex-col gap-3 px-6 py-5 transition-shadow has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${
                  active ? "shadow-[0_0_0_2px_var(--board-ink)]" : ""
                }`}
              >
                <input
                  type="radio"
                  name="choix-formule"
                  value={o.formule}
                  checked={active}
                  onChange={() => setChoisie(o.formule)}
                  className="sr-only"
                />
                <span className="flex items-baseline justify-between gap-3">
                  <span className="board-titre text-[22px]">{o.libelle}</span>
                  <span className="text-[13px] text-[color:var(--board-slate-mid)]">{o.pourQui}</span>
                </span>
                <span className="text-[15px]">
                  {prix === null ? (
                    <span className="text-[color:var(--board-slate-mid)]">Prix indisponible pour le moment</span>
                  ) : (
                    <>
                      <strong className="text-[20px] tabular-nums">{euros(prix)}</strong> TTC par{" "}
                      {LIBELLE_PERIODICITE[periodicite].unite}
                    </>
                  )}
                </span>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px] leading-[1.45] text-[color:var(--board-slate-ink)]">
                  {o.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="m-0 max-w-[var(--board-mesure)] text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)]">{quand}</p>
      {preleve && (
        <p className="m-0 text-[14.5px] font-semibold">
          Prélevé aujourd&apos;hui : {preleve}, pour {premiere}.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <BoutonEnvoi variant="board" disabled={preleve === null}>
          Continuer vers le paiement
        </BoutonEnvoi>
      </div>
    </form>
  );
}
