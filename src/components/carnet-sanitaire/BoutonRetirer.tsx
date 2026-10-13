"use client";

import { useState, useTransition } from "react";
import { useConfirmation } from "@/components/ui-kit/Confirmation";

/**
 * Retirer un point, un relevé ou une analyse du carnet, après confirmation
 * (2026-10-12, audit des modules, B6 : aucune saisie du carnet ne se
 * corrigeait). Un seul bouton pour les trois gestes ; chacun dit, dans sa
 * confirmation, ce qui part et ce qui reste.
 */
export function BoutonRetirer({
  libelle,
  titre,
  detail,
  agir,
  action,
}: {
  libelle: string;
  titre: string;
  detail: string;
  agir: string;
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          demander({
            titre,
            detail,
            agir,
            alors: () =>
              startTransition(async () => {
                setErreur(null);
                try {
                  await action();
                } catch {
                  setErreur("Introuvable : la page n'était plus à jour. Rechargez-la.");
                }
              }),
          })
        }
        className="text-[12px] font-medium text-[color:var(--board-slate-mid)] underline-offset-2 transition-colors hover:text-[color:var(--board-signal-ink)] hover:underline disabled:opacity-50"
      >
        {pending ? "…" : libelle}
      </button>
      {erreur && (
        <span className="text-[12px] text-[color:var(--board-signal-ink)]">{erreur}</span>
      )}
      {confirmation}
    </>
  );
}
