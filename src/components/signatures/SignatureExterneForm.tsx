"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formaterDateLongueFr, formaterHeureFr } from "@/lib/dates";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { phraseNouveauCode, phraseValiditeCode } from "./EtapesCodeSignature";
import {
  poserSignatureAvecToken,
  renvoyerCodeOtp,
  type PoserSignatureState,
  type RenvoiOtpState,
} from "@/lib/signatures/actions";

/**
 * Formulaire de signature via lien magique (cahier de reprise § 3.2,
 * 2026-11-19). ~~« Recevoir mon code », puis le code~~ : le bouton
 * principal est « Signer » ; le clic demande le code (`renvoyerCodeOtp`,
 * inchangée — 60 s entre deux codes, 5 par heure et par adresse, 3 essais
 * par lien) et ouvre l'étape du code. Un code déjà demandé sur ce lien
 * (page rechargée, retour plus tard) ouvre directement cette étape.
 *
 * Le signataire ne tape ni son nom ni son adresse : ils viennent du jeton.
 */

const essais = (n: number) => `${n} essai${n > 1 ? "s" : ""}`;

/** Le délai entre deux codes (`OTP_DELAI_RENVOI_SECONDES`, 60 s). */
const DELAI_RENVOI_MS = 60_000;
/** La validité d'un code (`OTP_TTL_MINUTES`, 10 min). */
const VALIDITE_CODE_MS = 10 * 60_000;

type EtatCode =
  | Exclude<RenvoiOtpState, { status: "success" }>
  | { status: "success"; message: string; renvoiA: number; expireA: number };

/**
 * Les secondes qui restent avant `cible`, arrondies au-dessus ; 0 passé.
 * `null` : l'heure de l'écran n'est pas encore lue.
 */
function secondesAvant(cible: number | null, maintenant: number | null): number | null {
  if (cible === null) return 0;
  if (maintenant === null) return null;
  return Math.max(0, Math.ceil((cible - maintenant) / 1000));
}

export function SignatureExterneForm({
  token,
  destinataire,
  expireLe,
  codeDejaDemande,
  essaisRestants,
  renvoiPossibleLe,
  codeExpireLe,
  proposer,
}: {
  token: string;
  destinataire: { email: string; nom: string | null };
  expireLe: Date;
  /** Un code est déjà parti sur ce lien (page rechargée, retour plus tard). */
  codeDejaDemande: boolean;
  /** Les essais de code qui restent sur le lien (`otpEssaisRestants`). */
  essaisRestants: number;
  /** Quand un nouveau code pourra être demandé (`renvoiOtpPossibleLe`). */
  renvoiPossibleLe: Date | null;
  /** La fin de validité du dernier code parti sur ce lien (`otpExpireLe`), dite sous le champ. */
  codeExpireLe: Date | null;
  /**
   * « Proposer des modifications » : présent sur le lien de l'entreprise
   * extérieure d'un plan seulement (ADR-061 § 3).
   */
  proposer?: () => void;
}) {
  const boundAction = poserSignatureAvecToken.bind(null, token);
  const [state, formAction, pending] = useActionState<PoserSignatureState, FormData>(
    boundAction,
    { status: "idle" },
  );
  // L'instant de l'envoi réussi, noté au retour de l'action : il ouvre le
  // compte à rebours du renvoi (60 s, la règle de `renvoiOtpAutorise`).
  const [codeState, demanderCode, codeEnCours] = useActionState<EtatCode>(
    async () => {
      const r = await renvoyerCodeOtp(token);
      const t = Date.now();
      return r.status === "success" ? { ...r, renvoiA: t + DELAI_RENVOI_MS, expireA: t + VALIDITE_CODE_MS } : r;
    },
    { status: "idle" },
  );
  const codeDemande = codeDejaDemande || codeState.status === "success";
  const envoyeIci = codeState.status === "success";
  // Un code faux décompte un essai : la réponse dit combien il en reste.
  const restants =
    state.status === "error" && state.restants !== undefined ? state.restants : essaisRestants;

  // Le compte à rebours, au navigateur seulement : l'heure du serveur et
  // celle de l'écran ne coïncident pas au rendu. `null` tant qu'elle n'est
  // pas lue — le lien reste alors fermé, sans chiffre.
  const [maintenant, setMaintenant] = useState<number | null>(null);
  useEffect(() => {
    const tic = () => setMaintenant(Date.now());
    const premier = setTimeout(tic, 0);
    const minuterie = setInterval(tic, 1000);
    return () => {
      clearTimeout(premier);
      clearInterval(minuterie);
    };
  }, []);
  const renvoiA =
    codeState.status === "success" ? codeState.renvoiA : (renvoiPossibleLe?.getTime() ?? null);
  const attente = secondesAvant(renvoiA, maintenant);
  const expireA = codeState.status === "success" ? codeState.expireA : (codeExpireLe?.getTime() ?? null);
  const validite =
    expireA === null
      ? "Valable 10 minutes"
      : maintenant !== null && expireA <= maintenant
        ? "Ce code a expiré : demandez-en un nouveau"
        : phraseValiditeCode(new Date(expireA));

  // La confirmation reste sur le lien (2026-11-21, ADR-006 amendée : plus
  // d'accusé public `/signe`). `router.refresh` relit la page : le lien,
  // consommé, y affiche la date de la signature.
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state, router]);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-[18px] bg-[color:var(--board-canvas)] px-5 py-5 text-center">
        <p className="m-0 font-mono text-[10.5px] tracking-[0.14em] uppercase text-[color:var(--board-slate-soft)]">
          Signature enregistrée
        </p>
        <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-ink)]">
          Quand toutes les parties auront signé, Rojer adresse à chaque signataire
          un e-mail avec l&apos;empreinte du document.
        </p>
      </div>
    );
  }

  const lienProposer = proposer ? (
    <div className="border-t border-[color:var(--board-slate-line)] pt-4 text-center">
      <p className="m-0 text-[13px] text-[color:var(--board-slate-mid)]">Un point ne convient pas ?</p>
      <button
        type="button"
        onClick={proposer}
        className="mt-1 text-[13.5px] font-semibold text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
      >
        Proposer des modifications →
      </button>
    </div>
  ) : null;

  const erreurCode =
    codeState.status === "error" ? (
      <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
        {codeState.message}
      </p>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-[18px] bg-[color:var(--board-canvas)] px-4 py-3">
        <p className="m-0 font-mono text-[10px] tracking-[0.12em] uppercase text-[color:var(--board-slate-soft)]">
          Vous signez en tant que
        </p>
        <dl className="m-0 mt-2 grid grid-cols-1 gap-y-1 text-[13.5px] sm:grid-cols-[auto_1fr] sm:gap-x-4">
          {destinataire.nom && destinataire.nom.trim().toLowerCase() !== destinataire.email.trim().toLowerCase() && (
            <>
              <dt className="text-[color:var(--board-slate-mid)]">Nom</dt>
              <dd className="m-0 text-[color:var(--board-ink)]">{destinataire.nom}</dd>
            </>
          )}
          <dt className="text-[color:var(--board-slate-mid)]">Adresse</dt>
          <dd className="m-0 font-mono text-[color:var(--board-ink)] break-all">{destinataire.email}</dd>
        </dl>
      </div>

      {!codeDemande ? (
        <form action={demanderCode} className="space-y-3">
          <Button type="submit" variant="board" size="board" className="min-h-14 w-full rounded-full font-display text-[18px]" disabled={codeEnCours}>
            {codeEnCours ? "Envoi du code…" : "Signer"}
          </Button>
          <p className="m-0 text-center text-[12.5px] text-[color:var(--board-slate-mid)]">
            Le clic sur « Signer » adresse un code de confirmation à {destinataire.email},
            dans un second e-mail, à saisir ici.
          </p>
          {erreurCode}
          {lienProposer}
        </form>
      ) : (
        <div className="space-y-5">
          <div
            role="status"
            className="rounded-[18px] bg-[color:var(--board-canvas)] px-4 py-3 text-[13.5px] leading-[1.55] text-[color:var(--board-slate-ink)]"
          >
            {envoyeIci ? (
              <p className="m-0">Un code à 6 chiffres a été envoyé à <strong>{destinataire.email}</strong>.</p>
            ) : (
              <p className="m-0">
                Un code à 6 chiffres a déjà été demandé sur ce lien : cherchez-le dans la
                boîte de <strong>{destinataire.email}</strong>.
              </p>
            )}
            <p className="m-0 mt-1">
              Il vous reste {essais(restants)} sur ce lien, nouveaux codes compris.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <ChampBoard
              id="signataireRole"
              name="signataireRole"
              label="Votre fonction (facultatif)"
              placeholder="Ex : Technicien, Chef d'entreprise, Contrôleur…"
              maxLength={120}
            />
            <ChampBoard
              id="otp"
              name="otp"
              label="Code reçu par e-mail"
              requis
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="• • • • • •"
              autoComplete="one-time-code"
              champClassName="text-center font-mono text-2xl tracking-[0.4em]"
              onInput={(e) => {
                const champ = e.currentTarget;
                champ.value = champ.value.replace(/\D/g, "").slice(0, 6);
              }}
              aide={`${validite}. Le lien expire le ${formaterDateLongueFr(expireLe)} à ${formaterHeureFr(expireLe)}.`}
            />

            {state.status === "error" && (
              <div
                role="alert"
                className="rounded-[18px] bg-[color:var(--board-signal-wash)] p-3 text-[12.5px] text-[color:var(--board-signal-ink)]"
              >
                {state.message}
              </div>
            )}

            <Button type="submit" variant="board" size="board" className="min-h-14 w-full rounded-full font-display text-[18px]" disabled={pending}>
              {pending ? "Signature en cours…" : "Valider ma signature"}
            </Button>

            <p className="m-0 text-[12px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {/* ~~« vous apposez une signature au sens de l'article 1367 du Code
                  civil »~~ — une qualification (vérification du 2026-09-26). */}
              En cliquant sur « Valider ma signature », vous signez ce document.
              Seront enregistrés : votre email, votre adresse IP, l&apos;empreinte
              SHA-256 du document et l&apos;horodatage serveur. Textes : art. 1366 et
              1367 du Code civil · règlement (UE) n° 910/2014.
            </p>
          </form>

          <form action={demanderCode} className="space-y-2 text-center">
            <button
              type="submit"
              disabled={codeEnCours || attente !== 0}
              className="font-mono text-[11px] tracking-[0.08em] uppercase text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[color:var(--board-slate-soft)] disabled:no-underline"
            >
              {codeEnCours
                ? "Envoi du code…"
                : attente
                  ? phraseNouveauCode(attente)
                  : "Renvoyer un code"}
            </button>
            {erreurCode}
          </form>

          {lienProposer}
        </div>
      )}
    </div>
  );
}
