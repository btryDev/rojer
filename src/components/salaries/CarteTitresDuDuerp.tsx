import Link from "next/link";
import { CarteFiche } from "@/components/ui-kit";
import { formaterDateLongueFr } from "@/lib/dates";
import type { QuestionDeLaFiche } from "@/lib/salaries/titres-du-duerp";
import type { ReponseTransverse } from "@/lib/transverses/etat";
import { ReferenceFondatrice } from "./ReferenceFondatrice";

/**
 * CE QUE LE DUERP REND DÛ À UNE PARTIE DE L'EFFECTIF (ADR-038).
 *
 * Le produit ne déduit pas qui conduit un engin ou opère sur l'installation
 * électrique : il lit la réponse du document unique à une question rédigée sur
 * l'article qui fonde le titre, et la pose sur la fiche. Un seul
 * questionnaire : chaque ligne mène à la question du DUERP.
 *
 * Les titres sont NOMMÉS DANS LES TROIS ÉTATS, avec leur condition. Une
 * première rédaction ne les nommait que sur « oui » : sur tous les dossiers
 * existants — sans réponse à la mise en production —, la formation à la
 * conduite disparaissait de la fiche où elle figurait la veille (relecture du
 * 2026-10-05). Le « non » ne fait rien disparaître non plus : les titres
 * restent déclarables, et la phrase ne dit pas le contraire.
 *
 * Composant à part, et sans état, pour être RENDU en test
 * (`CarteTitresDuDuerp.test.tsx`) : une garde sur les données ne voit pas ce
 * que l'écran omet.
 */
export const PHRASE_REPONSE: Record<ReponseTransverse, string> = {
  oui: "Votre DUERP répond oui : des salariés de l'établissement sont concernés. Si cette personne en fait partie, déclarez ses titres ci-dessous.",
  non: "Votre DUERP répond non. Si cette personne est pourtant concernée, corrigez la réponse et déclarez ses titres ci-dessous.",
  sans_reponse:
    "Votre évaluation des risques n'a pas encore répondu à cette question.",
};

export function CarteTitresDuDuerp({
  questions,
  lienVersLaQuestion,
}: {
  questions: readonly QuestionDeLaFiche[];
  lienVersLaQuestion: (questionId: string) => string;
}) {
  return (
    <CarteFiche titreFort="Formations liées aux risques du poste">
      <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        Chaque question ci-dessous vient de votre évaluation des risques. Les
        titres qu&apos;elle nomme sont dus aux salariés exposés au fait
        qu&apos;elle décrit : c&apos;est le DUERP qui dit si ce fait existe dans
        l&apos;établissement, et vous seul savez si cette personne est
        concernée.
      </p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
        {questions.map(({ question, reponse, titres }) => (
          <li
            key={question.id}
            className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-3.5"
          >
            <p className="m-0 text-[13.5px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
              {question.intitule}
            </p>
            <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {PHRASE_REPONSE[reponse]}{" "}
              <Link
                href={lienVersLaQuestion(question.id)}
                className="text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
              >
                {reponse === "sans_reponse"
                  ? "Répondre dans le DUERP →"
                  : "Voir la question dans le DUERP →"}
              </Link>
            </p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {titres.map(({ obligation, condition, dernierTitreLe }) => (
                <li key={obligation.id}>
                  <p className="m-0 text-[13px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
                    {obligation.libelle}
                  </p>
                  {condition && (
                    <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      {/^ils? /.test(condition) ? "Dû s'" : "Dû si "}
                      {condition}.
                    </p>
                  )}
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-soft)]">
                    {dernierTitreLe
                      ? `Titre déclaré pour cette personne, délivré le ${formaterDateLongueFr(dernierTitreLe)}.`
                      : "Aucun titre déclaré pour cette personne. Ce n'est pas un retard : Rojer ne sait pas si elle est concernée."}
                  </p>
                  <ReferenceFondatrice obligation={obligation} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </CarteFiche>
  );
}
