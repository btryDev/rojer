"use client";

// Widget « Ce qui doit être en place » — 2026-09-27, à la demande de la
// propriétaire (« peut-être penser un widget »).
//
// Il liste les lignes de l'écran du même nom, dans son ordre, avec leur état
// et l'article qui les fonde. Il ne compte rien et ne note rien : l'écran a
// son compteur de déclarations, l'indice d'avancement a le sien, et un
// troisième chiffre sur le même ensemble finirait par diverger des deux.
// Les lignes viennent de `etats-permanents/widget.ts`, qui aplatit la lecture
// de l'écran ; `etats-permanents.test.tsx` tient l'égalité. Elles sont
// demandées par le widget monté (`lecture-widget.ts`), pas chargées à chaque
// affichage du tableau de bord : le serveur ne sait pas si le widget y est.

import { useEffect, useState } from "react";
import { CarteBoard, TitreBloc } from "./board";
import { PastilleFondement } from "@/components/etats-permanents/PastilleFondement";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { lignesEtatsPermanentsPourWidget } from "@/lib/etats-permanents/lecture-widget";
import type { LigneWidgetEtat } from "@/lib/etats-permanents/widget";
import type { DashboardBundle } from "../types";

export function WidgetEtatsPermanents({
  bundle,
}: {
  bundle: DashboardBundle;
}) {
  const { etablissementId } = bundle;
  const href = `/etablissements/${etablissementId}/etats-permanents`;
  // `null` : pas encore lu. Une erreur de lecture laisse le lien vers l'écran,
  // qui dit tout, plutôt qu'une liste vide qui se lirait « rien à faire ».
  const [lignes, setLignes] = useState<LigneWidgetEtat[] | null>(null);
  const [echec, setEchec] = useState(false);
  useEffect(() => {
    let vivant = true;
    lignesEtatsPermanentsPourWidget(etablissementId).then(
      (l) => vivant && setLignes(l),
      () => vivant && setEchec(true),
    );
    return () => {
      vivant = false;
    };
  }, [etablissementId]);

  return (
    <CarteBoard className="px-7 py-[26px]">
      <TitreBloc
        famille="Sans date"
        titre={LABEL_ITEM["etats-permanents"]}
        href={href}
      />

      {echec ? (
        <p className="m-0 mt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          La liste n&apos;a pas pu être lue. Elle est sur l&apos;écran complet.
        </p>
      ) : lignes === null ? (
        <p className="m-0 mt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-soft)]">
          …
        </p>
      ) : lignes.length === 0 ? (
        // ~~« elles ont toutes une date, et figurent au calendrier »~~
        // (contre-lecture du 2026-09-27) : faux pour ce qui naît d'un
        // événement (« Quand ça arrive ») et pour ce que porte un salarié
        // (Équipe). On dit ce qui est su : cet écran-ci n'a rien.
        <p className="m-0 mt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Rien à déclarer sur cet écran pour ce dossier.
        </p>
      ) : (
        <ul className="m-0 mt-[18px] list-none p-0">
          {lignes.map((l) => (
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
