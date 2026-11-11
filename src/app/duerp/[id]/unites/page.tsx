import { PlafondDeCreation } from "@/components/quotas/PlafondDeCreation";
import { notFound } from "next/navigation";
import { AjouterUniteForm } from "@/components/duerps/AjouterUniteForm";
import { UniteRow } from "@/components/duerps/UniteRow";
import { ValiderEtapeBouton } from "@/components/duerps/ValiderEtapeBouton";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { etapesDuDuerp, numeroEtape } from "@/lib/duerps/etapes";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { getDuerp } from "@/lib/duerps/queries";

export default async function UnitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const unitesVisibles = duerp.unites.filter((u) => !u.estTransverse);
  const unitesOk = unitesVisibles.length > 0;
  const etapes = etapesDuDuerp(duerp, "unites");

  return (
    <div className="flex flex-col gap-[22px]">
      <WizardSteps etapes={etapes} />

      {/* Allégé le 2026-11-11 : la définition d'une unité était dite deux
          fois (infobulle et paragraphe) ; elle est derrière le « ? ». */}
      <header className="flex max-w-[var(--board-mesure)] flex-col gap-3">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          {numeroEtape("unites")} · Unités de travail
        </p>
        <div className="flex items-center gap-3">
          <h2 className="board-titre m-0 text-[clamp(23px,2.1vw,30px)]">
            Vérifiez vos unités de travail
          </h2>
          <AideEcran titre="Qu'est-ce qu'une unité de travail">
            <p className="m-0">
              Une unité de travail regroupe des salariés exposés aux mêmes
              risques. Ça peut être un poste (ex. accueil), une zone (ex.
              cuisine) ou une activité (ex. livraison). L&apos;évaluation se
              fait unité par unité, à l&apos;étape suivante.
            </p>
          </AideEcran>
        </div>
        <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Proposées selon votre secteur. Renommez, supprimez ou ajoutez.
        </p>
      </header>

      <section className="carte-board overflow-clip">
        <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] tabular-nums text-[color:var(--board-slate-soft)]">
            {unitesVisibles.length} unité{unitesVisibles.length > 1 ? "s" : ""}
          </p>
        </div>

        {unitesVisibles.length === 0 ? (
          <p className="m-0 px-7 py-8 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
            Aucune unité de travail. Ajoutez-en au moins une pour continuer.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
            {unitesVisibles.map((u) => (
              <UniteRow
                key={u.id}
                id={u.id}
                nom={u.nom}
                description={u.description}
                nombreRisques={u.risques.length}
              />
            ))}
          </ul>
        )}

        <div className="border-t border-[color:var(--board-slate-line)]">
          {/* La limite d'unités de l'essai, annoncée avant la saisie (ADR-053 § 14). */}
          <PlafondDeCreation cle="unitesTravail" className="mx-6 mt-4">
            <AjouterUniteForm duerpId={id} />
          </PlafondDeCreation>
        </div>
      </section>

      <div className="flex items-center justify-end">
        {/* Valider, même sans rien changer, coche l'étape (2026-11-11) : les
            unités pré-remplies par le secteur ne la cochent plus seules. Sans
            unité, un vrai `disabled` (interdit 20). */}
        <ValiderEtapeBouton duerpId={id} etape="unites" disabled={!unitesOk} />
      </div>
    </div>
  );
}
