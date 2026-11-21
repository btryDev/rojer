"use client";

import { useState, useTransition } from "react";
import { verifierSignatureDuCompte } from "@/lib/signatures/verification-actions";
import type { VerdictSignature } from "@/lib/signatures/verification";
import { formaterDateHeureFr } from "@/lib/dates";

/**
 * « Vérifier » une signature, dans l'application (2026-11-21, ADR-006
 * amendée) : recalcule l'empreinte du document signé et dit s'il a changé
 * depuis. Remplace le lien vers l'ancienne page publique `/verifier`.
 */
export function VerifierSignature({
  etablissementId,
  signatureId,
  libelle = "Vérifier",
  className,
}: {
  etablissementId: string;
  signatureId: string;
  libelle?: string;
  className?: string;
}) {
  const [verdict, setVerdict] = useState<VerdictSignature | null>(null);
  const [erreur, setErreur] = useState(false);
  const [enCours, demarrer] = useTransition();

  const verifier = () =>
    demarrer(async () => {
      setErreur(false);
      try {
        setVerdict(await verifierSignatureDuCompte(etablissementId, signatureId));
      } catch {
        setErreur(true);
      }
    });

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={verifier}
        disabled={enCours}
        className={
          className ??
          "text-[13px] font-semibold text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline disabled:cursor-wait disabled:opacity-60"
        }
      >
        {enCours ? "Vérification…" : libelle}
      </button>
      {(verdict || erreur) && !enCours ? (
        <span role="status" className="text-[12.5px] leading-[1.5] text-[color:var(--board-slate-ink)]">
          {erreur ? "La vérification n'a pas pu se faire. Réessayez." : phraseDuVerdict(verdict!)}
        </span>
      ) : null}
    </span>
  );
}

/** La phrase d'un verdict ; une signature révoquée le dit d'abord. */
export function phraseDuVerdict(v: VerdictSignature): string {
  if (v.etat === "introuvable") return "Le document signé n'est plus dans ce dossier : rien à comparer.";
  if (v.etat === "occupe") return "Trop de vérifications en cours. Réessayez dans quelques secondes.";
  const revoquee = v.revoqueLe
    ? `Signature révoquée le ${formaterDateHeureFr(new Date(v.revoqueLe))}. `
    : "";
  switch (v.etat) {
    case "intacte":
      return `${revoquee}Empreinte recalculée identique : le document n'a pas changé depuis la signature.`;
    case "modifiee":
      return `${revoquee}Empreinte différente : le document a changé depuis la signature.`;
    case "version_anterieure":
      return `${revoquee}Empreinte d'une forme antérieure de Rojer : le recalcul ne peut pas la comparer, ni conclure à une modification.`;
  }
}
