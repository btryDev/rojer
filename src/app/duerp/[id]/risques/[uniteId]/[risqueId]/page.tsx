import Link from "next/link";
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

  const hrefRetourUnite = `/duerp/${id}/risques/${uniteId}`;
  const hrefCotation = `/duerp/${id}/risques/${uniteId}/${risqueId}`;
  const hrefMesures = `/duerp/${id}/risques/${uniteId}/${risqueId}/mesures`;
  const hrefSuivant = suivant
    ? `/duerp/${id}/risques/${uniteId}/${suivant.id}`
    : undefined;

  return (
    <div className="flex flex-col gap-[22px]">
      <nav>
        <Link
          href={hrefRetourUnite}
          className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          ← {risque.unite.nom}
        </Link>
      </nav>

      <header className="max-w-[var(--board-mesure)]">
        <div className="board-eyebrow flex flex-wrap items-baseline gap-2 text-[10.5px] tracking-[0.18em]">
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
        <h2 className="board-titre m-0 mt-3 text-[clamp(23px,2.1vw,30px)]">
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

      <section aria-labelledby="partie-cotation" className="flex flex-col gap-[22px] pt-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-[18px] font-semibold tabular-nums text-[color:var(--board-blue-ink)]">
            01
          </span>
          <h3 id="partie-cotation" className="board-titre m-0 text-[22px]">
            Cotation
          </h3>
          <span aria-hidden className="text-[color:var(--board-slate)]">
            /
          </span>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            3 questions — criticité calculée
          </p>
        </div>

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
          hrefRetourUnite={hrefRetourUnite}
          hrefMesures={hrefMesures}
          hrefSuivant={hrefSuivant}
        />
      </section>
    </div>
  );
}
