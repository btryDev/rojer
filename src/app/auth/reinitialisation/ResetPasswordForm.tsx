"use client";

// Réinitialisation du mot de passe. Deux formes de lien atterrissent ici :
// - flux PKCE (resetPasswordForEmail depuis l'app) : ?code=… — le client
//   browser échange le code contre une session à l'initialisation ;
// - flux implicite (lien envoyé manuellement depuis le dashboard Supabase) :
//   #access_token=…&type=recovery — détecté via detectSessionInUrl.
// Dans les deux cas la session finit dans les cookies (@supabase/ssr), puis
// l'action serveur `definirMotDePasseAction` pose le nouveau mot de passe —
// côté serveur, où la règle des douze caractères est vérifiée (audit OWASP B4,
// 2026-10-14 ; c'était `updateUser` depuis le navigateur).

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

const etatInitial: AuthActionState = {};

type Status = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status>("checking");
  const [state, action, pending] = useActionState(
    definirMotDePasseAction,
    etatInitial,
  );
  const error = state.error ?? null;

  useEffect(() => {
    // Lien expiré ou déjà utilisé : Supabase renvoie l'erreur dans le hash.
    if (/error/.test(window.location.hash)) {
      // Lecture client-only (hash d'URL) : impossible au premier rendu SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("invalid");
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setStatus("ready");
    });
    // Même traitement que côté serveur (proxy, require-user) : un refresh
    // token périmé fait rejeter getSession — on le traite comme « pas de
    // session » au lieu de laisser la promesse rejeter sans handler.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) setStatus("ready");
      })
      .catch(() => {});
    // Si aucune session n'apparaît (lien invalide, autre navigateur pour un
    // lien PKCE…), on bascule en erreur plutôt que d'attendre indéfiniment.
    const timer = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 5000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase]);

  if (status === "checking") {
    return (
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
        Vérification du lien…
      </p>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col items-start gap-5">
        <p
          role="alert"
          className="m-0 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]"
        >
          Ce lien de réinitialisation est invalide ou a expiré.
        </p>
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
      {error ? (
        <p
          role="alert"
          className="m-0 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]"
        >
          {error}
        </p>
      ) : null}

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
