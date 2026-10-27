"use client";

// La date du dernier contrôle, saisie ligne par ligne sur la fiche d'un
// appareil (ADR-051). Une ligne par contrôle à rythme : chaque obligation a pu
// être vérifiée à une date différente.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { DateDeclareeState } from "@/lib/dernier-controle/actions";

type Action = (prev: DateDeclareeState, formData: FormData) => Promise<DateDeclareeState>;

export type LigneDateDeclaree = {
  id: string;
  libelle: string;
  /** « AAAA-MM-JJ » de la date déjà déclarée, sinon `null`. */
  declareLe: string | null;
  action: Action;
};

export function DateDernierControle({ lignes, aujourdhui }: { lignes: LigneDateDeclaree[]; aujourdhui: string }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {lignes.map((l) => (
        <li key={l.id}>
          <FormLigne ligne={l} aujourdhui={aujourdhui} />
        </li>
      ))}
    </ul>
  );
}

function FormLigne({ ligne, aujourdhui }: { ligne: LigneDateDeclaree; aujourdhui: string }) {
  const [state, formAction, pending] = useActionState<DateDeclareeState, FormData>(ligne.action, {
    status: "idle",
  });
  const champ = `dernier-controle-${ligne.id}`;
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <label htmlFor={champ} className="text-[12.5px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
        {ligne.libelle}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={champ}
          name="dernierControleLe"
          type="date"
          max={aujourdhui}
          defaultValue={ligne.declareLe ?? ""}
          required={ligne.declareLe === null}
          className="champ-board max-w-[180px]"
        />
        <Button type="submit" variant="boardClair" size="boardSm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
      {state.status === "error" ? (
        <p role="alert" className="m-0 text-[12px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
