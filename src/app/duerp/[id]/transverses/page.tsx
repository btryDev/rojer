import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { QuestionTransverseRow } from "@/components/duerps/QuestionTransverseRow";
import { ValiderTransversesButton } from "@/components/duerps/ValiderTransversesButton";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { activitesDuSecteur } from "@/lib/activites/reponses";
import { construireEtapes } from "@/lib/duerps/etapes";
import { getDuerp } from "@/lib/duerps/queries";
import { risquesTransverses } from "@/lib/referentiels";
import {
  repondreAuxQuestionsTransverses,
  risquesTransversesActifs,
} from "@/lib/transverses/etat";

export default async function TransversesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const unitesSaisies = duerp.unites.filter((u) => !u.estTransverse);
  const uniteTransverse = duerp.unites.find((u) => u.estTransverse);
  // Trois états — oui, non, sans réponse — lus par la règle partagée avec la
  // fiche salarié (ADR-038) : l'écran ne relit pas les risques à sa façon.
  // TOUTES les unités transverses, pas la première : le schéma n'interdit pas
  // d'en avoir deux (création concurrente), et la fiche salarié
  // (`transverses/queries.ts`) les lit toutes — les deux écrans ne doivent pas
  // pouvoir répondre différemment à la même question.
  const repondues = repondreAuxQuestionsTransverses(
    risquesTransversesActifs(duerp.unites),
    duerp.reponsesTransverses,
  );

  const unitesOk = unitesSaisies.length > 0;
  const risquesOk =
    unitesOk && unitesSaisies.every((u) => u.risques.length > 0);
  const etapes = construireEtapes(id, "transverses", {
    secteurOk: Boolean(duerp.referentielSecteurId),
    unitesOk,
    risquesOk,
    transversesOk: duerp.transversesRepondues,
    activitesPosees: activitesDuSecteur(duerp.referentielSecteurId).length > 0,
  });

  const risquesParId = new Map(risquesTransverses.map((r) => [r.id, r]));

  return (
    <div className="flex flex-col gap-[22px]">
      <WizardSteps etapes={etapes} />

      <header className="max-w-[68ch]">
        <h2 className="board-titre m-0 text-[clamp(23px,2.1vw,30px)]">
          Questions transverses
        </h2>
        <p className="m-0 mt-3 max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Ces questions couvrent des risques présents dans la plupart des
          entreprises, quel que soit le métier. Chaque « oui » ajoute
          automatiquement le risque correspondant à votre DUERP — vous pourrez
          ensuite le coter comme les autres.
        </p>
      </header>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {repondues.map(({ question: q, reponse }) => {
          const risque = risquesParId.get(q.risqueIdAssocie);
          if (!risque) return null;
          return (
            <QuestionTransverseRow
              key={q.id}
              duerpId={id}
              questionId={q.id}
              intitule={q.intitule}
              libelleRisque={risque.libelle}
              reponse={reponse}
            />
          );
        })}
      </ul>

      {uniteTransverse && uniteTransverse.risques.length > 0 && (
        <section className="carte-board px-7 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 text-[14px] font-medium leading-[1.45] text-[color:var(--board-ink)]">
                {uniteTransverse.risques.length} risque
                {uniteTransverse.risques.length > 1 ? "s" : ""} transverse
                {uniteTransverse.risques.length > 1 ? "s" : ""} ajouté
                {uniteTransverse.risques.length > 1 ? "s" : ""}
              </p>
              <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                {
                  uniteTransverse.risques.filter((r) => !r.cotationSaisie)
                    .length
                }{" "}
                à coter. Ils apparaissent dans l&apos;unité « Risques
                transverses ».
              </p>
            </div>
            <Link
              href={`/duerp/${id}/risques/${uniteTransverse.id}`}
              className={buttonVariants({
                variant: "boardClair",
                size: "boardSm",
              })}
            >
              Coter les risques transverses →
            </Link>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--board-slate-line)] pt-6">
        <Link
          href={`/duerp/${id}/risques`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          ← Risques
        </Link>
        <ValiderTransversesButton
          duerpId={id}
          hrefSuivant={`/duerp/${id}/synthese`}
        />
      </div>
    </div>
  );
}
