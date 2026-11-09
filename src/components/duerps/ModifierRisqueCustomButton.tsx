"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  modifierRisqueCustom,
  type RisqueActionState,
} from "@/lib/risques/actions";

export function ModifierRisqueCustomButton({
  id,
  libelle,
  description,
}: {
  id: string;
  libelle: string;
  description?: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const action = modifierRisqueCustom.bind(null, id);
  const [state, formAction, pending] = useActionState<
    RisqueActionState,
    FormData
  >(action, { status: "idle" });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fermeture du form après succès du Server Action
    if (state.status === "success") setOuvert(false);
  }, [state]);

  if (!ouvert) {
    return (
      <Button
        data-ecriture
        variant="boardClair"
        size="boardSm"
        onClick={() => setOuvert(true)}
      >
        Modifier
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
    >
      {/* Correction sur place : le nom du risque est déjà sous les yeux, un
          libellé au-dessus le redirait — mais un champ sans nom accessible
          ne s'annonce pas, d'où les `aria-label`. */}
      <input
        className="champ-board sm:max-w-sm"
        aria-label="Libellé du risque"
        name="libelle"
        defaultValue={libelle}
        autoFocus
        required
        aria-invalid={Boolean(
          state.status === "error" && state.fieldErrors?.libelle,
        )}
      />
      <input
        className="champ-board sm:max-w-xs"
        aria-label="Description du risque"
        name="description"
        defaultValue={description ?? ""}
        placeholder="Description (facultatif)"
      />
      <div className="flex gap-1.5">
        <Button
          variant="board"
          size="boardSm"
          type="submit"
          disabled={pending}
        >
          {pending ? "…" : "OK"}
        </Button>
        <Button
          variant="boardClair"
          size="boardSm"
          type="button"
          onClick={() => setOuvert(false)}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
