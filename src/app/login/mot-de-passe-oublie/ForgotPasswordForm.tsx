"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  if (state.message) {
    // Le message est volontairement le même que le compte existe ou non
    // (cf. l'action) : le registre calme du glacier le dit sans laisser
    // croire à un accusé de réception personnel.
    return (
      <MessageFormulaire ton="info">{state.message}</MessageFormulaire>
    );
  }

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

      <MessageFormulaire ton="alerte">{state.error}</MessageFormulaire>

      <Button
        type="submit"
        variant="board"
        size="board"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Envoi…" : "Recevoir le lien →"}
      </Button>
    </form>
  );
}
