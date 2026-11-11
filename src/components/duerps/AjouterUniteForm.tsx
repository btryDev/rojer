"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import {
  ajouterUnite,
  type UniteActionState,
} from "@/lib/duerps/actions";

export function AjouterUniteForm({ duerpId }: { duerpId: string }) {
  const action = ajouterUnite.bind(null, duerpId);
  const [state, formAction, pending] = useActionState<
    UniteActionState,
    FormData
  >(action, { status: "idle" });
  const [ouvert, setOuvert] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fermeture du form après succès du Server Action
      setOuvert(false);
    }
  }, [state]);

  if (!ouvert) {
    return (
      <div data-ecriture className="px-7 py-4 sm:px-8">
        {/* Un vrai bouton (2026-11-11) : en petites capitales grises, l'ajout
            se lisait comme une légende et passait inaperçu. */}
        <Button
          type="button"
          variant="boardClair"
          size="board"
          onClick={() => setOuvert(true)}
        >
          + Ajouter une unité de travail
        </Button>
      </div>
    );
  }

  const erreurNom =
    state.status === "error" ? state.fieldErrors?.nom?.[0] : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-[color:var(--board-slate-pale)] px-7 py-5 sm:px-8"
    >
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        Nouvelle unité
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          label="Description"
          placeholder="Description courte (facultatif)"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
        <Button
          type="button"
          variant="boardClair"
          size="board"
          onClick={() => setOuvert(false)}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
