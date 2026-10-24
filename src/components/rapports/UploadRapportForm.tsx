"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { LABEL_RESULTAT, RESULTATS } from "@/lib/rapports/resultats";
import type { UploadRapportState } from "@/lib/rapports/actions";
import {
  FORMATS_ACCEPTES,
  MIME_AUTORISES,
  TAILLE_MAX_OCTETS,
} from "@/lib/rapports/validator";

// Contrôles en jetons du board (`.champ-board` / `.label-board`) plutôt
// que les primitives `Input`/`Label` du papier : ce formulaire vit dans
// une carte à rayon 30 de la fiche vérification, où le rayon 6 px et la
// bordure grise des primitives sonnaient comme un encart d'un autre
// logiciel. Les primitives restent en place partout ailleurs.
type Props = {
  action: (
    prev: UploadRapportState,
    formData: FormData,
  ) => Promise<UploadRapportState>;
  labelAnnuler?: { libelle: string; href: string };
  /** Le prestataire attitré du contrôle (ADR-049), proposé comme organisme. */
  organismeParDefaut?: string;
};

export function UploadRapportForm({ action, labelAnnuler, organismeParDefaut }: Props) {
  // Un dépôt réussi ne revient pas ici : l'action serveur ramène à la fiche
  // du contrôle, qui dit « Rapport enregistré » (ADR-048).
  const [state, formAction, pending] = useActionState<UploadRapportState, FormData>(action, {
    status: "idle",
  });

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  const tailleMaxMo = Math.round(TAILLE_MAX_OCTETS / 1024 / 1024);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label-board" htmlFor="fichier">
          Fichier du rapport *
          <InfoTooltip>
            Formats acceptés : {FORMATS_ACCEPTES}. Taille max {tailleMaxMo} Mo.
          </InfoTooltip>
        </label>
        <input
          id="fichier"
          name="fichier"
          type="file"
          required
          accept={MIME_AUTORISES.join(",")}
          className="champ-board file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--board-ink)] file:px-3 file:py-1 file:text-[12px] file:font-semibold file:text-white"
        />
        {err("fichier") && (
          <p className="mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("fichier")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-board" htmlFor="dateRapport">
            Date du rapport *
          </label>
          <input
            id="dateRapport"
            name="dateRapport"
            type="date"
            required
            className="champ-board"
            aria-invalid={Boolean(err("dateRapport"))}
          />
          {err("dateRapport") && (
            <p className="mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
              {err("dateRapport")}
            </p>
          )}
        </div>

        <div>
          <label className="label-board" htmlFor="resultat">
            Résultat *
          </label>
          <select
            id="resultat"
            name="resultat"
            required
            defaultValue="conforme"
            className="champ-board"
          >
            {RESULTATS.map((r) => (
              <option key={r} value={r}>
                {LABEL_RESULTAT[r]}
              </option>
            ))}
          </select>
          {err("resultat") && (
            <p className="mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
              {err("resultat")}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="label-board" htmlFor="organismeVerif">
          Organisme vérificateur
          <InfoTooltip>
            Nom de l&apos;organisme qui a réalisé la vérification
            (facultatif mais recommandé pour l&apos;audit).
          </InfoTooltip>
        </label>
        <input
          id="organismeVerif"
          name="organismeVerif"
          className="champ-board"
          placeholder="Ex : Apave, Bureau Veritas, Socotec…"
          defaultValue={organismeParDefaut}
          aria-invalid={Boolean(err("organismeVerif"))}
        />
        {err("organismeVerif") && (
          <p className="mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("organismeVerif")}
          </p>
        )}
      </div>

      <div>
        <label className="label-board" htmlFor="commentaires">
          Commentaires libres
        </label>
        <textarea
          id="commentaires"
          name="commentaires"
          rows={3}
          className="champ-board"
          placeholder="Observations, remarques, points à corriger…"
        />
        {err("commentaires") && (
          <p className="mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("commentaires")}
          </p>
        )}
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Upload en cours…" : "Enregistrer le rapport"}
        </Button>
        {labelAnnuler && (
          <Link
            href={labelAnnuler.href}
            className="text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
          >
            {labelAnnuler.libelle}
          </Link>
        )}
      </div>
    </form>
  );
}
