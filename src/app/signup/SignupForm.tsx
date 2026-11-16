"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";

const initialState: AuthActionState = {};

/**
 * L'adresse seule (retours de test du 2026-11-16) : le mot de passe se
 * choisit à l'activation, par le lien reçu (`activation.ts`).
 */
export function SignupForm({ offre = null }: { offre?: string | null }) {
  const [state, action, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      {offre && <input type="hidden" name="offre" value={offre} />}
      <ChampBoard
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
        placeholder="vous@exemple.fr"
        aide="Un lien d'activation part à cette adresse : vous y choisirez votre mot de passe. Vérifiez-la bien."
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
