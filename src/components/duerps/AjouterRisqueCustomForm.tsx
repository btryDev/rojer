"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import {
  ajouterRisqueCustom,
  type RisqueActionState,
} from "@/lib/risques/actions";

export function AjouterRisqueCustomForm({
  uniteId,
  surAjout,
}: {
  uniteId: string;
  /** Appelé après un ajout réussi — la fenêtre qui porte le formulaire se ferme. */
  surAjout?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // La fenêtre se ferme depuis l'action elle-même, après un ajout réussi :
  // un effet sur l'état ne se déclenchait pas de façon fiable une fois la
  // page revalidée (2026-11-12).
  const action = async (prev: RisqueActionState, fd: FormData) => {
    const resultat = await ajouterRisqueCustom(uniteId, prev, fd);
    if (resultat.status === "success") {
      formRef.current?.reset();
      surAjout?.();
    }
    return resultat;
  };
  const [state, formAction, pending] = useActionState<
    RisqueActionState,
    FormData
  >(action, { status: "idle" });

  const erreurLibelle =
    state.status === "error" ? state.fieldErrors?.libelle?.[0] : undefined;

  return (
    // Les deux champs n'avaient qu'un placeholder pour libellé : il
    // disparaît dès la première frappe, et un lecteur d'écran n'a plus rien
    // à annoncer. `ChampBoard` pose un vrai `<label>`, l'astérisque du
    // champ requis, et l'erreur en encre de signal.
    <form ref={formRef} action={formAction}>
      <div className="grid grid-cols-1 gap-4">
        <ChampBoard
          id="risque-custom-libelle"
          name="libelle"
          label="Risque"
          placeholder="ex. Tension avec les clients lors du rush"
          requis
          erreur={erreurLibelle}
        />
        <ChampBoard
          id="risque-custom-description"
          name="description"
          label="Précision (facultatif)"
          placeholder="Dans quelle situation, sur quel poste…"
        />
      </div>
      {/* Un refus sans champ (plafond, saisie fermée…) se disait nulle part ;
          dans une fenêtre, il passerait pour un ajout réussi. */}
      {state.status === "error" && !erreurLibelle && (
        <p
          role="alert"
          className="m-0 mt-4 text-[12.5px] text-[color:var(--board-signal-ink)]"
        >
          {state.message}
        </p>
      )}
      <p className="m-0 mt-4 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Il s&apos;ajoute aux risques retenus de l&apos;unité ; vous le coterez
        ensuite comme les autres.
      </p>
      <Button
        type="submit"
        variant="board"
        size="board"
        disabled={pending}
        className="mt-4"
      >
        {pending ? "Ajout…" : "Ajouter"}
      </Button>
    </form>
  );
}
