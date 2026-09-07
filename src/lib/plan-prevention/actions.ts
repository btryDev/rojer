"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resoudreBatimentOptionnel } from "@/lib/batiments/queries";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import {
  ligneSchema,
  phaseSchema,
  planPreventionSchema,
  type LigneInput,
  type PhaseInput,
} from "./schema";
import { nextNumeroPlan } from "./queries";

export type PlanActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; planId: string; numero: number };

/**
 * Extrait la liste dynamique de lignes (risque / mesure EU / mesure EE)
 * postées via indices `lignes[0].risque`, `lignes[1].risque`, etc. —
 * c'est la forme naturelle pour un formulaire client qui ajoute/supprime
 * des lignes.
 */
function extraireLignes(formData: FormData): LigneInput[] {
  const out: LigneInput[] = [];
  let i = 0;
  while (true) {
    const risque = formData.get(`lignes[${i}].risque`);
    if (risque === null) break;
    const ligne = ligneSchema.safeParse({
      risque,
      mesureEntrepriseUtilisatrice: formData.get(
        `lignes[${i}].mesureEntrepriseUtilisatrice`,
      ),
      mesureEntrepriseExterieure: formData.get(
        `lignes[${i}].mesureEntrepriseExterieure`,
      ),
    });
    if (ligne.success) {
      // On ne garde que les lignes au moins partiellement renseignées.
      if (
        ligne.data.risque.trim() ||
        ligne.data.mesureEntrepriseUtilisatrice ||
        ligne.data.mesureEntrepriseExterieure
      ) {
        out.push(ligne.data);
      }
    }
    i++;
  }
  return out;
}

/**
 * Les phases d'activité dangereuses du 1° de `R. 4512-8`, postées sous la même
 * forme indicée que les lignes.
 *
 * Une phase VIDE est écartée, une phase renseignée sans ses moyens est GARDÉE.
 * Ce n'est pas symétrique et c'est voulu : le rang vide n'est qu'un champ que
 * l'utilisateur n'a pas rempli, tandis qu'une phase sans moyen de prévention
 * est une information — elle s'affiche « À compléter » sur la fiche, là où la
 * jeter l'aurait fait disparaître sans que personne le sache.
 */
function extrairePhases(formData: FormData): PhaseInput[] {
  const out: PhaseInput[] = [];
  let i = 0;
  while (true) {
    const phase = formData.get(`phases[${i}].phase`);
    if (phase === null) break;
    const parsed = phaseSchema.safeParse({
      phase,
      moyensPrevention: formData.get(`phases[${i}].moyensPrevention`),
    });
    if (parsed.success) out.push(parsed.data);
    i++;
  }
  return out;
}

export async function creerPlanPrevention(
  etablissementId: string,
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await assertEtablissementOwnership(etablissementId);

  const lignes = extraireLignes(formData);
  const phases = extrairePhases(formData);

  const parsed = planPreventionSchema.safeParse({
    prestataireId: formData.get("prestataireId"),
    entrepriseExterieureRaison: formData.get("entrepriseExterieureRaison"),
    entrepriseExterieureSiret: formData.get("entrepriseExterieureSiret"),
    efChefNom: formData.get("efChefNom"),
    efChefEmail: formData.get("efChefEmail"),
    efEffectifIntervenant: formData.get("efEffectifIntervenant"),
    euChefNom: formData.get("euChefNom"),
    euChefFonction: formData.get("euChefFonction"),
    dateDebut: formData.get("dateDebut"),
    dateFin: formData.get("dateFin"),
    dureeHeuresEstimee: formData.get("dureeHeuresEstimee"),
    lieux: formData.get("lieux"),
    batimentId: formData.get("batimentId"),
    naturesTravaux: formData.get("naturesTravaux"),
    travauxDangereux: formData.get("travauxDangereux") === "on",
    inspectionDate: formData.get("inspectionDate"),
    inspectionParticipants: formData.get("inspectionParticipants"),
    lignes,
    // Les cinq rubriques de `R. 4512-8` — cf. `contenu-r4512-8.ts`.
    phases,
    adaptationMateriels: formData.get("adaptationMateriels"),
    instructionsTravailleurs: formData.get("instructionsTravailleurs"),
    organisationSecours: formData.get("organisationSecours"),
    participationCroisee: formData.get("participationCroisee"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const batiment = await resoudreBatimentOptionnel(
    etablissementId,
    parsed.data.batimentId,
  );
  if (!batiment.ok) {
    return {
      status: "error",
      message: "Zone introuvable",
      fieldErrors: { batimentId: ["Zone introuvable"] },
    };
  }

  const numero = await nextNumeroPlan(etablissementId);
  const id = `pp_${randomUUID()}`;

  await prisma.planPrevention.create({
    data: {
      id,
      etablissementId,
      numero,
      prestataireId: parsed.data.prestataireId,
      entrepriseExterieureRaison: parsed.data.entrepriseExterieureRaison,
      entrepriseExterieureSiret: parsed.data.entrepriseExterieureSiret,
      efChefNom: parsed.data.efChefNom,
      efChefEmail: parsed.data.efChefEmail,
      efEffectifIntervenant: parsed.data.efEffectifIntervenant,
      euChefNom: parsed.data.euChefNom,
      euChefFonction: parsed.data.euChefFonction,
      dateDebut: parsed.data.dateDebut,
      dateFin: parsed.data.dateFin,
      dureeHeuresEstimee: parsed.data.dureeHeuresEstimee,
      lieux: parsed.data.lieux,
      batimentId: batiment.id,
      naturesTravaux: parsed.data.naturesTravaux,
      travauxDangereux: parsed.data.travauxDangereux,
      inspectionDate: parsed.data.inspectionDate,
      inspectionParticipants: parsed.data.inspectionParticipants,
      adaptationMateriels: parsed.data.adaptationMateriels,
      instructionsTravailleurs: parsed.data.instructionsTravailleurs,
      organisationSecours: parsed.data.organisationSecours,
      participationCroisee: parsed.data.participationCroisee,
      statut: "attente_signatures",
      phasesDangereuses: {
        create: parsed.data.phases.map((f, ordre) => ({
          id: `pha_${randomUUID()}`,
          ordre,
          phase: f.phase,
          moyensPrevention: f.moyensPrevention,
        })),
      },
      lignes: {
        create: parsed.data.lignes.map((l, ordre) => ({
          id: `lig_${randomUUID()}`,
          ordre,
          risque: l.risque,
          mesureEntrepriseUtilisatrice: l.mesureEntrepriseUtilisatrice,
          mesureEntrepriseExterieure: l.mesureEntrepriseExterieure,
        })),
      },
    },
  });

  revalidatePath(`/etablissements/${etablissementId}/plan-prevention`);
  return { status: "success", planId: id, numero };
}

export async function cloturerPlan(planId: string): Promise<void> {
  const plan = await prisma.planPrevention.findUnique({
    where: { id: planId },
    select: { etablissementId: true },
  });
  if (!plan) return;
  await assertEtablissementOwnership(plan.etablissementId);
  await prisma.planPrevention.update({
    where: { id: planId },
    data: { statut: "clos" },
  });
  revalidatePath(`/etablissements/${plan.etablissementId}/plan-prevention/${planId}`);
}

export async function supprimerPlan(planId: string): Promise<void> {
  const plan = await prisma.planPrevention.findUnique({
    where: { id: planId },
    select: { etablissementId: true, statut: true },
  });
  if (!plan) return;
  await assertEtablissementOwnership(plan.etablissementId);
  const etabId = plan.etablissementId;
  if (plan.statut === "brouillon" || plan.statut === "attente_signatures") {
    await prisma.planPrevention.delete({ where: { id: planId } });
  } else {
    await prisma.planPrevention.update({
      where: { id: planId },
      data: { statut: "annule" },
    });
  }
  revalidatePath(`/etablissements/${etabId}/plan-prevention`);
  redirect(`/etablissements/${etabId}/plan-prevention`);
}
