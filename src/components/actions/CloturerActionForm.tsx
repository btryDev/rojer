"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionPlanState } from "@/lib/actions/plan";
import { MIME_AUTORISES } from "@/lib/rapports/validator";
import {
  AIDE_JUSTIFICATIF,
  AIDE_PIECE,
  LIBELLE_JUSTIFICATIF,
  LIBELLE_PIECE,
} from "@/lib/points-a-corriger/libelles";
import { MessageFait } from "@/components/ui-kit/MessageFait";

type Props = {
  action: (
    prev: ActionPlanState,
    formData: FormData,
  ) => Promise<ActionPlanState>;
  rapportsDisponibles?: { id: string; label: string }[];
  /** Un point à corriger (ADR-048) : ses mots, et la pièce justificative. */
  point?: boolean;
};

export function CloturerActionForm({ action, rapportsDisponibles, point = false }: Props) {
  const [state, formAction, pending] = useActionState<
    ActionPlanState,
    FormData
  >(action, { status: "idle" });

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label-board" htmlFor="commentaire">
          {point ? LIBELLE_JUSTIFICATIF : "Justificatif de clôture"} *
        </label>
        <textarea
          id="commentaire"
          name="commentaire"
          required
          rows={3}
          className="champ-board"
          placeholder={point ? AIDE_JUSTIFICATIF : "Décrivez brièvement l'action menée et son résultat (traçabilité)."}
        />
        {err("commentaire") && (
          <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("commentaire")}
          </p>
        )}
      </div>

      {point && (
        <div>
          <label className="label-board" htmlFor="piece">
            {LIBELLE_PIECE}
          </label>
          <input
            id="piece"
            name="piece"
            type="file"
            accept={MIME_AUTORISES.join(",")}
            aria-describedby="piece-aide"
            className="champ-board file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--board-ink)] file:px-3 file:py-1 file:text-[12px] file:font-semibold file:text-white"
          />
          <p id="piece-aide" className="m-0 mt-1.5 text-[12px] text-[color:var(--board-slate-mid)]">
            {AIDE_PIECE}
          </p>
          {err("piece") && (
            <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">{err("piece")}</p>
          )}
        </div>
      )}

      {rapportsDisponibles && rapportsDisponibles.length > 0 && (
        <div>
          <label className="label-board" htmlFor="rapportId">
            {point ? "Rapport de contre-visite (facultatif)" : "Rapport de levée (facultatif)"}
          </label>
          <select
            id="rapportId"
            name="rapportId"
            className="champ-board"
            defaultValue=""
          >
            <option value="">— Aucun rapport spécifique —</option>
            {rapportsDisponibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.status === "error" && !state.fieldErrors && (
        <p
          role="alert"
          className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]"
        >
          {state.message}
        </p>
      )}
      {/* Posée vide d'avance : une zone d'annonce insérée avec son texte
          n'est souvent pas lue par les lecteurs d'écran. */}
      <MessageFait>
        {state.status === "success" ? (point ? "Point corrigé." : "Action clôturée.") : null}
      </MessageFait>

      <div>
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Enregistrement…" : point ? "Marquer comme corrigé" : "Clôturer l'action"}
        </Button>
      </div>
    </form>
  );
}
