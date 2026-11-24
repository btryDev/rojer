"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { sauverSection2 } from "@/lib/accessibilite/actions";
import type { RegistreActionState } from "@/lib/accessibilite/actions";
import { REGIMES, LABEL_REGIME } from "@/lib/accessibilite/schema";
import type { RegimeConformiteErp } from "@prisma/client";
import { cleJourCivil } from "@/lib/dates";

// Valeur d'un `<input type="date">` : le jour civil de Paris, jamais la
// date UTC. Sur une date stockée à minuit UTC les deux coïncident, mais
// pas sur un horodatage réel — et le composant est client (cf. ADR-011).
function fmtDate(d: Date | null): string {
  if (!d) return "";
  return cleJourCivil(d);
}

export function FormSection2({
  etablissementId,
  initial,
}: {
  etablissementId: string;
  initial: {
    conformiteRegime: RegimeConformiteErp | null;
    dateConformite: Date | null;
    numeroAttestationAccess: string | null;
    dateDepotAdap: Date | null;
  } | null;
}) {
  const boundAction = sauverSection2.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    RegistreActionState,
    FormData
  >(boundAction, { status: "idle" });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset>
        <legend className="label-board">
          Régime de conformité de l&apos;établissement *
        </legend>
        <div className="flex flex-col gap-2">
          {REGIMES.map((r) => (
            // Le choix retenu prend le champ bleu du board, pas un liseré
            // coloré : le board dit l'état par un champ et une encre.
            <label
              key={r}
              className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-4 py-3 transition-colors has-[:checked]:border-[color:var(--board-blue-strong)] has-[:checked]:bg-[color:var(--board-blue-pale)]"
            >
              <input
                type="radio"
                name="conformiteRegime"
                value={r}
                defaultChecked={initial?.conformiteRegime === r}
                className="mt-0.5 size-4 accent-[color:var(--board-ink)]"
              />
              <span className="text-[13.5px] leading-[1.5] text-[color:var(--board-slate-ink)]">
                {LABEL_REGIME[r]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ChampBoard
          id="dateConformite"
          name="dateConformite"
          label="Date de mise en conformité"
          type="date"
          defaultValue={fmtDate(initial?.dateConformite ?? null)}
        />
        <ChampBoard
          id="numeroAttestationAccess"
          name="numeroAttestationAccess"
          label="N° d'attestation d'accessibilité"
          defaultValue={initial?.numeroAttestationAccess ?? ""}
          maxLength={120}
        />
      </div>

      <ChampBoard
        id="dateDepotAdap"
        name="dateDepotAdap"
        label="Date de dépôt de l'Ad'AP"
        aide="Si applicable."
        type="date"
        defaultValue={fmtDate(initial?.dateDepotAdap ?? null)}
      />

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.section === 2 && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          ✓ Section 2 enregistrée.
        </p>
      )}

      <div>
        <Button type="submit" variant="board" size="board" enCours={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la section 2"}
        </Button>
      </div>
    </form>
  );
}
