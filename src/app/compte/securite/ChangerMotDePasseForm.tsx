"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { ChampMotDePasse } from "@/components/ui-kit/ChampMotDePasse";
import { changerMotDePasseAction, type AuthActionState } from "@/lib/auth/actions";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";

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
      {/* Un seul champ, avec un œil, comme à l'activation (2026-11-16). */}
      <ChampMotDePasse label="Nouveau mot de passe" />
      <MessageFormulaire ton="alerte">{state.error}</MessageFormulaire>
      <MessageFormulaire ton="info">{state.message}</MessageFormulaire>
      <Button type="submit" variant="board" size="board" disabled={pending} className="w-full">
        {pending ? "Changement…" : "Changer le mot de passe →"}
      </Button>
    </form>
  );
}
