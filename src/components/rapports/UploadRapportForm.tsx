"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { LABEL_RESULTAT, RESULTATS } from "@/lib/rapports/resultats";
import type { UploadRapportState } from "@/lib/rapports/actions";
import type { FaitPar } from "@/lib/rapports/interne";
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
  /**
   * Le choix « En interne / Prestataire » (2026-11-04, `rapports/interne.ts`) :
   * `null` = la ligne exige un tiers, pas de choix, le rapport est exigé ;
   * sinon, le mode par lequel le formulaire s'ouvre.
   */
  faitParDefaut?: FaitPar | null;
};

const OPTIONS_FAIT_PAR: { valeur: FaitPar; libelle: string }[] = [
  { valeur: "interne", libelle: "En interne" },
  { valeur: "prestataire", libelle: "Par un prestataire" },
];

export function UploadRapportForm({
  action,
  labelAnnuler,
  organismeParDefaut,
  faitParDefaut = null,
}: Props) {
  // Un dépôt réussi ne revient pas ici : l'action serveur ramène à la fiche
  // du contrôle, qui dit « Rapport enregistré » (ADR-048).
  const [state, formAction, pending] = useActionState<UploadRapportState, FormData>(action, {
    status: "idle",
  });
  // Un prestataire attitré fait ouvrir sur « Par un prestataire », même là où
  // l'exploitant peut le faire lui-même : c'est lui qui est attendu.
  const [faitPar, setFaitPar] = useState<FaitPar>(
    faitParDefaut === null
      ? "prestataire"
      : organismeParDefaut
        ? "prestataire"
        : faitParDefaut,
  );
  const choix = faitParDefaut !== null;
  const interne = faitPar === "interne";

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  const tailleMaxMo = Math.round(TAILLE_MAX_OCTETS / 1024 / 1024);

  const champFichier = (
    <div>
      <label className="label-board" htmlFor="fichier">
        {interne ? "Pièce jointe (facultatif)" : "Fichier du rapport *"}
        <InfoTooltip>
          {interne
            ? `Une photo, une fiche de relevé… si vous en avez une. Formats acceptés : ${FORMATS_ACCEPTES}. Taille max ${tailleMaxMo} Mo.`
            : `Formats acceptés : ${FORMATS_ACCEPTES}. Taille max ${tailleMaxMo} Mo.`}
        </InfoTooltip>
      </label>
      <input
        id="fichier"
        name="fichier"
        type="file"
        required={!interne}
        accept={MIME_AUTORISES.join(",")}
        className="champ-board file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--board-ink)] file:px-3 file:py-1 file:text-[12px] file:font-semibold file:text-white"
      />
      {err("fichier") && (
        <p className="mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {err("fichier")}
        </p>
      )}
    </div>
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="faitPar" value={faitPar} />

      {choix ? (
        <div>
          <p className="label-board" id="fait-par-label">
            Qui a fait la vérification ?
          </p>
          <div
            role="radiogroup"
            aria-labelledby="fait-par-label"
            className="inline-flex rounded-full bg-[color:var(--board-slate-pale)] p-1"
          >
            {OPTIONS_FAIT_PAR.map((o) => {
              const actif = faitPar === o.valeur;
              return (
                <button
                  key={o.valeur}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => setFaitPar(o.valeur)}
                  className={
                    "rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors " +
                    (actif
                      ? "bg-[color:var(--board-ink)] text-white"
                      : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
                  }
                >
                  {o.libelle}
                </button>
              );
            })}
          </div>
          <p className="m-0 mt-2 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {interne
              ? "Vous ou votre équipe : remplissez le relevé, aucun fichier n'est demandé."
              : "Joignez le rapport que le prestataire vous a remis."}
          </p>
        </div>
      ) : null}

      {/* Par un prestataire, le rapport vient en premier : c'est la pièce. */}
      {!interne ? champFichier : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-board" htmlFor="dateRapport">
            {interne ? "Date de la vérification *" : "Date du rapport *"}
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

      {/* Le même champ porte l'organisme ou, en interne, la personne : la
          `key` le vide au changement de mode, pour ne pas laisser le nom du
          prestataire attitré sous « Fait par ». */}
      <div key={faitPar}>
        <label className="label-board" htmlFor="organismeVerif">
          {interne ? "Fait par" : "Organisme vérificateur"}
          <InfoTooltip>
            {interne
              ? "La personne qui a fait la vérification (facultatif)."
              : "Nom de l'organisme qui a réalisé la vérification (facultatif mais recommandé pour l'audit)."}
          </InfoTooltip>
        </label>
        <input
          id="organismeVerif"
          name="organismeVerif"
          className="champ-board"
          placeholder={interne ? "Ex : Marie Dupont, responsable de salle" : "Ex : Apave, Bureau Veritas, Socotec…"}
          defaultValue={interne ? undefined : organismeParDefaut}
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
          {interne ? "Observations" : "Commentaires libres"}
        </label>
        <textarea
          id="commentaires"
          name="commentaires"
          rows={3}
          className="champ-board"
          placeholder={
            interne
              ? "Ce que vous avez constaté : tout fonctionne, un bloc ne s'allume pas…"
              : "Observations, remarques, points à corriger…"
          }
        />
        {err("commentaires") && (
          <p className="mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("commentaires")}
          </p>
        )}
      </div>

      {/* En interne, la pièce jointe vient en dernier : elle est facultative. */}
      {interne ? champFichier : null}

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending
            ? "Enregistrement…"
            : interne
              ? "Enregistrer la vérification"
              : "Enregistrer le rapport"}
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
