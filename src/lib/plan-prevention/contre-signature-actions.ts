"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { requireCompte } from "@/lib/auth/compte";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { revoquerLiensEnVol } from "@/lib/access-tokens/revocation";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import { compterSignatures, MOTIF_CONTENU_MODIFIE, verrouillerObjetSigne } from "@/lib/signatures/verrou-contenu";
import { calculerHashObjet, versionDeHash } from "@/lib/signatures/hash-objet";
import { lireProposition } from "./proposition";
import {
  avertirDecision,
  avertirSignaturesRetirees,
  emettreLienApresRefus,
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
  const { user, compte, db } = await requireCompte();
  const plan = await db.planPrevention.findFirst({
    where: { id: planId, etablissement: { entreprise: { compteId: compte.compteId } } },
    select: { id: true, etablissementId: true },
  });
  if (!plan) notFound();
  return { ...plan, db, auteurEmail: user.email ?? null };
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
  const { etablissementId, db, auteurEmail } = plan;

  const r = await db.$transaction(async (tx) => {
    await verrouillerObjetSigne(tx, "plan_prevention", planId, etablissementId);
    const etat = await tx.planPrevention.findFirst({
      where: { id: planId, etablissementId },
      select: { statut: true },
    });
    if (!etat || !statutPlanSignable(etat.statut)) {
      return { ok: false as const, message: "Ce plan est clos ou annulé : il ne se corrige plus." };
    }
    // Compté AVANT toute écriture : sans signature active, rien ne bouge —
    // pas même les liens en cours (un onglet resté ouvert les aurait fait
    // tomber en répondant « rien à révoquer »).
    if ((await compterSignatures(tx, "plan_prevention", planId, etablissementId)) === 0) {
      return { ok: false as const, message: "Ce plan ne porte aucune signature à révoquer." };
    }
    const retirees = await retirerSignaturesDuPlan(tx, {
      etablissementId,
      planId,
      motif: MOTIF_REVOCATION_PLAN.correction,
    });
    return { ok: true as const, retirees };
  });
  if (!r.ok) return { status: "error", message: r.message };

  after(() =>
    avertirSignaturesRetirees(db, {
      etablissementId,
      planId,
      motif: MOTIF_REVOCATION_PLAN.correction,
      retirees: r.retirees,
      // Qui révoque ne reçoit pas l'avis de ce qu'il vient de faire (2026-11-19).
      auteurEmail,
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
      select: { contenu: true, accessTokenId: true, hashVersion: true },
    });
    if (!p) return { ok: false as const, message: "Cette proposition a déjà été traitée." };
    const plan = await tx.planPrevention.findFirst({
      where: { id: planId, etablissementId },
      select: { statut: true, lignes: { select: { id: true } } },
    });
    // L'avis de décision va à qui a proposé : l'adresse de SON lien, qui a pu
    // différer de celle de la fiche.
    const lien = await tx.accessToken.findFirst({
      where: { id: p.accessTokenId, etablissementId },
      select: { emailDestinataire: true, nomDestinataire: true },
    });
    const auteur = lien?.emailDestinataire ?? null;
    const auteurNom = lien?.nomDestinataire ?? null;
    if (!plan) return { ok: false as const, message: "Ce plan n'existe plus." };
    // Un plan clos ou annulé ne s'applique plus rien, mais sa proposition se
    // refuse encore : elle ne reste pas en suspens pour toujours.
    if (!statutPlanSignable(plan.statut) && decision !== "refuser") {
      return { ok: false as const, message: "Ce plan est clos ou annulé : refusez la proposition." };
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
      return { ok: true as const, acceptee: false, auteur, auteurNom, retirees: [] };
    }

    // La proposition porte sur UNE version du plan (son empreinte, relevée à
    // l'envoi) : si le dirigeant a modifié le plan depuis, l'appliquer
    // écraserait ses modifications (relecture GestBAT du 2026-11-19). Deux
    // empreintes de formes différentes (`v1`/`v2:`) ne se comparent pas :
    // seule la vérification des lignes vaut alors.
    const actuel = await calculerHashObjet(tx, "plan_prevention", planId, etablissementId);
    if (
      actuel.ok &&
      versionDeHash(actuel.hash) === versionDeHash(p.hashVersion) &&
      actuel.hash !== p.hashVersion
    ) {
      return {
        ok: false as const,
        message: "Le plan a changé depuis la proposition : refusez-la et corrigez le plan à la main.",
      };
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
    // Accepter révoque les signatures déjà posées (ADR-061, revue de sécurité
    // du 2026-11-19) : elles portaient sur le plan d'avant la proposition.
    const retirees = await retirerSignaturesDuPlan(tx, {
      etablissementId,
      planId,
      motif: MOTIF_REVOCATION_PLAN.proposition,
    });
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
    return { ok: true as const, acceptee: true, auteur, auteurNom, retirees };
  });
  if (!r.ok) return { status: "error", message: r.message };

  const { auteur, auteurNom, acceptee, retirees } = r;
  // Au refus, un nouveau lien pour l'entreprise extérieure (2026-11-19) :
  // APRÈS la transaction — le refus est acquis quoi qu'il arrive à l'envoi —,
  // et avant la réponse, qui dit s'il est parti. Son courriel est l'avis de
  // décision ; en échec, l'avis part sans lien (`avertirDecision`).
  const nouveauLien =
    !acceptee && auteur
      ? await emettreLienApresRefus(db, {
          compteId: compte.compteId,
          emailDuCompte: user.email ?? null,
          etablissementId,
          planId,
          to: auteur,
          nom: auteurNom,
        })
      : undefined;
  after(async () => {
    if (auteur) await avertirDecision(db, { etablissementId, planId, to: auteur, acceptee, nouveauLien });
    await avertirSignaturesRetirees(db, {
      etablissementId,
      planId,
      motif: MOTIF_REVOCATION_PLAN.proposition,
      retirees,
      auteurEmail: traiteePar,
    });
  });
  revalider(etablissementId, planId);
  if (decision === "corriger") {
    redirect(`/etablissements/${etablissementId}/plan-prevention/${planId}/modifier`);
  }
  return {
    status: "success",
    message: acceptee
      ? "Proposition appliquée au plan. Demandez de nouveau les signatures."
      : nouveauLien === "parti"
        ? `Proposition refusée. Un nouveau lien de signature est parti à ${auteur} : le plan se signe tel qu'il est.`
        : nouveauLien === "echec"
          ? "Proposition refusée. Le nouveau lien de signature n'a pas pu partir : demandez de nouveau la signature de l'entreprise extérieure."
          : "Proposition refusée.",
  };
}
