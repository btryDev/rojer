"use client";
// S'abonner (ADR-053 § 10) : la formule et le rythme se choisissent ici, la
// carte se saisit ensuite sur la page sécurisée de Stripe. Rien n'est prélevé
// avant la fin de l'essai, sauf le paiement immédiat — imposé (`immediat` :
// un document officiel attend, ou un abonnement en pause reprend) ou choisi
// (« Payer maintenant », pendant l'essai : il lève les limites de l'essai).
// Le montant prélevé aujourd'hui est dit avant le clic (audit du 2026-11-16).
// La formule en cours est présélectionnée : un clic sans rien changer ne
// remplace pas Pro par Essentiel.

import Link from "next/link";
import { useState } from "react";
import { CASE_A_COCHER } from "@/components/ui-kit/case-a-cocher";
import { BoutonEnvoi } from "./BoutonEnvoi";
import { sAbonnerAction } from "@/lib/abonnements/actions";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { euros } from "@/lib/abonnements/affichage";
import type { ModeFormulaire } from "@/lib/abonnements/vue-abonnement";
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
  mode,
  libelle,
  quand,
  courante = null,
  proposerPayerMaintenant = false,
}: {
  offres: OffreAffichee[];
  /** Le compte que montre la page (`ChampCompteAttendu`). */
  compteId: string | null;
  /** Ce que fait le bouton principal (`vueAbonnement`). */
  mode: ModeFormulaire;
  /** Le texte du bouton : il dit ce qui se passe au clic. */
  libelle: string;
  /** Ce qui se passe ensuite, en une phrase. */
  quand: string;
  /** La formule et le rythme en cours : présélectionnés. */
  courante?: { formule: CleFormule; periodicite: Periodicite } | null;
  /** « Payer maintenant » à côté du bouton principal (essai en cours). */
  proposerPayerMaintenant?: boolean;
}) {
  // La case des conditions générales, toujours : c'est Stripe relu, pas la
  // copie de la page, qui dit au serveur si elle est exigée (essai, pause).
  // Une copie en retard d'un webhook n'enferme donc personne dans
  // « cochez la case » sans case (revue du 2026-11-16).
  const [accepte, setAccepte] = useState(false);
  const bloque = !accepte;
  const [periodicite, setPeriodicite] = useState<Periodicite>(courante?.periodicite ?? "mensuel");
  const [choisie, setChoisie] = useState<CleFormule>(
    courante && offres.some((o) => o.formule === courante.formule) ? courante.formule : offres[0].formule,
  );
  const prixChoisi = (offres.find((o) => o.formule === choisie) ?? offres[0]).prix[periodicite];
  const inchangee = courante !== null && courante.formule === choisie && courante.periodicite === periodicite;
  const preleve = prixChoisi.centimes === null ? null : `${euros(prixChoisi.centimes)} TTC`;
  const premiere = LIBELLE_PERIODICITE[periodicite].premiere;

  return (
    <form action={sAbonnerAction} className="mt-5 flex flex-col gap-6">
      <input type="hidden" name="formule" value={prixChoisi.cle} />
      {mode === "payer" && <input type="hidden" name="immediat" value="oui" />}
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
      {mode === "payer" && preleve && (
        <p className="m-0 text-[14.5px] font-semibold">
          Prélevé aujourd&apos;hui : {preleve}, pour {premiere}.
        </p>
      )}
      {/* Jamais cochée d'avance ; le serveur refuse sans elle (`sAbonnerAction`). */}
      <label className="flex max-w-[var(--board-mesure)] items-start gap-3 text-[14px] leading-[1.5]">
        <input
          type="checkbox"
          name="accepte"
          value="oui"
          checked={accepte}
          onChange={(e) => setAccepte(e.target.checked)}
          className={CASE_A_COCHER}
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/conditions" target="_blank" className="underline underline-offset-4">
            conditions générales
          </Link>{" "}
          (s&apos;ouvrent dans un nouvel onglet).
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <BoutonEnvoi variant="board" disabled={preleve === null || bloque || (mode === "changer" && inchangee)}>
          {libelle}
        </BoutonEnvoi>
        {proposerPayerMaintenant && (
          <BoutonEnvoi variant="boardClair" name="immediat" value="oui" disabled={preleve === null || bloque} describedBy="payer-maintenant">
            Payer maintenant
          </BoutonEnvoi>
        )}
      </div>
      {proposerPayerMaintenant && preleve && (
        <p id="payer-maintenant" className="m-0 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Payer maintenant lève les limites de l&apos;essai : {preleve} prélevés aussitôt pour {premiere}.
        </p>
      )}
    </form>
  );
}
