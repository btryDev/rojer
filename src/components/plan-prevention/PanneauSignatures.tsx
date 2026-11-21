"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { LegalBadge } from "@/components/ui-kit";
import { DemanderSignatureForm } from "@/components/signatures/DemanderSignatureForm";
import { BoutonRevoquerSignatures } from "./ContreSignatureBoutons";
import { FenetreSigner } from "./FenetreSigner";
import { CarteActionRequise } from "./ActionRequise";
import type { AttenteDirigeant } from "@/lib/plan-prevention/fiche-signatures";
import { VerifierSignature } from "@/components/signatures/VerifierSignature";
import {
  envoyerLienEntrepriseExterieure,
  renvoyerLienPlan,
  type GesteLienState,
} from "@/lib/plan-prevention/signature-fiche-actions";
import { SENS_R4512_7, URL_R4512_7 } from "@/lib/plan-prevention/annonces-plan";
import { formaterHeureEnLettresFr, formaterJourMoisChiffresFr } from "@/lib/dates";

/**
 * Les signatures de la fiche du plan (2026-11-19, lot 3, maquette V2
 * « Fiche ») : une ligne par partie — signée (tuile verte), lien adressé
 * (tuile ambre, « Renvoyer le lien »), ou rien —, puis LA grande action. Les
 * gestes passent par les actions de `signature-fiche-actions.ts` ; ce
 * composant ne décide d'aucune règle, il montre l'état que la page a lu.
 *
 * [2026-11-21, maquette V3 « Suivi » validée] Deux cartes : en tête, l'action
 * requise — signer, ou envoyer le lien —, absente quand une proposition ou
 * une correction porte déjà la sienne (la page les montre au-dessus) ; puis
 * les signatures, en lignes compactes. Le lien de l'entreprise extérieure
 * suspendu par une proposition se dit « En pause ».
 */

export type PartieVue =
  | { etat: "signee"; nom: string; quand: Date; methode: string; signatureId: string }
  | {
      etat: "lien_envoye" | "lien_expire" | "lien_revoque";
      lienId: string;
      nom: string | null;
      email: string;
      envoyeLe: Date;
      expireLe: Date;
      ouvert: boolean;
      motif: string | null;
    }
  | { etat: "rien" };

const jour = formaterJourMoisChiffresFr;
const heure = formaterHeureEnLettresFr;

const TUILE = "flex size-9 flex-none items-center justify-center rounded-[10px]";
const META = "m-0 mt-0.5 text-[13px] text-[color:var(--board-slate-soft)]";
const NOM = "m-0 text-[15px] font-semibold leading-[1.35] text-[color:var(--board-ink)]";
const LIGNE = "flex flex-wrap items-center gap-3.5 border-t border-[color:var(--board-slate-pale)] py-3";
const PILULE_CLAIRE =
  "inline-flex min-h-10 items-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-3.5 text-[13px] text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)] disabled:opacity-60";
const GRANDE_ACTION =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--board-ink)] px-8 py-4 text-center font-display text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";
const LIEN_DISCRET = "text-[13px] text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline";
const ARDOISE = "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]";
const AMBRE = "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]";

function MessageGeste({ state }: { state: GesteLienState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`m-0 w-full text-[13px] ${state.status === "error" ? "text-[color:var(--board-signal-ink)]" : "text-[color:var(--board-green-ink)]"}`}
    >
      {state.message}
    </p>
  );
}

function BoutonRenvoyer({ planId, lienId }: { planId: string; lienId: string }) {
  const [state, action, pending] = useActionState<GesteLienState>(renvoyerLienPlan.bind(null, planId, lienId), {
    status: "idle",
  });
  return (
    <form action={action} className="contents">
      <button type="submit" data-ecriture disabled={pending} className={PILULE_CLAIRE}>
        {pending ? "Envoi…" : "Renvoyer le lien"}
      </button>
      <MessageGeste state={state} />
    </form>
  );
}

function LignePartie({
  libellePartie,
  entreprise,
  personne,
  vue,
  planId,
  etablissementId,
  renvoiPossible,
  enPause,
  suite,
}: {
  libellePartie: string;
  entreprise: string;
  personne: string;
  vue: PartieVue;
  planId: string;
  etablissementId: string;
  renvoiPossible: boolean;
  /** Une proposition attend : le lien ouvert ne sert à rien avant la décision. */
  enPause: boolean;
  /** Ce qui suit pour un lien tombé, dit au dirigeant (« Rojer adresse un nouveau lien… »). */
  suite: string | null;
}) {
  if (vue.etat === "signee") {
    return (
      <li className={LIGNE}>
        <span className={`${TUILE} bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]`} aria-hidden>
          <Check className="size-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-[1_1_240px]">
          <p className={NOM}>
            {entreprise} · {vue.nom}
          </p>
          <p className={META}>
            {libellePartie} · signé le {jour(vue.quand)} à {heure(vue.quand)} · {vue.methode}
          </p>
        </div>
        <span className="pastille-board bg-[color:var(--board-green)] text-[12.5px] text-[color:var(--board-green-ink)]">
          Signée
        </span>
        <VerifierSignature etablissementId={etablissementId} signatureId={vue.signatureId} className={LIEN_DISCRET} />
      </li>
    );
  }
  if (vue.etat === "rien") {
    return (
      <li className={LIGNE}>
        <span
          className={`${TUILE} border-2 border-dashed border-[color:var(--board-slate)] bg-[color:var(--board-card)]`}
          aria-hidden
        />
        <div className="min-w-0 flex-[1_1_240px]">
          <p className={NOM}>
            {entreprise}
            {personne ? ` · ${personne}` : ""}
          </p>
          <p className={META}>{libellePartie} · pas encore signé</p>
        </div>
        <span className={`pastille-board text-[12.5px] ${ARDOISE}`}>À signer</span>
      </li>
    );
  }
  const actif = vue.etat === "lien_envoye" && !enPause;
  const etat =
    vue.etat === "lien_envoye"
      ? enPause
        ? `lien adressé le ${jour(vue.envoyeLe)} · expire le ${jour(vue.expireLe)} ; signera après votre décision`
        : `lien adressé le ${jour(vue.envoyeLe)} · ${vue.ouvert ? "ouvert" : "non ouvert"} · expire le ${jour(vue.expireLe)}`
      : vue.etat === "lien_expire"
        ? `lien adressé le ${jour(vue.envoyeLe)} · expiré le ${jour(vue.expireLe)}`
        : `lien révoqué${vue.motif ? ` : ${vue.motif}` : ""}`;
  return (
    <li className={LIGNE}>
      <span className={`${TUILE} ${actif ? AMBRE : ARDOISE}`} aria-hidden>
        <Clock className="size-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-[1_1_240px]">
        <p className={NOM}>
          {entreprise} · {vue.nom ?? vue.email}
        </p>
        <p className={META}>
          {libellePartie} · {etat}
          {suite ? ` · ${suite}` : ""}
        </p>
      </div>
      <span className={`pastille-board text-[12.5px] ${actif ? AMBRE : ARDOISE}`}>
        {vue.etat === "lien_envoye"
          ? enPause
            ? "En pause"
            : "Lien adressé"
          : vue.etat === "lien_expire"
            ? "Lien expiré"
            : "Lien révoqué"}
      </span>
      {renvoiPossible && <BoutonRenvoyer planId={planId} lienId={vue.lienId} />}
    </li>
  );
}

function BoutonEnvoyerLien({ planId }: { planId: string }) {
  const [state, action, pending] = useActionState<GesteLienState>(envoyerLienEntrepriseExterieure.bind(null, planId), {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <button type="submit" data-ecriture disabled={pending} className={GRANDE_ACTION}>
        {pending ? "Envoi…" : "Envoyer le lien à l'entreprise extérieure"}
      </button>
      <MessageGeste state={state} />
    </form>
  );
}

export function PanneauSignatures({
  etablissementId,
  planId,
  reference,
  objet,
  raisonEU,
  raisonEE,
  euChefNom,
  efChefNom,
  efChefEmail,
  vous,
  eu,
  ee,
  planSignable,
  propositionEnAttente,
  attente,
  ouvrirSigner,
}: {
  etablissementId: string;
  planId: string;
  reference: string;
  objet: string;
  raisonEU: string;
  raisonEE: string;
  euChefNom: string;
  efChefNom: string;
  efChefEmail: string;
  vous: { nom: string; email: string };
  eu: PartieVue;
  ee: PartieVue;
  planSignable: boolean;
  propositionEnAttente: boolean;
  /** Ce qui attend le dirigeant (`ceQuiAttendLeDirigeant`) : le même calcul que la pastille de « Suivi ». */
  attente: AttenteDirigeant | null;
  /** `?openSign=1` : « Terminer la correction et signer » ramène ici, fenêtre ouverte. */
  ouvrirSigner: boolean;
}) {
  const router = useRouter();
  const [fenetre, setFenetre] = useState(false);
  const [collegue, setCollegue] = useState(false);

  const recueillir = planSignable && !propositionEnAttente;
  const euSignee = eu.etat === "signee";
  const eeSignee = ee.etat === "signee";
  const nSignees = Number(euSignee) + Number(eeSignee);
  // Le lien part après la signature s'il n'y en a pas d'ouvert pour l'EE.
  const lienAEnvoyer = !eeSignee && ee.etat !== "lien_envoye";
  const peutSigner = recueillir && !euSignee;

  // `?openSign=1` ouvre la fenêtre au rendu qui le reçoit — à l'arrivée sur
  // la fiche comme depuis « Terminer la correction et signer » sur la même
  // page —, puis le paramètre est retiré de l'adresse : un rechargement ne
  // rouvre pas la fenêtre. Les autres paramètres restent (`?onglet=suivi`,
  // 2026-11-21) : sans eux, l'onglet « Suivi » se refermait.
  const [ouvertureVue, setOuvertureVue] = useState(false);
  if (ouvrirSigner !== ouvertureVue) {
    setOuvertureVue(ouvrirSigner);
    if (ouvrirSigner && peutSigner) setFenetre(true);
  }
  useEffect(() => {
    if (!ouvrirSigner) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("openSign");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [ouvrirSigner, router]);

  const resume = eeSignee && euSignee
    ? { mot: "Plan signé par les deux parties", classe: "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]" }
    : euSignee
      ? { mot: "Il manque l'entreprise extérieure", classe: AMBRE }
      : eeSignee
        ? { mot: "Il manque votre signature", classe: AMBRE }
        : { mot: "Aucune signature", classe: ARDOISE };

  // Un lien tombé (révoqué, expiré) : ce qui suit, dit au dirigeant — pas la
  // consigne écrite pour l'entreprise extérieure (retour de test, 2026-11-21).
  const suiteEE =
    peutSigner && lienAEnvoyer && (ee.etat === "lien_revoque" || ee.etat === "lien_expire")
      ? "Rojer adresse un nouveau lien quand vous signez"
      : null;

  return (
    <>
      {/* La proposition et la correction portent leur propre carte, sur la
          page ; ici, la signature à poser et le lien à envoyer. */}
      {attente === "signer" && (
        <CarteActionRequise
          id="action-signature-titre"
          titre="Votre signature est attendue"
          phrase={
            lienAEnvoyer
              ? `Un code arrive à votre adresse pour confirmer, puis Rojer adresse le lien à ${raisonEE}.`
              : "Un code arrive à votre adresse pour confirmer votre signature."
          }
          ecriture
        >
          <div>
            <button type="button" onClick={() => setFenetre(true)} className={GRANDE_ACTION}>
              {lienAEnvoyer ? "Signer et envoyer à l'entreprise extérieure" : "Signer le plan"}
            </button>
          </div>
        </CarteActionRequise>
      )}
      {attente === "envoyer_lien" && (
        <CarteActionRequise id="action-lien-titre" titre={`${raisonEE} n'a pas encore son lien`} ecriture>
          <BoutonEnvoyerLien planId={planId} />
        </CarteActionRequise>
      )}

      <section
        aria-labelledby="signatures-titre"
        className="carte-board flex flex-col gap-3 px-6 py-6 md:px-[34px]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="signatures-titre" className="board-titre m-0 text-[22px]">
            Signatures{" "}
            <span className="text-[15px] font-normal text-[color:var(--board-slate-mid)]">
              · {nSignees} sur 2
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`pastille-board text-[12.5px] ${resume.classe}`}>{resume.mot}</span>
            <LegalBadge reference="Art. R. 4512-7 CT" href={URL_R4512_7}>
              {SENS_R4512_7}
            </LegalBadge>
          </div>
        </div>

        <ul className="m-0 list-none p-0">
          <LignePartie
            libellePartie="Entreprise utilisatrice"
            entreprise={raisonEU}
            personne={euChefNom}
            vue={eu}
            planId={planId}
            etablissementId={etablissementId}
            renvoiPossible={recueillir}
            enPause={propositionEnAttente}
            suite={null}
          />
          <LignePartie
            libellePartie="Entreprise extérieure"
            entreprise={raisonEE}
            personne={efChefNom}
            vue={ee}
            planId={planId}
            etablissementId={etablissementId}
            renvoiPossible={recueillir}
            enPause={propositionEnAttente}
            suite={suiteEE}
          />
        </ul>

        {!planSignable ? (
          <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
            Plus de signature à recueillir : le plan est clos ou annulé.
          </p>
        ) : euSignee && eeSignee ? (
          <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">Les deux parties ont signé ce plan.</p>
        ) : null}

        {(peutSigner && eu.etat !== "lien_envoye") || (planSignable && (euSignee || eeSignee)) ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {peutSigner && eu.etat !== "lien_envoye" && (
              <button type="button" onClick={() => setCollegue((c) => !c)} className={LIEN_DISCRET} aria-expanded={collegue}>
                Faire signer un collègue
              </button>
            )}
            {planSignable && (euSignee || eeSignee) && <BoutonRevoquerSignatures planId={planId} forme="lien" />}
          </div>
        ) : null}
        {collegue && peutSigner && (
          <div className="w-full max-w-[640px]">
            <DemanderSignatureForm
              etablissementId={etablissementId}
              objetType="plan_prevention"
              objetId={planId}
              nomDefaut={euChefNom}
              partie="entreprise_utilisatrice"
              ouvertDEmblee
            />
          </div>
        )}
      </section>

      <FenetreSigner
        ouvert={fenetre}
        surFermer={() => setFenetre(false)}
        planId={planId}
        reference={reference}
        objet={objet}
        raisonEU={raisonEU}
        raisonEE={raisonEE}
        efChefEmail={efChefEmail}
        vous={vous}
        envoyer={lienAEnvoyer}
      />
    </>
  );
}
