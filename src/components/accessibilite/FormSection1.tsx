"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sauverSection1 } from "@/lib/accessibilite/actions";
import type { RegistreActionState } from "@/lib/accessibilite/actions";
import { HANDICAPS, LABEL_HANDICAP } from "@/lib/accessibilite/schema";
import type { HandicapAccessible } from "@prisma/client";

export function FormSection1({
  etablissementId,
  initial,
}: {
  etablissementId: string;
  initial: {
    prestationsFournies: string | null;
    handicapsAccueillis: HandicapAccessible[];
    servicesAdaptes: string | null;
  } | null;
}) {
  const boundAction = sauverSection1.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    RegistreActionState,
    FormData
  >(boundAction, { status: "idle" });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label className="label-board" htmlFor="prestationsFournies">
          Prestations fournies par l&apos;établissement *
        </label>
        <textarea
          id="prestationsFournies"
          name="prestationsFournies"
          defaultValue={initial?.prestationsFournies ?? ""}
          rows={4}
          maxLength={4000}
          className="champ-board min-h-[104px] resize-y"
          placeholder="Ex : restaurant traditionnel, 48 couverts, service midi et soir. Terrasse en saison. Paiement CB, espèces, titres-restaurant."
        />
      </div>

      <fieldset>
        <legend className="label-board">
          Types de handicaps pour lesquels l&apos;établissement est adapté
        </legend>
        <p className="m-0 mb-2 max-w-[var(--board-mesure)] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Cochez les catégories concernées — l&apos;arrêté du 19-04-2017 impose
          d&apos;informer le public sur ce point.
        </p>
        <div className="flex flex-wrap gap-2">
          {HANDICAPS.map((h) => (
            <label
              key={h}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[color:var(--board-slate-pale)] px-3 py-1.5 text-[12px] font-medium text-[color:var(--board-slate-mid)] transition-colors has-[:checked]:bg-[color:var(--board-blue-pale)] has-[:checked]:text-[color:var(--board-blue-ink)]"
            >
              <input
                type="checkbox"
                name="handicapsAccueillis"
                value={h}
                defaultChecked={initial?.handicapsAccueillis.includes(h)}
                className="sr-only"
              />
              {LABEL_HANDICAP[h]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label-board" htmlFor="servicesAdaptes">
          Adaptations et services disponibles
        </label>
        <textarea
          id="servicesAdaptes"
          name="servicesAdaptes"
          defaultValue={initial?.servicesAdaptes ?? ""}
          rows={4}
          maxLength={4000}
          className="champ-board min-h-[104px] resize-y"
          placeholder="Ex : menu en gros caractères disponible à la demande, personnel formé à l'accueil, place de parking PMR à 20 m, sanitaires accessibles au rez-de-chaussée."
        />
      </div>

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.section === 1 && (
        // Le vert du board dit « fait » : ici il porte un fait de saisie —
        // la section est enregistrée —, jamais un jugement de conformité.
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          ✓ Section 1 enregistrée.
        </p>
      )}

      <div>
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la section 1"}
        </Button>
      </div>
    </form>
  );
}
