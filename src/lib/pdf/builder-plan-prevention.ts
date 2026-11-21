import "server-only";
import type { Prisma } from "@prisma/client";
import { diagnostiquerPlan } from "@/lib/plan-prevention/schema";
import { LIEN_PARTI } from "@/lib/access-tokens/revocation";
import { publicAppUrl, refusUrlPublique } from "@/lib/url-publique";
import type { PlanPreventionData } from "./PlanPreventionDocument";

/**
 * Les données du PDF d'un plan de prévention (2026-11-19, ADR-061 § 7).
 *
 * **Contrat d'appel** : `db` est le client borné au compte de l'appelant
 * (session : `requireEtablissement` ; signature par lien : le compte
 * propriétaire du jeton, ADR-051), et l'établissement en vient. Le plan est
 * cherché DANS cet établissement : un identifiant d'autrui rend `null`, donc
 * 404 à la route.
 *
 * Les projections sont des `select` explicites, comme `contenuASigner` : un
 * champ ajouté au modèle n'entre pas dans le PDF sans qu'on l'ait décidé.
 * Seules les signatures en vigueur sont lues (`active: true`, ADR-061).
 */
export async function construirePlanPreventionData(
  db: Prisma.TransactionClient,
  etablissementId: string,
  planId: string,
  maintenant: Date = new Date(),
): Promise<PlanPreventionData | null> {
  if (!planId || !etablissementId) return null;
  const [etab, plan, signatures] = await Promise.all([
    db.etablissement.findFirst({
      where: { id: etablissementId },
      select: {
        raisonDisplay: true,
        adresse: true,
        siret: true,
        entreprise: { select: { raisonSociale: true } },
      },
    }),
    db.planPrevention.findFirst({
      where: { id: planId, etablissementId },
      select: {
        numero: true,
        statut: true,
        entrepriseExterieureRaison: true,
        entrepriseExterieureSiret: true,
        efChefNom: true,
        efEffectifIntervenant: true,
        euChefNom: true,
        euChefFonction: true,
        dateDebut: true,
        dateFin: true,
        dureeHeuresEstimee: true,
        heuresPrevisiblesRevisees: true,
        heuresPrevisiblesReviseesLe: true,
        lieux: true,
        naturesTravaux: true,
        travauxDangereux: true,
        inspectionDate: true,
        inspectionParticipants: true,
        lignes: {
          orderBy: { ordre: "asc" },
          select: {
            risque: true,
            mesureEntrepriseUtilisatrice: true,
            mesureEntrepriseExterieure: true,
          },
        },
        phasesDangereuses: {
          orderBy: { ordre: "asc" },
          select: { phase: true, moyensPrevention: true },
        },
        adaptationMateriels: true,
        instructionsTravailleurs: true,
        organisationSecours: true,
        participationCroisee: true,
      },
    }),
    db.signature.findMany({
      where: { etablissementId, objetType: "plan_prevention", objetId: planId, active: true },
      orderBy: { horodatageIso: "asc" },
      select: {
        id: true,
        partie: true,
        signataireNom: true,
        signataireRole: true,
        horodatageIso: true,
        methode: true,
        hashDocument: true,
        active: true,
      },
    }),
  ]);
  if (!etab || !plan) return null;
  // « Brouillon » tant que rien n'est parti ni signé (2026-11-19) : la même
  // lecture que la fiche, les liens dont l'e-mail est parti.
  const lienOuSignature =
    signatures.length > 0 ||
    (await db.accessToken.count({
      where: { etablissementId, objetType: "plan_prevention", objetId: planId, scope: "signature", ...LIEN_PARTI },
    })) > 0;

  const { numero, statut, ...contenu } = plan;
  return {
    numero,
    statut,
    lienOuSignature,
    entreprise: etab.entreprise.raisonSociale,
    etablissement: etab.raisonDisplay,
    adresse: etab.adresse,
    siretEtablissement: etab.siret,
    genereLe: maintenant,
    // Sans adresse publique configurée, le PDF donne le chemin seul plutôt
    // que de refuser d'être produit.
    urlPublique: refusUrlPublique() === null ? publicAppUrl() : null,
    raisonsEcrit: diagnostiquerPlan(plan).raisons,
    plan: contenu,
    signatures,
  };
}
