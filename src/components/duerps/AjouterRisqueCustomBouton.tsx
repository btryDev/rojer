"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { AjouterRisqueCustomForm } from "./AjouterRisqueCustomForm";

/**
 * « + Ajouter un risque », en tête de la liste des risques retenus, ouvre une
 * fenêtre (2026-11-12) qui réunit les deux façons d'ajouter : cocher un risque
 * type du secteur (la liste vivait dans sa propre carte, sous la page) ou en
 * saisir un spécifique. Mêmes composants, mêmes actions serveur. Cocher un
 * risque type laisse la fenêtre ouverte ; ajouter un risque spécifique la
 * ferme.
 */
export function AjouterRisqueCustomBouton({
  uniteId,
  nbRisquesTypes = 0,
  risquesTypes,
}: {
  uniteId: string;
  nbRisquesTypes?: number;
  /** Les lignes `RisqueReferentielRow` des risques types non encore retenus. */
  risquesTypes?: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <Button
        data-ecriture
        type="button"
        variant="boardClair"
        size="boardSm"
        onClick={() => setOuvert(true)}
      >
        + Ajouter un risque
      </Button>
      <PanneauModal
        ouvert={ouvert}
        surFermer={fermer}
        surtitre="Risques retenus"
        titre="Ajouter un risque"
      >
        <div className="flex flex-col gap-6">
          {nbRisquesTypes > 0 && (
            <section aria-label="Risques types de votre secteur" className="flex flex-col gap-2">
              <h3 className="m-0 flex items-baseline gap-2 text-[13.5px] font-semibold text-[color:var(--board-ink)]">
                Risques types de votre secteur
                <span className="board-surtitre font-normal">{nbRisquesTypes} à passer en revue</span>
              </h3>
              <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Cochez ceux qui s&apos;appliquent ; les autres sont considérés
                comme écartés pour cette unité.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">{risquesTypes}</ul>
            </section>
          )}
          <section aria-label="Risque spécifique" className="flex flex-col gap-2">
            <h3 className="m-0 text-[13.5px] font-semibold text-[color:var(--board-ink)]">
              {nbRisquesTypes > 0 ? "Ou un risque spécifique" : "Un risque spécifique"}
            </h3>
            <AjouterRisqueCustomForm uniteId={uniteId} surAjout={fermer} />
          </section>
        </div>
      </PanneauModal>
    </>
  );
}
