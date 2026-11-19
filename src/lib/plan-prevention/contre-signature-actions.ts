"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { requireCompte } from "@/lib/auth/compte";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { revoquerLiensEnVol } from "@/lib/access-tokens/revocation";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import { MOTIF_CONTENU_MODIFIE, verrouillerObjetSigne } from "@/lib/signatures/verrou-contenu";
import { lireProposition } from "./proposition";
import {
  avertirDecision,
  avertirSignaturesRetirees,
  MOTIF_REVOCATION_PLAN,
  retirerSignaturesDuPlan,
} from "./contre-signature";

/**
 * Les gestes du dirigeant sur la contre-signature d'un plan (ADR-061 §§ 2 et
 * 4) : révoquer les signatures pour corriger, et traiter la proposition de
 * l'entreprise extérieure (accepter, accepter puis corriger, refuser).
 *
 * Chaque geste relit le plan SOUS SON VERROU (`verrouillerObjetSigne`) dans
 * une transaction : une signature qui se termine au même instant attend, ou
 * passe avant et compte.
 */

export type ContreSignatureState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

async function planDuCompte(planId: string) {
  const { compte, db } = await requireCompte();
  const plan = await db.planPrevention.findFirst({
    where: { id: planId, etablissement: { entreprise: { compteId: compte.compteId } } },
    select: { id: true, etablissementId: true },
  });
  if (!plan) notFound();
  return { ...plan, db };
}

function revalider(etablissementId: string, planId: string) {
  revalidatePath(`/etablissements/${etablissementId}/plan-prevention`);
  revalidatePath(`/etablissements/${etablissementId}/plan-prevention/${planId}`);
}

/** « Révoquer les signatures pour corriger » (ADR-061 § 2). */
export async function revoquerSignaturesPlan(
  planId: string,
  _prev: ContreSignatureState,
): Promise<ContreSignatureState> {
  await verifierSaisie();
  const plan = await planDuCompte(planId);
  const { etablissementId, db } = plan;

  const r = await db.$transaction(async (tx) => {
    await verrouillerObjetSigne(tx, "plan_prevention", planId, etablissementId);
    const etat = await tx.planPrevention.findFirst({
      where: { id: planId, etablissementId },
      select: { statut: true },
    });
    if (!etat || !statutPlanSignable(etat.statut)) {
      return { ok: false as const, message: "Ce plan est clos ou annulé : il ne se corrige plus." };
    }
    const retirees = await retirerSignaturesDuPlan(tx, {
      etablissementId,
      planId,
      motif: MOTIF_REVOCATION_PLAN.correction,
    });
    if (retirees.length === 0) return { ok: false as const, message: "Ce plan ne porte aucune signature à révoquer." };
    return { ok: true as const, retirees };
  });
  if (!r.ok) return { status: "error", message: r.message };

  after(() =>
    avertirSignaturesRetirees(db, {
      etablissementId,
      planId,
      motif: MOTIF_REVOCATION_PLAN.correction,
      retirees: r.retirees,
    }),
  );
  revalider(etablissementId, planId);
  return {
    status: "success",
    message: "Signatures révoquées : le plan se modifie, puis se fait signer de nouveau.",
  };
}

const DECISIONS = ["accepter", "corriger", "refuser"] as const;
type Decision = (typeof DECISIONS)[number];

/** Traiter la proposition de l'entreprise extérieure (ADR-061 § 4). */
export async function traiterProposition(
  propositionId: string,
  _prev: ContreSignatureState,
  formData: FormData,
): Promise<ContreSignatureState> {
  await verifierSaisie();
  const decision = formData.get("decision");
  if (typeof decision !== "string" || !DECISIONS.includes(decision as Decision)) {
    return { status: "error", message: "Choix inconnu." };
  }
  const { user, compte, db } = await requireCompte();
  const proposition = await db.propositionModificationPlan.findFirst({
    where: { id: propositionId, etablissement: { entreprise: { compteId: compte.compteId } } },
    select: { id: true, planPreventionId: true, etablissementId: true },
  });
  if (!proposition) notFound();
  const { planPreventionId: planId, etablissementId } = proposition;
  const maintenant = new Date();
  const traiteePar = user.email ?? null;

  const r = await db.$transaction(async (tx) => {
    await verrouillerObjetSigne(tx, "plan_prevention", planId, etablissementId);
    const p = await tx.propositionModificationPlan.findFirst({
      where: { id: propositionId, etablissementId, enAttente: true },
      select: { contenu: true },
    });
    if (!p) return { ok: false as const, message: "Cette proposition a déjà été traitée." };
    const plan = await tx.planPrevention.findFirst({
      where: { id: planId, etablissementId },
      select: { statut: true, efChefEmail: true, lignes: { select: { id: true } } },
    });
    if (!plan || !statutPlanSignable(plan.statut)) {
      return { ok: false as const, message: "Ce plan est clos ou annulé." };
    }
    const cloture = {
      enAttente: null,
      traiteeLe: maintenant,
      traiteeParEmail: traiteePar,
    };

    if (decision === "refuser") {
      await tx.propositionModificationPlan.update({
        where: { id: propositionId, etablissementId },
        data: { ...cloture, statut: "refusee" },
      });
      return { ok: true as const, acceptee: false, efChefEmail: plan.efChefEmail };
    }

    // Relue telle qu'enregistrée, contre le plan d'AUJOURD'HUI : une ligne
    // retirée depuis par le dirigeant rend la proposition inapplicable.
    const lecture = lireProposition(JSON.stringify(p.contenu), new Set(plan.lignes.map((l) => l.id)));
    if (!lecture.ok) {
      return {
        ok: false as const,
        message: "Le plan a changé depuis la proposition : refusez-la et corrigez le plan à la main.",
      };
    }
    const { fiche, lignes } = lecture.proposition;
    await tx.planPrevention.update({
      where: { id: planId, etablissementId },
      data: {
        entrepriseExterieureRaison: fiche.entrepriseExterieureRaison,
        entrepriseExterieureSiret: fiche.entrepriseExterieureSiret,
        efChefNom: fiche.efChefNom,
        efEffectifIntervenant: fiche.efEffectifIntervenant,
        // Remplacées en bloc, dans l'ordre proposé — comme « Modifier ».
        lignes: {
          deleteMany: {},
          create: lignes.map((l, ordre) => ({
            id: `lig_${randomUUID()}`,
            ordre,
            risque: l.risque,
            mesureEntrepriseUtilisatrice: l.mesureEntrepriseUtilisatrice,
            mesureEntrepriseExterieure: l.mesureEntrepriseExterieure,
          })),
        },
      },
    });
    // Le contenu a changé : un lien émis entre-temps montrerait l'ancien.
    await revoquerLiensEnVol(tx, {
      etablissementId,
      objetType: "plan_prevention",
      objetId: planId,
      motif: MOTIF_CONTENU_MODIFIE.plan,
    });
    await tx.propositionModificationPlan.update({
      where: { id: propositionId, etablissementId },
      data: { ...cloture, statut: "acceptee" },
    });
    return { ok: true as const, acceptee: true, efChefEmail: plan.efChefEmail };
  });
  if (!r.ok) return { status: "error", message: r.message };

  after(() =>
    avertirDecision(db, { etablissementId, planId, to: r.efChefEmail, acceptee: r.acceptee }),
  );
  revalider(etablissementId, planId);
  if (decision === "corriger") {
    redirect(`/etablissements/${etablissementId}/plan-prevention/${planId}/modifier`);
  }
  return {
    status: "success",
    message: r.acceptee
      ? "Proposition appliquée au plan. Demandez de nouveau les signatures."
      : "Proposition refusée. Demandez de nouveau les signatures.",
  };
}
