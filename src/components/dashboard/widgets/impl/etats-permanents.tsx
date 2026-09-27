"use client";

// Widget « Ce qui doit être en place » — 2026-09-27, à la demande de la
// propriétaire (« peut-être penser un widget »).
//
// Il liste les lignes de l'écran du même nom, dans son ordre, avec leur état
// et l'article qui les fonde. Il ne compte rien et ne note rien : l'écran a
// son compteur de déclarations, l'indice d'avancement a le sien, et un
// troisième chiffre sur le même ensemble finirait par diverger des deux.
// Les lignes viennent de `etats-permanents/widget.ts`, qui aplatit la lecture
// de l'écran ; `widget.test.ts` tient l'égalité.

import { CarteBoard, TitreBloc } from "./board";
import { PastilleFondement } from "@/components/etats-permanents/PastilleFondement";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import type { DashboardBundle } from "../types";

export function WidgetEtatsPermanents({
  bundle,
}: {
  bundle: DashboardBundle;
}) {
  const { etatsPermanents, etablissementId } = bundle;
  const href = `/etablissements/${etablissementId}/etats-permanents`;

  return (
    <CarteBoard className="px-7 py-[26px]">
      <TitreBloc
        famille="Sans date"
        titre={LABEL_ITEM["etats-permanents"]}
        href={href}
      />

      {etatsPermanents.length === 0 ? (
        <p className="m-0 mt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Aucune des obligations de ce dossier n&apos;est un état à mettre en
          place : elles ont toutes une date, et figurent au calendrier.
        </p>
      ) : (
        <ul className="m-0 mt-[18px] list-none p-0">
          {etatsPermanents.map((l) => (
            <li
              key={l.obligationId}
              data-obligation={l.obligationId}
              className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 border-t border-[color:var(--board-slate-line)] py-3 first:border-t-0"
            >
              <div className="min-w-0 flex-1 basis-[16rem]">
                <p className="m-0 text-[13px] leading-[1.45] text-[color:var(--board-ink)]">
                  {l.libelle}
                </p>
                {l.fondement && (
                  <div className="mt-1.5">
                    <PastilleFondement fondement={l.fondement} />
                  </div>
                )}
              </div>
              <span className="shrink-0 text-right text-[12px] leading-[1.4] text-[color:var(--board-slate-mid)]">
                {l.etat}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CarteBoard>
  );
}
