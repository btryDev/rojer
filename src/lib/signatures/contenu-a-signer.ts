import { prisma } from "@/lib/prisma";
import { formaterDateFr } from "@/lib/dates";

/**
 * Ce que le porteur d'un lien de signature a sous les yeux avant de signer.
 *
 * **Ce module n'est volontairement pas `"use server"`** (voir
 * `./appartenance.ts`) : exporté comme server action, il rendrait le contenu
 * d'un plan sur simple identifiant.
 *
 * ── Pourquoi ─────────────────────────────────────────────────────────────
 *
 * La page `/acces/[token]` ne savait nommer qu'un rapport de vérification. Un
 * plan de prévention ou un permis de feu retombait sur « Document à signer —
 * Référence interne : <id> » : le chef d'entreprise extérieure signait une
 * empreinte SHA-256 de quelque chose qu'on ne lui montrait pas.
 *
 * ── Ce qui est montré, et ce qui ne l'est pas (décision) ─────────────────
 *
 * Le signataire voit **ce que sa signature scelle** — les champs que
 * `calculerHashObjet` fait entrer dans l'empreinte (`./hash-objet.ts`) —,
 * parce qu'il s'engage sur eux. Pour un plan : les deux entreprises, la
 * période et la durée, les lieux, la nature des travaux, l'inspection
 * commune, les risques d'interférence avec les mesures de chaque partie, et
 * les cinq rubriques de `R. 4512-8`. Pour un permis de feu : l'intervenant,
 * le donneur d'ordre, la période, le lieu, les natures et la description des
 * travaux, les mesures de prévention retenues et la surveillance.
 *
 * **Une seule exclusion parmi les champs scellés : l'adresse électronique
 * d'un tiers** — celle du chef de l'entreprise extérieure (plan) ou du
 * technicien (permis). Le lien peut aller au donneur d'ordre, qui n'a pas à
 * la lire ici, et le destinataire du lien, lui, connaît la sienne. Rien
 * d'autre ne sort : ni statut, ni zone, ni fiche prestataire, ni identifiant.
 *
 * ── Le périmètre ─────────────────────────────────────────────────────────
 *
 * `etablissementId` est obligatoire et vient du jeton, jamais de l'URL : c'est
 * par une lecture non bornée que cette page a déjà laissé fuir le rapport
 * d'un autre client. Un objet hors du périmètre rend `null`, comme un type
 * qu'on ne sait pas encore montrer.
 *
 * Les projections sont des `select` explicites : un champ ajouté au modèle
 * n'apparaît pas ici sans qu'on l'ait décidé.
 */

export type ContenuPlanASigner = {
  type: "plan_prevention";
  numero: number;
  entrepriseExterieureRaison: string;
  entrepriseExterieureSiret: string | null;
  efChefNom: string;
  efEffectifIntervenant: number;
  euChefNom: string;
  euChefFonction: string | null;
  dateDebut: Date;
  dateFin: Date;
  dureeHeuresEstimee: number | null;
  lieux: string;
  naturesTravaux: string;
  travauxDangereux: boolean;
  inspectionDate: Date | null;
  inspectionParticipants: string | null;
  lignes: {
    ordre: number;
    risque: string;
    mesureEntrepriseUtilisatrice: string | null;
    mesureEntrepriseExterieure: string | null;
  }[];
  phasesDangereuses: {
    ordre: number;
    phase: string;
    moyensPrevention: string | null;
  }[];
  adaptationMateriels: string | null;
  instructionsTravailleurs: string | null;
  organisationSecours: string | null;
  participationCroisee: string | null;
};

export type ContenuPermisASigner = {
  type: "permis_feu";
  numero: number;
  prestataireRaison: string;
  prestataireContact: string;
  donneurOrdreNom: string;
  donneurOrdreFonction: string | null;
  dateDebut: Date;
  dateFin: Date;
  lieu: string;
  naturesTravaux: string[];
  descriptionTravaux: string;
  mesuresValidees: string[];
  mesuresNotes: string | null;
  dureeSurveillanceMinutes: number;
  /**
   * AFFICHAGE SEUL, hors de l'empreinte (`hash-objet.ts` a son propre
   * `select`, sans lui) : sert à dire qu'un permis ancien sans mesure cochée
   * a été établi sur une liste antérieure (vérification du 2026-09-26).
   */
  createdAt: Date;
};

export type ContenuRapportASigner = {
  type: "rapport_verification";
  titre: string;
  description: string;
};

export type ContenuASigner =
  | ContenuPlanASigner
  | ContenuPermisASigner
  | ContenuRapportASigner;

export async function contenuASigner(
  objetType: string,
  objetId: string,
  etablissementId: string,
): Promise<ContenuASigner | null> {
  if (!objetId || !etablissementId) return null;

  if (objetType === "rapport_verification") {
    const r = await prisma.rapportVerification.findFirst({
      where: { id: objetId, etablissementId },
      select: {
        fichierNomOriginal: true,
        dateRapport: true,
        verification: { select: { libelleObligation: true } },
      },
    });
    if (!r) return null;
    return {
      type: "rapport_verification",
      titre: r.verification.libelleObligation,
      description: `Rapport du ${formaterDateFr(r.dateRapport)} — fichier « ${r.fichierNomOriginal} ».`,
    };
  }

  if (objetType === "plan_prevention") {
    const p = await prisma.planPrevention.findFirst({
      where: { id: objetId, etablissementId },
      select: {
        numero: true,
        entrepriseExterieureRaison: true,
        entrepriseExterieureSiret: true,
        efChefNom: true,
        efEffectifIntervenant: true,
        euChefNom: true,
        euChefFonction: true,
        dateDebut: true,
        dateFin: true,
        dureeHeuresEstimee: true,
        lieux: true,
        naturesTravaux: true,
        travauxDangereux: true,
        inspectionDate: true,
        inspectionParticipants: true,
        lignes: {
          orderBy: { ordre: "asc" },
          select: {
            ordre: true,
            risque: true,
            mesureEntrepriseUtilisatrice: true,
            mesureEntrepriseExterieure: true,
          },
        },
        phasesDangereuses: {
          orderBy: { ordre: "asc" },
          select: { ordre: true, phase: true, moyensPrevention: true },
        },
        adaptationMateriels: true,
        instructionsTravailleurs: true,
        organisationSecours: true,
        participationCroisee: true,
      },
    });
    if (!p) return null;
    return { type: "plan_prevention", ...p };
  }

  if (objetType === "permis_feu") {
    const p = await prisma.permisFeu.findFirst({
      where: { id: objetId, etablissementId },
      select: {
        numero: true,
        prestataireRaison: true,
        prestataireContact: true,
        donneurOrdreNom: true,
        donneurOrdreFonction: true,
        dateDebut: true,
        dateFin: true,
        lieu: true,
        naturesTravaux: true,
        descriptionTravaux: true,
        mesuresValidees: true,
        mesuresNotes: true,
        dureeSurveillanceMinutes: true,
        createdAt: true,
      },
    });
    if (!p) return null;
    return { type: "permis_feu", ...p };
  }

  return null;
}
