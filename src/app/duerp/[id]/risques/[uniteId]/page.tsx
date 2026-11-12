import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AjouterRisqueCustomBouton } from "@/components/duerps/AjouterRisqueCustomBouton";
import { ActionsSecondaires } from "@/components/duerps/ActionsSecondaires";
import { MarcheASuivre, type PasMarche } from "@/components/duerps/MarcheASuivre";
import { EnTeteEtape } from "@/components/duerps/EnTeteEtape";
import { etatUnite } from "@/lib/risques/etat-unite";
import { DeclarerAucunRisqueForm } from "@/components/duerps/DeclarerAucunRisqueForm";
import { ModifierRisqueCustomButton } from "@/components/duerps/ModifierRisqueCustomButton";
import { RisqueReferentielRow } from "@/components/duerps/RisqueReferentielRow";
import { SupprimerRisqueButton } from "@/components/duerps/SupprimerRisqueButton";
import { MentionHorsReferentiel } from "@/components/duerps/MentionHorsReferentiel";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { PastilleFiche } from "@/components/ui-kit/fiche";
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
  const e = etatUnite(unite);
  const lienRisque = (risqueId: string) => `/duerp/${id}/risques/${uniteId}/${risqueId}`;

  const pas: PasMarche[] = e.declareeSansRisque
    ? [
        { titre: "Inventorier", detail: "Aucun risque significatif, justifié", etat: "fait" },
        { titre: "Coter", detail: "Sans objet", etat: "fait" },
        { titre: "Prévoir les mesures", detail: "Sans objet", etat: "fait" },
      ]
    : [
        {
          titre: "Inventorier",
          detail: e.inventoriee
            ? `${e.nbRisques} risque${e.nbRisques > 1 ? "s" : ""} retenu${e.nbRisques > 1 ? "s" : ""}`
            : e.nbRisques > 0
              ? `${e.nbRisques} risque${e.nbRisques > 1 ? "s" : ""} ajouté${e.nbRisques > 1 ? "s" : ""} pour vous, à vérifier`
              : "Cochez les risques types, ajoutez les vôtres.",
          etat: e.inventoriee ? "fait" : "courant",
        },
        {
          titre: "Coter",
          detail: !e.inventoriee
            ? "Après l'inventaire"
            : e.cotee
              ? "Tous cotés"
              : `${e.aCoter.length} sur ${e.nbRisques} à coter`,
          etat: e.cotee ? "fait" : e.inventoriee ? "courant" : "a-faire",
        },
        {
          titre: "Prévoir les mesures",
          detail: !e.cotee
            ? "Après la cotation"
            : e.mesuree
              ? "Toutes prévues"
              : `${e.sansMesure.length} risque${e.sansMesure.length > 1 ? "s" : ""} sans mesure`,
          etat: e.mesuree ? "fait" : e.cotee ? "courant" : "a-faire",
        },
      ];

  return (
    <div className="flex flex-col gap-8">
      <EnTeteEtape page="risques" titre={unite.nom} niveau="detail">
        {unite.description}
      </EnTeteEtape>

      {horsReferentiel && <MentionHorsReferentiel />}

      {/* La marche à suivre, sur fond creux (2026-11-12) : elle
          était une grande carte, barre, pastilles et paragraphes compris,
          au même rang que les listes. */}
      <MarcheASuivre libelle="Les étapes, pour cette unité" pas={pas} />

      <section className="carte-board overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--board-slate-line)] px-7 py-4 sm:px-8">
          <h3 className="m-0 flex items-baseline gap-2 text-[13.5px] font-semibold text-[color:var(--board-ink)]">
            Risques retenus
            <span className="board-surtitre font-normal">{e.nbRisques}</span>
          </h3>
          <AjouterRisqueCustomBouton
            uniteId={uniteId}
            nbRisquesTypes={nonSelectionnes.length}
            risquesTypes={nonSelectionnes.flatMap((refId) => {
              const ref = refMap.get(refId);
              if (!ref) return [];
              return [
                <li key={refId}>
                  <RisqueReferentielRow
                    uniteId={uniteId}
                    referentielId={refId}
                    libelle={ref.libelle}
                    description={ref.description}
                  />
                </li>,
              ];
            })}
          />
        </div>

        {risquesRetenus.length === 0 ? (
          <p className="m-0 px-7 py-6 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
            Aucun risque retenu pour l&apos;instant : «&nbsp;+ Ajouter un
            risque&nbsp;» pour cocher les risques types ou saisir les vôtres.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
            {risquesRetenus.map((r) => {
              const mesureFaite = r.mesures.length > 0;
              const evalComplete = r.cotationSaisie && mesureFaite;
              // Le bouton dit l'action ; la ligne ne la répète pas. Seul un
              // risque terminé porte une pastille (2026-11-12).
              const detail = [
                !r.referentielId ? "Risque spécifique" : null,
                mesureFaite
                  ? `${r.mesures.length} mesure${r.mesures.length > 1 ? "s" : ""}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 px-7 py-5 sm:px-8"
                >
                  <div className="min-w-0 flex-[1_1_260px]">
                    <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {r.libelle}
                    </p>
                    {r.description && (
                      <p className="m-0 mt-1 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                        {r.description}
                      </p>
                    )}
                    {detail && (
                      <p className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-mid)]">
                        {detail}
                      </p>
                    )}
                  </div>
                  {r.cotationSaisie && (
                    <span className="inline-flex shrink-0 items-center text-[13px] font-semibold tabular-nums text-[color:var(--board-slate-ink)]">
                      {String(r.criticite).padStart(2, "0")}
                      <span className="ml-1 font-normal text-[color:var(--board-slate-soft)]">/ 16</span>
                      <InfoTooltip align="left">
                        Criticité : (gravité × probabilité) ÷ maîtrise, bornée
                        à 16. Plus elle est élevée, plus le risque est à
                        traiter en priorité.
                      </InfoTooltip>
                    </span>
                  )}
                  {evalComplete && (
                    <span className="shrink-0">
                      <PastilleFiche ton="fait">✓ Évalué</PastilleFiche>
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      data-ecriture
                      href={lienRisque(r.id)}
                      className={buttonVariants({
                        size: "boardSm",
                        variant: evalComplete ? "boardClair" : "board",
                      })}
                    >
                      {!r.cotationSaisie ? "Coter" : !mesureFaite ? "Prévoir les mesures" : "Revoir"}
                    </Link>
                    {/* Les gestes rares derrière le « ⋯ » : mêmes composants,
                        mêmes actions qu'avant. */}
                    <ActionsSecondaires libelle={`Autres actions sur « ${r.libelle} »`}>
                      {evalComplete && (
                        <Link
                          href={`/duerp/${id}/risques/${uniteId}/${r.id}/mesures`}
                          className={buttonVariants({ size: "boardSm", variant: "boardClair" })}
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
                    </ActionsSecondaires>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {risquesRetenus.length === 0 && (
        <section>
          <DeclarerAucunRisqueForm
            uniteId={uniteId}
            justifInitiale={unite.aucunRisqueJustif}
          />
        </section>
      )}

    </div>
  );
}
