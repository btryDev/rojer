import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { QuestionActiviteRow } from "@/components/duerps/QuestionActiviteRow";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { questionsActivites } from "@/lib/activites/reponses";
import { construireEtapes } from "@/lib/duerps/etapes";
import { etatEtapeTransverses } from "@/lib/transverses/etat";
import { getDuerp } from "@/lib/duerps/queries";
import { trouverReferentielParId } from "@/lib/referentiels";

/**
 * « Périmètre du référentiel » — les activités que le référentiel sectoriel
 * retenu ne couvre pas, et la question fermée qui demande au dirigeant s'il
 * les exerce (ADR-020).
 *
 * L'étape se tient juste après le choix du secteur et avant les unités de
 * travail : c'est le seul ordre utile. Apprendre que la boucherie n'est pas
 * couverte n'a d'effet que si l'unité correspondante peut encore être créée
 * à la main dans la foulée.
 *
 * Rien ici ne bloque : on peut traverser l'étape sans répondre, et une
 * question sans réponse le reste — elle n'est jamais convertie en « non ».
 */
export default async function ActivitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const questions = questionsActivites(
    duerp.referentielSecteurId,
    duerp.reponsesActivitesNonCouvertes,
  );

  // Aucune question à poser : soit le secteur n'est pas retenu, soit sa liste
  // d'activités n'est pas instruite. Dans les deux cas l'écran n'aurait rien à
  // dire — et une page vide se lirait « le référentiel couvre tout », ce qui
  // est exactement l'affirmation que ce module refuse de faire.
  if (questions.length === 0) {
    redirect(`/duerp/${id}/${duerp.referentielSecteurId ? "unites" : "secteur"}`);
  }

  const unitesVisibles = duerp.unites.filter((u) => !u.estTransverse);
  const etapes = construireEtapes(id, "activites", {
    secteurOk: Boolean(duerp.referentielSecteurId),
    unitesOk: unitesVisibles.length > 0,
    risquesOk: false,
    transverses: etatEtapeTransverses(duerp),
    activitesPosees: true,
  });

  const referentiel = duerp.referentielSecteurId
    ? trouverReferentielParId(duerp.referentielSecteurId)
    : undefined;
  const sansReponse = questions.filter((q) => q.exercee === undefined);

  return (
    <div className="flex flex-col gap-[22px]">
      <WizardSteps etapes={etapes} />

      <header className="max-w-[var(--board-mesure)]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Périmètre du référentiel
        </p>
        <h2 className="board-titre m-0 mt-3 text-[clamp(23px,2.1vw,30px)]">
          Ce que {referentiel ? `le référentiel « ${referentiel.nom} »` : "le référentiel retenu"}{" "}
          ne couvre pas
        </h2>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Un référentiel sectoriel est bâti sur une activité type. Le vôtre ne
          connaît ni les ateliers, ni les métiers annexes que vous exercez
          peut-être en plus. Les questions ci-dessous servent uniquement à le
          savoir.
        </p>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Répondre «&nbsp;oui&nbsp;» ne bloque rien, n&apos;ajoute aucun risque
          et n&apos;en retire aucun. Cela enregistre un fait sur le périmètre de
          votre dossier, qui sera repris dans le DUERP généré : le lecteur du
          document saura ce qu&apos;il ne traite pas.
        </p>
      </header>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {questions.map((q) => (
          <QuestionActiviteRow
            key={q.activite.id}
            duerpId={id}
            activiteId={q.activite.id}
            question={q.activite.question}
            aide={q.activite.aide}
            cequiManque={q.activite.cequiManque}
            exercee={q.exercee}
          />
        ))}
      </ul>

      {/* Décompte, pas reproche : on rappelle ce qui n'a pas été tranché, sans
          verdict sur le dossier et sans taux de complétude — un pourcentage
          laisserait croire à une mesure de la qualité du DUERP. */}
      {sansReponse.length > 0 && (
        <p className="m-0 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {sansReponse.length} question{sansReponse.length > 1 ? "s" : ""}{" "}
          sans
          réponse. Vous pouvez continuer sans répondre&nbsp;: le document ne
          dira alors ni que ces activités sont exercées, ni qu&apos;elles ne le
          sont pas.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--board-slate-line)] pt-6">
        <Link
          href={`/duerp/${id}/secteur`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          ← Secteur d&apos;activité
        </Link>
        <Link
          href={`/duerp/${id}/unites`}
          className={buttonVariants({ variant: "board", size: "board" })}
        >
          Unités de travail →
        </Link>
      </div>
    </div>
  );
}
