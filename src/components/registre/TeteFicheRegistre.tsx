// La tête d'une fiche du registre.
//
// Une fiche n'est pas un écran de plus : c'est une page d'un document, et la
// tête doit dire laquelle. D'où l'ordre — le numéro de partie et son titre
// en sur-titre (c'est la référence qu'un inspecteur citera), le titre de la
// fiche en grand, puis ce qu'elle attend et pourquoi elle vous est due.
//
// L'état se lit à droite du titre, pas en pied : « qu'est-ce qui manque »
// est la question qu'on se pose en arrivant, pas celle qu'on découvre après
// avoir tout lu.

import Link from "next/link";
import type { Completude } from "@/lib/registre/completude";
import { PastilleCompletude } from "./PastilleCompletude";

export function TeteFicheRegistre({
  partie,
  titre,
  attendu,
  raisons,
  aConfirmer = [],
  hrefFiche,
  completude,
}: {
  partie: { id: string; titre: string };
  titre: string;
  /** Ce que la fiche doit contenir, en une phrase. */
  attendu?: string;
  /** Pourquoi elle figure au registre de cet établissement. */
  raisons?: readonly string[];
  /** Les phrases « à confirmer » de la fiche (`SectionDue.aConfirmer`). */
  aConfirmer?: readonly string[];
  /** La fiche de l'établissement, où l'on répond. */
  hrefFiche?: string;
  completude: Completude;
}) {
  return (
    <section className="carte-board px-7 py-6 sm:px-8">
      <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
        <span className="tabular-nums">{partie.id}</span>
        <span aria-hidden className="mx-2">
          ·
        </span>
        {partie.titre}
      </p>

      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <h1 className="board-titre m-0 min-w-0 flex-1 text-[clamp(24px,2.4vw,31px)]">
          {titre}
        </h1>
        <PastilleCompletude completude={completude} className="mt-1 flex-none" />
      </div>

      {attendu && (
        <p className="m-0 mt-3 max-w-[64ch] text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          {attendu}
        </p>
      )}

      {raisons && raisons.length > 0 && (
        <p className="m-0 mt-4 max-w-[64ch] border-t border-[color:var(--board-slate-line)] pt-3.5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-soft)]">
          <span className="font-semibold text-[color:var(--board-slate-mid)]">
            Elle vous est due parce que&nbsp;:
          </span>{" "}
          {raisons.join(" · ")}
        </p>
      )}

      {aConfirmer.length > 0 && (
        <div className="m-0 mt-2 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {aConfirmer.map((phrase) => (
            <p key={phrase} className="m-0">
              <strong className="font-semibold text-[color:var(--board-ink)]">
                À confirmer.
              </strong>{" "}
              {phrase}
            </p>
          ))}
          {hrefFiche && (
            <Link
              href={hrefFiche}
              className="mt-1 inline-block font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
            >
              Répondre sur la fiche de l&apos;établissement
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
