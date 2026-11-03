"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import type { ActionState } from "@/lib/entreprises/actions";

type Valeurs = {
  raisonSociale?: string;
  effectif?: number;
  adresse?: string;
};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  valeursInitiales?: Valeurs;
  libelleSubmit: string;
  labelAnnuler?: { libelle: string; href: string };
};

export function EntrepriseForm({
  action,
  valeursInitiales,
  libelleSubmit,
  labelAnnuler,
}: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    { status: "idle" },
  );

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ChampBoard
        id="raisonSociale"
        name="raisonSociale"
        label="Raison sociale"
        requis
        defaultValue={valeursInitiales?.raisonSociale}
        erreur={err("raisonSociale")}
      />

      {/* ~~SIRET et code NAF~~ [2026-10-26 : ils appartiennent à l'établissement et se
          saisissent sur la fiche de l'établissement.] */}

      {/* [2026-11-03 : l'effectif n'est plus saisi ici. Il est la somme des
          établissements, déclarés chacun dans Équipe, et des salariés hors
          Rojer — `entreprises/effectif.ts`.] */}
      {valeursInitiales?.effectif !== undefined ? (
        <p id="effectif" className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Salariés de la société, tous établissements, apprentis non compris :{" "}
          <span className="font-mono tabular-nums text-[color:var(--board-ink)]">
            {valeursInitiales.effectif}
          </span>
          . Ce nombre se calcule depuis la page Équipe de chaque établissement.
        </p>
      ) : null}

      <ChampBoard
        id="adresse"
        name="adresse"
        label="Adresse"
        requis
        defaultValue={valeursInitiales?.adresse}
        erreur={err("adresse")}
      />

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          Enregistré.
        </p>
      )}
      {state.status === "success_avec_avertissement" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Enregistrement…" : libelleSubmit}
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
