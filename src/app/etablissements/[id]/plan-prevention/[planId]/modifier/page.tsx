import Link from "next/link";
import { requireEtablissement } from "@/lib/auth/scope";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormulairePlanPrevention } from "@/components/plan-prevention/FormulairePlanPrevention";
import { getPlanPrevention } from "@/lib/plan-prevention/queries";
import { listPrestataires } from "@/lib/prestataires/queries";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import { avisLiensEnVol, motifContenuScelle } from "@/lib/signatures/verrou-contenu";
import { compterLiensEnVol } from "@/lib/access-tokens/revocation";
import { cleJourCivil, versSaisieDateHeure } from "@/lib/dates";

export const metadata = {
  title: "Modifier le plan de prévention",
};

/**
 * Corriger un plan (audit du 2026-10-12, constat 1) : le formulaire de
 * création, rouvert sur ce plan. Signé, son contenu est scellé et l'écran dit
 * pourquoi (`motifContenuScelle`) ; clos ou annulé, il ne se modifie plus.
 */
export default async function ModifierPlanPreventionPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const plan = await getPlanPrevention(id, planId);
  if (!plan || !statutPlanSignable(plan.statut)) notFound();
  // Le client borné de la garde (ADR-051), mise en cache pour la requête.
  const { db } = await requireEtablissement(id);
  const [prestatairesAnnuaire, batiments, liensEnVol] = await Promise.all([
    listPrestataires(id),
    listerBatimentsDeLEtablissement(id),
    compterLiensEnVol(db, { etablissementId: id, objetType: "plan_prevention", objetId: plan.id }),
  ]);

  const numero = `PP-${String(plan.numero).padStart(3, "0")}`;
  const fiche = `/etablissements/${id}/plan-prevention/${plan.id}`;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={fiche}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Plan {numero}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Modifier le plan {numero}
        </h1>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <FormulairePlanPrevention
            etablissementId={id}
            prestataires={prestatairesAnnuaire.map((p) => ({
              id: p.id,
              raisonSociale: p.raisonSociale,
              contactNom: p.contactNom,
              contactEmail: p.contactEmail,
              siret: p.siret,
            }))}
            batiments={batiments}
            scelle={motifContenuScelle(
              "plan",
              plan.signatures.length,
              plan.inspectionDate === null,
            )}
            avisLiens={avisLiensEnVol(liensEnVol)}
            plan={{
              id: plan.id,
              prestataireId: plan.prestataireId,
              entrepriseExterieureRaison: plan.entrepriseExterieureRaison,
              entrepriseExterieureSiret: plan.entrepriseExterieureSiret,
              efChefNom: plan.efChefNom,
              efChefEmail: plan.efChefEmail,
              efEffectifIntervenant: plan.efEffectifIntervenant,
              euChefNom: plan.euChefNom,
              euChefFonction: plan.euChefFonction,
              dateDebut: versSaisieDateHeure(plan.dateDebut),
              dateFin: versSaisieDateHeure(plan.dateFin),
              dureeHeuresEstimee: plan.dureeHeuresEstimee,
              lieux: plan.lieux,
              batimentId: plan.batimentId,
              naturesTravaux: plan.naturesTravaux,
              travauxDangereux: plan.travauxDangereux,
              inspectionDate: plan.inspectionDate ? cleJourCivil(plan.inspectionDate) : null,
              inspectionParticipants: plan.inspectionParticipants,
              lignes: plan.lignes.map((l) => ({
                risque: l.risque,
                mesureEntrepriseUtilisatrice: l.mesureEntrepriseUtilisatrice ?? "",
                mesureEntrepriseExterieure: l.mesureEntrepriseExterieure ?? "",
              })),
              phases: plan.phasesDangereuses.map((f) => ({
                phase: f.phase,
                moyensPrevention: f.moyensPrevention ?? "",
              })),
              adaptationMateriels: plan.adaptationMateriels,
              instructionsTravailleurs: plan.instructionsTravailleurs,
              organisationSecours: plan.organisationSecours,
              participationCroisee: plan.participationCroisee,
            }}
          />
        </div>
      </div>
    </main>
  );
}
