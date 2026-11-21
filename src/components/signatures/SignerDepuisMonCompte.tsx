"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import type { ObjetSignable } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import {
  demanderCodeSignatureDuCompte,
  signerDuCompteAvecCode,
  type SignerDuCompteState,
} from "@/lib/signatures/signature-compte-actions";
import { texteConsentementPour } from "@/lib/signatures/consentement";

/**
 * La signature du dirigeant depuis son propre compte, pour tout objet
 * signable autre que le plan (dont la fiche a sa fenêtre « Signer et
 * envoyer »). ~~Deux temps, un clic sur `signerEnCompteConnecte`~~
 * [2026-11-21, décision de la propriétaire : une seule voie, celle du plan —
 * le récapitulatif, la case de consentement, un code à l'adresse du compte,
 * et la signature posée par le serveur avec le bon code seulement
 * (`signerDuCompteAvecCode`)]. La partie n'est pas choisie ici : le serveur
 * signe au nom de l'entreprise utilisatrice, toujours.
 */

const BOUTON_PLEIN =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--board-ink)] px-7 font-display text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const BOUTON_CLAIR =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-6 text-[14px] text-[color:var(--board-ink)] hover:bg-[color:var(--board-slate-pale)]";

export function SignerDepuisMonCompte({
  etablissementId,
  objetType,
  objetId,
  auNomDe,
  raisonSociale,
  surtitre,
}: {
  etablissementId: string;
  objetType: ObjetSignable;
  objetId: string;
  /** Ce que la fiche appelle cette partie : « le donneur d'ordre ». */
  auNomDe: string;
  /** L'entreprise engagée, nommée dans le consentement. */
  raisonSociale: string;
  /** « Permis de feu · PF-004 ». */
  surtitre: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const objet = { etablissementId, objetType, objetId };
  const [coche, setCoche] = useState(false);
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [demande, startDemande] = useTransition();
  const [state, formAction, pending] = useActionState<SignerDuCompteState, FormData>(
    signerDuCompteAvecCode.bind(null, objet),
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state, router]);
  // Signée : la fenêtre se ferme. Un code à redemander (expiré, essais
  // épuisés) : retour à l'étape du code. Décidé au rendu qui reçoit la réponse.
  const [reponseVue, setReponseVue] = useState(state);
  if (state !== reponseVue) {
    setReponseVue(state);
    if (state.status === "success") setOuvert(false);
    if (state.status === "error" && state.codeAReDemander) {
      setEnvoi(null);
      setCode("");
    }
  }

  function demanderCode() {
    setErreurCode(null);
    startDemande(async () => {
      try {
        const r = await demanderCodeSignatureDuCompte(objet);
        if (r.ok) setEnvoi(r.email);
        else setErreurCode(r.message);
      } catch (e) {
        unstable_rethrow(e);
        setErreurCode("Le code n'a pas pu être demandé. Réessayez dans un instant.");
      }
    });
  }

  const erreur =
    erreurCode ?? (state.status === "error" ? state.message : null);

  return (
    <>
      <Button data-ecriture type="button" variant="board" size="boardSm" onClick={() => setOuvert(true)}>
        Signer depuis mon compte
      </Button>
      <PanneauModal ouvert={ouvert} surFermer={() => setOuvert(false)} surtitre={surtitre} titre="Signer depuis mon compte">
        <form action={formAction} className="flex flex-col gap-5">
          <p className="m-0 rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4 text-[14px] leading-[1.6] text-[color:var(--board-ink)]">
            Vous signez au nom de {auNomDe} ({raisonSociale}). Seront enregistrés : votre adresse, votre
            adresse IP, l&apos;empreinte SHA-256 des données signées, le texte de votre consentement et
            l&apos;horodatage serveur.
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-[color:var(--board-slate-line)] px-4 py-3.5">
            <input
              type="checkbox"
              name="consentement"
              checked={coche}
              onChange={(e) => setCoche(e.target.checked)}
              className="mt-1 size-[18px] flex-none accent-[color:var(--board-ink)]"
            />
            <span className="text-[14px] leading-[1.55] text-[color:var(--board-ink)]">
              {texteConsentementPour(objetType, raisonSociale)}
            </span>
          </label>

          {envoi ? (
            <>
              <p className="m-0 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3 text-[13.5px] text-[color:var(--board-slate-ink)]">
                Un code à 6 chiffres est parti à {envoi}. Il vaut 10 minutes et accepte 3 essais.
              </p>
              <label htmlFor={`code-${objetId}`} className="label-board">
                Votre code de signature
              </label>
              <input
                id={`code-${objetId}`}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="rounded-[18px] border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-4 py-3.5 text-center font-mono text-[28px] tracking-[0.45em] text-[color:var(--board-ink)] outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--board-blue-strong)]"
              />
            </>
          ) : null}

          {erreur && (
            <p role="alert" className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
              {erreur}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2.5">
            <button type="button" onClick={() => setOuvert(false)} className={BOUTON_CLAIR}>
              Annuler
            </button>
            {envoi ? (
              <>
                <button type="button" onClick={demanderCode} disabled={demande} className={BOUTON_CLAIR}>
                  {demande ? "Envoi…" : "Renvoyer un code"}
                </button>
                <button type="submit" data-ecriture disabled={!coche || code.length !== 6 || pending} className={BOUTON_PLEIN}>
                  {pending ? "Signature en cours…" : "Je signe"}
                </button>
              </>
            ) : (
              <button type="button" data-ecriture onClick={demanderCode} disabled={!coche || demande} className={BOUTON_PLEIN}>
                {demande ? "Envoi du code…" : "Recevoir mon code"}
              </button>
            )}
          </div>
        </form>
      </PanneauModal>
    </>
  );
}
