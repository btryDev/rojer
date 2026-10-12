"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resoudreBatimentOptionnel } from "@/lib/batiments/queries";
import { resoudrePrestataireOptionnel } from "@/lib/prestataires/queries";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { lireDateDeclaree } from "@/lib/traces/date-declaree";
import { z } from "zod";
import {
  diagnostiquerPlan,
  ligneSchema,
  planPreventionSchema,
  type LigneInput,
  type PlanPreventionInput,
} from "./schema";
import { nextNumeroPlan } from "./queries";
import { porteUneTraceDeSignature } from "@/lib/signatures/trace";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import {
  compterSignatures,
  MOTIF_CONTENU_MODIFIE,
  motifContenuScelle,
  porteUnChampScelle,
  verrouillerObjetSigne,
} from "@/lib/signatures/verrou-contenu";
import { calculerHashObjet } from "@/lib/signatures/hash-objet";
import { revoquerLiensEnVol } from "@/lib/access-tokens/revocation";

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
 * ON NE JETTE QUE LES RANGS ENTIÈREMENT VIDES, ET RIEN D'AUTRE. La première
 * version validait chaque rang par `phaseSchema` et ne gardait que les succès,
 * SANS `else` — trois saisies disparaissaient alors sans un mot : une phase de
 * moins de trois caractères, une phase mal formée, et surtout un rang dont
 * l'utilisateur avait rempli les MOYENS en oubliant la phase, qui perdait les
 * deux. Le filtre étant posé avant `zod`, `fieldErrors.phases` ne pouvait même
 * pas exister : aucune erreur n'était rendue à l'écran, et le dirigeant croyait
 * avoir enregistré ce qu'il venait de taper.
 *
 * Un rang dont au moins un champ porte quelque chose remonte donc TEL QUEL au
 * schéma, qui décide et dont l'erreur, elle, s'affiche. Le rang vide, lui, n'est
 * qu'un champ que personne n'a rempli — il n'y a rien à en dire.
 */
function extrairePhases(formData: FormData): unknown[] {
  const out: unknown[] = [];
  let i = 0;
  while (true) {
    const phase = formData.get(`phases[${i}].phase`);
    if (phase === null) break;
    const moyensPrevention = formData.get(`phases[${i}].moyensPrevention`);
    const vide =
      String(phase ?? "").trim() === "" &&
      String(moyensPrevention ?? "").trim() === "";
    if (!vide) out.push({ phase, moyensPrevention });
    i++;
  }
  return out;
}

/**
 * La saisie du formulaire, validée — UNE lecture pour la création et la
 * modification (2026-10-12) : l'écran « Modifier » réutilise le formulaire
 * de création, et le serveur reprend les mêmes validations.
 */
function lirePlanPrevention(formData: FormData) {
  return planPreventionSchema.safeParse({
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
    lignes: extraireLignes(formData),
    // Les cinq rubriques de `R. 4512-8` — cf. `contenu-r4512-8.ts`.
    phases: extrairePhases(formData),
    adaptationMateriels: formData.get("adaptationMateriels"),
    instructionsTravailleurs: formData.get("instructionsTravailleurs"),
    organisationSecours: formData.get("organisationSecours"),
    participationCroisee: formData.get("participationCroisee"),
  });
}

/** Les colonnes du plan tirées d'une saisie valide (hors lignes et phases). */
function colonnesPlan(d: PlanPreventionInput) {
  return {
    prestataireId: d.prestataireId ?? null,
    entrepriseExterieureRaison: d.entrepriseExterieureRaison,
    entrepriseExterieureSiret: d.entrepriseExterieureSiret ?? null,
    efChefNom: d.efChefNom,
    efChefEmail: d.efChefEmail,
    efEffectifIntervenant: d.efEffectifIntervenant,
    euChefNom: d.euChefNom,
    euChefFonction: d.euChefFonction ?? null,
    dateDebut: d.dateDebut,
    dateFin: d.dateFin,
    dureeHeuresEstimee: d.dureeHeuresEstimee ?? null,
    lieux: d.lieux,
    naturesTravaux: d.naturesTravaux,
    travauxDangereux: d.travauxDangereux,
    inspectionDate: d.inspectionDate ?? null,
    inspectionParticipants: d.inspectionParticipants ?? null,
    adaptationMateriels: d.adaptationMateriels ?? null,
    instructionsTravailleurs: d.instructionsTravailleurs ?? null,
    organisationSecours: d.organisationSecours ?? null,
    participationCroisee: d.participationCroisee ?? null,
  };
}

const phasesACreer = (d: PlanPreventionInput) =>
  d.phases.map((f, ordre) => ({
    id: `pha_${randomUUID()}`,
    ordre,
    phase: f.phase,
    moyensPrevention: f.moyensPrevention,
  }));

const lignesACreer = (d: PlanPreventionInput) =>
  d.lignes.map((l, ordre) => ({
    id: `lig_${randomUUID()}`,
    ordre,
    risque: l.risque,
    mesureEntrepriseUtilisatrice: l.mesureEntrepriseUtilisatrice,
    mesureEntrepriseExterieure: l.mesureEntrepriseExterieure,
  }));

const PRESTATAIRE_INTROUVABLE: PlanActionState = {
  status: "error",
  message: "Prestataire introuvable",
  fieldErrors: { prestataireId: ["Prestataire introuvable dans votre annuaire"] },
};

const ZONE_INTROUVABLE: PlanActionState = {
  status: "error",
  message: "Zone introuvable",
  fieldErrors: { batimentId: ["Zone introuvable"] },
};

export async function creerPlanPrevention(
  etablissementId: string,
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = lirePlanPrevention(formData);
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
  if (!batiment.ok) return ZONE_INTROUVABLE;
  const prestataire = await resoudrePrestataireOptionnel(
    etablissementId,
    parsed.data.prestataireId,
  );
  if (!prestataire.ok) return PRESTATAIRE_INTROUVABLE;

  const numero = await nextNumeroPlan(etablissementId);
  const id = `pp_${randomUUID()}`;

  await prisma.planPrevention.create({
    data: {
      id,
      etablissementId,
      numero,
      ...colonnesPlan(parsed.data),
      batimentId: batiment.id,
      statut: "attente_signatures",
      phasesDangereuses: { create: phasesACreer(parsed.data) },
      lignes: { create: lignesACreer(parsed.data) },
    },
  });

  revalidatePath(`/etablissements/${etablissementId}/plan-prevention`);
  return { status: "success", planId: id, numero };
}

/**
 * Corriger un plan (audit du 2026-10-12, constat 1). Le plan ne se modifiait
 * pas : créé sans date d'inspection commune, il ne pouvait jamais l'enregistrer
 * et restait en alerte au calendrier jusqu'à sa clôture.
 *
 * La règle de `verrou-contenu.ts` : tant qu'aucune signature n'existe, tout se
 * corrige, avec les validations de la création ; dès qu'une signature existe,
 * seul ce qui est hors de l'empreinte (`hash-objet.ts`) se modifie — la zone.
 * Le reste n'est pas réécrit en silence : une saisie qui le porte quand même
 * est refusée, avec la phrase que l'écran affiche.
 *
 * Compter les signatures puis écrire se fait SOUS LE VERROU DE LA LIGNE, dans
 * une transaction (relecture indépendante du 2026-10-12) : une signature posée
 * entre les deux laissait réécrire ce qu'elle venait de sceller. Et si
 * l'empreinte change, les liens de signature en vol sont révoqués dans la même
 * transaction : sans cela, l'entreprise extérieure lisait une version sur la
 * page du lien et en signait une autre, l'empreinte étant calculée au code.
 *
 * Un plan clos ou annulé ne se modifie plus, comme il ne se signe plus. Le
 * calendrier lit le plan en direct (`sourcePlansPrevention`) : rien à
 * régénérer, la création n'en régénère pas non plus.
 */
export async function modifierPlanPrevention(
  planId: string,
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const plan = await prisma.planPrevention.findUnique({
    where: { id: planId },
    select: { etablissementId: true, statut: true, numero: true, inspectionDate: true },
  });
  if (!plan) return { status: "error", message: "Plan introuvable" };
  await assertEtablissementOwnership(plan.etablissementId);
  const etablissementId = plan.etablissementId;
  if (!statutPlanSignable(plan.statut)) {
    return { status: "error", message: "Ce plan est clos ou annulé : il ne se modifie plus." };
  }

  const resultat = await prisma.$transaction(async (tx): Promise<PlanActionState | null> => {
    await verrouillerObjetSigne(tx, "plan_prevention", planId);
    const scelle = motifContenuScelle(
      "plan",
      await compterSignatures("plan_prevention", planId, etablissementId, tx),
      plan.inspectionDate === null,
    );
    if (scelle) {
      if (porteUnChampScelle(formData)) return { status: "error", message: scelle };
      const batiment = await resoudreBatimentOptionnel(
        etablissementId,
        lireChampOptionnel(formData.get("batimentId")),
      );
      if (!batiment.ok) return ZONE_INTROUVABLE;
      await tx.planPrevention.updateMany({
        where: { id: planId, etablissementId },
        data: { batimentId: batiment.id },
      });
      return null;
    }
    const parsed = lirePlanPrevention(formData);
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
    if (!batiment.ok) return ZONE_INTROUVABLE;
    const prestataire = await resoudrePrestataireOptionnel(
      etablissementId,
      parsed.data.prestataireId,
    );
    if (!prestataire.ok) return PRESTATAIRE_INTROUVABLE;
    const avant = await calculerHashObjet("plan_prevention", planId, etablissementId, tx);
    await tx.planPrevention.update({
      where: { id: planId, etablissementId },
      data: {
        ...colonnesPlan(parsed.data),
        batimentId: batiment.id,
        // Remplacées en bloc : l'ordre est celui de la saisie, et c'est lui
        // que l'empreinte lit.
        phasesDangereuses: { deleteMany: {}, create: phasesACreer(parsed.data) },
        lignes: { deleteMany: {}, create: lignesACreer(parsed.data) },
      },
    });
    const apres = await calculerHashObjet("plan_prevention", planId, etablissementId, tx);
    if (!avant.ok || !apres.ok || avant.hash !== apres.hash) {
      await revoquerLiensEnVol(
        {
          etablissementId,
          objetType: "plan_prevention",
          objetId: planId,
          motif: MOTIF_CONTENU_MODIFIE.plan,
        },
        tx,
      );
    }
    return null;
  });
  if (resultat) return resultat;

  revalidatePath(`/etablissements/${etablissementId}/plan-prevention`);
  revalidatePath(`/etablissements/${etablissementId}/plan-prevention/${planId}`);
  return { status: "success", planId, numero: plan.numero };
}

function lireChampOptionnel(v: FormDataEntryValue | null): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
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
  // Un plan clos ne se signe plus : les liens encore ouverts tombent avec lui.
  // La garde de fond reste au moment de signer (`etat-signable.ts`).
  await revoquerLiensEnVol({
    etablissementId: plan.etablissementId,
    objetType: "plan_prevention",
    objetId: planId,
    motif: "Plan de prévention clos",
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
  // LE STATUT NE DIT PAS SI LE PLAN A ÉTÉ SIGNÉ. `attente_signatures` est
  // l'état de création ET celui où les signatures se recueillent, ~~et rien
  // n'écrit jamais `valide`~~ [2026-10-12 : `valide` n'est écrit qu'à la
  // seconde signature, `validerSiCoSigne`] : s'y fier effaçait des plans signés, laissant
  // leurs signatures orphelines. Un plan ne s'efface que VIERGE — ni
  // signature, ni lien émis (`porteUneTraceDeSignature`) ; sinon il passe
  // « annulé » et rien n'est détruit.
  const effacable =
    (plan.statut === "brouillon" || plan.statut === "attente_signatures") &&
    !(await porteUneTraceDeSignature("plan_prevention", planId, etabId));
  if (effacable) {
    await prisma.planPrevention.delete({ where: { id: planId } });
  } else {
    await prisma.planPrevention.update({
      where: { id: planId },
      data: { statut: "annule" },
    });
  }
  // Annulé ou effacé, le plan ne se signe plus. Pour un plan effacé la
  // révocation ne trouve rien — il était vierge —, sauf un lien émis entre
  // la vérification et l'effacement : elle le ferme aussi.
  await revoquerLiensEnVol({
    etablissementId: etabId,
    objetType: "plan_prevention",
    objetId: planId,
    motif: effacable ? "Plan de prévention supprimé" : "Plan de prévention annulé",
  });
  revalidatePath(`/etablissements/${etabId}/plan-prevention`);
  redirect(`/etablissements/${etabId}/plan-prevention`);
}

export type TraceInspectionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

/**
 * Note la date à laquelle le chef de l'entreprise utilisatrice a informé par
 * écrit l'inspection du travail de l'ouverture des travaux — R. 4512-12, 2°,
 * CT (C45, 2026-09-27). Une trace déclarée, facultative : Rojer n'informe
 * personne. Le champ vide l'efface ; une date future est refusée ; aucun
 * délai n'est vérifié, le texte n'en fixe pas.
 */
export async function noterInformationInspection(
  planId: string,
  _prev: TraceInspectionState,
  formData: FormData,
): Promise<TraceInspectionState> {
  const plan = await prisma.planPrevention.findUnique({
    where: { id: planId },
    select: { etablissementId: true },
  });
  if (!plan) return { status: "error", message: "Plan introuvable" };
  await assertEtablissementOwnership(plan.etablissementId);

  const lu = lireDateDeclaree(
    formData.get("inspectionTravailInformeeLe"),
    new Date(),
  );
  if (!lu.ok) return { status: "error", message: lu.message };

  await prisma.planPrevention.update({
    where: { id: planId },
    data: { inspectionTravailInformeeLe: lu.date },
  });
  revalidatePath(
    `/etablissements/${plan.etablissementId}/plan-prevention/${planId}`,
  );
  return { status: "success" };
}

const heuresSchema = z.coerce
  .number({ error: "Nombre d'heures attendu" })
  .int("Nombre d'heures entier attendu")
  .min(1, "Au moins 1 heure")
  .max(99999, "99 999 heures au plus");

/**
 * Note le nombre d'heures prévisible revu en cours de chantier — R. 4512-7,
 * 1°, seconde phrase (2026-10-12). Le diagnostic en tire l'écrit dès 400 h
 * (`seuil400EnCours`).
 *
 * - Propriétaire de l'établissement seulement ; plan clos ou annulé : refusé.
 * - Un entier de 1 à 99 999, et la date où il a été revu, jamais future —
 *   les deux sont requis : un nombre sans date ne dit pas quand l'obligation
 *   est née.
 * - La dernière valeur seulement. ~~Mais une révision à la baisse ne retire
 *   jamais une obligation déjà née : si les 400 h ont été notées, une valeur
 *   inférieure est refusée.~~ [2026-10-12, relecture indépendante : refusée
 *   SANS EXCEPTION, une faute de frappe (4000 pour 400… ou 450 pour 45) ne se
 *   corrigeait plus, et le ZIP disait « Plan écrit obligatoire » pour
 *   toujours. Et la date était réécrite à chaque saisie.] Désormais :
 *   - la date retenue est la PREMIÈRE où 400 h ou plus ont été notées, et elle
 *     ne bouge plus tant que la valeur reste à 400 ou au-dessus — c'est le
 *     jour où l'obligation est née ;
 *   - une valeur sous 400, une fois les 400 h notées, reste refusée comme
 *     révision — une révision à la baisse ne retire pas l'obligation née —,
 *     et n'est acceptée que comme CORRECTION DE SAISIE déclarée (case
 *     « Je corrige une erreur de saisie »), qui remplace valeur et date.
 *   L'estimation initiale, elle, n'est pas touchée.
 * - Hors de l'empreinte de signature : se note sur un plan signé.
 * - Sans migration : la colonne de date porte la première date ≥ 400 h dès
 *   qu'elles sont atteintes, la date de la révision sinon.
 */
export async function noterHeuresRevisees(
  planId: string,
  _prev: TraceInspectionState,
  formData: FormData,
): Promise<TraceInspectionState> {
  const plan = await prisma.planPrevention.findUnique({
    where: { id: planId },
    select: {
      etablissementId: true,
      statut: true,
      heuresPrevisiblesRevisees: true,
      heuresPrevisiblesReviseesLe: true,
    },
  });
  if (!plan) return { status: "error", message: "Plan introuvable" };
  await assertEtablissementOwnership(plan.etablissementId);
  if (!statutPlanSignable(plan.statut)) {
    return { status: "error", message: "Ce plan est clos ou annulé : il ne se modifie plus." };
  }

  const heures = heuresSchema.safeParse(formData.get("heuresPrevisiblesRevisees"));
  if (!heures.success) {
    return { status: "error", message: heures.error.issues[0]?.message ?? "Nombre d'heures invalide" };
  }
  const le = lireDateDeclaree(formData.get("heuresPrevisiblesReviseesLe"), new Date());
  if (!le.ok) return { status: "error", message: le.message };
  if (!le.date) return { status: "error", message: "Date de la révision requise" };
  const correction = formData.get("correctionSaisie") === "on";

  const deja = diagnostiquerPlan({
    dureeHeuresEstimee: null,
    travauxDangereux: false,
    heuresPrevisiblesRevisees: plan.heuresPrevisiblesRevisees,
    heuresPrevisiblesReviseesLe: plan.heuresPrevisiblesReviseesLe,
  });
  if (deja.seuil400EnCours && heures.data < 400 && !correction) {
    return {
      status: "error",
      message:
        "Les 400 heures ont déjà été notées : l'écrit est dû depuis, et une révision à la baisse ne le retire pas. " +
        "S'il s'agissait d'une erreur de saisie, cochez « Je corrige une erreur de saisie ».",
    };
  }
  // La première date où 400 h ont été notées reste celle de l'obligation.
  const garderLaDate = deja.seuil400EnCours && heures.data >= 400 && !correction;

  await prisma.planPrevention.updateMany({
    where: { id: planId, etablissementId: plan.etablissementId },
    data: {
      heuresPrevisiblesRevisees: heures.data,
      heuresPrevisiblesReviseesLe: garderLaDate ? plan.heuresPrevisiblesReviseesLe : le.date,
    },
  });
  revalidatePath(`/etablissements/${plan.etablissementId}/plan-prevention`);
  revalidatePath(`/etablissements/${plan.etablissementId}/plan-prevention/${planId}`);
  return { status: "success" };
}
