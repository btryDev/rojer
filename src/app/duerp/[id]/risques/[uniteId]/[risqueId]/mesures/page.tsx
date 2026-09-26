import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { AjouterMesureCustomForm } from "@/components/duerps/AjouterMesureCustomForm";
import { EvaluationProgression } from "@/components/duerps/EvaluationProgression";
import { MesureReferentielToggle } from "@/components/duerps/MesureReferentielToggle";
import { MesureRow } from "@/components/duerps/MesureRow";
import { mesuresUniquementBasNiveau, trierParHierarchie } from "@/lib/prevention";
import { tousRisquesConnus } from "@/lib/referentiels";
import { getRisque } from "@/lib/risques/queries";
import type { TypeMesure } from "@/lib/referentiels/types";
import { L4121_2_8, ORDRE_SELON_L4121_2 } from "@/lib/verbatim/l4121-2-ordre";

export default async function MesuresPage({
  params,
}: {
  params: Promise<{ id: string; uniteId: string; risqueId: string }>;
}) {
  const { id, uniteId, risqueId } = await params;
  const risque = await getRisque(risqueId);
  if (
    !risque ||
    risque.uniteId !== uniteId ||
    risque.unite.duerpId !== id
  ) {
    notFound();
  }

  const mesuresRef = risque.referentielId
    ? tousRisquesConnus().get(risque.referentielId)?.mesuresRecommandees ?? []
    : [];
  const idsSelectionnes = new Set(
    risque.mesures
      .map((m) => m.referentielMesureId)
      .filter((x): x is string => Boolean(x)),
  );
  const mesuresRefNonSelectionnees = mesuresRef.filter(
    (m) => !idsSelectionnes.has(m.id),
  );

  const typesRetenus = risque.mesures.map((m) => m.type as TypeMesure);
  const alerteBasNiveau = mesuresUniquementBasNiveau(typesRetenus);

  const mesuresAffichees = trierParHierarchie(
    risque.mesures.map((m) => ({ ...m, type: m.type as TypeMesure })),
  );

  const hrefUnite = `/duerp/${id}/risques/${uniteId}`;
  const hrefCotation = `/duerp/${id}/risques/${uniteId}/${risqueId}`;
  const hrefMesures = `/duerp/${id}/risques/${uniteId}/${risqueId}/mesures`;
  const risquesUnite = risque.unite.risques;
  const idxCourant = risquesUnite.findIndex((r) => r.id === risqueId);
  const suivant = risquesUnite.slice(idxCourant + 1)[0];
  const hrefSuivant = suivant
    ? `/duerp/${id}/risques/${uniteId}/${suivant.id}`
    : undefined;

  return (
    <div className="flex flex-col gap-[22px]">
      <nav>
        <Link
          href={hrefUnite}
          className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          ← {risque.unite.nom}
        </Link>
      </nav>

      <header className="max-w-[68ch]">
        <div className="board-eyebrow flex flex-wrap items-baseline gap-2 text-[10.5px] tracking-[0.18em]">
          <span className="text-[color:var(--board-ink)]">
            Évaluation du risque
          </span>
          <span aria-hidden className="text-[color:var(--board-slate)]">
            ·
          </span>
          <span className="tabular-nums text-[color:var(--board-slate-soft)]">
            {String(idxCourant + 1).padStart(2, "0")}
            <span className="mx-1 text-[color:var(--board-slate)]">/</span>
            {String(risquesUnite.length).padStart(2, "0")}
          </span>
        </div>
        <h2 className="board-titre m-0 mt-3 text-[clamp(23px,2.1vw,30px)]">
          {risque.libelle}
        </h2>
        <p className="board-eyebrow m-0 mt-3 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          Criticité cotée{" "}
          <span className="tabular-nums text-[color:var(--board-ink)]">
            {String(risque.criticite).padStart(2, "0")} / 16
          </span>
          <span className="mx-2 text-[color:var(--board-slate)]">·</span>
          <Link
            href={hrefCotation}
            className="text-[12.5px] font-medium normal-case tracking-normal text-[color:var(--board-blue-ink)] [font-family:var(--font-body)] hover:underline"
          >
            revoir la cotation
          </Link>
        </p>
      </header>

      <EvaluationProgression
        etape="mesures"
        cotationSaisie={risque.cotationSaisie}
        nombreMesures={risque.mesures.length}
        hrefCotation={hrefCotation}
        hrefMesures={hrefMesures}
      />

      <section aria-labelledby="partie-mesures" className="flex flex-col gap-[22px] pt-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-[18px] font-semibold tabular-nums text-[color:var(--board-blue-ink)]">
            02
          </span>
          <h3
            id="partie-mesures"
            className="board-titre m-0 text-[22px]"
          >
            Mesures de prévention
          </h3>
          <span aria-hidden className="text-[color:var(--board-slate)]">
            /
          </span>
          <span className="board-eyebrow inline-flex items-center text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Types de mesures — existantes et prévues
            <InfoTooltip variant="legal" align="left" label="Types de mesures — classement de Rojer">
              <span className="block font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] opacity-70">
                Art. L. 4121-2 · Code du travail
              </span>
              <span className="mt-2 block font-medium normal-case tracking-normal">
                {ORDRE_SELON_L4121_2}{" "}
                L&apos;ordre des types ci-dessous est un
                classement de Rojer&nbsp;:
              </span>
              <span className="mt-1.5 block normal-case tracking-normal">
                <span className="block">
                  <span className="font-mono tabular-nums opacity-60">1.</span>{" "}
                  Supprimer le risque
                </span>
                <span className="block">
                  <span className="font-mono tabular-nums opacity-60">2.</span>{" "}
                  Réduire à la source
                </span>
                <span className="block">
                  <span className="font-mono tabular-nums opacity-60">3.</span>{" "}
                  Protection collective
                </span>
                <span className="mt-1 block border-t border-white/20 pt-1">
                  <span className="font-mono tabular-nums opacity-60">4.</span>{" "}
                  EPI (individuelle)
                </span>
                <span className="block">
                  <span className="font-mono tabular-nums opacity-60">5.</span>{" "}
                  Formation / information
                </span>
                <span className="block">
                  <span className="font-mono tabular-nums opacity-60">6.</span>{" "}
                  Mesure organisationnelle
                </span>
              </span>
              <span className="mt-2 block text-[11px] opacity-75">
                EPI et formation viennent en dernier, jamais en substitut des
                trois premiers niveaux.
              </span>
            </InfoTooltip>
          </span>
        </div>

        <div className="max-w-[66ch] space-y-2.5">
          <p className="m-0 text-[14.5px] font-medium leading-[1.55] text-[color:var(--board-ink)]">
            Sélectionnez les mesures déjà en place et celles que vous comptez
            mettre en œuvre.
          </p>
          <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Si votre inventaire diffère de la maîtrise que vous aviez cotée,
            vous pourrez{" "}
            <Link
              href={hrefCotation}
              className="font-medium text-[color:var(--board-blue-ink)] hover:underline"
            >
              revenir ajuster la cotation
            </Link>
            .
          </p>
        </div>

        {alerteBasNiveau && (
          // Un écart relevé sur la hiérarchie de prévention, pas une
          // échéance dépassée : encre de signal sur voile, jamais le champ
          // rose (charte, interdit 3).
          <div className="rounded-[22px] bg-[color:var(--board-signal-wash)] px-6 py-5">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-signal-ink)]">
              Protection collective · art. L. 4121-2, 8°
            </p>
            <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
              Les mesures retenues ne comportent que des EPI, de la formation
              ou de l&apos;organisation. Avez-vous étudié une solution
              collective ou une réduction à la source&nbsp;? Art. L. 4121-2,
              8°&nbsp;: «&nbsp;{L4121_2_8}&nbsp;».
            </p>
          </div>
        )}

        <section className="carte-board overflow-clip">
          <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Mesures retenues
            </p>
            <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] tabular-nums text-[color:var(--board-slate-soft)]">
              {String(mesuresAffichees.length).padStart(2, "0")} au total
            </p>
          </div>
          {mesuresAffichees.length === 0 ? (
            <p className="m-0 px-7 py-8 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
              Aucune mesure retenue pour ce risque. Cochez ci-dessous dans le
              référentiel, ou ajoutez une mesure personnalisée.
            </p>
          ) : (
            <>
              <p className="m-0 flex flex-wrap items-baseline gap-2 border-b border-[color:var(--board-slate-line)] px-7 py-3 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)] sm:px-8">
                <span
                  aria-hidden
                  className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-blue-ink)]"
                >
                  À faire
                </span>
                <span className="min-w-0 flex-1">
                  Pour chaque mesure, indiquez si elle est{" "}
                  <span className="font-medium text-[color:var(--board-ink)]">
                    déjà en place
                  </span>{" "}
                  ou{" "}
                  <span className="font-medium text-[color:var(--board-ink)]">
                    à prévoir
                  </span>
                  . Les mesures « à prévoir » deviennent des actions avec
                  échéance et responsable.
                </span>
              </p>
              <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
                {mesuresAffichees.map((m) => (
                  <li key={m.id} className="px-7 py-4 sm:px-8">
                    <MesureRow
                      id={m.id}
                      libelle={m.libelle}
                      type={m.type}
                      statut={m.statut as "existante" | "prevue"}
                      echeance={m.echeance}
                      responsable={m.responsable}
                      origine={m.referentielMesureId ? "referentiel" : "custom"}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {mesuresRefNonSelectionnees.length > 0 && (
          <section className="carte-board overflow-clip">
            <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
              <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Mesures recommandées par le référentiel
              </p>
              <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] tabular-nums text-[color:var(--board-slate-soft)]">
                {String(mesuresRefNonSelectionnees.length).padStart(2, "0")} à
                envisager
              </p>
            </div>
            <p className="m-0 border-b border-[color:var(--board-slate-line)] px-7 py-4 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)] sm:px-8">
              Cochez celles qui sont déjà en place ou prévues. Vous pourrez
              ensuite préciser le statut (existante / prévue), l&apos;échéance
              et le responsable.
            </p>
            <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
              {mesuresRefNonSelectionnees.map((m) => (
                <li key={m.id} className="px-7 py-4 sm:px-8">
                  <MesureReferentielToggle
                    risqueId={risqueId}
                    mesureRefId={m.id}
                    libelle={m.libelle}
                    type={m.type}
                    selectionne={false}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="carte-board overflow-clip">
          <div className="border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Ajouter une mesure personnalisée
            </p>
          </div>
          <div className="px-7 py-5 sm:px-8">
            <AjouterMesureCustomForm risqueId={risqueId} />
          </div>
        </section>
      </section>

      {/* Actions */}
      <div className="space-y-4 border-t border-[color:var(--board-slate-line)] pt-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            href={hrefUnite}
            className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
          >
            ← Retour à l&apos;unité
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={hrefCotation}
              className={buttonVariants({ variant: "boardClair", size: "board" })}
            >
              ← Revoir la cotation
            </Link>
            {hrefSuivant ? (
              <Link
                href={hrefSuivant}
                className={buttonVariants({ variant: "board", size: "board" })}
              >
                Risque suivant →
              </Link>
            ) : (
              <Link
                href={hrefUnite}
                className={buttonVariants({ variant: "board", size: "board" })}
              >
                Valider et revenir à l&apos;unité →
              </Link>
            )}
          </div>
        </div>

        <p className="m-0 max-w-[66ch] text-center text-[12px] leading-[1.55] text-[color:var(--board-slate-soft)] sm:mx-auto">
          Les mesures sont enregistrées au fur et à mesure. « Risque suivant »
          vous fait reprendre l&apos;évaluation sur le risque suivant de
          l&apos;unité.
        </p>
      </div>
    </div>
  );
}
