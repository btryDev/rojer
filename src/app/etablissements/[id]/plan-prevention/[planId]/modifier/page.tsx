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
      {/* L'en-tête centré sur la trame de points (maquette V2, 2026-11-19). */}
      <header className="entete-trame">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2.5 px-4 pb-9 pt-8 text-center md:px-6 md:pt-10">
          <Link
            href={fiche}
            className="board-eyebrow inline-flex items-center gap-2 self-start text-[11px] tracking-[0.14em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
          >
            <ArrowLeft className="size-3" aria-hidden />
            Plan {numero}
          </Link>
          <h1 className="board-titre m-0 text-[34px] leading-none md:text-[46px]">Modifier le plan {numero}</h1>
        </div>
      </header>

      <div className="px-[var(--board-gutter)] pt-7">
        <div>
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
              entrepriseExterieureAdresse: plan.entrepriseExterieureAdresse,
              efChefTelephone: plan.efChefTelephone,
              euChefNom: plan.euChefNom,
              euChefFonction: plan.euChefFonction,
              euChefTelephone: plan.euChefTelephone,
              dateDebut: versSaisieDateHeure(plan.dateDebut),
              dateFin: versSaisieDateHeure(plan.dateFin),
              dureeHeuresEstimee: plan.dureeHeuresEstimee,
              lieux: plan.lieux,
              batimentId: plan.batimentId,
              naturesTravaux: plan.naturesTravaux,
              travauxDangereux: plan.travauxDangereux,
              horaires: plan.horaires,
              inspectionDate: plan.inspectionDate ? cleJourCivil(plan.inspectionDate) : null,
              inspectionParticipants: plan.inspectionParticipants,
              cseAssocie: plan.cseAssocie,
              lignes: plan.lignes.map((l) => ({
                risque: l.risque,
                mesureEntrepriseUtilisatrice: l.mesureEntrepriseUtilisatrice ?? "",
                mesureEntrepriseExterieure: l.mesureEntrepriseExterieure ?? "",
                famille: l.famille ?? "",
                lieu: l.lieu ?? "",
                frequence: l.frequence ?? "",
              })),
              phases: plan.phasesDangereuses.map((f) => ({
                phase: f.phase,
                moyensPrevention: f.moyensPrevention ?? "",
              })),
              adaptationMateriels: plan.adaptationMateriels,
              instructionsTravailleurs: plan.instructionsTravailleurs,
              organisationSecours: plan.organisationSecours,
              participationCroisee: plan.participationCroisee,
              qualificationsRequises: plan.qualificationsRequises,
              moyensFournis: plan.moyensFournis,
              autresObservations: plan.autresObservations,
            }}
          />
        </div>
      </div>
    </main>
  );
}
