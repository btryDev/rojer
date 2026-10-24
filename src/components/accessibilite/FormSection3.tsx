"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { sauverSection3 } from "@/lib/accessibilite/actions";
import type { RegistreActionState } from "@/lib/accessibilite/actions";
import { cleJourCivil } from "@/lib/dates";

// Valeur d'un `<input type="date">` : le jour civil de Paris, jamais la
// date UTC. Sur une date stockée à minuit UTC les deux coïncident, mais
// pas sur un horodatage réel — et le composant est client (cf. ADR-011).
function fmtDate(d: Date | null): string {
  if (!d) return "";
  return cleJourCivil(d);
}

export function FormSection3({
  etablissementId,
  initial,
}: {
  etablissementId: string;
  initial: {
    personnelForme: boolean;
    dateDerniereFormation: Date | null;
    organismeFormation: string | null;
    effectifForme: number | null;
  } | null;
}) {
  const boundAction = sauverSection3.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    RegistreActionState,
    FormData
  >(boundAction, { status: "idle" });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-4 py-3 transition-colors has-[:checked]:border-[color:var(--board-blue-strong)] has-[:checked]:bg-[color:var(--board-blue-pale)]">
        <input
          type="checkbox"
          name="personnelForme"
          defaultChecked={initial?.personnelForme ?? false}
          className="mt-0.5 size-4 accent-[color:var(--board-ink)]"
        />
        <div>
          <p className="m-0 text-[13.5px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
            Le personnel d&apos;accueil a été formé à l&apos;accueil des
            personnes en situation de handicap
          </p>
          <p className="m-0 mt-1 max-w-[var(--board-mesure)] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            L&apos;arrêté du 19-04-2017 impose de décrire les actions de formation
            du personnel en contact avec le public.
          </p>
        </div>
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ChampBoard
          id="dateDerniereFormation"
          name="dateDerniereFormation"
          label="Date de dernière formation"
          type="date"
          defaultValue={fmtDate(initial?.dateDerniereFormation ?? null)}
        />
        <ChampBoard
          id="effectifForme"
          name="effectifForme"
          label="Effectif formé"
          type="number"
          min={0}
          defaultValue={initial?.effectifForme ?? ""}
        />
      </div>

      <ChampBoard
        id="organismeFormation"
        name="organismeFormation"
        label="Organisme formateur"
        defaultValue={initial?.organismeFormation ?? ""}
        maxLength={200}
        placeholder="Ex : AFPA, CCI, formation interne encadrée par…"
      />

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.section === 3 && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          ✓ Section 3 enregistrée.
        </p>
      )}

      <div>
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la section 3"}
        </Button>
      </div>
    </form>
  );
}
