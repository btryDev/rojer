"use client";

import { type ComponentProps, useState } from "react";
import { SignatureExterneForm } from "./SignatureExterneForm";
import { PropositionPlanForm } from "@/components/plan-prevention/PropositionPlanForm";

/**
 * Le bloc d'action de la page du lien (`/acces/[token]`, cahier de reprise
 * § 3.2-3.3, 2026-11-19) : la signature, ou — sur le lien de l'entreprise
 * extérieure d'un plan — la proposition de modifications, qui la REMPLACE.
 *
 * Les deux restent montés une fois ouverts (`hidden`) : revenir à la
 * signature retrouve l'étape du code là où on l'a laissée, et revenir à la
 * proposition retrouve sa saisie. Une proposition envoyée RETIRE la
 * signature de la page : seul l'encadré de succès reste (le plan ne se signe
 * plus tant qu'elle attend).
 */
export function SignerOuProposer({
  signature,
  proposition,
}: {
  signature: Omit<ComponentProps<typeof SignatureExterneForm>, "proposer">;
  /** Absent : ce lien ne propose pas de modification. */
  proposition?: Omit<
    ComponentProps<typeof PropositionPlanForm>,
    "onRetour" | "onEnvoyee" | "token" | "email"
  > | null;
}) {
  const [mode, setMode] = useState<"signature" | "proposition">("signature");
  const [propositionOuverte, setPropositionOuverte] = useState(false);
  const [propositionEnvoyee, setPropositionEnvoyee] = useState(false);

  return (
    <>
      {!propositionEnvoyee && (
        <div hidden={mode !== "signature"}>
          <SignatureExterneForm
            {...signature}
            proposer={
              proposition
                ? () => {
                    setPropositionOuverte(true);
                    setMode("proposition");
                  }
                : undefined
            }
          />
        </div>
      )}
      {proposition && propositionOuverte && (
        <div hidden={mode !== "proposition"}>
          <PropositionPlanForm
            {...proposition}
            token={signature.token}
            email={signature.destinataire.email}
            onRetour={() => setMode("signature")}
            onEnvoyee={() => setPropositionEnvoyee(true)}
          />
        </div>
      )}
    </>
  );
}
