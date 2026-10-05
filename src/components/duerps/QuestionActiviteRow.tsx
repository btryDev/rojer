"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { repondreActivite } from "@/lib/activites/actions";

/**
 * Une question d'activité hors couverture, et son couple Oui / Non (ADR-020).
 *
 * Le traitement de l'absence de réponse est repris tel quel de
 * `QuestionTransverseRow` : tant que rien n'a été répondu, **aucun** des deux
 * boutons n'est mis en avant. Mettre « Non » en évidence par défaut afficherait
 * une réponse que personne n'a donnée, sur un document à valeur légale. Le
 * « non » est persistable (`exercee === false`), donc l'écran distingue trois
 * états — les transverses aussi depuis l'ADR-038, qui leur a repris ce geste.
 * Et les trois sont atteignables dans les deux sens : « retirer ma réponse »
 * ramène au silence.
 *
 * Répondre « oui » ne bloque rien et n'ajoute aucun risque : c'est une
 * déclaration de périmètre, pas une étape d'évaluation. C'est aussi pourquoi
 * la conséquence est affichée en clair sous la question — ce que le document
 * ne traitera pas est la seule chose que le dirigeant a besoin de savoir pour
 * décider de créer, ou non, une unité de travail à la main.
 */
type Props = {
  duerpId: string;
  activiteId: string;
  question: string;
  aide?: string;
  cequiManque: string;
  /** `undefined` = pas de réponse. Ne jamais replier sur `false`. */
  exercee: boolean | undefined;
};

export function QuestionActiviteRow({
  duerpId,
  activiteId,
  question,
  aide,
  cequiManque,
  exercee,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [echec, setEchec] = useState(false);

  // L'action peut refuser : le DUERP a disparu entre-temps, ou l'onglet est
  // resté ouvert après un changement de secteur et l'activité n'est plus
  // instruite. Sans ce `catch`, le rejet se perdait dans la transition, la
  // ligne restait affichée dans son état précédent, et le dirigeant repartait
  // en croyant avoir répondu.
  const repondre = (valeur: boolean | null) => {
    if (valeur === exercee) return;
    setEchec(false);
    startTransition(async () => {
      try {
        await repondreActivite(duerpId, activiteId, valeur);
      } catch {
        setEchec(true);
      }
    });
  };

  return (
    <li className="carte-board px-7 py-6 sm:px-8">
      <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
        {question}
      </p>
      {aide && (
        <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {aide}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant={exercee === true ? "board" : "boardClair"}
          size="boardSm"
          disabled={pending}
          onClick={() => repondre(true)}
        >
          Oui
        </Button>
        <Button
          variant={exercee === false ? "board" : "boardClair"}
          size="boardSm"
          disabled={pending}
          onClick={() => repondre(false)}
        >
          Non
        </Button>
        {exercee === undefined ? (
          <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Sans réponse
          </span>
        ) : (
          // Une réponse doit pouvoir être retirée, et pas seulement changée :
          // un « non » cliqué par erreur partait sinon dans une version figée
          // pour quarante ans, où il affirme que le dirigeant a *déclaré ne
          // pas exercer* l'activité. Revenir au silence est un état légitime
          // du dossier (ADR-020), pas un aveu.
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

      {exercee === true && (
        <div className="mt-4 max-w-[66ch] border-l-2 border-[color:var(--board-slate-line)] pl-4">
          <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Ce que le référentiel de votre secteur ne propose pas pour cette
            activité&nbsp;: {cequiManque}
          </p>
          <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            L&apos;inventaire reste à votre main — créez au besoin une unité de
            travail dédiée à l&apos;étape suivante. Le DUERP généré porte la
            mention de cette déclaration.
          </p>
        </div>
      )}
    </li>
  );
}
