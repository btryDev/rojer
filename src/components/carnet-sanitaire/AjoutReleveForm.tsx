"use client";

import { useActionState, useState } from "react";
import { useOuvertureFormulaire } from "./useOuvertureFormulaire";
import { Button } from "@/components/ui/button";
import { ChampBoard, StatusPill } from "@/components/ui-kit";
import {
  ajouterReleve,
  modifierReleve,
  type CarnetActionState,
} from "@/lib/carnet-sanitaire/actions";
import { estReleveConforme, libelleSeuils } from "@/lib/carnet-sanitaire/schema";
import { cleJourCivil } from "@/lib/dates";
import { formaterMesure } from "@/lib/rendu/mesures";

/**
 * Formulaire compact de saisie d'un relevé de température. Pensé pour
 * mobile : grand champ numérique, bouton massif. Utilisable directement sur
 * place (tablette, téléphone).
 *
 * Le même formulaire corrige un relevé déjà saisi (2026-10-12) : `releve`
 * présent, il se pré-remplit et appelle `modifierReleve`.
 */
export function AjoutReleveForm({
  etablissementId,
  pointReleveId,
  seuilMinCelsius,
  seuilMaxCelsius,
  releve,
}: {
  etablissementId: string;
  pointReleveId: string;
  /** La plage du point (2026-10-14) ; l'aperçu la lit par
   *  `estReleveConforme`, comme le serveur. */
  seuilMinCelsius: number | null;
  seuilMaxCelsius: number | null;
  releve?: {
    id: string;
    /** « AAAA-MM-JJ ». */
    dateReleve: string;
    temperatureCelsius: number;
    operateur: string | null;
    commentaire: string | null;
  };
}) {
  const boundAction = releve
    ? modifierReleve.bind(null, etablissementId, releve.id)
    : ajouterReleve.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    CarnetActionState,
    FormData
  >(boundAction, { status: "idle" });
  const [temperature, setTemperature] = useState<string>(
    releve ? String(releve.temperatureCelsius) : "",
  );
  // Une correction faite referme le formulaire : la liste montre le résultat.
  const [ouvert, setOuvert] = useOuvertureFormulaire(state, Boolean(releve));
  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;
  // Un identifiant par formulaire : la saisie et chaque correction coexistent.
  const sfx = releve ? releve.id : pointReleveId;

  const tempNum = temperature ? parseFloat(temperature) : null;
  const seuils = { seuilMinCelsius, seuilMaxCelsius };
  const dansLaPlage =
    tempNum === null || Number.isNaN(tempNum) ? null : estReleveConforme(tempNum, seuils);

  if (!ouvert) {
    return releve ? (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-[12px] font-medium text-[color:var(--board-slate-mid)] underline-offset-2 transition-colors hover:text-[color:var(--board-ink)] hover:underline"
      >
        Modifier
      </button>
    ) : (
      <Button
        type="button"
        variant="board"
        size="boardSm"
        onClick={() => setOuvert(true)}
      >
        + Saisir un relevé
      </Button>
    );
  }

  // Jour civil de Paris, pas la date UTC du navigateur : entre 00:00 et
  // 02:00 heure d'été, `toISOString()` renvoie encore la veille et le
  // formulaire proposait la mauvaise date de relevé (cf. ADR-011).
  const today = cleJourCivil(new Date());

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] p-5"
    >
      <input type="hidden" name="pointReleveId" value={pointReleveId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1.5fr]">
        <ChampBoard
          id={`dateReleve-${sfx}`}
          name="dateReleve"
          label="Date"
          requis
          type="date"
          max={today}
          defaultValue={releve?.dateReleve ?? today}
          erreur={err("dateReleve")}
        />
        <div>
          <label
            className="label-board"
            htmlFor={`temperatureCelsius-${sfx}`}
          >
            Température (°C) *
          </label>
          <div className="flex items-center gap-3">
            <input
              id={`temperatureCelsius-${sfx}`}
              name="temperatureCelsius"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              max={100}
              required
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="52.3"
              className="champ-board text-center text-[22px] font-semibold tabular-nums"
              aria-describedby={`seuil-${sfx}`}
            />
            {/* « Conforme » ne se dit pas : l'outil constate qu'une mesure
                tombe dans la plage attendue, ou qu'elle en sort — il ne
                prononce pas la conformité de l'installation (interdits
                16-17). Mêmes mots que la pastille du carnet. */}
            {dansLaPlage !== null && (
              <StatusPill
                charte="board"
                size="sm"
                status={dansLaPlage ? "a_jour" : "non_conforme"}
                label={dansLaPlage ? "Dans la plage" : undefined}
                className="shrink-0"
              />
            )}
          </div>
          <p
            id={`seuil-${sfx}`}
            className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
          >
            Plage du point : {libelleSeuils(seuils, (c) => formaterMesure(c, "°C", 0, 1))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampBoard
          id={`operateur-${sfx}`}
          name="operateur"
          label="Opérateur (facultatif)"
          maxLength={200}
          defaultValue={releve?.operateur ?? undefined}
          placeholder="Prénom Nom"
        />
        <ChampBoard
          id={`commentaire-${sfx}`}
          name="commentaire"
          label="Commentaire"
          maxLength={1000}
          defaultValue={releve?.commentaire ?? undefined}
          placeholder="Ex : après purge"
        />
      </div>

      {state.status === "error" && !state.fieldErrors?.dateReleve && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="boardSm" disabled={pending}>
          {pending ? "…" : releve ? "Enregistrer la correction" : "Enregistrer le relevé"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setTemperature(releve ? String(releve.temperatureCelsius) : "");
          }}
          className="text-[12.5px] font-medium text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
