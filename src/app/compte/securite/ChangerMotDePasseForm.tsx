"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { changerMotDePasseAction, type AuthActionState } from "@/lib/auth/actions";
import { AIDE_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";

const etatInitial: AuthActionState = {};

export function ChangerMotDePasseForm() {
  const [state, action, pending] = useActionState(changerMotDePasseAction, etatInitial);
  return (
    <form action={action} className="flex flex-col gap-5">
      <ChampBoard
        id="actuel"
        name="actuel"
        type="password"
        label="Mot de passe actuel"
        autoComplete="current-password"
        required
      />
      <ChampBoard
        id="password"
        name="password"
        type="password"
        label="Nouveau mot de passe"
        autoComplete="new-password"
        required
        minLength={LONGUEUR_MIN_MOT_DE_PASSE}
        aide={AIDE_MOT_DE_PASSE}
      />
      <ChampBoard
        id="confirm"
        name="confirm"
        type="password"
        label="Confirmer le nouveau mot de passe"
        autoComplete="new-password"
        required
        minLength={LONGUEUR_MIN_MOT_DE_PASSE}
      />
      {state.error ? (
        <p
          role="alert"
          className="m-0 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="m-0 rounded-[18px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-blue-ink)]"
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="board" size="board" disabled={pending} className="w-full">
        {pending ? "Changement…" : "Changer le mot de passe →"}
      </Button>
    </form>
  );
}
