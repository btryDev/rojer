"use client";

import { type ComponentProps, type ReactNode, useState } from "react";
import { SignatureExterneForm } from "./SignatureExterneForm";
import { PropositionPlanForm } from "@/components/plan-prevention/PropositionPlanForm";

/**
 * Le bloc d'action de la page du lien (`/acces/[token]`, cahier de reprise
 * § 3.2-3.3, 2026-11-19) : la signature, ou — sur le lien de l'entreprise
 * extérieure d'un plan — la proposition de modifications, qui la REMPLACE.
 *
 * [2026-11-21, retour de test de la propriétaire : en remontant, on voyait
 * encore « Signer ».] La proposition est un écran à part : l'en-tête, le
 * document et le bloc de signature (`entete`, `document`, `chapeauAction`)
 * ne s'affichent qu'en mode signature ; le mode proposition a son propre
 * en-tête (`enteteProposition`) et seulement le formulaire.
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
  entete,
  document,
  chapeauAction,
  enteteProposition,
  classeConteneur,
  classeCarte,
}: {
  signature: Omit<ComponentProps<typeof SignatureExterneForm>, "proposer">;
  /** Absent : ce lien ne propose pas de modification. */
  proposition?: Omit<
    ComponentProps<typeof PropositionPlanForm>,
    "onRetour" | "onEnvoyee" | "token" | "email"
  > | null;
  /** En-tête et document de la page, montrés en mode signature seulement. */
  entete?: ReactNode;
  document?: ReactNode;
  /** Le texte au-dessus du formulaire de signature (« Action requise »). */
  chapeauAction?: ReactNode;
  /** L'en-tête de l'écran de proposition. */
  enteteProposition?: ReactNode;
  classeConteneur?: string;
  classeCarte?: string;
}) {
  const [mode, setMode] = useState<"signature" | "proposition">("signature");
  const [propositionOuverte, setPropositionOuverte] = useState(false);
  const [propositionEnvoyee, setPropositionEnvoyee] = useState(false);

  const basculer = (m: "signature" | "proposition") => {
    setMode(m);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  return (
    <>
      {/* L'en-tête et le document sont statiques : rendus selon le mode,
          sans rien à garder. Seuls les deux formulaires restent montés. */}
      {mode === "signature" ? entete : enteteProposition}
      <div className={classeConteneur}>
        {mode === "signature" && document}
        {!propositionEnvoyee && (
          <div hidden={mode !== "signature"}>
            <section className={classeCarte} aria-label={chapeauAction ? "Signer" : undefined}>
              {chapeauAction}
              <div className={chapeauAction ? "mt-5" : undefined}>
                <SignatureExterneForm
                  {...signature}
                  proposer={
                    proposition
                      ? () => {
                          setPropositionOuverte(true);
                          basculer("proposition");
                        }
                      : undefined
                  }
                />
              </div>
            </section>
          </div>
        )}
        {proposition && propositionOuverte && (
          <div hidden={mode !== "proposition"}>
            <section className={classeCarte} aria-label={classeCarte ? "Proposer des modifications" : undefined}>
              <PropositionPlanForm
                {...proposition}
                token={signature.token}
                email={signature.destinataire.email}
                onRetour={() => basculer("signature")}
                onEnvoyee={() => setPropositionEnvoyee(true)}
              />
            </section>
          </div>
        )}
      </div>
    </>
  );
}
