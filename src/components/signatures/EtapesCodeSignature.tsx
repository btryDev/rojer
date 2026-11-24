"use client";

import { useEffect, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import type { EnvoiCodeCompte } from "@/lib/signatures/code-compte";
import { formaterHeureEnLettresFr } from "@/lib/dates";
import { useMonte } from "@/components/ui-kit/useMonte";

/**
 * Les deux phrases du code, communes aux trois fenêtres de signature — les
 * deux depuis le compte et celle du lien (`SignatureExterneForm`) —
 * (2026-11-21, retour de test : « Renvoyer un code dans 0:32 » se lisait
 * comme une durée de validité).
 */
export function phraseNouveauCode(secondes: number): string {
  return `Nouveau code possible dans ${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, "0")}`;
}

/** « Code valable jusqu'à 15 h 42 » — l'heure de Paris. */
export function phraseValiditeCode(expireLe: Date): string {
  return `Code valable jusqu'à ${formaterHeureEnLettresFr(expireLe)}`;
}

/**
 * Les secondes avant `cible` (en ms), arrondies au-dessus ; 0 passé ou sans
 * cible. `null` tant que la page n'est pas montée : l'heure du serveur et
 * celle de l'écran ne coïncident pas au rendu, le chiffre attend le
 * navigateur. Partagé par les trois fenêtres de signature.
 */
export function useSecondesAvant(cible: number | null): number | null {
  const monte = useMonte();
  const [maintenant, setMaintenant] = useState(Date.now);
  useEffect(() => {
    if (cible === null) return;
    const tic = () => setMaintenant(Date.now());
    // L'heure relue dès qu'une cible arrive, pas une seconde plus tard.
    const premier = setTimeout(tic, 0);
    const minuterie = setInterval(tic, 1000);
    return () => {
      clearTimeout(premier);
      clearInterval(minuterie);
    };
  }, [cible]);
  if (cible === null) return 0;
  if (!monte) return null;
  return Math.max(0, Math.ceil((cible - maintenant) / 1000));
}

/**
 * Redemander un code : le compte à rebours tant que le délai court, puis le
 * lien. Partagé par les deux fenêtres de signature depuis le compte.
 */
export function RenvoiDuCode({
  renvoiPossibleLe,
  demande,
  demanderCode,
}: {
  renvoiPossibleLe: string;
  demande: boolean;
  demanderCode: () => void;
}) {
  const attente = useSecondesAvant(Date.parse(renvoiPossibleLe)) ?? 0;
  return attente > 0 ? (
    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--board-slate-soft)]">
      {phraseNouveauCode(attente)}
    </span>
  ) : (
    <button
      type="button"
      onClick={demanderCode}
      disabled={demande}
      className="text-[13px] text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline"
    >
      {demande ? "Envoi…" : "Renvoyer un code"}
    </button>
  );
}

/**
 * Ce que partagent les deux fenêtres de signature depuis le compte — « Signer
 * et envoyer » du plan (`plan-prevention/FenetreSigner.tsx`) et « Signer
 * depuis mon compte » des autres objets (`SignerDepuisMonCompte.tsx`) : la
 * case de consentement, la demande du code, le champ du code et le retour à
 * l'étape du code quand le serveur le redemande (2026-11-21, passe
 * « simplify » : les deux fenêtres recopiaient ce montage).
 */

export const BOUTON_PLEIN =
  "inline-flex gap-2 min-h-12 items-center justify-center rounded-full bg-[color:var(--board-ink)] px-7 font-display text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const BOUTON_CLAIR =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-6 text-[14px] text-[color:var(--board-ink)] hover:bg-[color:var(--board-slate-pale)]";

type ReponseSignature = { status: string; codeAReDemander?: boolean };

/**
 * L'état des deux temps : la case, le code envoyé, sa saisie. `demander`
 * appelle l'action serveur du code ; `reponse` est l'état de l'action de
 * signature — un code à redemander (expiré, essais épuisés) ramène à l'étape
 * du code, décidé au rendu qui reçoit la réponse.
 */
export function useCodeDeSignature(demander: () => Promise<EnvoiCodeCompte>, reponse: ReponseSignature) {
  const [coche, setCoche] = useState(false);
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState<{ email: string; renvoiPossibleLe: string; expireLe: string } | null>(null);
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [demande, startDemande] = useTransition();

  const [reponseVue, setReponseVue] = useState(reponse);
  if (reponse !== reponseVue) {
    setReponseVue(reponse);
    if (reponse.status === "error" && reponse.codeAReDemander) {
      setEnvoi(null);
      setCode("");
    }
  }

  function demanderCode() {
    setErreurCode(null);
    startDemande(async () => {
      try {
        const r = await demander();
        if (r.ok) setEnvoi({ email: r.email, renvoiPossibleLe: r.renvoiPossibleLe, expireLe: r.expireLe });
        else setErreurCode(r.message);
      } catch (e) {
        unstable_rethrow(e);
        setErreurCode("Le code n'a pas pu être demandé. Réessayez dans un instant.");
      }
    });
  }

  return { coche, setCoche, code, setCode, envoi, erreurCode, demande, demanderCode };
}

/** La case à cocher : sans elle, ni code ni signature. */
export function CaseConsentement({
  coche,
  surChanger,
  texte,
}: {
  coche: boolean;
  surChanger: (coche: boolean) => void;
  texte: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-[color:var(--board-slate-line)] px-4 py-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)]">
      <input
        type="checkbox"
        name="consentement"
        checked={coche}
        onChange={(e) => surChanger(e.target.checked)}
        className="mt-1 size-[18px] flex-none accent-[color:var(--board-ink)]"
      />
      <span className="text-[14px] leading-[1.55] text-[color:var(--board-ink)]">{texte}</span>
    </label>
  );
}

/** L'adresse où le code est parti, puis le champ à six chiffres. */
export function ChampCodeSignature({
  id,
  email,
  expireLe,
  code,
  surChanger,
}: {
  id: string;
  email: string;
  /** La fin de validité du code envoyé (ISO), dite sous le champ. */
  expireLe: string;
  code: string;
  surChanger: (code: string) => void;
}) {
  return (
    <>
      <p className="m-0 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3 text-[13.5px] text-[color:var(--board-slate-ink)]">
        Un code à 6 chiffres est parti à {email}. Il vaut 10 minutes et accepte 3 essais.
      </p>
      <label htmlFor={id} className="label-board">
        Votre code de signature
      </label>
      <input
        id={id}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => surChanger(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        autoFocus
        aria-describedby={`${id}-validite`}
        className="rounded-[18px] border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-4 py-3.5 text-center font-mono text-[28px] tracking-[0.45em] text-[color:var(--board-ink)] outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--board-blue-strong)]"
      />
      <p id={`${id}-validite`} className="m-0 -mt-2 text-[12.5px] text-[color:var(--board-slate-soft)]">
        {phraseValiditeCode(new Date(expireLe))}
      </p>
    </>
  );
}
