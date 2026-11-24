"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import {
  ajouterMesureCustom,
  type MesureActionState,
} from "@/lib/mesures/actions";
import { LABEL_TYPE_MESURE } from "@/lib/mesures/labels";

export function AjouterMesureCustomForm({ risqueId }: { risqueId: string }) {
  const action = ajouterMesureCustom.bind(null, risqueId);
  const [state, formAction, pending] = useActionState<
    MesureActionState,
    FormData
  >(action, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const erreurLibelle =
    state.status === "error" ? state.fieldErrors?.libelle?.[0] : undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <p className="m-0 text-[13.5px] font-medium text-[color:var(--board-ink)]">
        Ajouter une mesure
      </p>

      <ChampBoard
        id="mesure-libelle"
        name="libelle"
        label="Description"
        placeholder="ex. Révision annuelle de la friteuse par un technicien"
        requis
        erreur={erreurLibelle}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-board" htmlFor="mesure-type">
            Type *
          </label>
          {/* Le `<select>` n'a pas d'équivalent dans `ChampBoard`, qui rend un
              `<input>` : il porte donc `.champ-board` directement, plutôt que
              de recopier le rayon et le creux en littéral (interdit 26). */}
          <select
            id="mesure-type"
            name="type"
            required
            className="champ-board"
            defaultValue="reduction_source"
          >
            {Object.entries(LABEL_TYPE_MESURE).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-board" htmlFor="mesure-statut">
            Statut *
          </label>
          <select
            id="mesure-statut"
            name="statut"
            required
            className="champ-board"
            defaultValue="existante"
          >
            <option value="existante">Existante</option>
            <option value="prevue">Prévue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampBoard
          id="mesure-echeance"
          name="echeance"
          type="date"
          label="Échéance (si prévue)"
        />
        <ChampBoard
          id="mesure-responsable"
          name="responsable"
          label="Responsable"
          placeholder="Nom ou rôle"
        />
      </div>

      <Button type="submit" variant="board" size="board" enCours={pending}>
        {pending ? "Ajout…" : "Ajouter la mesure"}
      </Button>
    </form>
  );
}
