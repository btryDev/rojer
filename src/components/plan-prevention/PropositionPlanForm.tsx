"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  proposerModificationPlan,
  type PropositionState,
} from "@/lib/plan-prevention/proposition-actions";
import { LIGNES_MAX } from "@/lib/plan-prevention/proposition";

/**
 * « Un point ne convient pas ? Proposer une modification » — sur la page du
 * lien de signature, pour l'entreprise extérieure (ADR-061 § 3).
 *
 * Structurée : sa fiche (sans son adresse e-mail, figée) et les lignes de
 * risques, à modifier, ajouter ou retirer. Pas de code demandé : proposer
 * n'engage pas.
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

export function PropositionPlanForm({
  token,
  fiche: ficheInitiale,
  lignes: lignesInitiales,
}: {
  token: string;
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
}) {
  const [ouvert, setOuvert] = useState(false);
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
  const action = proposerModificationPlan.bind(null, token);
  const [state, formAction, pending] = useActionState<PropositionState, FormData>(action, {
    status: "idle",
  });

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-[color:var(--board-green-ink)]/40 bg-[color:var(--board-green)] p-6">
        <p className="m-0 text-[0.95rem] font-semibold text-[color:var(--board-ink)]">
          Votre proposition est enregistrée.
        </p>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--board-ink)]">
          Votre interlocuteur accepte, corrige ou refuse votre proposition. D&apos;ici
          là, le plan ne se signe pas. S&apos;il l&apos;accepte, les signatures déjà
          posées sont révoquées et le plan se signe de nouveau.
        </p>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <div className="rounded-2xl border border-[color:var(--board-slate-line)] p-5">
        <p className="m-0 text-[0.9rem] text-[color:var(--board-ink)]">Un point ne convient pas ?</p>
        <p className="mt-1 text-[0.8rem] text-[color:var(--muted-foreground)]">
          Au lieu de signer, proposez une modification de votre fiche ou des risques
          et de leurs mesures. Votre interlocuteur la traite avant toute signature.
        </p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => setOuvert(true)}>
          Proposer une modification
        </Button>
      </div>
    );
  }

  const changerLigne = (cle: string, champ: keyof Omit<Ligne, "id" | "cle">, valeur: string) =>
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)));

  const json = JSON.stringify({
    fiche: {
      ...fiche,
      efEffectifIntervenant: fiche.efEffectifIntervenant,
    },
    lignes: lignes.map(({ id, risque, mesureEntrepriseUtilisatrice, mesureEntrepriseExterieure }) => ({
      ...(id ? { id } : {}),
      risque,
      mesureEntrepriseUtilisatrice,
      mesureEntrepriseExterieure,
    })),
  });

  return (
    <form action={formAction} className="space-y-6 rounded-2xl border border-[color:var(--board-slate-line)] p-5">
      <input type="hidden" name="proposition" value={json} />
      <div>
        <p className="m-0 text-[0.95rem] font-semibold text-[color:var(--board-ink)]">Proposer une modification</p>
        <p className="mt-1 text-[0.8rem] text-[color:var(--muted-foreground)]">
          Les dates, les lieux, la nature des travaux et les rubriques du plan restent à
          votre interlocuteur. Votre adresse e-mail ne se modifie pas ici.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-[0.85rem] font-semibold">Votre entreprise</legend>
        <div className="space-y-1">
          <Label htmlFor="pp-raison">Raison sociale *</Label>
          <Input
            id="pp-raison"
            value={fiche.entrepriseExterieureRaison}
            maxLength={200}
            onChange={(e) => setFiche({ ...fiche, entrepriseExterieureRaison: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-siret">SIRET</Label>
          <Input
            id="pp-siret"
            value={fiche.entrepriseExterieureSiret}
            inputMode="numeric"
            maxLength={17}
            onChange={(e) => setFiche({ ...fiche, entrepriseExterieureSiret: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-chef">Chef de l&apos;entreprise *</Label>
          <Input
            id="pp-chef"
            value={fiche.efChefNom}
            maxLength={200}
            onChange={(e) => setFiche({ ...fiche, efChefNom: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-effectif">Effectif qui interviendra *</Label>
          <Input
            id="pp-effectif"
            value={fiche.efEffectifIntervenant}
            inputMode="numeric"
            maxLength={4}
            onChange={(e) => setFiche({ ...fiche, efEffectifIntervenant: e.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-[0.85rem] font-semibold">Risques d&apos;interférence et mesures</legend>
        {lignes.map((l, i) => (
          <div key={l.cle} className="space-y-2 rounded-xl border border-[color:var(--board-slate-line)] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-[0.8rem] font-semibold text-[color:var(--muted-foreground)]">
                Risque {i + 1}
                {!l.id && " (ajouté)"}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))}
                disabled={lignes.length <= 1}
              >
                Retirer
              </Button>
            </div>
            <Label htmlFor={`pp-risque-${l.cle}`}>Risque *</Label>
            <textarea
              className="champ-board min-h-[64px] resize-y"
              id={`pp-risque-${l.cle}`}
              value={l.risque}
              maxLength={500}
              onChange={(e) => changerLigne(l.cle, "risque", e.target.value)}
            />
            <Label htmlFor={`pp-eu-${l.cle}`}>Mesure de l&apos;entreprise utilisatrice</Label>
            <textarea
              className="champ-board min-h-[64px] resize-y"
              id={`pp-eu-${l.cle}`}
              value={l.mesureEntrepriseUtilisatrice}
              maxLength={500}
              onChange={(e) => changerLigne(l.cle, "mesureEntrepriseUtilisatrice", e.target.value)}
            />
            <Label htmlFor={`pp-ee-${l.cle}`}>Votre mesure</Label>
            <textarea
              className="champ-board min-h-[64px] resize-y"
              id={`pp-ee-${l.cle}`}
              value={l.mesureEntrepriseExterieure}
              maxLength={500}
              onChange={(e) => changerLigne(l.cle, "mesureEntrepriseExterieure", e.target.value)}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
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
        <p role="alert" className="text-[0.85rem] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <p className="text-[0.78rem] text-[color:var(--muted-foreground)]">
        Tant que votre proposition attend la réponse de votre interlocuteur, le plan
        ne se signe pas. S&apos;il l&apos;accepte, chaque partie le signe de nouveau.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer ma proposition"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOuvert(false)} disabled={pending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
