"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { depuisCleJourCivil, formaterDateFr } from "@/lib/dates";
import { validerPrescription } from "./schema";
import {
  compterLignesAvecPreuve as compterPreuves,
  lignesVisees,
  SELECT_LIGNE_VISEE,
  versLigneVisee,
  type PrescriptionAPreuver,
} from "./preuves";

/**
 * Prescriptions particulières (ADR-035) — création, levée, suppression.
 *
 * Toute mutation relance `genererCalendrier` : c'est le générateur qui
 * applique (ou ignore, avec raison) la prescription, jamais cette action.
 */

export type PrescriptionActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success"; prescriptionId: string };

function normaliser(fd: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(fd);
  return {
    ...raw,
    realisateurRequis: fd.getAll("realisateurRequis").map(String),
  };
}

export async function creerPrescription(
  etablissementId: string,
  _prev: PrescriptionActionState,
  formData: FormData,
): Promise<PrescriptionActionState> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = validerPrescription(normaliser(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  // Un équipement visé doit appartenir à l'établissement.
  if (d.equipementId) {
    const eq = await prisma.equipement.findFirst({
      where: { id: d.equipementId, etablissementId },
      select: { id: true },
    });
    if (!eq) {
      return {
        status: "error",
        message: "Formulaire invalide",
        fieldErrors: { equipementId: ["Équipement inconnu"] },
      };
    }
  }

  const commun = {
    etablissementId,
    source: d.source,
    reference: d.reference,
    autorite: d.autorite ?? null,
    dateDocument: depuisCleJourCivil(d.dateDocument),
    dateFin: d.dateFin ? depuisCleJourCivil(d.dateFin) : null,
    periodicite: d.periodicite,
    equipementId: d.equipementId ?? null,
  } satisfies Partial<Prisma.PrescriptionParticuliereUncheckedCreateInput>;

  const data: Prisma.PrescriptionParticuliereUncheckedCreateInput =
    d.effet === "renforce_periodicite"
      ? {
          ...commun,
          effet: "renforce_periodicite",
          obligationId: d.obligationId,
          realisateurRequis: [],
        }
      : {
          ...commun,
          effet: "obligation_sur_mesure",
          libelle: d.libelle,
          description: d.description ?? null,
          realisateurRequis: d.realisateurRequis,
          categorieEquipement: d.categorieEquipement ?? null,
        };

  const p = await prisma.prescriptionParticuliere.create({
    data,
    select: { id: true },
  });

  await regenererApresMutation(etablissementId, "prescriptions");
  revalidatePath(`/etablissements/${etablissementId}/prescriptions`);
  revalidatePath(`/etablissements/${etablissementId}`);
  return { status: "success", prescriptionId: p.id };
}

/**
 * Nombre de lignes VISÉES par cette prescription qui portent une preuve faite
 * SOUS l'acte (`prescriptions/preuves.ts`, où vit la règle et son pourquoi).
 * Plus par `Verification.prescriptionId`, que la régénération pose et retire au
 * gré de l'effet de la prescription, pas de l'histoire (2026-09-15).
 */
async function compterLignesAvecPreuve(
  etablissementId: string,
  p: PrescriptionAPreuver,
): Promise<number> {
  const where = lignesVisees(etablissementId, p);
  if (where === null) return 0;
  const lignes = await prisma.verification.findMany({
    where,
    select: SELECT_LIGNE_VISEE,
  });
  return compterPreuves(p, lignes.map(versLigneVisee));
}

/**
 * Lève une prescription à une date : elle cesse de produire effet mais reste
 * dans l'historique. C'est la voie normale de sortie — un arrêté rapporté ou
 * une mise en demeure levée ne s'effacent pas, ils cessent.
 */
export async function leverPrescription(
  etablissementId: string,
  prescriptionId: string,
  _prev: PrescriptionActionState,
  formData: FormData,
): Promise<PrescriptionActionState> {
  await assertEtablissementOwnership(etablissementId);

  const brut = formData.get("dateFin");
  const dateFin = typeof brut === "string" ? brut.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFin)) {
    return {
      status: "error",
      message: "Date de levée attendue au format AAAA-MM-JJ.",
    };
  }

  const existante = await prisma.prescriptionParticuliere.findFirst({
    where: { id: prescriptionId, etablissementId },
    select: { dateDocument: true },
  });
  if (!existante) {
    return { status: "error", message: "Prescription introuvable." };
  }

  // Une levée antérieure à l'acte lui-même n'a pas de sens et produirait une
  // prescription qui n'a jamais eu d'effet, sans que rien ne le dise.
  const date = depuisCleJourCivil(dateFin);
  if (date.getTime() < existante.dateDocument.getTime()) {
    return {
      status: "error",
      message: "La levée ne peut pas précéder la date de l'acte.",
    };
  }

  await prisma.prescriptionParticuliere.update({
    where: { id: prescriptionId, etablissementId },
    data: { dateFin: date },
  });
  await regenererApresMutation(etablissementId, "prescriptions");
  revalidatePath(`/etablissements/${etablissementId}/prescriptions`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  return { status: "success", prescriptionId };
}

/** Annule une levée : la prescription reprend effet. */
export async function reactiverPrescription(
  etablissementId: string,
  prescriptionId: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);
  await prisma.prescriptionParticuliere.update({
    where: { id: prescriptionId, etablissementId },
    data: { dateFin: null, actif: true },
  });
  await regenererApresMutation(etablissementId, "prescriptions");
  revalidatePath(`/etablissements/${etablissementId}/prescriptions`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
}

/**
 * Suppression physique — réservée à la prescription saisie par erreur, qui
 * n'a encore rien produit de probant.
 *
 * Le refus n'est pas décoratif : `Verification.prescriptionId` est en
 * `ON DELETE SET NULL`, donc supprimer une prescription qui a produit des
 * lignes porteuses de preuve laisserait ces lignes en place sans que plus
 * rien ne dise de quel acte elles venaient. La preuve survivrait à sa
 * justification. Dans ce cas, c'est la levée qu'il faut employer.
 */
export async function supprimerPrescription(
  etablissementId: string,
  prescriptionId: string,
): Promise<PrescriptionActionState> {
  await assertEtablissementOwnership(etablissementId);

  // (Une garde « prescription levée » a vécu ici quelques heures, le
  // 2026-09-15 : elle rattrapait un compte fondé sur `prescriptionId`, que la
  // levée remettait à zéro. Elle créait une impasse — une saisie erronée sur
  // une ligne déjà contrôlée ne se supprimait ni active, ni levée. Le compte
  // par cible et par date de l'acte ne dépend plus de l'effet : il suffit.)
  const existante = await prisma.prescriptionParticuliere.findFirst({
    where: { id: prescriptionId, etablissementId },
    select: {
      id: true,
      effet: true,
      obligationId: true,
      equipementId: true,
      dateDocument: true,
    },
  });
  if (!existante) {
    return { status: "error", message: "Prescription introuvable." };
  }

  const avecPreuve = await compterLignesAvecPreuve(etablissementId, existante);
  if (avecPreuve > 0) {
    const pluriel = avecPreuve > 1;
    const preuve =
      existante.effet === "obligation_sur_mesure"
        ? "un rapport, une action corrective ou un contrôle enregistré"
        : `un rapport daté du ${formaterDateFr(existante.dateDocument)} ou après`;
    return {
      status: "error",
      message:
        `Suppression refusée : ${avecPreuve} vérification${pluriel ? "s" : ""} ` +
        `visée${pluriel ? "s" : ""} par cette prescription porte${pluriel ? "nt" : ""} ` +
        `${preuve}, fait sous l'acte. Ces contrôles restent justifiés par lui : ` +
        "la prescription reste au dossier. Pour arrêter son effet, levez-la.",
    };
  }

  await prisma.prescriptionParticuliere.delete({
    where: { id: prescriptionId, etablissementId },
  });
  await regenererApresMutation(etablissementId, "prescriptions");
  revalidatePath(`/etablissements/${etablissementId}/prescriptions`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  return { status: "success", prescriptionId };
}
