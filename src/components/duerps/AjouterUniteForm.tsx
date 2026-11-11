"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import {
  ajouterUnite,
  type UniteActionState,
} from "@/lib/duerps/actions";

/**
 * « + Ajouter une unité de travail », en tête de la liste, ouvre une fenêtre
 * (2026-11-12) : comme l'ajout d'un risque. Même action serveur ; la fenêtre
 * se ferme depuis l'action, après un ajout réussi.
 */
export function AjouterUniteForm({ duerpId }: { duerpId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const formRef = useRef<HTMLFormElement>(null);
  const action = async (prev: UniteActionState, fd: FormData) => {
    const resultat = await ajouterUnite(duerpId, prev, fd);
    if (resultat.status === "success") {
      formRef.current?.reset();
      fermer();
    }
    return resultat;
  };
  const [state, formAction, pending] = useActionState<UniteActionState, FormData>(
    action,
    { status: "idle" },
  );

  const erreurNom =
    state.status === "error" ? state.fieldErrors?.nom?.[0] : undefined;

  return (
    <>
      <Button
        data-ecriture
        type="button"
        variant="boardClair"
        size="boardSm"
        onClick={() => setOuvert(true)}
      >
        + Ajouter une unité de travail
      </Button>
      <PanneauModal
        ouvert={ouvert}
        surFermer={fermer}
        surtitre="Unités de travail"
        titre="Ajouter une unité de travail"
      >
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <ChampBoard
            id="unite-nom"
            name="nom"
            label="Nom de l'unité"
            placeholder="ex. Terrasse, Atelier, Entrepôt"
            requis
            autoFocus
            erreur={erreurNom}
          />
          <ChampBoard
            id="unite-description"
            name="description"
            label="Description (facultatif)"
            placeholder="Description courte"
          />
          {/* Un refus sans champ (limite de l'essai…) se dit dans la fenêtre. */}
          {state.status === "error" && !erreurNom && (
            <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
              {state.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="board" size="board" disabled={pending}>
              {pending ? "Ajout…" : "Ajouter"}
            </Button>
            <Button type="button" variant="boardClair" size="board" onClick={fermer}>
              Annuler
            </Button>
          </div>
        </form>
      </PanneauModal>
    </>
  );
}
