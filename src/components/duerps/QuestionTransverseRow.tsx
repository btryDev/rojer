"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { repondreQuestionTransverse } from "@/lib/transverses/actions";
import type { ReponseTransverse } from "@/lib/transverses/etat";

/**
 * Une question transverse, et son couple Oui / Non.
 *
 * Trois états depuis l'ADR-038, comme `QuestionActiviteRow` dont le geste est
 * repris : le « non » est persisté (`Duerp.reponsesTransverses`), donc il peut
 * enfin s'afficher sélectionné ; tant que rien n'a été répondu, **aucun** des
 * deux boutons n'est mis en avant — mettre « Non » en évidence par défaut
 * afficherait une réponse que personne n'a donnée, sur un document à valeur
 * légale. « Retirer ma réponse » ramène au silence.
 *
 * Le `id` de la ligne est celui de la question : la fiche d'un salarié y
 * renvoie directement quand la réponse manque (« Formations liées aux risques
 * du poste »). Un seul questionnaire, celui du document unique.
 */
type Props = {
  duerpId: string;
  questionId: string;
  intitule: string;
  libelleRisque: string;
  reponse: ReponseTransverse;
};

const VALEUR: Record<ReponseTransverse, boolean | null> = {
  oui: true,
  non: false,
  sans_reponse: null,
};

export function QuestionTransverseRow({
  duerpId,
  questionId,
  intitule,
  libelleRisque,
  reponse,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [echec, setEchec] = useState(false);

  // Même raison que `QuestionActiviteRow` : un rejet perdu dans la transition
  // laissait la ligne dans son état précédent, et le dirigeant repartait en
  // croyant avoir répondu.
  const repondre = (valeur: boolean | null) => {
    if (valeur === VALEUR[reponse]) return;
    setEchec(false);
    startTransition(async () => {
      try {
        await repondreQuestionTransverse(duerpId, questionId, valeur);
      } catch {
        setEchec(true);
      }
    });
  };

  return (
    <li id={questionId} className="carte-board scroll-mt-6 px-7 py-6 sm:px-8">
      <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
        {intitule}
      </p>
      <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Si oui → ajoute le risque « {libelleRisque} » à votre DUERP.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant={reponse === "oui" ? "board" : "boardClair"}
          size="boardSm"
          disabled={pending}
          onClick={() => repondre(true)}
        >
          Oui
        </Button>
        <Button
          variant={reponse === "non" ? "board" : "boardClair"}
          size="boardSm"
          disabled={pending}
          onClick={() => repondre(false)}
        >
          Non
        </Button>
        {reponse === "sans_reponse" ? (
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
      {echec && (
        <p
          role="alert"
          className="m-0 mt-3 text-[12.5px] text-[color:var(--board-signal-ink)]"
        >
          Cette réponse n&apos;a pas pu être enregistrée. Rechargez la page,
          puis réessayez.
        </p>
      )}
    </li>
  );
}
