"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { repondreFaitActivite } from "@/lib/etablissements/faits-activite-actions";
import type { ChampFaitActivite } from "@/lib/etablissements/faits-activite";

/**
 * Un fait d'activité de l'établissement, et son couple Oui / Non (ADR-041).
 *
 * Le geste de `QuestionTransverseRow` et `QuestionActiviteRow`, à l'identique :
 * aucun bouton mis en avant tant que rien n'est répondu, « retirer ma réponse »
 * ramène au silence. La même réponse que l'étape transverse du DUERP — c'est la
 * même colonne.
 *
 * Pas de confirmation sur un « non » : depuis cet écran, un risque du DUERP
 * déjà travaillé n'est jamais supprimé (`risque-transverse.ts`, `si_vierge`).
 * L'écran le dit quand c'est le cas.
 */
type Props = {
  etablissementId: string;
  champ: ChampFaitActivite;
  intitule: string;
  pourquoi: string;
  /**
   * Ce que la question ne couvre pas (`autresFondements`). ~~La carte de la
   * fiche salarié le disait~~ [2026-10-24 : carte retirée ; la phrase vit
   * avec sa question, quelle que soit la réponse — revue indépendante.]
   */
  horsQuestion?: string;
  valeur: boolean | null;
  // ~~`children` : les vignettes nées du fait, sous les réponses (2026-10-21)~~
  // [retiré le 2026-10-24, ADR-047 : la page ne pose plus que la question].
};

export function FaitActiviteRow({ etablissementId, champ, intitule, pourquoi, horsQuestion, valeur }: Props) {
  const [pending, startTransition] = useTransition();
  // `true` : échec sans explication ; une chaîne : le refus dit pourquoi.
  const [echec, setEchec] = useState<boolean | string>(false);
  const [risqueConserve, setRisqueConserve] = useState(false);
  const [avertissement, setAvertissement] = useState<string | null>(null);

  const repondre = (v: boolean | null) => {
    if (v === valeur) return;
    setEchec(false);
    setRisqueConserve(false);
    setAvertissement(null);
    startTransition(async () => {
      try {
        const r = await repondreFaitActivite(etablissementId, champ, v);
        if (r.status === "error") setEchec(r.message || true);
        // La réponse est acquise mais le calendrier n'a pas suivi : le dire,
        // comme la fiche établissement (`MESSAGE_REGEN_ECHEC`).
        if (r.status === "success_avec_avertissement") setAvertissement(r.message);
        if ("risqueConserve" in r && r.risqueConserve) setRisqueConserve(true);
      } catch {
        setEchec(true);
      }
    });
  };

  return (
    <li id={champ} className="carte-board scroll-mt-6 px-7 py-6 sm:px-8">
      <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
        {intitule}
      </p>
      <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        {pourquoi}
      </p>
      {horsQuestion && (
        <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12px] leading-[1.55] text-[color:var(--board-slate-soft)]">
          {horsQuestion}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant={valeur === true ? "board" : "boardClair"}
          size="boardSm"
          disabled={pending}
          onClick={() => repondre(true)}
        >
          Oui
        </Button>
        <Button
          variant={valeur === false ? "board" : "boardClair"}
          size="boardSm"
          disabled={pending}
          onClick={() => repondre(false)}
        >
          Non
        </Button>
        {valeur === null ? (
          <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Sans réponse
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => repondre(null)}
            className="text-[12.5px] text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline disabled:opacity-50"
          >
            retirer ma réponse
          </button>
        )}
      </div>
      {risqueConserve && (
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Votre réponse est enregistrée. Votre DUERP garde un risque qui dit le
          contraire — déjà coté, avec des actions, ou coché « exposition CMR ».
          Rojer ne modifie pas ce travail sans vous : corrigez-le dans le DUERP
          si besoin.
        </p>
      )}
      {avertissement && (
        <p role="status" className="m-0 mt-3 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {avertissement}
        </p>
      )}
      {echec && (
        <p role="alert" className="m-0 mt-3 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {typeof echec === "string"
            ? echec
            : "Cette réponse n'a pas pu être enregistrée. Rechargez la page, puis réessayez."}
        </p>
      )}
    </li>
  );
}
