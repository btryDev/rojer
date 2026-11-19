"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import {
  proposerModificationPlan,
  type PropositionState,
} from "@/lib/plan-prevention/proposition-actions";
import { LIGNES_MAX } from "@/lib/plan-prevention/proposition";

/**
 * « Un point ne convient pas ? Proposer des modifications » — sur la page du
 * lien de signature, pour l'entreprise extérieure (ADR-061 § 3).
 *
 * ~~Un encadré sous le formulaire de signature, ouvert par un bouton~~
 * [2026-11-19, cahier de reprise § 3.3] : un MODE qui remplace le bloc de
 * signature (`SignerOuProposer`), avec « ← Retour à la signature ». Après
 * l'envoi, seul l'encadré de succès reste.
 *
 * Structurée : sa fiche (son adresse e-mail affichée, figée) et les lignes de
 * risques, à modifier, ajouter ou retirer. Pas de code demandé : proposer
 * n'engage pas, et ne révoque rien — le plan ne se signe plus tant que la
 * proposition attend (ce n'est PAS un retour au brouillon).
 */

type Fiche = {
  entrepriseExterieureRaison: string;
  entrepriseExterieureSiret: string;
  efChefNom: string;
  efEffectifIntervenant: string;
};

type Ligne = {
  /** Absent : une ligne ajoutée. */
  id?: string;
  cle: string;
  risque: string;
  mesureEntrepriseUtilisatrice: string;
  mesureEntrepriseExterieure: string;
};

let compteur = 0;
const nouvelleCle = () => `nouvelle-${++compteur}`;

const CLASSE_ZONE = "champ-board min-h-[64px] resize-y";

export function PropositionPlanForm({
  token,
  email,
  fiche: ficheInitiale,
  lignes: lignesInitiales,
  onRetour,
  onEnvoyee,
}: {
  token: string;
  /** L'adresse du lien : affichée, jamais modifiable ici. */
  email: string;
  fiche: {
    entrepriseExterieureRaison: string;
    entrepriseExterieureSiret: string | null;
    efChefNom: string;
    efEffectifIntervenant: number;
  };
  lignes: {
    id: string;
    risque: string;
    mesureEntrepriseUtilisatrice: string | null;
    mesureEntrepriseExterieure: string | null;
  }[];
  /** « ← Retour à la signature ». */
  onRetour: () => void;
  /** La proposition est enregistrée. */
  onEnvoyee?: () => void;
}) {
  const [fiche, setFiche] = useState<Fiche>({
    entrepriseExterieureRaison: ficheInitiale.entrepriseExterieureRaison,
    entrepriseExterieureSiret: ficheInitiale.entrepriseExterieureSiret ?? "",
    efChefNom: ficheInitiale.efChefNom,
    efEffectifIntervenant: String(ficheInitiale.efEffectifIntervenant),
  });
  const [lignes, setLignes] = useState<Ligne[]>(
    lignesInitiales.map((l) => ({
      id: l.id,
      cle: l.id,
      risque: l.risque,
      mesureEntrepriseUtilisatrice: l.mesureEntrepriseUtilisatrice ?? "",
      mesureEntrepriseExterieure: l.mesureEntrepriseExterieure ?? "",
    })),
  );
  // Le succès se dit aussi au bloc qui l'entoure (`onEnvoyee`), qui retire
  // alors la signature de la page.
  const [state, formAction, pending] = useActionState<PropositionState, FormData>(
    async (prec, donnees) => {
      const r = await proposerModificationPlan(token, prec, donnees);
      if (r.status === "success") onEnvoyee?.();
      return r;
    },
    { status: "idle" },
  );

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-[22px] bg-[color:var(--board-green)] p-6">
        <p className="m-0 text-[16px] font-semibold text-[color:var(--board-ink)]">Demande envoyée</p>
        <p className="m-0 mt-2 text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
          Votre proposition est enregistrée. <strong>Vous n&apos;avez pas signé le plan.</strong>{" "}
          Votre interlocuteur accepte, corrige ou refuse votre proposition ; d&apos;ici là, le
          plan ne se signe pas. S&apos;il l&apos;accepte, les signatures déjà posées sont
          révoquées et le plan se signe de nouveau.
        </p>
        <p className="m-0 mt-2 text-[13.5px] text-[color:var(--board-ink)]">Vous pouvez fermer cette page.</p>
      </div>
    );
  }

  const changerLigne = (cle: string, champ: keyof Omit<Ligne, "id" | "cle">, valeur: string) =>
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)));

  const json = JSON.stringify({
    fiche,
    lignes: lignes.map(({ id, risque, mesureEntrepriseUtilisatrice, mesureEntrepriseExterieure }) => ({
      ...(id ? { id } : {}),
      risque,
      mesureEntrepriseUtilisatrice,
      mesureEntrepriseExterieure,
    })),
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="proposition" value={json} />

      <div className="rounded-[18px] bg-[color:var(--board-amber-wash)] p-4 shadow-[inset_0_0_0_1px_rgba(117,77,10,.22)]">
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-amber-ink)]">
          Mode proposition de modifications
        </p>
        <p className="m-0 mt-2 text-[13.5px] font-semibold leading-[1.55] text-[color:var(--board-amber-ink)]">
          Vous ne signez pas maintenant.
        </p>
        <p className="m-0 mt-1 text-[13px] leading-[1.55] text-[color:var(--board-amber-ink)]">
          Votre interlocuteur accepte, corrige ou refuse votre proposition. Tant qu&apos;il
          n&apos;a pas répondu, le plan ne se signe pas. S&apos;il l&apos;accepte, chaque partie
          le signe de nouveau. Les dates, les lieux, la nature des travaux et les rubriques du
          plan restent à votre interlocuteur.
        </p>
      </div>

      <ChampBoard
        id="pp-email"
        label="Votre adresse e-mail"
        value={email}
        readOnly
        disabled
        aide="L'adresse du lien de signature ne se modifie pas ici."
        champClassName="cursor-not-allowed opacity-70"
      />

      <fieldset className="m-0 space-y-3 border-0 p-0">
        <legend className="mb-2 text-[14px] font-semibold text-[color:var(--board-ink)]">Votre entreprise</legend>
        <ChampBoard
          id="pp-raison"
          label="Raison sociale"
          requis
          value={fiche.entrepriseExterieureRaison}
          maxLength={200}
          onChange={(e) => setFiche({ ...fiche, entrepriseExterieureRaison: e.target.value })}
        />
        <ChampBoard
          id="pp-siret"
          label="SIRET"
          value={fiche.entrepriseExterieureSiret}
          inputMode="numeric"
          maxLength={17}
          onChange={(e) => setFiche({ ...fiche, entrepriseExterieureSiret: e.target.value })}
        />
        <ChampBoard
          id="pp-chef"
          label="Chef de l'entreprise"
          requis
          value={fiche.efChefNom}
          maxLength={200}
          onChange={(e) => setFiche({ ...fiche, efChefNom: e.target.value })}
        />
        <ChampBoard
          id="pp-effectif"
          label="Effectif qui interviendra"
          requis
          value={fiche.efEffectifIntervenant}
          inputMode="numeric"
          maxLength={4}
          onChange={(e) => setFiche({ ...fiche, efEffectifIntervenant: e.target.value })}
        />
      </fieldset>

      <fieldset className="m-0 space-y-4 border-0 p-0">
        <legend className="mb-2 text-[14px] font-semibold text-[color:var(--board-ink)]">
          Risques d&apos;interférence et mesures
        </legend>
        {lignes.map((l, i) => (
          <div key={l.cle} className="space-y-2 rounded-[18px] bg-[color:var(--board-slate-pale)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                Risque {i + 1}
                {!l.id && " (ajouté)"}
              </p>
              <Button
                type="button"
                variant="boardClair"
                size="boardSm"
                onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))}
                disabled={lignes.length <= 1}
              >
                Retirer
              </Button>
            </div>
            <label className="label-board" htmlFor={`pp-risque-${l.cle}`}>
              Risque *
            </label>
            <textarea
              className={CLASSE_ZONE}
              id={`pp-risque-${l.cle}`}
              value={l.risque}
              maxLength={500}
              onChange={(e) => changerLigne(l.cle, "risque", e.target.value)}
            />
            <label className="label-board" htmlFor={`pp-eu-${l.cle}`}>
              Mesure de l&apos;entreprise utilisatrice
            </label>
            <textarea
              className={CLASSE_ZONE}
              id={`pp-eu-${l.cle}`}
              value={l.mesureEntrepriseUtilisatrice}
              maxLength={500}
              onChange={(e) => changerLigne(l.cle, "mesureEntrepriseUtilisatrice", e.target.value)}
            />
            <label className="label-board" htmlFor={`pp-ee-${l.cle}`}>
              Votre mesure
            </label>
            <textarea
              className={CLASSE_ZONE}
              id={`pp-ee-${l.cle}`}
              value={l.mesureEntrepriseExterieure}
              maxLength={500}
              onChange={(e) => changerLigne(l.cle, "mesureEntrepriseExterieure", e.target.value)}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="boardClair"
          size="board"
          disabled={lignes.length >= LIGNES_MAX}
          onClick={() =>
            setLignes((ls) => [
              ...ls,
              { cle: nouvelleCle(), risque: "", mesureEntrepriseUtilisatrice: "", mesureEntrepriseExterieure: "" },
            ])
          }
        >
          Ajouter un risque
        </Button>
      </fieldset>

      {state.status === "error" && (
        <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="boardClair" size="board" onClick={onRetour} disabled={pending}>
          ← Retour à la signature
        </Button>
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer ma demande de modification"}
        </Button>
      </div>
    </form>
  );
}
