import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormulairePlanPrevention } from "@/components/plan-prevention/FormulairePlanPrevention";
import { requireEtablissement } from "@/lib/auth/scope";
import { listPrestataires } from "@/lib/prestataires/queries";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";

export const metadata = {
  title: "Nouveau plan de prévention",
};

/**
 * L'écran de saisie d'un plan de prévention, en charte board — même gabarit
 * que son jumeau `permis-feu/nouveau` : bandeau bord à bord, puis une seule
 * carte qui porte le formulaire.
 */
export default async function NouveauPlanPreventionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireEtablissement(id);
  const prestatairesAnnuaire = await listPrestataires(id);
  const batiments = await listerBatimentsDeLEtablissement(id);

  const prestataires = prestatairesAnnuaire.map((p) => ({
    id: p.id,
    raisonSociale: p.raisonSociale,
    contactNom: p.contactNom,
    contactEmail: p.contactEmail,
    siret: p.siret,
  }));

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}/plan-prevention`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Plans de prévention
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Nouveau plan de prévention
        </h1>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Diagnostic, inspection commune, matrice risques/mesures.
        </p>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <FormulairePlanPrevention
            etablissementId={id}
            prestataires={prestataires}
            batiments={batiments}
          />
        </div>
      </div>
    </main>
  );
}
