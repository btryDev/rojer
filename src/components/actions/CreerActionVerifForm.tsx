"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { TYPES_ACTION } from "@/lib/actions/schema";
import { LABEL_TYPE_ACTION } from "@/lib/actions/labels";
import type { ActionPlanState } from "@/lib/actions/plan";
import { ORDRE_SELON_L4121_2 } from "@/lib/verbatim/l4121-2-ordre";

type Props = {
  action: (
    prev: ActionPlanState,
    formData: FormData,
  ) => Promise<ActionPlanState>;
  labelAnnuler?: { libelle: string; href: string };
};

export function CreerActionVerifForm({ action, labelAnnuler }: Props) {
  const [state, formAction, pending] = useActionState<
    ActionPlanState,
    FormData
  >(action, { status: "idle" });

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <ChampBoard
        id="libelle"
        name="libelle"
        label="Libellé de l'action"
        requis
        placeholder="Ex : Remettre en état le BAES de l'entrée principale"
        erreur={err("libelle")}
      />

      <div>
        <label className="label-board" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="champ-board"
          placeholder="Détails : référence, localisation, étapes prévues…"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-board" htmlFor="type">
            Type de mesure *
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue="reduction_source"
            className="champ-board"
            aria-describedby="type-aide"
          >
            {TYPES_ACTION.map((t) => (
              <option key={t} value={t}>
                {LABEL_TYPE_ACTION[t]}
              </option>
            ))}
          </select>
          {/* La hiérarchie des mesures se lit en clair sous le champ : une
              infobulle n'existe pas au doigt. */}
          <p
            id="type-aide"
            className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
          >
            {ORDRE_SELON_L4121_2}{" "}
            L&apos;ordre des types proposés est un
            classement de Rojer.
          </p>
        </div>

        <ChampBoard
          id="criticite"
          name="criticite"
          label="Criticité (1-5)"
          // Un champ `type="number"` change de valeur à la molette, sur une
          // saisie déjà faite et sans que rien ne le signale.
          type="text"
          inputMode="numeric"
          placeholder="3"
          aide="1 = correctif mineur, 5 = priorité vitale. Sert au tri du plan d'actions. Facultatif."
          erreur={err("criticite")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampBoard
          id="echeance"
          name="echeance"
          label="Échéance prévue"
          type="date"
          erreur={err("echeance")}
        />

        <ChampBoard
          id="responsable"
          name="responsable"
          label="Responsable"
          placeholder="Ex : DAF, prestataire"
          erreur={err("responsable")}
        />
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          Action créée.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Création…" : "Créer l'action"}
        </Button>
        {labelAnnuler && (
          <Link
            href={labelAnnuler.href}
            className={buttonVariants({
              variant: "boardClair",
              size: "board",
            })}
          >
            {labelAnnuler.libelle}
          </Link>
        )}
      </div>
    </form>
  );
}
