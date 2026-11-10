"use client";

// Choisir un mot de passe au retour d'un lien envoyé par e-mail : la
// réinitialisation (`/auth/reinitialisation`) et l'activation du compte
// (`/auth/verification`, audit du 2026-11-10). Le lien porte un jeton
// (`?token=…`), transmis à l'action serveur par un champ caché ; l'action pose
// le mot de passe côté SERVEUR, où la règle des douze caractères est vérifiée
// (audit OWASP B4), et c'est Better Auth qui juge le jeton. Sans jeton, la
// page le dit tout de suite.

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import type { AuthActionState } from "@/lib/auth/actions";
import { AIDE_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";

const etatInitial: AuthActionState = {};

export function FormulaireMotDePasse({
  token,
  action: actionServeur,
  libelleChamp,
  libelleBouton,
  libelleEnCours,
  lienInvalide,
}: {
  token: string | null;
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  libelleChamp: string;
  libelleBouton: string;
  libelleEnCours: string;
  /** Sans jeton : le message, et la porte vers où l'on en redemande un. */
  lienInvalide: { message: string; href: string; libelle: string };
}) {
  const [state, action, pending] = useActionState(actionServeur, etatInitial);
  const error = state.error ?? null;

  if (!token) {
    return (
      <div className="flex flex-col items-start gap-5">
        <MessageFormulaire ton="alerte">{lienInvalide.message}</MessageFormulaire>
        {/* Une porte, pas un cul-de-sac : le lien mène là où l'on en
            redemande un. */}
        <Link href={lienInvalide.href} className={buttonVariants({ variant: "boardClair", size: "board" })}>
          {lienInvalide.libelle}
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
        label={libelleChamp}
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

      <Button type="submit" variant="board" size="board" disabled={pending} className="w-full">
        {pending ? libelleEnCours : libelleBouton}
      </Button>
    </form>
  );
}
