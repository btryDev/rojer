"use client";

import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard, EvidenceDropzone, StatusPill } from "@/components/ui-kit";
import {
  ajouterAnalyseLegionelle,
  type CarnetActionState,
} from "@/lib/carnet-sanitaire/actions";
import { SEUIL_LEGIONELLE_UFC_PAR_L } from "@/lib/carnet-sanitaire/schema";
import { cleJourCivil } from "@/lib/dates";

export function AjoutAnalyseForm({
  etablissementId,
}: {
  etablissementId: string;
}) {
  const boundAction = ajouterAnalyseLegionelle.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    CarnetActionState,
    FormData
  >(boundAction, { status: "idle" });
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState<string>("");

  const ufcNum = valeur ? parseInt(valeur, 10) : null;
  const sousLeSeuil = ufcNum !== null && ufcNum < SEUIL_LEGIONELLE_UFC_PAR_L;

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
      >
        + Enregistrer une analyse
      </button>
    );
  }

  // Jour civil de Paris : entre 00:00 et 02:00 heure d'été,
  // `toISOString()` renvoie encore la veille (cf. ADR-011).
  const today = cleJourCivil(new Date());

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="flex flex-col gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampBoard
          id="dateAnalyse"
          name="dateAnalyse"
          label="Date de l'analyse"
          requis
          type="date"
          defaultValue={today}
        />
        <ChampBoard
          id="laboratoire"
          name="laboratoire"
          label="Laboratoire"
          maxLength={200}
          placeholder="Ex : Eurofins, Inovalys"
        />
      </div>

      <div>
        <label className="label-board" htmlFor="valeurUfcParL">
          Résultat (UFC/L de Legionella pneumophila)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="valeurUfcParL"
            name="valeurUfcParL"
            type="number"
            min={0}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            placeholder="0"
            className="champ-board max-w-[180px] text-center text-[20px] font-semibold tabular-nums"
            aria-describedby="valeurUfcParL-aide"
          />
          {/* Le libellé nomme le seuil, pas un verdict : c'est déjà ce que
              disait le papier, et le board le garde tel quel. */}
          {ufcNum !== null && (
            <StatusPill
              charte="board"
              size="sm"
              status={sousLeSeuil ? "a_jour" : "non_conforme"}
              label={
                sousLeSeuil
                  ? "Sous la limite de qualité"
                  : "Limite de qualité atteinte"
              }
              className="shrink-0"
            />
          )}
        </div>
        <p
          id="valeurUfcParL-aide"
          className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
        >
          Limite de qualité en <em>Legionella pneumophila</em> :{" "}
          {SEUIL_LEGIONELLE_UFC_PAR_L}{" "}UFC/L aux points d&apos;usage à risque
          (arrêté du 1er février 2010, art. 4). À partir de cette valeur, le
          même article
          demande des mesures correctives sans délai, puis des analyses pour
          en vérifier l&apos;efficacité.
        </p>
      </div>

      <div>
        <p className="label-board">Rapport du laboratoire (facultatif)</p>
        <EvidenceDropzone
          name="rapport"
          label="Rapport d'analyse PDF"
          hint="Fichier fourni par le laboratoire"
        />
      </div>

      <div>
        <label className="label-board" htmlFor="commentaire">
          Commentaire / mesures correctives
        </label>
        <textarea
          id="commentaire"
          name="commentaire"
          rows={3}
          maxLength={2000}
          className="champ-board min-h-[84px] resize-y"
          placeholder="Ex : Choc thermique programmé le JJ/MM, prélèvement de contrôle à 2 semaines"
        />
      </div>

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="boardSm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer l'analyse"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setValeur("");
          }}
          className="text-[12.5px] font-medium text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
