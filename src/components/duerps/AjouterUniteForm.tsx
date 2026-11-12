"use client";

import { useActionState, useCallback, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import {
  ajouterUnite,
  type UniteActionState,
} from "@/lib/duerps/actions";

/**
 * « + Ajouter une unité de travail », en tête de la liste, ouvre une fenêtre
 * (2026-11-12) : comme l'ajout d'un risque. Même action serveur.
 */
export function AjouterUniteForm({ duerpId }: { duerpId: string }) {
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
        + Ajouter une unité de travail
      </Button>
      <PanneauModal
        ouvert={ouvert}
        surFermer={fermer}
        surtitre="Unités de travail"
        titre="Ajouter une unité de travail"
      >
        <FormulaireUnite duerpId={duerpId} surAjout={fermer} />
      </PanneauModal>
    </>
  );
}

/**
 * Le formulaire, monté avec la fenêtre : rouvrir la fenêtre repart d'un état
 * vierge, sans l'erreur de la fois précédente. La soumission passe par
 * `onSubmit` pour que React ne vide pas les champs sur un refus.
 */
function FormulaireUnite({ duerpId, surAjout }: { duerpId: string; surAjout: () => void }) {
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<UniteActionState, FormData>(
    async (prev, fd) => {
      const resultat = await ajouterUnite(duerpId, prev, fd);
      if (resultat.status === "success") surAjout();
      return resultat;
    },
    { status: "idle" },
  );
  const soumettre = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
  const erreurNom =
    state.status === "error" ? state.fieldErrors?.nom?.[0] : undefined;

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
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
        <Button type="button" variant="boardClair" size="board" onClick={surAjout}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
