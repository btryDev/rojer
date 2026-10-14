"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <ChampBoard
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
        placeholder="vous@exemple.fr"
      />

      {/* La contrainte passe en `aide` : posée là, elle est lue avec le champ
          par un lecteur d'écran (aria-describedby) au lieu de flotter à côté
          en petites capitales. */}
      <ChampBoard
        id="password"
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="new-password"
        required
        minLength={8}
        aide="8 caractères minimum"
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
        <p className="m-0 rounded-[18px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[13px] leading-[1.5] text-[color:var(--board-blue-ink)]">
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="board"
        size="board"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Création…" : "Créer mon compte →"}
      </Button>
    </form>
  );
}
