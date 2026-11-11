import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuestionActiviteRow } from "@/components/duerps/QuestionActiviteRow";
import { ValiderEtapeBouton } from "@/components/duerps/ValiderEtapeBouton";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { questionsActivites } from "@/lib/activites/reponses";
import { etapesDuDuerp, enteteEtape } from "@/lib/duerps/etapes";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { getDuerp } from "@/lib/duerps/queries";
import { ajoutsParActivite } from "@/lib/activites/ajouts";
import { requireCompte } from "@/lib/auth/compte";
import { trouverReferentielParId } from "@/lib/referentiels";

/**
 * « Précisez votre activité » (sous-étape de « Votre activité ») — les activités que le référentiel sectoriel
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

  const etapes = etapesDuDuerp(duerp, "activites");

  const referentiel = duerp.referentielSecteurId
    ? trouverReferentielParId(duerp.referentielSecteurId)
    : undefined;
  // Ce que les « oui » ont ajouté, lu en base (ADR-060).
  const { db } = await requireCompte();
  const ajouts = await ajoutsParActivite(db, id);
  const sansReponse = questions.filter((q) => q.exercee === undefined);

  return (
    <div className="flex flex-col gap-8">
      <WizardSteps etapes={etapes} />

      {/* Allégé le 2026-11-11 : le titre parlait du référentiel, un mot de
          l'outil que le dirigeant ne connaît pas ; il dit maintenant ce qu'on
          attend de lui. Les deux paragraphes d'explication sont derrière le
          « ? » — on ne les lit qu'une fois. */}
      <header className="flex max-w-[var(--board-mesure)] flex-col gap-3">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          {enteteEtape("activites")}
        </p>
        {/* Le « ? » à côté du titre qu'il explique, pas sur sa propre ligne. */}
        <div className="flex items-center gap-3">
          <h2 className="board-titre m-0 text-[clamp(23px,2.1vw,30px)]">
            Précisez votre activité
          </h2>
          <AideEcran titre="Pourquoi ces questions">
            <p className="m-0">
              Les risques proposés pour votre secteur sont bâtis sur une activité
              type. Ils ne connaissent ni les ateliers, ni les métiers annexes que
              vous exercez peut-être en plus. Ces questions servent uniquement à
              le savoir.
            </p>
            <p className="m-0 mt-3">
              Répondre «&nbsp;oui&nbsp;» ajoute à votre DUERP l&apos;unité et
              les risques de cette activité, à évaluer à l&apos;étape Risques.
              Revenir à «&nbsp;non&nbsp;» les retire, sauf ce que vous avez
              déjà complété. La réponse est aussi reprise dans le DUERP
              généré.
            </p>
            <p className="m-0 mt-3">
              Vous pouvez continuer sans répondre. Le document ne dira alors ni
              que ces activités sont exercées, ni qu&apos;elles ne le sont pas.
            </p>
          </AideEcran>
        </div>
        <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {referentiel ? (
            <>
              Secteur retenu&nbsp;: {referentiel.nom} (
              <Link
                href={`/duerp/${id}/secteur`}
                className="text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
              >
                changer
              </Link>
              ). Faites-vous aussi l&apos;une de ces choses&nbsp;?
            </>
          ) : (
            <>
              Faites-vous aussi l&apos;une de ces choses&nbsp;? (
              <Link
                href={`/duerp/${id}/secteur`}
                className="text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
              >
                changer de secteur
              </Link>
              )
            </>
          )}
        </p>
      </header>

      <ul className="carte-board m-0 flex list-none flex-col p-0">
        {questions.map((q) => (
          <QuestionActiviteRow
            key={q.activite.id}
            duerpId={id}
            activiteId={q.activite.id}
            question={q.activite.question}
            aide={q.activite.aide}
            ajout={ajouts.get(q.activite.id)}
            risquesAPenser={q.activite.aFaire.risques}
            exercee={q.exercee}
          />
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Décompte, pas reproche : aucun taux de complétude, qui laisserait
            croire à une mesure de la qualité du DUERP. */}
        <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
          {sansReponse.length > 0
            ? `${sansReponse.length} sans réponse — vous pouvez continuer.`
            : "Toutes les questions ont une réponse."}
        </p>
        <ValiderEtapeBouton duerpId={id} etablissementId={duerp.etablissementId} etape="activite" />
      </div>
    </div>
  );
}
