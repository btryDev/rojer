"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { verifierAccessToken } from "@/lib/access-tokens/verify";
import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import { calculerHashObjet } from "@/lib/signatures/hash-objet";
import { verrouillerObjetSigne } from "@/lib/signatures/verrou-contenu";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import { ipClient, ipPourLimite } from "@/lib/securite/ip-client";
import { cleLimite, consommer, LIMITES, messageTropDeTentatives } from "@/lib/securite/limite-debit";
import { aucunEcart, ecartsDeLaProposition, lireProposition, PROPOSITION_TAILLE_MAX, propositionSchema } from "./proposition";
import {
  avertirPropositionRecue,
  avertirSignaturesRetirees,
  MOTIF_REVOCATION_PLAN,
  retirerSignaturesDuPlan,
} from "./contre-signature";

/**
 * L'entreprise extérieure propose une modification du plan, depuis son lien
 * de signature, au lieu de signer (ADR-061 § 3).
 *
 * Autorisation : la connaissance du lien, comme pour la signature — un lien
 * de signature du plan, émis pour l'entreprise extérieure, ni consommé, ni
 * révoqué, ni expiré. Le périmètre vient du JETON, jamais du formulaire.
 *
 * Pas de code demandé : proposer n'engage pas. La trace tient au lien, à
 * l'IP, au navigateur et à l'empreinte de la version lue. Une limite par IP
 * borne les envois ; une seule proposition attend par plan (unicité en base).
 *
 * L'effet : la proposition est enregistrée, les signatures actives du plan
 * sont révoquées et ses liens aussi (celui-ci compris), le dirigeant est
 * prévenu. Il accepte, corrige ou refuse depuis la fiche du plan.
 */

export type PropositionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

const LIEN_INVALIDE: PropositionState = { status: "error", message: "Ce lien ne permet pas de proposer une modification." };

export async function proposerModificationPlan(
  tokenClair: string,
  _prev: PropositionState,
  formData: FormData,
): Promise<PropositionState> {
  const res = await verifierAccessToken(tokenClair);
  if (!res.ok) return LIEN_INVALIDE;
  const token = res.token;
  if (
    token.scope !== "signature" ||
    token.objetType !== "plan_prevention" ||
    token.partie !== "entreprise_exterieure"
  ) {
    return LIEN_INVALIDE;
  }

  // La forme se valide AVANT la limite : une saisie à corriger ne consomme
  // pas les envois de l'heure (l'appartenance des lignes se vérifie ensuite,
  // sous le verrou).
  const brut = formData.get("proposition");
  if (typeof brut !== "string" || brut.length > PROPOSITION_TAILLE_MAX) {
    return { status: "error", message: "Proposition illisible." };
  }
  try {
    const forme = propositionSchema.safeParse(JSON.parse(brut));
    if (!forme.success) {
      return { status: "error", message: forme.error.issues[0]?.message ?? "Proposition invalide." };
    }
  } catch {
    return { status: "error", message: "Proposition illisible." };
  }

  const hh = await headers();
  const ip = ipClient(hh);
  const ua = hh.get("user-agent")?.slice(0, 500) ?? null;
  // Par réseau (/64 en IPv6), comme les autres limites.
  const verdict = await consommer([
    { cle: cleLimite("proposition-plan", "ip", ipPourLimite(hh) ?? "inconnue"), limite: LIMITES.propositionPlanIp },
  ]);
  if (!verdict.ok) return { status: "error", message: messageTropDeTentatives(verdict.reessayerDansSecondes) };

  const db = await clientDuProprietaire(token.etablissementId);
  if (!db) return LIEN_INVALIDE;
  const etablissementId = token.etablissementId;
  const planId = token.objetId;

  let resultat;
  try {
    resultat = await db.$transaction(async (tx) => {
      await verrouillerObjetSigne(tx, "plan_prevention", planId, etablissementId);
      // Relu SOUS LE VERROU : le jeton a pu tomber (une modification du
      // dirigeant le révoque dans sa transaction), le plan être clos.
      const jeton = await tx.accessToken.findUnique({
        where: { id: token.id, etablissementId },
        select: { revoqueLe: true, utiliseLe: true },
      });
      if (!jeton || jeton.revoqueLe || jeton.utiliseLe) return { ok: false as const, reponse: LIEN_INVALIDE };
      const plan = await tx.planPrevention.findFirst({
        where: { id: planId, etablissementId },
        select: {
          statut: true,
          entrepriseExterieureRaison: true,
          entrepriseExterieureSiret: true,
          efChefNom: true,
          efEffectifIntervenant: true,
          lignes: {
            orderBy: { ordre: "asc" },
            select: { id: true, risque: true, mesureEntrepriseUtilisatrice: true, mesureEntrepriseExterieure: true },
          },
          etablissement: { select: { entreprise: { select: { compteId: true } } } },
        },
      });
      if (!plan || !statutPlanSignable(plan.statut)) {
        return { ok: false as const, reponse: { status: "error", message: "Ce plan ne se modifie plus." } as const };
      }
      const lecture = lireProposition(brut, new Set(plan.lignes.map((l) => l.id)));
      if (!lecture.ok) return { ok: false as const, reponse: { status: "error", message: lecture.message } as const };
      if (aucunEcart(ecartsDeLaProposition(plan, lecture.proposition))) {
        return {
          ok: false as const,
          reponse: { status: "error", message: "Votre proposition ne change rien au plan." } as const,
        };
      }
      const h = await calculerHashObjet(tx, "plan_prevention", planId, etablissementId);
      if (!h.ok) return { ok: false as const, reponse: LIEN_INVALIDE };

      await tx.propositionModificationPlan.create({
        data: {
          id: `ppm_${randomUUID()}`,
          etablissementId,
          planPreventionId: planId,
          accessTokenId: token.id,
          hashVersion: h.hash,
          contenu: lecture.proposition,
          ipAddress: ip,
          userAgent: ua,
        },
      });
      const retirees = await retirerSignaturesDuPlan(tx, {
        etablissementId,
        planId,
        motif: MOTIF_REVOCATION_PLAN.proposition,
      });
      return {
        ok: true as const,
        retirees,
        compteId: plan.etablissement.entreprise.compteId,
        entreprise: lecture.proposition.fiche.entrepriseExterieureRaison,
      };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { status: "error", message: "Une proposition attend déjà la réponse de votre interlocuteur." };
    }
    throw e;
  }
  if (!resultat.ok) return resultat.reponse;

  const { retirees, compteId, entreprise } = resultat;
  after(async () => {
    if (compteId) await avertirPropositionRecue(db, { compteId, etablissementId, planId, entreprise });
    await avertirSignaturesRetirees(db, {
      etablissementId,
      planId,
      motif: MOTIF_REVOCATION_PLAN.proposition,
      retirees,
    });
  });
  return { status: "success" };
}
