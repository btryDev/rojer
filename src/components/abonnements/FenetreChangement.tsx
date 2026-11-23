"use client";
// La fenêtre de confirmation d'un changement de formule (retour de test du
// 2026-11-23, « passer à Pro n'est pas clair, il faut un temps
// intermédiaire »). Le bouton de la carte ouvre la fenêtre ; elle dit ce que
// le changement coûte et ce qu'il change, AVANT le geste, puis ce qui a été
// fait :
// - monter : le montant prélevé aujourd'hui, calculé par Stripe sans rien
//   prélever (`apercuMonteeAction`), le prix ensuite, ce qui s'ouvre ;
// - baisser : rien aujourd'hui, la formule gardée jusqu'à la fin de la
//   période payée, ce qui change ce jour-là.
// La page se relit à la fermeture : la carte de la nouvelle formule devient
// « Votre formule », ou porte la baisse prévue.

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BoutonEnvoi } from "./BoutonEnvoi";
import { buttonVariants } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import {
  annulerBaisseAction,
  apercuMonteeAction,
  changerFormuleAction,
  type ApercuDeChangement,
  type ResultatChangement,
} from "@/lib/abonnements/actions";
import { eurosAuCentime } from "@/lib/abonnements/affichage";
import { CHAMP_COMPTE_ATTENDU } from "@/lib/auth/compte-attendu";
import { PAGE_PAIEMENT } from "@/lib/abonnements/sous-pages";
import { formaterDateLongueFr } from "@/lib/dates";

/** Ce que la page sait du changement avant d'ouvrir la fenêtre (tout est lu côté serveur). */
export type ChangementPropose = {
  cle: string;
  sens: "montee" | "baisse";
  /** « Pro », « Pro, annuelle ». */
  libelle: string;
  /** La formule du compte : « Essentiel ». */
  actuelle: string;
  /** Le prix de la formule visée, TTC, par période. */
  ensuiteCentimes: number | null;
  unite: string;
  /** Une montée qui change de rythme : la phrase de l'effet, à la place de « la différence avec … ». */
  rythme: string | null;
  /** La fin de la période payée (une baisse s'y applique), ISO. */
  finPeriode: string | null;
  /** Ce que la formule visée ouvre (montée), ou ce qui change à la date (baisse). */
  changements: string[];
};

const LIGNE_PRIX = "flex items-baseline justify-between gap-4";
const MONTANT = "board-titre m-0 whitespace-nowrap text-[28px]";
const AIDE = "m-0 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]";
const BOUTONS = "flex flex-wrap justify-end gap-2.5 pt-1";
const PLEIN = buttonVariants({ variant: "board", size: "board" });
const CLAIR = buttonVariants({ variant: "boardClair", size: "board" });

const date = (iso: string | null) => (iso ? formaterDateLongueFr(new Date(iso)) : null);

export function FenetreChangement({
  changement,
  compteId,
  carte,
  disabled,
  describedBy,
}: {
  changement: ChangementPropose;
  compteId: string | null;
  carte: "claire" | "encre";
  disabled: boolean;
  describedBy?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  // Chaque ouverture repart de zéro : l'aperçu se relit, le résultat s'oublie.
  const [ouverture, setOuverture] = useState(0);
  const router = useRouter();
  const [fait, setFait] = useState(false);
  const fermer = () => {
    setOuvert(false);
    if (fait) router.refresh();
  };
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={describedBy}
        onClick={() => {
          setFait(false);
          setOuverture((n) => n + 1);
          setOuvert(true);
        }}
        className={`lp-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-45 ${carte === "encre" ? "lp-btn-blanc" : "lp-btn-ink"}`}
      >
        {changement.sens === "montee" ? `Passer à ${changement.libelle}` : "Prévoir ce changement"}
      </button>
      {ouvert ? (
        <Contenu key={ouverture} changement={changement} compteId={compteId} fermer={fermer} surFait={() => setFait(true)} />
      ) : null}
    </>
  );
}

function Contenu({
  changement,
  compteId,
  fermer,
  surFait,
}: {
  changement: ChangementPropose;
  compteId: string | null;
  fermer: () => void;
  surFait: () => void;
}) {
  const [resultat, envoyer] = useActionState(async (avant: ResultatChangement, formData: FormData) => {
    const r = await changerFormuleAction(avant, formData);
    if (r) surFait();
    return r;
  }, null);

  if (resultat?.etat === "changee") {
    const prochain = date(resultat.prochainLe);
    return (
      <PanneauModal ouvert surFermer={fermer} surtitre="C'est fait" titre={`Vous êtes en ${changement.libelle}`}>
        <p className="m-0">
          {resultat.preleveCentimes !== null ? `${eurosAuCentime(resultat.preleveCentimes)} TTC prélevés aujourd'hui. ` : "Votre nouvelle formule s'applique dès maintenant. "}
          {prochain && changement.ensuiteCentimes !== null
            ? `Prochain prélèvement : ${eurosAuCentime(changement.ensuiteCentimes)} TTC le ${prochain}.`
            : null}
        </p>
        <p className={AIDE}>
          La facture est dans{" "}
          <Link href={PAGE_PAIEMENT} className="font-semibold underline">
            Paiement et factures
          </Link>
          .
        </p>
        <div className={BOUTONS}>
          <button type="button" onClick={fermer} className={PLEIN}>
            Fermer
          </button>
        </div>
      </PanneauModal>
    );
  }

  if (resultat?.etat === "prevue") {
    const le = date(resultat.le);
    return (
      <PanneauModal ouvert surFermer={fermer} surtitre="C'est noté" titre={`Passage à ${changement.libelle}${le ? ` le ${le}` : " à la fin de la période"}`}>
        <p className="m-0">
          D&apos;ici là, vous gardez {changement.actuelle}. Rien n&apos;a été prélevé
          {changement.ensuiteCentimes !== null ? ` ; ensuite, ${eurosAuCentime(changement.ensuiteCentimes)} TTC par ${changement.unite}` : ""}.
        </p>
        <p className={AIDE}>Vous avez changé d&apos;avis ? Le changement s&apos;annule ici, jusqu&apos;à cette date.</p>
        <div className={BOUTONS}>
          <form action={annulerBaisseAction}>
            <ChampCompteAttendu compteId={compteId} />
            <BoutonEnvoi variant="boardClair">Annuler ce changement</BoutonEnvoi>
          </form>
          <button type="button" onClick={fermer} className={PLEIN}>
            Fermer
          </button>
        </div>
      </PanneauModal>
    );
  }

  return changement.sens === "montee" ? (
    <ConfirmerMontee changement={changement} compteId={compteId} fermer={fermer} envoyer={envoyer} />
  ) : (
    <ConfirmerBaisse changement={changement} compteId={compteId} fermer={fermer} envoyer={envoyer} />
  );
}

type Confirmer = {
  changement: ChangementPropose;
  compteId: string | null;
  fermer: () => void;
  envoyer: (formData: FormData) => void;
};

function ConfirmerMontee({ changement, compteId, fermer, envoyer }: Confirmer) {
  const [apercu, setApercu] = useState<ApercuDeChangement | null>(null);
  // L'aperçu se lit à l'ouverture, une fois : Stripe calcule, rien n'est prélevé.
  useEffect(() => {
    let actif = true;
    const f = new FormData();
    f.set("formule", changement.cle);
    f.set(CHAMP_COMPTE_ATTENDU, compteId ?? "");
    apercuMonteeAction(f)
      .catch((): ApercuDeChangement => ({ erreur: true }))
      .then((a) => {
        if (actif) setApercu(a);
      });
    return () => {
      actif = false;
    };
  }, [changement.cle, compteId]);
  const lu = apercu && !("erreur" in apercu) ? apercu : null;
  const jusquAu = date(lu?.jusquAu ?? null);
  return (
    <PanneauModal ouvert surFermer={fermer} surtitre="Changer de formule" titre={`Passer à ${changement.libelle}`}>
      <div className="flex flex-col gap-3.5 rounded-[18px] bg-[color:var(--board-canvas)] px-5 py-4">
        <div className={LIGNE_PRIX}>
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-[color:var(--board-ink)]">Prélevé aujourd&apos;hui</span>
            <span className="text-[12.5px] leading-[1.45] text-[color:var(--board-slate-mid)]">
              {changement.rythme ?? `La différence avec ${changement.actuelle}${jusquAu ? `, jusqu'au ${jusquAu}` : ""}`}
            </span>
          </div>
          <span className={MONTANT} aria-live="polite">
            {lu ? (
              <>
                {eurosAuCentime(lu.aujourdhuiCentimes)}
                <span className="text-[13px] font-medium text-[color:var(--board-slate-mid)]"> TTC</span>
              </>
            ) : apercu ? (
              "—"
            ) : (
              <span className="text-[14px] font-medium text-[color:var(--board-slate-mid)]">Calcul…</span>
            )}
          </span>
        </div>
        {changement.ensuiteCentimes !== null ? (
          <>
            <div className="h-px bg-[color:var(--board-slate-line)]" />
            <div className={LIGNE_PRIX}>
              <span className="text-[14px]">{jusquAu ? `Puis, à partir du ${jusquAu}` : "Puis"}</span>
              <span className="whitespace-nowrap text-[15px] font-semibold text-[color:var(--board-ink)]">
                {eurosAuCentime(changement.ensuiteCentimes)} TTC par {changement.unite}
              </span>
            </div>
          </>
        ) : null}
      </div>
      {apercu && "erreur" in apercu ? (
        <p className="m-0 font-semibold text-[color:var(--board-ink)]">
          Le montant n&apos;a pas pu être calculé : rien n&apos;a été fait. Réessayez dans un instant.
        </p>
      ) : null}
      {changement.changements.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-[color:var(--board-ink)]">Ce qui s&apos;ouvre tout de suite</span>
          <ul className="m-0 grid list-none grid-cols-1 gap-x-5 gap-y-1.5 p-0 sm:grid-cols-2">
            {changement.changements.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden className="text-[color:var(--board-green-ink)]">
                  ✓
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className={AIDE}>Payé avec la carte de votre abonnement. La facture sera dans Paiement et factures.</p>
      <form action={envoyer} className={BOUTONS}>
        <input type="hidden" name="formule" value={changement.cle} />
        <ChampCompteAttendu compteId={compteId} />
        {lu ? <input type="hidden" name="prorationDate" value={lu.prorationDate} /> : null}
        <button type="button" onClick={fermer} className={CLAIR}>
          Annuler
        </button>
        <BoutonEnvoi variant="board" disabled={!lu}>
          {lu ? `Confirmer et payer ${eurosAuCentime(lu.aujourdhuiCentimes)}` : "Confirmer et payer"}
        </BoutonEnvoi>
      </form>
    </PanneauModal>
  );
}

function ConfirmerBaisse({ changement, compteId, fermer, envoyer }: Confirmer) {
  const fin = date(changement.finPeriode);
  return (
    <PanneauModal ouvert surFermer={fermer} surtitre="Changer de formule" titre={`Passer à ${changement.libelle}`}>
      <div className="flex flex-col gap-3.5 rounded-[18px] bg-[color:var(--board-canvas)] px-5 py-4">
        <div className={LIGNE_PRIX}>
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-[color:var(--board-ink)]">Prélevé aujourd&apos;hui</span>
            <span className="text-[12.5px] leading-[1.45] text-[color:var(--board-slate-mid)]">
              Vous gardez {changement.actuelle}
              {fin ? ` jusqu'au ${fin}` : " jusqu'à la fin de la période"}, déjà payé
            </span>
          </div>
          <span className={MONTANT}>0 €</span>
        </div>
        {changement.ensuiteCentimes !== null ? (
          <>
            <div className="h-px bg-[color:var(--board-slate-line)]" />
            <div className={LIGNE_PRIX}>
              <span className="text-[14px]">{fin ? `Puis, à partir du ${fin}` : "Puis"}</span>
              <span className="whitespace-nowrap text-[15px] font-semibold text-[color:var(--board-ink)]">
                {eurosAuCentime(changement.ensuiteCentimes)} TTC par {changement.unite}
              </span>
            </div>
          </>
        ) : null}
      </div>
      {changement.changements.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-[color:var(--board-ink)]">
            Ce qui change {fin ? `le ${fin}` : "à cette date"}
          </span>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {changement.changements.map((c) => (
              <li key={c} className="flex gap-2.5">
                <span aria-hidden className="text-[color:var(--board-slate-mid)]">
                  –
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className={AIDE}>
        Pas de remboursement de la période en cours. Vous pourrez annuler ce changement{fin ? ` jusqu'au ${fin}` : ""}.
      </p>
      <form action={envoyer} className={BOUTONS}>
        <input type="hidden" name="formule" value={changement.cle} />
        <ChampCompteAttendu compteId={compteId} />
        <button type="button" onClick={fermer} className={CLAIR}>
          Garder {changement.actuelle}
        </button>
        <BoutonEnvoi variant="board">{fin ? `Passer à ${changement.libelle} le ${fin}` : `Passer à ${changement.libelle}`}</BoutonEnvoi>
      </form>
    </PanneauModal>
  );
}
