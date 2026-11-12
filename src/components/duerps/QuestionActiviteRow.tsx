"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { repondreActivite } from "@/lib/activites/actions";
import type { AjoutActivite } from "@/lib/activites/ajouts";
import { AideEcran } from "@/components/ui-kit/AideEcran";

/**
 * Une question d'activité hors couverture, et son couple Oui / Non (ADR-020).
 *
 * Le traitement de l'absence de réponse est repris tel quel de
 * `QuestionTransverseRow` : tant que rien n'a été répondu, **aucun** des deux
 * boutons n'est mis en avant. Mettre « Non » en évidence par défaut afficherait
 * une réponse que personne n'a donnée, sur un document à valeur légale. Le
 * « non » est persistable (`exercee === false`), donc l'écran distingue trois
 * états — les transverses aussi depuis l'ADR-038, qui leur a repris ce geste.
 * Et les trois sont atteignables dans les deux sens : « retirer ma réponse »
 * ramène au silence.
 *
 * ~~Répondre « oui » ne bloque rien et n'ajoute aucun risque~~ [2026-11-11,
 * ADR-060 : un « oui » ajoute l'unité et les risques de l'activité, à évaluer ;
 * l'écran dit ce qui a été ajouté (`AjoutsDeLActivite`).]
 */
type Props = {
  duerpId: string;
  activiteId: string;
  question: string;
  aide?: string;
  /** Ce que le « oui » a ajouté, lu en base (`ajoutsParActivite`). */
  ajout: AjoutActivite | undefined;
  /** Les risques à ajouter à la main quand rien n'a pu l'être (`aFaire.risques`). */
  risquesAPenser: string[];
  /** « 03 · Risques par unité » — le nom de l'étape où se cotent les ajouts. */
  etapeRisques: string;
  /** La limite d'unités de l'essai (`LIMITES_ESSAI.unitesTravail`). */
  limiteUnitesEssai: number;
  /** `undefined` = pas de réponse. Ne jamais replier sur `false`. */
  exercee: boolean | undefined;
};

export function QuestionActiviteRow({
  duerpId,
  activiteId,
  question,
  aide,
  ajout,
  risquesAPenser,
  etapeRisques,
  limiteUnitesEssai,
  exercee,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [echec, setEchec] = useState(false);

  // L'action peut refuser : le DUERP a disparu entre-temps, ou l'onglet est
  // resté ouvert après un changement de secteur et l'activité n'est plus
  // instruite. Sans ce `catch`, le rejet se perdait dans la transition, la
  // ligne restait affichée dans son état précédent, et le dirigeant repartait
  // en croyant avoir répondu.
  const repondre = (valeur: boolean | null) => {
    if (valeur === exercee) return;
    setEchec(false);
    startTransition(async () => {
      try {
        await repondreActivite(duerpId, activiteId, valeur);
      } catch (e) {
        // Une redirection (saisie fermée, ADR-053) n'est pas un échec : Next la reprend.
        unstable_rethrow(e);
        setEchec(true);
      }
    });
  };

  // Une ligne d'une seule carte (2026-11-11) : trois grandes cartes pour
  // trois questions fermées alourdissaient l'écran. « Sans réponse » n'est
  // plus écrit à côté des boutons — aucun des deux n'étant mis en avant, le
  // silence se voit déjà.
  return (
    <li className="border-t border-[color:var(--board-slate-line)] px-7 py-5 first:border-t-0 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="m-0 text-[14.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-[color:var(--board-ink)]">
            {question}
          </p>
          {aide && (
            <p className="m-0 mt-1 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              {aide}
            </p>
          )}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <div className="flex gap-2">
            <Button
              data-ecriture-inerte
              variant={exercee === true ? "board" : "boardClair"}
              size="boardSm"
              disabled={pending}
              onClick={() => repondre(true)}
            >
              Oui
            </Button>
            <Button
              data-ecriture-inerte
              variant={exercee === false ? "board" : "boardClair"}
              size="boardSm"
              disabled={pending}
              onClick={() => repondre(false)}
            >
              Non
            </Button>
          </div>
          {exercee !== undefined && (
            // Une réponse doit pouvoir être retirée, et pas seulement changée :
            // un « non » cliqué par erreur partait sinon dans une version figée
            // pour quarante ans, où il affirme que le dirigeant a *déclaré ne
            // pas exercer* l'activité. Revenir au silence est un état légitime
            // du dossier (ADR-020), pas un aveu.
            <button
              data-ecriture
              type="button"
              disabled={pending}
              onClick={() => repondre(null)}
              className="text-[12px] text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline disabled:opacity-50"
            >
              retirer ma réponse
            </button>
          )}
        </div>
      </div>

      {echec && (
        <p
          role="alert"
          className="m-0 mt-3 text-[12.5px] text-[color:var(--board-signal-ink)]"
        >
          Cette réponse n&apos;a pas pu être enregistrée. Rechargez la page,
          puis réessayez.
        </p>
      )}

      {/* Ce que le « oui » a fait (ADR-060, 2026-11-11) : dit en clair, et
          non plus « non couvert par votre secteur », qui se lisait « Rojer ne
          s'en occupe pas ». */}
      {exercee === true && (
        <AjoutsDeLActivite
          ajout={ajout}
          risquesAPenser={risquesAPenser}
          etapeRisques={etapeRisques}
          limiteUnitesEssai={limiteUnitesEssai}
        />
      )}
      {exercee === false && ajout && ajout.risques.length > 0 && (
        <p className={NOTE}>
          {`Conservés parce que vous les avez déjà complétés : ${ajout.risques
            .map((r) => r.libelle)
            .join(" · ")} (unité « ${ajout.unite.nom} »).`}
        </p>
      )}
    </li>
  );
}

const NOTE =
  "m-0 mt-3 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]";

function AjoutsDeLActivite({
  ajout,
  risquesAPenser,
  etapeRisques,
  limiteUnitesEssai,
}: Pick<Props, "ajout" | "risquesAPenser" | "etapeRisques" | "limiteUnitesEssai">) {
  return (
    <div className="mt-4 max-w-[var(--board-mesure)] rounded-[16px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
      {ajout ? (
        <>
          <p className="m-0 font-semibold text-[color:var(--board-ink)]">
            {ajout.unite.creeePourActivite
              ? `Nous avons ajouté l'unité « ${ajout.unite.nom} »`
              : `Nous avons complété l'unité « ${ajout.unite.nom} »`}
            {ajout.risques.length > 0 ? " avec ces risques :" : "."}
          </p>
          {ajout.risques.length > 0 && (
            <ul className="m-0 mt-1 list-disc pl-5">
              {ajout.risques.map((r) => (
                <li key={r.id}>{r.libelle}</li>
              ))}
            </ul>
          )}
          <p className="m-0 mt-1.5">
            {`Vous les évaluerez à l'étape ${etapeRisques}.`}
          </p>
        </>
      ) : (
        // Rien d'ajouté : aucune unité possible (essai plein, unité type
        // supprimée). L'ajout est automatique ; ici on informe seulement, le
        // détail derrière le « ? ».
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {`Ajoutez ces risques à la main à l'étape ${etapeRisques}.`}
          </span>
          <AideEcran titre="Les risques de cette activité">
            <ul className="m-0 list-disc pl-5">
              {risquesAPenser.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="m-0 mt-3">
              {`Nous n'avons pas pu les ajouter nous-mêmes : pendant l'essai, un DUERP compte ${limiteUnitesEssai} unités au plus, ou l'unité qui devait les recevoir a été supprimée.`}
            </p>
          </AideEcran>
        </div>
      )}
    </div>
  );
}
