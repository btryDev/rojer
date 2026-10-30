"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";
import {
  AIDE_MOT_DE_PASSE,
  LONGUEUR_MIN_MOT_DE_PASSE,
} from "@/lib/auth/mot-de-passe";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";

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
        minLength={LONGUEUR_MIN_MOT_DE_PASSE}
        aide={AIDE_MOT_DE_PASSE}
      />

      <MessageFormulaire ton="alerte">{state.error}</MessageFormulaire>

      <MessageFormulaire ton="info">{state.message}</MessageFormulaire>

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
