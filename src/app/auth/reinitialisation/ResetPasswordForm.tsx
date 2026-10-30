"use client";

// Réinitialisation du mot de passe (ADR-052) : le lien de l'e-mail porte un
// jeton (`?token=…`), transmis à l'action serveur par un champ caché.
// L'action `definirMotDePasseAction` pose le nouveau mot de passe côté
// SERVEUR, où la règle des douze caractères est vérifiée (audit OWASP B4) ;
// c'est Better Auth qui juge le jeton. Sans jeton, la page le dit tout de suite.

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import {
  definirMotDePasseAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  AIDE_MOT_DE_PASSE,
  LONGUEUR_MIN_MOT_DE_PASSE,
} from "@/lib/auth/mot-de-passe";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";

const etatInitial: AuthActionState = {};

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [state, action, pending] = useActionState(
    definirMotDePasseAction,
    etatInitial,
  );
  const error = state.error ?? null;

  if (!token) {
    return (
      <div className="flex flex-col items-start gap-5">
        <MessageFormulaire ton="alerte">Ce lien de réinitialisation est invalide ou a expiré.</MessageFormulaire>
        {/* Une porte, pas un cul-de-sac : le lien mène là où l'on en
            redemande un. */}
        <Link
          href="/login/mot-de-passe-oublie"
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          Redemander un lien →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
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
        label="Confirmer le mot de passe"
        autoComplete="new-password"
        required
        minLength={LONGUEUR_MIN_MOT_DE_PASSE}
      />

      {/* La comparaison des deux saisies est faite à la soumission, sur le
          formulaire entier : l'erreur porte sur la paire, pas sur l'un des
          deux champs. */}
      <MessageFormulaire ton="alerte">{error}</MessageFormulaire>

      <Button
        type="submit"
        variant="board"
        size="board"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Mise à jour…" : "Définir le mot de passe →"}
      </Button>
    </form>
  );
}
