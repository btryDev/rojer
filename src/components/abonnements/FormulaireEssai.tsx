"use client";
// Le choix de la formule et l'acceptation des conditions (ADR-053 § 8). La
// case n'est jamais cochée d'avance ; le bouton ne part qu'avec elle.

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { demarrerEssaiAction } from "@/lib/abonnements/actions";
import type { CleFormule, Periodicite } from "@/lib/abonnements/formules";

export type OffreAffichee = {
  formule: CleFormule;
  libelle: string;
  pourQui: string;
  points: string[];
  prix: Record<Periodicite, { cle: string; centimes: number | null }>;
};

const euros = (centimes: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(centimes / 100);

export function FormulaireEssai({ offres }: { offres: OffreAffichee[] }) {
  const [etat, envoyer, enCours] = useActionState(demarrerEssaiAction, { status: "idle" });
  const [periodicite, setPeriodicite] = useState<Periodicite>("mensuel");
  const [choisie, setChoisie] = useState<CleFormule>(offres[0].formule);
  const [accepte, setAccepte] = useState(false);
  const cle = offres.find((o) => o.formule === choisie)!.prix[periodicite].cle;
  const prixManquent = offres.some((o) => o.prix[periodicite].centimes === null);

  return (
    <form action={envoyer} className="mt-10 flex flex-col gap-8">
      <input type="hidden" name="formule" value={cle} />

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 text-[14px] font-semibold">Facturation après l&apos;essai</legend>
        <div className="inline-flex rounded-full bg-[color:var(--board-slate-pale)] p-1" role="radiogroup">
          {(["mensuel", "annuel"] as const).map((p) => (
            <label
              key={p}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${
                periodicite === p ? "bg-[color:var(--board-ink)] text-white" : "text-[color:var(--board-slate-ink)]"
              }`}
            >
              <input
                type="radio"
                name="periodicite"
                value={p}
                checked={periodicite === p}
                onChange={() => setPeriodicite(p)}
                className="sr-only"
              />
              {p === "mensuel" ? "Mensuelle" : "Annuelle"}
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
                      <strong className="text-[20px] tabular-nums">{euros(prix)}</strong> HT par{" "}
                      {periodicite === "mensuel" ? "mois" : "an"}
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

      <section className="max-w-[var(--board-mesure)]" aria-labelledby="titre-fin-essai">
        <h2 id="titre-fin-essai" className="m-0 text-[14px] font-semibold">
          À la fin de l&apos;essai
        </h2>
        <p className="m-0 mt-2 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Rien n&apos;est prélevé si vous n&apos;avez pas ajouté de carte. Pour continuer, vous l&apos;ajoutez depuis
          la page Abonnement de votre compte. Sans abonnement, vos dossiers restent consultables et exportables ;
          seule la saisie s&apos;arrête.
        </p>
      </section>

      <div className="flex flex-col gap-4">
        <label className="flex max-w-[var(--board-mesure)] items-start gap-3 text-[14px] leading-[1.5]">
          <input
            type="checkbox"
            name="accepte"
            value="oui"
            checked={accepte}
            onChange={(e) => setAccepte(e.target.checked)}
            className="mt-1 size-4 flex-none accent-[color:var(--board-ink)]"
          />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions" target="_blank" className="underline underline-offset-4">
              conditions générales
            </Link>{" "}
            (s&apos;ouvrent dans un nouvel onglet).
          </span>
        </label>
        {etat.status === "error" && (
          <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {etat.message}
          </p>
        )}
        {prixManquent && (
          <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
            Les prix ne sont pas disponibles pour le moment : réessayez dans quelques minutes.
          </p>
        )}
        <div>
          <Button type="submit" variant="board" size="board" disabled={!accepte || enCours || prixManquent}>
            {enCours ? "Démarrage de l'essai…" : "Démarrer mon essai"}
          </Button>
        </div>
      </div>
    </form>
  );
}
