"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  poserSignatureAvecToken,
  renvoyerCodeOtp,
  type PoserSignatureState,
  type RenvoiOtpState,
} from "@/lib/signatures/actions";

/**
 * Formulaire de signature via lien magique, en deux temps (2026-11-19) :
 * l'adresse est connue par le jeton ; le signataire demande son code
 * (« Recevoir mon code »), qui part par un second courriel, puis le saisit
 * avec, s'il le souhaite, sa fonction.
 */
export function SignatureExterneForm({
  token,
  destinataire,
  expireLe,
  codeDejaDemande,
}: {
  token: string;
  destinataire: { email: string; nom: string | null };
  expireLe: Date;
  /** Un code est déjà parti sur ce lien (page rechargée, retour plus tard). */
  codeDejaDemande: boolean;
}) {
  const boundAction = poserSignatureAvecToken.bind(null, token);
  const [state, formAction, pending] = useActionState<
    PoserSignatureState,
    FormData
  >(boundAction, { status: "idle" });
  const [codeState, demanderCode, codeEnCours] = useActionState<RenvoiOtpState>(
    () => renvoyerCodeOtp(token),
    { status: "idle" },
  );
  const codeDemande = codeDejaDemande || codeState.status === "success";

  // Vers l'accusé de réception dès que la signature est posée. `/signe/[id]`
  // est une route dynamique sous le même layout racine, jamais visitée
  // avant (l'identifiant vient de naître) : `router.push` la rend au
  // serveur avec la signature fraîche, sans rechargement complet. Ni
  // session ni cookie n'a changé, rien n'impose une navigation « hard ».
  // (L'ancien `window.location` invoquait une iframe de démo qui n'existe
  // plus dans le dépôt.)
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success") {
      router.push(`/signe/${state.signatureId}`);
    }
  }, [state, router]);

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
    <div className="space-y-6">
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

      <form action={demanderCode} className="space-y-2">
        <Button type="submit" variant={codeDemande ? "outline" : "default"} disabled={codeEnCours}>
          {codeEnCours
            ? "Envoi du code…"
            : codeDemande
              ? "Renvoyer un code"
              : "Recevoir mon code"}
        </Button>
        {codeState.status === "idle" && !codeDemande && (
          <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
            Rojer adresse le code de confirmation à {destinataire.email}, dans un
            second e-mail.
          </p>
        )}
        {codeState.status !== "idle" && (
          <p
            role="status"
            className={
              codeState.status === "error"
                ? "text-[0.85rem] text-[color:var(--board-signal-ink)]"
                : "text-[0.85rem] text-[color:var(--board-ink)]"
            }
          >
            {codeState.message}
          </p>
        )}
      </form>

      {codeDemande && (
        <form action={formAction} className="space-y-6">
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
            <Label htmlFor="otp">Code reçu par e-mail *</Label>
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
              Code à 6 chiffres reçu dans le second e-mail. Valable 10 minutes,
              3 essais au total sur ce lien, nouveaux codes compris. Le lien expire
              le{" "}
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
      )}
    </div>
  );
}
