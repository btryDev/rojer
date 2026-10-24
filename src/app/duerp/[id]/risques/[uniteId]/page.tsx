import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AjouterRisqueCustomForm } from "@/components/duerps/AjouterRisqueCustomForm";
import { DeclarerAucunRisqueForm } from "@/components/duerps/DeclarerAucunRisqueForm";
import { ModifierRisqueCustomButton } from "@/components/duerps/ModifierRisqueCustomButton";
import { RisqueReferentielRow } from "@/components/duerps/RisqueReferentielRow";
import { SupprimerRisqueButton } from "@/components/duerps/SupprimerRisqueButton";
import { MentionHorsReferentiel } from "@/components/duerps/MentionHorsReferentiel";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { getUnite } from "@/lib/duerps/queries";
import {
  estHorsReferentiel,
  risquesProposesPourUnite,
} from "@/lib/risques/helpers";
import { tousRisquesConnus } from "@/lib/referentiels";

export default async function RisquesUnitePage({
  params,
}: {
  params: Promise<{ id: string; uniteId: string }>;
}) {
  const { id, uniteId } = await params;
  const unite = await getUnite(uniteId);
  if (!unite || unite.duerpId !== id) notFound();

  const refMap = tousRisquesConnus();
  const proposes = risquesProposesPourUnite(unite.referentielUniteId);
  // Une liste de propositions vide a deux causes très différentes : tout a
  // déjà été coché, ou le référentiel ne connaît pas cette unité. Seule la
  // seconde se dit à l'écran, et elle se lit sur la donnée, pas sur le compte.
  const horsReferentiel = estHorsReferentiel(unite);
  const idsSelectionnes = new Map(
    unite.risques
      .filter((r) => r.referentielId)
      .map((r) => [r.referentielId!, r]),
  );
  const nonSelectionnes = proposes.filter((refId) => !idsSelectionnes.has(refId));

  const risquesRetenus = unite.risques;
  const aCoterCount = risquesRetenus.filter((r) => !r.cotationSaisie).length;
  const sansMesureCount = risquesRetenus.filter(
    (r) => r.cotationSaisie && r.mesures.length === 0,
  ).length;
  const aEvaluerCount = aCoterCount + sansMesureCount;
  const etape1Faite = risquesRetenus.length > 0;
  const etape2Faite = etape1Faite && aEvaluerCount === 0;

  return (
    <div className="flex flex-col gap-[22px]">
      <nav>
        <Link
          href={`/duerp/${id}/risques`}
          className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          ← Toutes les unités
        </Link>
      </nav>

      <header className="max-w-[var(--board-mesure)]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Unité de travail
        </p>
        <h2 className="board-titre m-0 mt-2.5 text-[clamp(23px,2.1vw,30px)]">
          {unite.nom}
        </h2>
        {unite.description && (
          <p className="m-0 mt-2.5 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            {unite.description}
          </p>
        )}
        <p className="board-eyebrow m-0 mt-4 text-[10px] tracking-[0.16em] tabular-nums text-[color:var(--board-slate-soft)]">
          {String(risquesRetenus.length).padStart(2, "0")} risque
          {risquesRetenus.length > 1 ? "s" : ""} retenu
          {risquesRetenus.length > 1 ? "s" : ""}
          {aEvaluerCount > 0 && (
            <>
              <span className="mx-2 text-[color:var(--board-slate)]">·</span>
              <span className="text-[color:var(--board-blue-ink)]">
                {String(aEvaluerCount).padStart(2, "0")} à évaluer
              </span>
            </>
          )}
        </p>
      </header>

      {horsReferentiel && <MentionHorsReferentiel />}

      {/* La marche à suivre est une carte pédagogique, pas un état : elle
          n'a donc pas de champ coloré, sur le modèle de `WhyCard` en board.
          Le bleu du board n'y sert qu'à désigner le geste en cours. */}
      <section aria-label="Marche à suivre" className="carte-board">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Marche à suivre
          </p>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Progression de cette unité
          </p>
        </div>

        {/* Barre continue 2 segments + légendes sous-jacentes */}
        <div className="px-7 pt-6 sm:px-8">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={2}
            aria-valuenow={(etape1Faite ? 1 : 0) + (etape2Faite ? 1 : 0)}
            className="flex gap-1.5"
          >
            <span
              className={`h-[6px] flex-1 rounded-full transition-colors duration-300 ${
                etape1Faite
                  ? "bg-[color:var(--board-ink)]"
                  : "bg-[color:var(--board-slate-line)]"
              }`}
            />
            <span
              className={`h-[6px] flex-1 rounded-full transition-colors duration-300 ${
                etape2Faite
                  ? "bg-[color:var(--board-ink)]"
                  : etape1Faite
                    ? "bg-[color:var(--board-blue-ink)]"
                    : "bg-[color:var(--board-slate-line)]"
              }`}
            />
          </div>
          <div className="board-eyebrow mt-2 flex justify-between text-[10px] tracking-[0.16em] tabular-nums text-[color:var(--board-slate-soft)]">
            <span>
              01 /{" "}
              {etape1Faite ? "terminé" : "à faire"}
            </span>
            <span>
              02 /{" "}
              {!etape1Faite
                ? "en attente"
                : etape2Faite
                  ? "terminé"
                  : "à faire"}
            </span>
          </div>
        </div>

        <ol className="mt-5 grid list-none grid-cols-1 p-0 sm:grid-cols-2">
          <li className="flex items-start gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-6 sm:border-b-0 sm:border-r sm:px-8">
            <span
              aria-hidden
              className={`flex size-11 shrink-0 items-center justify-center rounded-full font-mono text-[12.5px] font-semibold tabular-nums transition-colors ${
                etape1Faite
                  ? "bg-[color:var(--board-ink)] text-white"
                  : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
              }`}
            >
              01
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                {horsReferentiel
                  ? "Inventorier les risques"
                  : "Cocher les risques concernés"}
              </p>
              {/* Renvoyer vers « la liste du référentiel plus bas » quand elle
                  n'existe pas enverrait le dirigeant chercher un écran vide. */}
              <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                {horsReferentiel ? (
                  <>
                    Aucun risque type n&apos;est proposé pour cette unité :
                    ajoutez-les un par un depuis «&nbsp;Ajouter un risque
                    spécifique&nbsp;» plus bas.
                  </>
                ) : (
                  <>
                    Parcourez la liste du référentiel plus bas et cochez ceux
                    qui s&apos;appliquent à cette unité. Les non-cochés sont
                    considérés comme écartés.
                  </>
                )}
              </p>
              <span
                className={`pastille-board mt-3 tabular-nums ${
                  etape1Faite
                    ? "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
                    : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                }`}
              >
                {etape1Faite ? (
                  <>
                    <span aria-hidden>✓</span>
                    {String(risquesRetenus.length).padStart(2, "0")} retenu
                    {risquesRetenus.length > 1 ? "s" : ""}
                  </>
                ) : (
                  "À faire"
                )}
              </span>
            </div>
          </li>

          <li className="flex items-start gap-4 px-7 py-6 sm:px-8">
            <span
              aria-hidden
              className={`flex size-11 shrink-0 items-center justify-center rounded-full font-mono text-[12.5px] font-semibold tabular-nums transition-colors ${
                etape2Faite
                  ? "bg-[color:var(--board-ink)] text-white"
                  : etape1Faite
                    ? "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                    : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
              }`}
            >
              02
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] ${
                  etape1Faite
                    ? "text-[color:var(--board-ink)]"
                    : "text-[color:var(--board-slate-mid)]"
                }`}
              >
                Évaluer chaque risque retenu
              </p>
              <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Pour chaque risque, en deux temps :{" "}
                <span className="font-semibold text-[color:var(--board-ink)]">
                  01 · coter (gravité, probabilité, maîtrise)
                </span>{" "}
                puis{" "}
                <span className="font-semibold text-[color:var(--board-ink)]">
                  02 · lister les mesures de prévention
                </span>
                . Les deux vont ensemble — la maîtrise cotée reflète ce qui
                existe déjà.
              </p>
              <span
                className={`pastille-board mt-3 tabular-nums ${
                  !etape1Faite
                    ? "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
                    : etape2Faite
                      ? "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
                      : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                }`}
              >
                {!etape1Faite ? (
                  "Verrouillé"
                ) : etape2Faite ? (
                  <>
                    <span aria-hidden>✓</span>
                    Terminé
                  </>
                ) : (
                  `${String(aEvaluerCount).padStart(2, "0")} à évaluer`
                )}
              </span>
            </div>
          </li>
        </ol>
      </section>

      <div
        className={
          nonSelectionnes.length > 0
            ? "grid gap-[22px] lg:grid-cols-2 lg:items-start"
            : ""
        }
      >
        <section className="carte-board">
        <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Risques retenus
          </p>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Enregistrés automatiquement
          </p>
        </div>

        {risquesRetenus.length === 0 ? (
          <p className="m-0 px-7 py-8 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
            {horsReferentiel ? (
              <>
                Aucun risque retenu pour cette unité. Ajoutez vos risques
                ci-dessous, ou déclarez « aucun risque significatif » après
                examen.
              </>
            ) : (
              <>
                Aucun risque retenu pour cette unité. Cochez dans la liste du
                référentiel ci-dessous, ajoutez un risque personnalisé, ou
                déclarez « aucun risque significatif ».
              </>
            )}
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
            {risquesRetenus.map((r) => {
              const mesureFaite = r.mesures.length > 0;
              const evalComplete = r.cotationSaisie && mesureFaite;
              return (
              <li
                key={r.id}
                className="flex flex-col items-start justify-between gap-4 px-7 py-5 sm:flex-row sm:items-center sm:px-8"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                    {r.libelle}
                  </p>
                  {r.description && (
                    <p className="m-0 mt-1 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      {r.description}
                    </p>
                  )}

                  {/* Progression compacte 01 · 02 de l'évaluation de ce risque */}
                  <div className="board-eyebrow mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-[0.16em]">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        r.cotationSaisie
                          ? "text-[color:var(--board-ink)]"
                          : "text-[color:var(--board-blue-ink)]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`inline-block size-1.5 rounded-full ${
                          r.cotationSaisie
                            ? "bg-[color:var(--board-ink)]"
                            : "bg-[color:var(--board-blue-ink)]"
                        }`}
                      />
                      01 ·{" "}
                      {r.cotationSaisie ? (
                        <span className="inline-flex items-center tabular-nums">
                          criticité {String(r.criticite).padStart(2, "0")}/16
                          <InfoTooltip align="left">
                            Indice calculé : (gravité × probabilité) ÷
                            maîtrise, borné à 16. Plus c&apos;est élevé, plus
                            le risque est à traiter en priorité.
                          </InfoTooltip>
                        </span>
                      ) : (
                        "à coter"
                      )}
                    </span>
                    <span aria-hidden className="text-[color:var(--board-slate)]">
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        !r.cotationSaisie
                          ? "text-[color:var(--board-slate-soft)]"
                          : mesureFaite
                            ? "text-[color:var(--board-ink)]"
                            : "text-[color:var(--board-blue-ink)]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`inline-block size-1.5 rounded-full ${
                          !r.cotationSaisie
                            ? "bg-[color:var(--board-slate)]"
                            : mesureFaite
                              ? "bg-[color:var(--board-ink)]"
                              : "bg-[color:var(--board-blue-ink)]"
                        }`}
                      />
                      02 ·{" "}
                      {!r.cotationSaisie
                        ? "après cotation"
                        : mesureFaite
                          ? `${String(r.mesures.length).padStart(2, "0")} mesure${
                              r.mesures.length > 1 ? "s" : ""
                            }`
                          : "à renseigner"}
                    </span>
                    {!r.referentielId && (
                      <>
                        <span aria-hidden className="text-[color:var(--board-slate)]">
                          ·
                        </span>
                        <span className="inline-flex items-center text-[color:var(--board-slate-soft)]">
                          personnalisé
                          <InfoTooltip align="left">
                            Risque ajouté manuellement (hors référentiel
                            INRS). Vous pouvez le modifier ou le supprimer à
                            tout moment.
                          </InfoTooltip>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* `sm:flex-nowrap` a été retiré : la question de suppression
                    du risque naît ici et doit passer à la ligne pour avoir sa
                    largeur, au lieu de se glisser entre deux pilules. Les
                    boutons, eux, ne bougent pas — la colonne est `sm:w-auto
                    sm:shrink-0`, donc dimensionnée sur son contenu, et une
                    ligne qui ne déborde pas ne se replie pas. */}
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                  {/* Le déroulé « cotation puis mesures » se lisait ici dans
                      une bulle au survol — invisible au doigt (interdit 18),
                      et déjà écrit en clair dans la marche à suivre ci-dessus.
                      Elle n'a pas été traduite, elle a été retirée. */}
                  <Link
                    href={`/duerp/${id}/risques/${uniteId}/${r.id}`}
                    className={buttonVariants({
                      size: "boardSm",
                      variant: evalComplete ? "boardClair" : "board",
                    })}
                  >
                    {!r.cotationSaisie
                      ? "Évaluer"
                      : !mesureFaite
                        ? "Continuer l'évaluation"
                        : "Modifier l'évaluation"}
                  </Link>
                  {evalComplete && (
                    <Link
                      href={`/duerp/${id}/risques/${uniteId}/${r.id}/mesures`}
                      className={buttonVariants({
                        size: "boardSm",
                        variant: "boardClair",
                      })}
                    >
                      Mesures →
                    </Link>
                  )}
                  {!r.referentielId && (
                    <ModifierRisqueCustomButton
                      id={r.id}
                      libelle={r.libelle}
                      description={r.description}
                    />
                  )}
                  {/* Retenu par erreur, un risque du référentiel se retire
                      ici, confirmé (2026-10-12) : la liste ne fait qu'ajouter. */}
                  <SupprimerRisqueButton
                    id={r.id}
                    referentiel={Boolean(r.referentielId)}
                    nbActions={r.actions.length}
                    nbLevees={r.actions.filter((a) => a.statut === "levee").length}
                  />
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {nonSelectionnes.length > 0 && (
        <section className="carte-board overflow-clip">
          <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Autres risques du référentiel
            </p>
            <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] tabular-nums text-[color:var(--board-slate-soft)]">
              {String(nonSelectionnes.length).padStart(2, "0")} à envisager
            </p>
          </div>
          <p className="m-0 border-b border-[color:var(--board-slate-line)] px-7 py-4 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)] sm:px-8">
            Cochez ceux qui s&apos;appliquent. Les risques non cochés sont
            considérés comme écartés pour cette unité.
          </p>
          <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
            {nonSelectionnes.map((refId) => {
              const ref = refMap.get(refId);
              if (!ref) return null;
              return (
                <li key={refId} className="px-7 py-4 sm:px-8">
                  <RisqueReferentielRow
                    uniteId={uniteId}
                    referentielId={refId}
                    libelle={ref.libelle}
                    description={ref.description}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      </div>

      <section className="carte-board overflow-clip">
        <div className="border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Ajouter un risque spécifique
          </p>
        </div>
        <div className="px-7 py-5 sm:px-8">
          <AjouterRisqueCustomForm uniteId={uniteId} />
        </div>
      </section>

      {risquesRetenus.length === 0 && (
        <section>
          <DeclarerAucunRisqueForm
            uniteId={uniteId}
            justifInitiale={unite.aucunRisqueJustif}
          />
        </section>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-[color:var(--board-slate-line)] pt-7">
        <Link
          href={`/duerp/${id}/risques`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          Annuler
        </Link>
        <Link
          href={`/duerp/${id}/risques`}
          className={buttonVariants({ variant: "board", size: "board" })}
        >
          Valider et revenir →
        </Link>
      </div>

      <p className="m-0 max-w-[var(--board-mesure)] text-center text-[12px] leading-[1.55] text-[color:var(--board-slate-soft)] sm:mx-auto">
        Toutes vos modifications sont enregistrées au fur et à mesure.
        &laquo;&nbsp;Valider et revenir&nbsp;&raquo; vous ramène à la liste
        des unités.
      </p>
    </div>
  );
}
