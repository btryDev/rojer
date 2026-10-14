"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <ChampBoard
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
        placeholder="vous@exemple.fr"
      />

      <div>
        <ChampBoard
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          autoComplete="current-password"
          required
        />
        {/* Sous le champ et non dans la ligne du libellé : `ChampBoard` pose
            son propre <label>, et y glisser un lien reviendrait à réécrire le
            champ à la main pour un placement. On y gagne l'ordre de
            tabulation attendu — on n'atteint « Oublié ? » qu'après avoir
            essayé de taper son mot de passe. */}
        <p className="m-0 mt-2 text-right text-[12.5px]">
          <Link
            href="/login/mot-de-passe-oublie"
            className="text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-blue-ink)]"
          >
            Oublié ?
          </Link>
        </p>
      </div>

      {/* Erreur de formulaire, pas de champ : le message ne dit jamais lequel
          des deux identifiants est en cause. Le voile porte donc l'erreur au
          niveau du bloc, là où `ChampBoard` la poserait sous un champ. */}
      {state.error ? (
        <p
          role="alert"
          className="m-0 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="board"
        size="board"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Connexion…" : "Se connecter →"}
      </Button>
    </form>
  );
}
