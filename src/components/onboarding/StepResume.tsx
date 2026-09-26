"use client";

import { PastilleFiche } from "@/components/ui-kit/fiche";
import type { StepProps } from "./types";
import { LABEL_TYPE_ERP } from "@/lib/etablissements/labels";
import type { TYPE_ERP } from "@/lib/etablissements/schema";

/**
 * Étape 3 sur 3 — Résumé.
 * Carte des informations saisies + carte « la suite » qui annonce
 * uniquement ce qui existe réellement après la création (pas de promesse
 * de contenu pré-généré : le calendrier vient des équipements déclarés,
 * le DUERP s'ouvre ensuite, le registre se remplit avec les rapports).
 */
export function StepResume({ state }: StepProps) {
  const typeErpLabel =
    LABEL_TYPE_ERP[state.typeErp as (typeof TYPE_ERP)[number]] ??
    state.typeErp;
  const regimes: string[] = [];
  if (state.estEtablissementTravail) regimes.push("Travail");
  if (state.estERP) {
    const precisions = [
      state.typeErp ? typeErpLabel : null,
      state.categorieErp ? `${state.categorieErp.slice(1)}ᵉ cat.` : null,
    ].filter(Boolean);
    regimes.push(
      precisions.length > 0 ? `ERP · ${precisions.join(" · ")}` : "ERP",
    );
  }
  // Depuis le 2026-09-03, IGH et habitation n'ont plus de précision à
  // afficher : la classe d'IGH et la famille d'habitation ne sont plus
  // demandées, faute d'obligation qui en dépende. Le résumé ne montre donc que
  // le régime lui-même — il ne doit jamais annoncer plus que ce qui a été
  // saisi.
  if (state.estIGH) regimes.push("IGH");
  if (state.estHabitation) regimes.push("Habitation");

  const adresseComplete = [
    state.adresseRue.trim(),
    [state.adresseCodePostal.trim(), state.adresseVille.trim()]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <h2 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">
          Vérification
        </h2>
        <p className="m-0 mt-2.5 max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Tout est bon ? En créant l&apos;espace, on enregistre votre
          établissement. La suite se joue en une étape : déclarer vos
          équipements — ce sont eux qui alimentent votre calendrier de
          vérifications.
        </p>
      </div>

      {/* Ce qui a été saisi */}
      <section className="carte-board px-7 py-6 sm:px-8">
        <div>
          <strong className="board-titre block text-[22px]">
            {state.raisonSociale || "—"}
          </strong>
          {state.siret ? (
            <span className="mt-1.5 block font-mono text-[11.5px] tabular-nums text-[color:var(--board-slate-mid)]">
              SIRET {state.siret}
            </span>
          ) : null}
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <SumLigne label="Adresse" valeur={adresseComplete || "—"} />
          <SumLigne label="Code NAF" valeur={state.codeNaf || "—"} />
          <SumLigne
            label="Travailleurs sur ce site"
            valeur={
              state.effectifSurSite
                ? `${state.effectifSurSite}, apprentis compris`
                : "—"
            }
          />
          <SumLigne
            label="Salariés de l'entreprise"
            valeur={
              state.effectifEntreprise.trim()
                ? `${state.effectifEntreprise}, apprentis non compris`
                : "—"
            }
          />
          <SumLignePills
            label="Régimes"
            pills={regimes.length > 0 ? regimes : ["—"]}
          />
        </dl>
      </section>

      {/* Ce qui existera après la création. Aucune couleur d'état : rien
          n'est encore fait, et le vert du board dirait justement « fait ». */}
      <section className="carte-board px-7 py-6 sm:px-8">
        <div>
          <h3 className="board-titre m-0 text-[22px]">La suite, concrètement</h3>
          <p className="m-0 mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Dès que vous déclarerez vos équipements, le calendrier des
            vérifications se remplira automatiquement.
          </p>
        </div>
        <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0 text-[13.5px] leading-[1.5] text-[color:var(--board-slate-ink)]">
          <ForecastLi>
            Espace entreprise + premier établissement liés
          </ForecastLi>
          <ForecastLi>
            Votre calendrier de vérifications, généré dès la déclaration de
            vos équipements
          </ForecastLi>
          <ForecastLi>
            Votre DUERP, prêt à être ouvert — l&apos;outil vous guide unité
            par unité
          </ForecastLi>
          <ForecastLi>
            Un registre de sécurité qui se remplira au fil des rapports
            déposés
          </ForecastLi>
        </ul>
      </section>
    </div>
  );
}

function SumLigne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="border-t border-[color:var(--board-slate-line)] pt-4">
      <dt className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {label}
      </dt>
      <dd className="m-0 mt-1.5 text-[14px] leading-[1.45] text-[color:var(--board-ink)]">
        {valeur}
      </dd>
    </div>
  );
}

function SumLignePills({
  label,
  pills,
}: {
  label: string;
  pills: string[];
}) {
  return (
    <div className="border-t border-[color:var(--board-slate-line)] pt-4">
      <dt className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {label}
      </dt>
      {/* Les régimes sont des faits déclarés, pas des états : la pastille
          bleue, le registre calme du board — surtout pas le vert, qui dit
          « fait », ni l'ambre, qui appelle une action. */}
      <dd className="m-0 mt-1.5 flex flex-wrap gap-1.5">
        {pills.map((p, i) => (
          <PastilleFiche key={`${p}-${i}`} ton={p === "—" ? "neutre" : "bleu"}>
            {p}
          </PastilleFiche>
        ))}
      </dd>
    </div>
  );
}

function ForecastLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2.5">
      <span
        aria-hidden
        className="inline-block size-1.5 shrink-0 rounded-full bg-[color:var(--board-slate)]"
      />
      {children}
    </li>
  );
}
