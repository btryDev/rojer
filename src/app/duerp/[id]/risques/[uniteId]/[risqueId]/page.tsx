import { notFound } from "next/navigation";
import { CotationForm } from "@/components/duerps/CotationForm";
import { EvaluationProgression } from "@/components/duerps/EvaluationProgression";
import { getRisque } from "@/lib/risques/queries";

export default async function CotationPage({
  params,
}: {
  params: Promise<{ id: string; uniteId: string; risqueId: string }>;
}) {
  const { id, uniteId, risqueId } = await params;
  const risque = await getRisque(risqueId);
  if (
    !risque ||
    risque.uniteId !== uniteId ||
    risque.unite.duerpId !== id
  ) {
    notFound();
  }

  const risquesUnite = risque.unite.risques;
  const idxCourant = risquesUnite.findIndex((r) => r.id === risqueId);
  const suivant = risquesUnite
    .slice(idxCourant + 1)
    .find((r) => !r.cotationSaisie);

  const hrefCotation = `/duerp/${id}/risques/${uniteId}/${risqueId}`;
  const hrefMesures = `/duerp/${id}/risques/${uniteId}/${risqueId}/mesures`;
  const hrefSuivant = suivant
    ? `/duerp/${id}/risques/${uniteId}/${suivant.id}`
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-[var(--board-mesure)]">
        <div className="board-surtitre flex flex-wrap items-baseline gap-2">
          <span className="text-[color:var(--board-ink)]">
            Évaluation du risque
          </span>
          <span aria-hidden className="text-[color:var(--board-slate)]">
            ·
          </span>
          <span className="tabular-nums text-[color:var(--board-slate-soft)]">
            {String(idxCourant + 1).padStart(2, "0")}
            <span className="mx-1 text-[color:var(--board-slate)]">/</span>
            {String(risquesUnite.length).padStart(2, "0")}
          </span>
          <span aria-hidden className="text-[color:var(--board-slate)]">
            ·
          </span>
          <span className="text-[color:var(--board-slate-soft)]">
            {risque.cotationSaisie ? "déjà coté" : "à coter"}
          </span>
        </div>
        <h2 className="board-titre m-0 mt-3 text-[22px]">
          {risque.libelle}
        </h2>
        {risque.description && (
          <p className="m-0 mt-2.5 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            {risque.description}
          </p>
        )}
      </header>

      <EvaluationProgression
        etape="cotation"
        cotationSaisie={risque.cotationSaisie}
        nombreMesures={risque.mesures.length}
        hrefCotation={hrefCotation}
        hrefMesures={hrefMesures}
      />

      <section aria-labelledby="partie-cotation" className="flex flex-col gap-6">
        <h3 id="partie-cotation" className="sr-only">
          Cotation
        </h3>

        <CotationForm
          risqueId={risqueId}
          etablissementId={risque.unite.duerp.etablissementId}
          libelleRisque={risque.libelle}
          initial={{
            gravite: risque.gravite,
            probabilite: risque.probabilite,
            maitrise: risque.maitrise,
            nombreSalariesExposes: risque.nombreSalariesExposes,
            dateMesuresPhysiques: risque.dateMesuresPhysiques
              ? risque.dateMesuresPhysiques.toISOString().slice(0, 10)
              : null,
            exposeCMR: risque.exposeCMR,
          }}
          cotationSaisie={risque.cotationSaisie}
          hrefMesures={hrefMesures}
          hrefSuivant={hrefSuivant}
        />
      </section>
    </div>
  );
}
