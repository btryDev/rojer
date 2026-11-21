import { PlafondDeCreation } from "@/components/quotas/PlafondDeCreation";
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
    contactTelephone: p.contactTelephone,
    siret: p.siret,
  }));

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* Le plafond de la formule, annoncé avant la saisie (ADR-053 § 14). */}
      <PlafondDeCreation cle="plansDePreventionParAn" className="mx-[var(--board-gutter)] mt-4">
      {/* L'en-tête centré sur la trame de points (maquette V2, 2026-11-19). */}
      <header className="entete-trame">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2.5 px-4 pb-9 pt-8 text-center md:px-6 md:pt-10">
          <Link
            href={`/etablissements/${id}/plan-prevention`}
            className="board-eyebrow inline-flex items-center gap-2 self-start text-[11px] tracking-[0.14em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
          >
            <ArrowLeft className="size-3" aria-hidden />
            Plans de prévention
          </Link>
          <h1 className="board-titre m-0 text-[34px] leading-none md:text-[46px]">Nouveau plan de prévention</h1>
          <p className="m-0 max-w-[560px] text-[15.5px] leading-[1.5] text-[color:var(--board-slate-ink)]">
            Pour une entreprise extérieure qui intervient chez vous. Vous le complétez ensemble à
            l&apos;inspection commune ; vous le faites signer ensuite.
          </p>
        </div>
      </header>

      <div className="px-[var(--board-gutter)] pt-7">
        <FormulairePlanPrevention etablissementId={id} prestataires={prestataires} batiments={batiments} />
      </div>
      </PlafondDeCreation>
    </main>
  );
}
