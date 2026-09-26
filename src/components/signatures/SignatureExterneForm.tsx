"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  poserSignatureAvecToken,
  type PoserSignatureState,
} from "@/lib/signatures/actions";

/**
 * Formulaire de signature via lien magique : on connaît déjà l'email (via
 * le token), le signataire saisit simplement son OTP et éventuellement
 * sa fonction, puis confirme.
 */
export function SignatureExterneForm({
  token,
  destinataire,
  expireLe,
}: {
  token: string;
  destinataire: { email: string; nom: string | null };
  expireLe: Date;
}) {
  const boundAction = poserSignatureAvecToken.bind(null, token);
  const [state, formAction, pending] = useActionState<
    PoserSignatureState,
    FormData
  >(boundAction, { status: "idle" });

  // Redirection navigateur vers la page de confirmation dès que la
  // signature est posée. On utilise window.location plutôt que router.push
  // parce que la page publique n'est pas dans l'arbre Next habituel et on
  // veut une navigation « hard » (nouveau RSC rendu avec la signature fraîche).
  useEffect(() => {
    if (state.status === "success") {
      const href = `/signe/${state.signatureId}`;
      // Si on est dans une iframe (modal de démo local), on fait la
      // navigation dans l'iframe pour que le parent puisse aussi détecter
      // et rafraîchir.
      window.location.href = href;
    }
  }, [state]);

  if (state.status === "success") {
    // Transition — la page de confirmation va s'afficher immédiatement.
    return (
      <div className="rounded-2xl border border-[color:var(--board-green-ink)]/40 bg-[color:var(--board-green)] p-8 text-center">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Redirection…</p>
        <p className="mt-2 text-[0.9rem] text-[color:var(--board-ink)]">
          Votre signature est enregistrée. Vous allez être redirigé(e) vers
          l&apos;accusé de réception.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] p-4">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Identité (remplie automatiquement)</p>
        <dl className="mt-2 grid grid-cols-1 gap-y-1 text-[0.85rem] sm:grid-cols-[auto_1fr] sm:gap-x-4">
          {destinataire.nom && (
            <>
              <dt className="text-[color:var(--muted-foreground)]">Nom :</dt>
              <dd className="text-[color:var(--board-ink)]">{destinataire.nom}</dd>
            </>
          )}
          <dt className="text-[color:var(--muted-foreground)]">Email :</dt>
          <dd className="font-mono text-[color:var(--board-ink)]">{destinataire.email}</dd>
        </dl>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signataireRole">
          Votre fonction <span className="text-[color:var(--muted-foreground)]">(facultatif)</span>
        </Label>
        <Input
          id="signataireRole"
          name="signataireRole"
          placeholder="Ex : Technicien, Chef d'entreprise, Contrôleur…"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp">Code reçu par email *</Label>
        <Input
          id="otp"
          name="otp"
          required
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="• • • • • •"
          className="text-center font-mono text-2xl tracking-[0.4em]"
          autoComplete="one-time-code"
        />
        <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
          Code à 6 chiffres reçu dans l&apos;email. Valable 10 minutes, 3 essais
          maximum. Lien expire le{" "}
          {expireLe.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Paris",
          })}
          .
        </p>
      </div>

      {state.status === "error" && (
        <div className="rounded-lg border border-[color:var(--board-signal-ink)]/40 bg-[color:color-mix(in_oklch,var(--board-signal-ink)_8%,transparent)] p-3 text-[0.85rem] text-[color:var(--board-signal-ink)]">
          {state.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Signature en cours…" : "Signer électroniquement"}
        </Button>
      </div>

      <p className="text-[0.72rem] leading-relaxed text-[color:var(--muted-foreground)]">
        {/* ~~« vous apposez une signature au sens de l'article 1367 du Code
            civil »~~ — une qualification (vérification du 2026-09-26) :
            aligné sur `/verifier`. */}
        En cliquant sur « Signer électroniquement », vous signez ce document.
        Seront enregistrés : votre email, votre adresse IP, l&apos;empreinte
        SHA-256 du document et l&apos;horodatage serveur. Textes : art. 1366 et
        1367 du Code civil · règlement (UE) n° 910/2014.
      </p>
    </form>
  );
}
