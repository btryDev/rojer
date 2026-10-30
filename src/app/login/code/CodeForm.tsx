"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { CASE_A_COCHER } from "@/components/ui-kit/case-a-cocher";
import { verifierSecondFacteurAction, type AuthActionState } from "@/lib/auth/actions";

const etatInitial: AuthActionState = {};

export function CodeForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(verifierSecondFacteurAction, etatInitial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      {/* Un seul champ pour les deux sortes de code : l'action les distingue
          à la forme (six chiffres, ou dix lettres et chiffres). Pas de
          `inputMode="numeric"`, qui cacherait les lettres d'un code de
          secours au clavier du téléphone. */}
      <ChampBoard
        id="code"
        name="code"
        label="Code"
        autoComplete="one-time-code"
        autoCapitalize="off"
        spellCheck={false}
        required
        autoFocus
        aide="Six chiffres dans l'application, ou un code de secours (il ne servira qu'une fois)."
      />

      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="confiance" className={CASE_A_COCHER} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
            Faire confiance à cet appareil pendant 30 jours
          </span>
          <span className="mt-1 block text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Le code ne sera plus demandé ici. Pas sur un poste partagé.
          </span>
        </span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="m-0 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="board" size="board" disabled={pending} className="w-full">
        {pending ? "Vérification…" : "Valider →"}
      </Button>
    </form>
  );
}
