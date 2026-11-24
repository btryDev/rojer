"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ObjetSignable } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import {
  demanderCodeSignatureDuCompte,
  signerDuCompteAvecCode,
  type SignerDuCompteState,
} from "@/lib/signatures/signature-compte-actions";
import { texteConsentementPour } from "@/lib/signatures/consentement";
import {
  BOUTON_CLAIR,
  BOUTON_PLEIN,
  CaseConsentement,
  ChampCodeSignature,
  RenvoiDuCode,
  useCodeDeSignature,
} from "./EtapesCodeSignature";
import { BoutonOccupe } from "@/components/ui/bouton-occupe";

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
  const [state, formAction, pending] = useActionState<SignerDuCompteState, FormData>(
    signerDuCompteAvecCode.bind(null, objet),
    { status: "idle" },
  );
  const { coche, setCoche, code, setCode, envoi, erreurCode, demande, demanderCode } = useCodeDeSignature(
    () => demanderCodeSignatureDuCompte(objet),
    state,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state, router]);
  // Signée : la fenêtre se ferme, décidé au rendu qui reçoit la réponse (le
  // retour à l'étape du code est dans `useCodeDeSignature`).
  const [reponseVue, setReponseVue] = useState(state);
  if (state !== reponseVue) {
    setReponseVue(state);
    if (state.status === "success") setOuvert(false);
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

          <CaseConsentement coche={coche} surChanger={setCoche} texte={texteConsentementPour(objetType, raisonSociale)} />

          {envoi ? (
            <ChampCodeSignature
              id={`code-${objetId}`}
              email={envoi.email}
              expireLe={envoi.expireLe}
              code={code}
              surChanger={setCode}
            />
          ) : null}

          {erreur && (
            <p role="alert" className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
              {erreur}
            </p>
          )}

          <div className={`flex flex-wrap items-center gap-2.5 ${envoi ? "justify-between" : "justify-end"}`}>
            {/* Le compte à rebours du renvoi, comme la fenêtre du plan (2026-11-21). */}
            {envoi && <RenvoiDuCode renvoiPossibleLe={envoi.renvoiPossibleLe} demande={demande} demanderCode={demanderCode} />}
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => setOuvert(false)} className={BOUTON_CLAIR}>
                Annuler
              </button>
              {envoi ? (
                <BoutonOccupe type="submit" data-ecriture enCours={pending} disabled={!coche || code.length !== 6} className={BOUTON_PLEIN}>
                  {pending ? "Signature en cours…" : "Je signe"}
                </BoutonOccupe>
              ) : (
                <BoutonOccupe type="button" data-ecriture onClick={demanderCode} enCours={demande} disabled={!coche} className={BOUTON_PLEIN}>
                  {demande ? "Envoi du code…" : "Recevoir mon code"}
                </BoutonOccupe>
              )}
            </div>
          </div>
        </form>
      </PanneauModal>
    </>
  );
}
