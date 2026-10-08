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
 * électrique : il lit un fait d'activité de l'établissement (ADR-041), posé une
 * fois et repris par le DUERP. Chaque ligne mène à l'écran « Évaluer les
 * risques de vos salariés », où la question se répond.
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
  oui: "Vous avez répondu oui : le fait existe dans l'établissement. Chaque titre dit à quelle condition il est dû ; si cette personne la remplit, déclarez-le ci-dessous.",
  non: "Vous avez répondu non. Si cette personne est pourtant concernée, corrigez la réponse et déclarez ses titres ci-dessous.",
  sans_reponse:
    "Vous n'avez pas encore répondu à cette question.",
};

/**
 * Ce qu'on dit d'une formation d'établissement sur la fiche. Après un « non »,
 * le moteur l'a retirée : la renvoyer à « Ce qui doit être en place » serait
 * pointer une ligne qui n'existe pas (contre-relecture du 2026-10-08, N3).
 */
export function phraseFormation(reponse: ReponseTransverse, nature: string): string {
  if (reponse === "non") {
    return "Retirée de vos obligations : vous avez répondu non. Si cette personne est pourtant concernée, corrigez la réponse.";
  }
  const ecran = nature === "evenementielle" ? "Quand ça arrive" : "Ce qui doit être en place";
  const suivi = reponse === "oui" ? `Suivie dans « ${ecran} ».` : `Affichée « à confirmer » dans « ${ecran} » tant que vous n'avez pas répondu.`;
  return `Formation que l'établissement organise pour les travailleurs concernés — à faire suivre à cette personne si elle l'est. ${suivi}`;
}

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
        Chaque question dit si un fait existe dans l&apos;établissement — la
        même réponse que dans votre DUERP. Chaque titre dit à quelle condition
        il est dû, et vous seul savez si cette personne la remplit.
      </p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
        {questions.map(({ champ, intitule, reponse, titres, formations, autresFondements }) => (
          <li
            key={champ}
            id={champ}
            className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-3.5"
          >
            <p className="m-0 text-[13.5px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
              {intitule}
            </p>
            <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {PHRASE_REPONSE[reponse]}{" "}
              <Link
                href={lienVersLaQuestion(champ)}
                className="text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
              >
                {reponse === "sans_reponse" ? "Répondre →" : "Modifier la réponse →"}
              </Link>
            </p>
            {autresFondements && (
              <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                {autresFondements}
              </p>
            )}
            <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {formations.map((obligation) => (
                <li key={obligation.id}>
                  <p className="m-0 text-[13px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
                    {obligation.libelle}
                  </p>
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-soft)]">
                    {phraseFormation(reponse, obligation.nature)}
                  </p>
                  <ReferenceFondatrice obligation={obligation} />
                </li>
              ))}
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
