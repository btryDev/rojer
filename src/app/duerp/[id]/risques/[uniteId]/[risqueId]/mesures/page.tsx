import Link from "next/link";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { FilUnite } from "@/components/duerps/FilUnite";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AjouterMesureCustomForm } from "@/components/duerps/AjouterMesureCustomForm";
import { EvaluationProgression } from "@/components/duerps/EvaluationProgression";
import { MesureReferentielToggle } from "@/components/duerps/MesureReferentielToggle";
import { MesureRow } from "@/components/duerps/MesureRow";
import { LigneTitreDeLaMesure } from "@/components/salaries/LigneTitreDeLaMesure";
import { mesuresUniquementBasNiveau, trierParHierarchie } from "@/lib/prevention";
import { tousRisquesConnus } from "@/lib/referentiels";
import { getRisque } from "@/lib/risques/queries";
import type { TypeMesure } from "@/lib/referentiels/types";
import { L4121_2_3, L4121_2_8, ORDRE_SELON_L4121_2 } from "@/lib/verbatim/l4121-2-ordre";

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
  // Le 8° de L. 4121-2 ne vise que la protection INDIVIDUELLE : sans EPI
  // retenu (formation ou organisation seules), c'est le 3° qu'on cite, pas le
  // 8° (seconde contre-lecture du 2026-09-26).
  const avecEpi = typesRetenus.includes("protection_individuelle");

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
    <div className="flex flex-col gap-8">
      <FilUnite
        niveaux={[
          { libelle: "Toutes les unités", href: `/duerp/${id}/risques` },
          { libelle: risque.unite.nom, href: hrefUnite },
          { libelle: risque.libelle, href: hrefCotation },
          { libelle: "Mesures" },
        ]}
      />

      <header className="max-w-[var(--board-mesure)]">
        <div className="board-surtitre flex flex-wrap items-baseline gap-2">
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
        <h2 className="board-titre m-0 mt-3 text-[22px]">
          {risque.libelle}
        </h2>
        <p className="board-surtitre m-0 mt-3 text-[color:var(--board-slate-soft)]">
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

      <section aria-labelledby="partie-mesures" className="flex flex-col gap-6">
        {/* Allégé le 2026-11-12 : le titre « 02 Mesures de prévention » doublait
            la progression, et la hiérarchie de L. 4121-2 vivait dans une
            infobulle. Une phrase, et le détail derrière le « ? ». */}
        <h3 id="partie-mesures" className="sr-only">
          Mesures de prévention
        </h3>
        <div className="flex max-w-[var(--board-mesure)] flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <p className="m-0 text-[14.5px] font-medium leading-[1.55] text-[color:var(--board-ink)]">
              Cochez les mesures déjà en place et celles que vous comptez
              mettre en œuvre.
            </p>
            <AideEcran titre="Types de mesures — classement de Rojer">
              <p className="m-0 font-semibold">Art. L. 4121-2 · Code du travail</p>
              <p className="m-0 mt-2">
                {ORDRE_SELON_L4121_2} L&apos;ordre des types ci-dessous est un
                classement de Rojer&nbsp;:
              </p>
              <ol className="m-0 mt-2 pl-5">
                <li>Supprimer le risque</li>
                <li>Réduire à la source</li>
                <li>Protection collective</li>
                <li>EPI (individuelle)</li>
                <li>Formation / information</li>
                <li>Mesure organisationnelle</li>
              </ol>
              <p className="m-0 mt-2">
                EPI et formation viennent en dernier, jamais en substitut des
                trois premiers niveaux — classement de Rojer, que l&apos;article
                n&apos;écrit pas.
              </p>
            </AideEcran>
          </div>
          <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Si votre inventaire diffère de la maîtrise cotée, vous pourrez{" "}
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
            <p className="board-surtitre m-0 text-[color:var(--board-signal-ink)]">
              {avecEpi
                ? "Protection collective · art. L. 4121-2, 8°"
                : "Réduction à la source · art. L. 4121-2, 3°"}
            </p>
            <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
              Les mesures retenues ne comportent que des EPI, de la formation
              ou de l&apos;organisation. Avez-vous étudié une solution
              collective ou une réduction à la source&nbsp;? Art. L. 4121-2,{" "}
              {avecEpi ? (
                <>8°&nbsp;: «&nbsp;{L4121_2_8}&nbsp;».</>
              ) : (
                <>3°&nbsp;: «&nbsp;{L4121_2_3}&nbsp;».</>
              )}
            </p>
          </div>
        )}

        <section className="carte-board overflow-clip">
          <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
            <p className="board-surtitre m-0 text-[color:var(--board-slate-soft)]">
              Mesures retenues
            </p>
            <p className="board-surtitre m-0 tabular-nums text-[color:var(--board-slate-soft)]">
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
                  className="board-surtitre text-[color:var(--board-blue-ink)]"
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
                    <LigneTitreDeLaMesure
                      referentielMesureId={m.referentielMesureId}
                      etablissementId={risque.unite.duerp.etablissementId}
                      className="mt-2"
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
              <p className="board-surtitre m-0 text-[color:var(--board-slate-soft)]">
                Mesures recommandées par le référentiel
              </p>
              <p className="board-surtitre m-0 tabular-nums text-[color:var(--board-slate-soft)]">
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

        <section data-ecriture className="carte-board overflow-clip">
          <div className="border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
            <p className="board-surtitre m-0 text-[color:var(--board-slate-soft)]">
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
          {/* Les retours du bas sont partis (2026-11-12) : le fil du haut
              mène à l'unité et à la cotation. */}
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
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

        <p className="m-0 max-w-[var(--board-mesure)] text-center text-[12px] leading-[1.55] text-[color:var(--board-slate-soft)] sm:mx-auto">
          Les mesures sont enregistrées au fur et à mesure. « Risque suivant »
          vous fait reprendre l&apos;évaluation sur le risque suivant de
          l&apos;unité.
        </p>
      </div>
    </div>
  );
}
