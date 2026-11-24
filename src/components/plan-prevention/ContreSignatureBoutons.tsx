"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  revoquerSignaturesPlan,
  traiterProposition,
  type ContreSignatureState,
} from "@/lib/plan-prevention/contre-signature-actions";
import { useAnnonceFiche } from "./AnnonceFiche";
import { RoueAttente } from "@/components/ui/roue-attente";

/**
 * Les boutons de la contre-signature sur la fiche du plan (ADR-061) :
 * traiter la proposition de l'entreprise extérieure, et révoquer les
 * signatures pour corriger. La phrase sur le plafond de la formule est dite
 * au moment du geste (§ 6).
 *
 * [2026-11-19, lot 4, maquette V2 « Bandeau »] « Refuser » / « Corriger » /
 * ~~« Accepter sans modifier »~~ « Accepter » (2026-11-21, maquette « Bloc
 * Suivi ») ; le refus se confirme dans ~~le bandeau~~ [2026-11-21 : la carte
 * « À décider »]. Le résultat s'annonce sur la fiche (`AnnonceFiche`) : la
 * carte disparaît avec la proposition traitée, son message disparaissait avec
 * elle.
 */

export const PHRASE_PLAFOND =
  "Un signataire qui signe de nouveau ce plan ne compte pas une seconde fois dans votre formule.";

function Message({ state }: { state: ContreSignatureState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "m-0 text-[13px] text-[color:var(--board-signal-ink)]"
          : "m-0 text-[13px] text-[color:var(--board-green-ink)]"
      }
    >
      {state.message}
    </p>
  );
}

/** Le résultat d'un geste, porté par la fiche : il survit au bandeau qui disparaît. */
function useAnnoncer(state: ContreSignatureState) {
  const annoncer = useAnnonceFiche();
  useEffect(() => {
    if (state.status === "success") annoncer({ ton: "succes", message: state.message });
  }, [state, annoncer]);
}

const BOUTON_CLAIR =
  "inline-flex min-h-11 items-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-5 text-[14px] transition-colors hover:bg-[color:var(--board-slate-pale)] disabled:opacity-60";
const BOUTON_PLEIN =
  "inline-flex min-h-11 items-center rounded-full bg-[color:var(--board-ink)] px-6 font-display text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

export function TraiterPropositionBoutons({
  propositionId,
  raisonEE,
}: {
  propositionId: string;
  raisonEE: string;
}) {
  const action = traiterProposition.bind(null, propositionId);
  const [state, formAction, pending] = useActionState<ContreSignatureState, FormData>(action, {
    status: "idle",
  });
  const [refus, setRefus] = useState(false);
  useAnnoncer(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {refus ? (
        <div className="flex flex-col gap-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4">
          <p className="m-0 text-[14px] leading-[1.55] text-[color:var(--board-ink)]">
            Refuser la proposition ? Le plan reste tel quel, les signatures déjà posées restent valables, et la trace
            de la proposition est conservée. Rojer adresse un nouveau lien de signature à {raisonEE}.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              name="decision"
              value="refuser"
              disabled={pending}
              aria-busy={pending || undefined}
              data-ecriture
              className={`${BOUTON_CLAIR} text-[color:var(--board-signal-ink)]`}
            >
              {pending ? <RoueAttente className="size-4" /> : null}
              {pending ? "Refus…" : "Confirmer le refus"}
            </button>
            <button type="button" onClick={() => setRefus(false)} disabled={pending} className={BOUTON_CLAIR}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 max-w-[520px] text-[13px] leading-[1.55] text-[color:var(--board-slate-ink)]">
            Accepter retire les signatures déjà posées : chacun signe la nouvelle version. Refuser les laisse valables et renvoie un lien à {raisonEE}.{" "}
            {PHRASE_PLAFOND}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setRefus(true)}
              disabled={pending}
              data-ecriture
              className={`${BOUTON_CLAIR} text-[color:var(--board-signal-ink)]`}
            >
              Refuser
            </button>
            <button type="submit" name="decision" value="corriger" disabled={pending} data-ecriture className={`${BOUTON_CLAIR} text-[color:var(--board-ink)]`}>
              Corriger
            </button>
            <button type="submit" name="decision" value="accepter" disabled={pending} aria-busy={pending || undefined} data-ecriture className={BOUTON_PLEIN}>
              {pending ? <RoueAttente className="size-4" /> : null}
              {pending ? "Application…" : "Accepter"}
            </button>
          </div>
        </div>
      )}
      <Message state={state} />
    </form>
  );
}

export function BoutonRevoquerSignatures({
  planId,
  forme = "bouton",
}: {
  planId: string;
  /** `lien` : le lien discret sous la grande action du panneau Signatures. */
  forme?: "bouton" | "lien";
}) {
  const [confirmer, setConfirmer] = useState(false);
  const action = revoquerSignaturesPlan.bind(null, planId);
  const [state, formAction, pending] = useActionState<ContreSignatureState>(action, { status: "idle" });
  useAnnoncer(state);

  if (!confirmer) {
    return (
      <div className={forme === "lien" ? "contents" : "flex w-full flex-col gap-2"}>
        {forme === "lien" ? (
          <button
            type="button"
            onClick={() => setConfirmer(true)}
            data-ecriture
            className="text-[13px] text-[color:var(--board-signal-ink)] underline-offset-2 hover:underline"
          >
            Révoquer les signatures pour corriger
          </button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirmer(true)} data-ecriture>
            Révoquer les signatures pour corriger
          </Button>
        )}
        {state.status === "error" && <Message state={state} />}
      </div>
    );
  }
  return (
    <form action={formAction} className="flex w-full flex-col items-center gap-2 text-center">
      <p className="m-0 max-w-[560px] text-[13px] leading-[1.55] text-[color:var(--board-ink)]">
        Les signatures déjà posées seront révoquées et datées, jamais effacées. Chaque
        signataire en est prévenu, et le plan se fait signer de nouveau après votre
        correction. {PHRASE_PLAFOND}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="submit" enCours={pending} data-ecriture>
          {pending ? "Révocation…" : "Confirmer la révocation"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirmer(false)} disabled={pending}>
          Annuler
        </Button>
      </div>
      <Message state={state} />
    </form>
  );
}
