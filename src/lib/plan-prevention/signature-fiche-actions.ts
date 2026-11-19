"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCompte } from "@/lib/auth/compte";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { lienActif } from "@/lib/access-tokens/revocation";
import { envoyerCodeSignatureCompte, poserSignatureCompteAvecCode, type EnvoiCodeCompte } from "@/lib/signatures/code-compte";
import { texteConsentement } from "@/lib/signatures/consentement";
import { emettreLienDepuisLaFiche } from "./liens-fiche";

/**
 * Les gestes de la fiche du plan sur les signatures (2026-11-19, lot 3) :
 * le code de signature du compte, « Signer et envoyer », « Renvoyer le
 * lien » et « Envoyer le lien ». Le fond est ailleurs et ne change pas
 * (`signatures/code-compte.ts`, `access-tokens/emission.ts`) ; chaque geste
 * ouvre par `verifierSaisie` et lit le plan dans le périmètre du compte.
 *
 * L'ORDRE DE « SIGNER ET ENVOYER » : la signature d'abord, le lien ensuite.
 * Le code et la case cochée prouvent la volonté de SIGNER : c'est l'acte
 * qu'ils confirment, et il est posé tel quel. Le lien part après ; s'il ne
 * part pas (fournisseur, plafond, essai), la réponse le dit, et la fiche
 * montre l'état vrai — votre signature posée, aucun lien pour l'entreprise
 * extérieure, et le bouton « Envoyer le lien ». L'ordre inverse aurait fait
 * partir chez l'entreprise extérieure une demande au nom d'une signature qui
 * pouvait encore échouer (code faux, plafond de la formule, proposition
 * arrivée entre-temps) — et le courriel, lui, ne se rattrape pas.
 */

export type SignerEtEnvoyerState =
  | { status: "idle" }
  | { status: "error"; message: string; codeAReDemander?: boolean }
  | { status: "success"; message: string; lienParti: boolean | null };

export type GesteLienState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const identifiant = z.string().min(1).max(100);

async function planDuCompte(planId: string) {
  const { user, compte, db } = await requireCompte();
  const id = identifiant.safeParse(planId);
  if (!id.success) notFound();
  const plan = await db.planPrevention.findFirst({
    where: { id: id.data, etablissement: { entreprise: { compteId: compte.compteId } } },
    select: {
      id: true,
      etablissementId: true,
      efChefNom: true,
      efChefEmail: true,
      entrepriseExterieureRaison: true,
      etablissement: { select: { entreprise: { select: { raisonSociale: true } } } },
    },
  });
  if (!plan) notFound();
  return { plan, user, compte, db };
}

function revalider(etablissementId: string, planId: string) {
  revalidatePath(`/etablissements/${etablissementId}/plan-prevention`);
  revalidatePath(`/etablissements/${etablissementId}/plan-prevention/${planId}`);
}

/** Envoie le code de signature à l'adresse du compte connecté. */
export async function demanderCodeSignaturePlan(planId: string): Promise<EnvoiCodeCompte> {
  await verifierSaisie();
  const { plan } = await planDuCompte(planId);
  return envoyerCodeSignatureCompte({
    etablissementId: plan.etablissementId,
    objetType: "plan_prevention",
    objetId: plan.id,
  });
}

/**
 * « Signer » ou « Signer et envoyer » : la signature du compte avec son code
 * et la case cochée, puis — `envoyer=1` — le lien à l'entreprise extérieure,
 * à l'adresse de la fiche, si elle n'a ni signé ni de lien ouvert.
 */
export async function signerEtEnvoyerPlan(
  planId: string,
  _prev: SignerEtEnvoyerState,
  formData: FormData,
): Promise<SignerEtEnvoyerState> {
  await verifierSaisie();
  const { plan, user, compte, db } = await planDuCompte(planId);
  const coche = formData.get("consentement") === "on";
  const r = await poserSignatureCompteAvecCode({
    etablissementId: plan.etablissementId,
    objetType: "plan_prevention",
    objetId: plan.id,
    code: String(formData.get("code") ?? ""),
    // Le texte enregistré est celui que la fenêtre affiche, recomposé ici
    // depuis les mêmes données — jamais un texte venu du navigateur.
    consentement: coche ? { texte: texteConsentement(plan.etablissement.entreprise.raisonSociale) } : null,
  });
  if (!r.ok) return { status: "error", message: r.message, codeAReDemander: r.codeAReDemander };

  let lienParti: boolean | null = null;
  let suite = "";
  if (formData.get("envoyer") === "1") {
    const [signee, ouvert] = await Promise.all([
      db.signature.count({
        where: { etablissementId: plan.etablissementId, objetType: "plan_prevention", objetId: plan.id, partie: "entreprise_exterieure", active: true },
      }),
      db.accessToken.count({
        where: {
          etablissementId: plan.etablissementId,
          objetType: "plan_prevention",
          objetId: plan.id,
          scope: "signature",
          partie: "entreprise_exterieure",
          ...lienActif(),
        },
      }),
    ]);
    if (signee === 0 && ouvert === 0) {
      const lien = await emettreLienDepuisLaFiche(db, {
        compteId: compte.compteId,
        emailDuCompte: user.email ?? null,
        etablissementId: plan.etablissementId,
        planId: plan.id,
        to: plan.efChefEmail,
        nom: plan.efChefNom,
        partie: "entreprise_exterieure",
      });
      lienParti = lien.ok;
      suite = lien.ok
        ? ` Le lien de signature est parti à ${plan.entrepriseExterieureRaison} (${plan.efChefEmail}).`
        : ` Le lien n'est pas parti à ${plan.entrepriseExterieureRaison} : ${lien.message} Utilisez « Envoyer le lien » sur la fiche.`;
    }
  }
  revalider(plan.etablissementId, plan.id);
  return { status: "success", message: `Votre signature est posée.${suite}`, lienParti };
}

/**
 * « Renvoyer le lien » : un nouveau lien à la même partie, à la même adresse
 * que celui qu'il remplace ; l'ancien est révoqué après l'envoi
 * (`emettreAccessToken`). Il ne prend ni place de lien actif, ni signature
 * de la formule (décision du 2026-11-19).
 */
export async function renvoyerLienPlan(
  planId: string,
  accessTokenId: string,
  _prev: GesteLienState,
): Promise<GesteLienState> {
  await verifierSaisie();
  const { plan, user, compte, db } = await planDuCompte(planId);
  const idLien = identifiant.safeParse(accessTokenId);
  if (!idLien.success) notFound();
  const ancien = await db.accessToken.findFirst({
    where: {
      id: idLien.data,
      etablissementId: plan.etablissementId,
      objetType: "plan_prevention",
      objetId: plan.id,
      scope: "signature",
    },
    select: { emailDestinataire: true, nomDestinataire: true, partie: true, utiliseLe: true },
  });
  if (!ancien) notFound();
  if (!ancien.partie) return { status: "error", message: "Ce lien ne dit pas au nom de quelle partie signer : demandez une nouvelle signature." };
  if (ancien.utiliseLe) return { status: "error", message: "Ce lien a déjà servi à signer." };
  const r = await emettreLienDepuisLaFiche(db, {
    compteId: compte.compteId,
    emailDuCompte: user.email ?? null,
    etablissementId: plan.etablissementId,
    planId: plan.id,
    to: ancien.emailDestinataire,
    nom: ancien.nomDestinataire,
    partie: ancien.partie,
  });
  if (!r.ok) return { status: "error", message: r.message };
  revalider(plan.etablissementId, plan.id);
  return { status: "success", message: `Nouveau lien envoyé à ${ancien.emailDestinataire}. L'ancien ne sert plus.` };
}

/** « Envoyer le lien » à l'entreprise extérieure, à l'adresse de la fiche. */
export async function envoyerLienEntrepriseExterieure(
  planId: string,
  _prev: GesteLienState,
): Promise<GesteLienState> {
  await verifierSaisie();
  const { plan, user, compte, db } = await planDuCompte(planId);
  const r = await emettreLienDepuisLaFiche(db, {
    compteId: compte.compteId,
    emailDuCompte: user.email ?? null,
    etablissementId: plan.etablissementId,
    planId: plan.id,
    to: plan.efChefEmail,
    nom: plan.efChefNom,
    partie: "entreprise_exterieure",
  });
  if (!r.ok) return { status: "error", message: r.message };
  revalider(plan.etablissementId, plan.id);
  return { status: "success", message: `Lien de signature envoyé à ${plan.efChefEmail}.` };
}
