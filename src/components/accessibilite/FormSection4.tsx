"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { sauverSection4 } from "@/lib/accessibilite/actions";
import type { RegistreActionState } from "@/lib/accessibilite/actions";
import { cleJourCivil } from "@/lib/dates";

// Valeur d'un `<input type="date">` : le jour civil de Paris, jamais la
// date UTC. Sur une date stockée à minuit UTC les deux coïncident, mais
// pas sur un horodatage réel — et le composant est client (cf. ADR-011).
function fmtDate(d: Date | null): string {
  if (!d) return "";
  return cleJourCivil(d);
}

export function FormSection4({
  etablissementId,
  initial,
}: {
  etablissementId: string;
  initial: {
    equipementsAccessibilite: string | null;
    modalitesMaintenance: string | null;
    dernierControleMaintenance: Date | null;
  } | null;
}) {
  const boundAction = sauverSection4.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    RegistreActionState,
    FormData
  >(boundAction, { status: "idle" });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label className="label-board" htmlFor="equipementsAccessibilite">
          Équipements d&apos;accessibilité présents
        </label>
        <textarea
          id="equipementsAccessibilite"
          name="equipementsAccessibilite"
          defaultValue={initial?.equipementsAccessibilite ?? ""}
          rows={4}
          maxLength={4000}
          className="champ-board min-h-[104px] resize-y"
          placeholder="Ex : rampe d'accès en entrée, plateforme élévatrice vers la salle, sanitaires PMR au RDC, bande de guidage podotactile, boucle magnétique au comptoir."
        />
      </div>

      <div>
        <label className="label-board" htmlFor="modalitesMaintenance">
          Modalités de maintenance de ces équipements
        </label>
        <textarea
          id="modalitesMaintenance"
          name="modalitesMaintenance"
          defaultValue={initial?.modalitesMaintenance ?? ""}
          rows={4}
          maxLength={4000}
          className="champ-board min-h-[104px] resize-y"
          placeholder="Ex : contrôle annuel de la plateforme élévatrice par Otis, vérification mensuelle des bandes podotactiles en interne, contrat de maintenance boucle magnétique avec Sonova."
        />
      </div>

      <ChampBoard
        id="dernierControleMaintenance"
        name="dernierControleMaintenance"
        label="Date du dernier contrôle de maintenance"
        type="date"
        defaultValue={fmtDate(initial?.dernierControleMaintenance ?? null)}
        className="max-w-xs"
      />

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.section === 4 && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          ✓ Section 4 enregistrée.
        </p>
      )}

      <div>
        <Button type="submit" variant="board" size="board" enCours={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la section 4"}
        </Button>
      </div>
    </form>
  );
}
