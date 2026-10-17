"use client";

// Widget « Ce qui doit être en place » — 2026-09-27, à la demande de la
// propriétaire (« peut-être penser un widget »).
//
// ~~Il liste les lignes de l'écran du même nom, dans son ordre, avec leur état
// et l'article qui les fonde. Il ne compte rien et ne note rien~~ (2026-10-17,
// contrôle visuel de c6 : trente-quatre lignes, 3 811 px, et aucun compte — un
// widget qui recopie l'écran n'en est pas le résumé). Il RÉSUME désormais :
// le compte de l'en-tête de page — le même composant, `CompteurDeLaPage`, sur
// la même lecture, `compteDeLaPage` —, puis chaque famille présente avec son
// « x sur n » et un lien vers sa section. Aucune ligne individuelle.
//
// Le chiffre n'est pas un troisième compte : c'est celui de l'écran, et
// `etats-permanents.test.tsx` rend les deux sur les mêmes dossiers pour le
// tenir. Le résumé est demandé par le widget monté (`lecture-widget.ts`), pas
// chargé à chaque affichage du tableau de bord : le serveur ne sait pas si le
// widget y est.

import Link from "next/link";
import { useEffect, useState } from "react";
import { CarteBoard, TitreBloc } from "./board";
import {
  CLASSES_LIEN_FAMILLE,
  CompteurDeLaPage,
} from "@/components/etats-permanents/SectionsParUsage";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { resumeEtatsPermanentsPourWidget } from "@/lib/etats-permanents/lecture-widget";
import type { ResumeWidgetEtats } from "@/lib/etats-permanents/widget";
import type { DashboardBundle } from "../types";

export function WidgetEtatsPermanents({
  bundle,
}: {
  bundle: DashboardBundle;
}) {
  const { etablissementId } = bundle;
  const href = `/etablissements/${etablissementId}/etats-permanents`;
  // `null` : pas encore lu. Une erreur de lecture laisse le lien vers l'écran,
  // qui dit tout, plutôt qu'un résumé vide qui se lirait « rien à faire ».
  const [resume, setResume] = useState<ResumeWidgetEtats | null>(null);
  const [echec, setEchec] = useState(false);
  useEffect(() => {
    let vivant = true;
    resumeEtatsPermanentsPourWidget(etablissementId).then(
      (r) => vivant && setResume(r),
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
          Le résumé n&apos;a pas pu être lu. Tout est sur l&apos;écran complet.
        </p>
      ) : resume === null ? (
        <p className="m-0 mt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-soft)]">
          …
        </p>
      ) : resume.familles.length === 0 ? (
        // ~~« elles ont toutes une date, et figurent au calendrier »~~
        // (contre-lecture du 2026-09-27) : faux pour ce qui naît d'un
        // événement (« Quand ça arrive ») et pour ce que porte un salarié
        // (Équipe). On dit ce qui est su : cet écran-ci n'a rien — ou, s'il
        // n'a que des lignes « fait le », aucun état.
        <p className="m-0 mt-[18px] text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          {resume.faits === 0
            ? "Rien à déclarer sur cet écran pour ce dossier."
            : "Aucun état à déclarer sur ce dossier."}
        </p>
      ) : (
        <>
          {/* Le compte de l'en-tête de page, tel quel : chiffre et phrase.
              Aligné à droite comme sur l'écran, et comme les comptes des
              familles en dessous. */}
          <div className="mt-[18px] flex justify-end">
            <CompteurDeLaPage
              enPlace={resume.enPlace}
              total={resume.total}
              parLesTitres={resume.parLesTitres}
            />
          </div>
          {/* Filets sur le `<li>`, jamais sur le lien (charte, interdit 25). */}
          <ul className="m-0 mt-4 list-none p-0">
            {resume.familles.map((f) => (
              <li
                key={f.groupe}
                data-famille={f.groupe}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-[color:var(--board-slate-line)] py-3 first:border-t-0"
              >
                <Link href={`${href}#${f.ancre}`} className={CLASSES_LIEN_FAMILLE}>
                  {f.libelle}
                </Link>
                <span className="text-[12.5px] tabular-nums text-[color:var(--board-slate-mid)]">
                  {f.enPlace} sur {f.total}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </CarteBoard>
  );
}
