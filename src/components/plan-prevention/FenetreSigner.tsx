"use client";

import { useActionState, useEffect, useRef } from "react";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import {
  BOUTON_CLAIR,
  BOUTON_PLEIN,
  CaseConsentement,
  ChampCodeSignature,
  RenvoiDuCode,
  useCodeDeSignature,
} from "@/components/signatures/EtapesCodeSignature";
import {
  demanderCodeSignaturePlan,
  signerEtEnvoyerPlan,
  type SignerEtEnvoyerState,
} from "@/lib/plan-prevention/signature-fiche-actions";
import { texteConsentement } from "@/lib/signatures/consentement";
import { nomSansAdresse } from "@/lib/signatures/signataire";
import { useAnnonceFiche } from "./AnnonceFiche";
import { RoueAttente } from "@/components/ui/roue-attente";

/**
 * La fenêtre « Signer et envoyer » (2026-11-19, lot 3 ; cahier de reprise
 * § 1.2, décision de la propriétaire : un code par e-mail). Trois temps :
 * le récapitulatif et la case à cocher ; le code, envoyé à l'adresse du
 * compte ; la signature, posée par le serveur seulement avec le bon code et
 * la case cochée (`signerEtEnvoyerPlan`), puis le lien à l'entreprise
 * extérieure s'il y a lieu. Le résultat s'annonce sur la fiche.
 */

const FMT_MAINTENANT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "long",
  timeStyle: "short",
});

/** « Nom <adresse> », ou l'adresse seule quand le nom n'est qu'elle (`nomSansAdresse`). */
export function signataireAffiche(vous: { nom: string; email: string }): string {
  const email = vous.email.trim();
  if (!email) return vous.nom.trim();
  const nom = nomSansAdresse(vous.nom, email);
  return nom ? `${nom} <${email}>` : email;
}

export function FenetreSigner({
  ouvert,
  surFermer,
  planId,
  reference,
  objet,
  raisonEU,
  raisonEE,
  efChefEmail,
  vous,
  envoyer,
}: {
  ouvert: boolean;
  surFermer: () => void;
  planId: string;
  reference: string;
  objet: string;
  raisonEU: string;
  raisonEE: string;
  efChefEmail: string;
  vous: { nom: string; email: string };
  /** Le lien part à l'entreprise extérieure après la signature. */
  envoyer: boolean;
}) {
  const annoncer = useAnnonceFiche();
  const [state, formAction, pending] = useActionState<SignerEtEnvoyerState, FormData>(
    signerEtEnvoyerPlan.bind(null, planId),
    { status: "idle" },
  );
  const { coche, setCoche, code, setCode, envoi, erreurCode, demande, demanderCode } = useCodeDeSignature(
    () => demanderCodeSignaturePlan(planId),
    state,
  );

  // Signé : la fenêtre se ferme, la fiche annonce ce qui a eu lieu.
  // Une fois par réponse : `surFermer` est recréé à chaque rendu du panneau.
  const fermer = useRef(surFermer);
  useEffect(() => {
    fermer.current = surFermer;
  });
  useEffect(() => {
    if (state.status !== "success") return;
    annoncer({ ton: state.lienParti === false ? "erreur" : "succes", message: state.message });
    fermer.current();
  }, [state, annoncer]);
  const consentement = texteConsentement(raisonEU);
  const recap: [string, string][] = [
    ["Référence", reference],
    ["Objet", objet],
    ["Signataire", signataireAffiche(vous)],
    ["Au nom de", raisonEU],
    ["Date et heure", FMT_MAINTENANT.format(new Date())],
    ...(envoyer ? ([["Ensuite", `Rojer adresse le lien de signature à ${raisonEE} (${efChefEmail})`]] as [string, string][]) : []),
  ];

  return (
    <PanneauModal
      ouvert={ouvert}
      surFermer={surFermer}
      surtitre={`Plan de prévention · ${reference}`}
      titre={envoyer ? "Signer et envoyer" : "Signer le plan"}
    >
      <form action={formAction} className="flex flex-col gap-5">
        <div className="rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4 text-[14px] leading-[1.6] text-[color:var(--board-ink)]">
          <p className="m-0 font-semibold">Vous vous apprêtez à signer ce plan.</p>
          <p className="m-0 mt-1 text-[color:var(--board-slate-ink)]">
            {`Votre signature engage ${raisonEU} sur le contenu du plan et les mesures de prévention qu'il définit, arrêtées avec l'entreprise extérieure (art. R. 4512-6 et R. 4512-7 du Code du travail).`}
          </p>
        </div>

        <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] sm:grid-cols-[130px_minmax(0,1fr)]">
          {recap.map(([cle, valeur]) => (
            <div key={cle} className="contents">
              <dt className="board-eyebrow pt-[3px] text-[10.5px] tracking-[0.12em] text-[color:var(--board-slate-soft)]">{cle}</dt>
              <dd className="m-0 break-words text-[color:var(--board-ink)]">{valeur}</dd>
            </div>
          ))}
        </dl>

        <CaseConsentement coche={coche} surChanger={setCoche} texte={consentement} />
        <input type="hidden" name="envoyer" value={envoyer ? "1" : "0"} />

        {!envoi ? (
          <div className="flex flex-col gap-3">
            {erreurCode && (
              <p role="alert" className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
                {erreurCode}
              </p>
            )}
            {state.status === "error" && state.codeAReDemander && (
              <p role="alert" className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
                {state.message}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2.5">
              <button type="button" onClick={surFermer} className={BOUTON_CLAIR}>
                Annuler
              </button>
              <button type="button" data-ecriture onClick={demanderCode} disabled={!coche || demande} className={BOUTON_PLEIN}>
                {demande ? "Envoi du code…" : "Recevoir mon code"}
              </button>
            </div>
            <p className="m-0 text-right text-[12.5px] text-[color:var(--board-slate-soft)]">
              Un code à 6 chiffres arrive à votre adresse : il confirme que c&apos;est bien vous qui signez.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ChampCodeSignature
              id="code-signature"
              email={envoi.email}
              expireLe={envoi.expireLe}
              code={code}
              surChanger={setCode}
            />
            {state.status === "error" && !state.codeAReDemander && (
              <p role="alert" className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
                {state.message}
              </p>
            )}
            {erreurCode && (
              <p role="alert" className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
                {erreurCode}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <RenvoiDuCode renvoiPossibleLe={envoi.renvoiPossibleLe} demande={demande} demanderCode={demanderCode} />
              <div className="flex flex-wrap gap-2.5">
                <button type="button" onClick={surFermer} className={BOUTON_CLAIR}>
                  Annuler
                </button>
                <button type="submit" data-ecriture disabled={!coche || code.length !== 6 || pending} aria-busy={pending || undefined} className={BOUTON_PLEIN}>
                  {pending ? <RoueAttente className="size-4" /> : null}
                  {pending ? "Signature en cours…" : envoyer ? "Je signe et j'envoie" : "Je signe"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </PanneauModal>
  );
}
