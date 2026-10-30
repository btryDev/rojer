"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { HandicapAccessible } from "@prisma/client";
import {
  HANDICAPS,
  genererSlug,
  slugLibre,
  section1Schema,
  section2Schema,
  section3Schema,
  section4Schema,
} from "./schema";

export type RegistreActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; section: 1 | 2 | 3 | 4 | "publie" };

async function obtenirOuCreer(etablissementId: string) {
  const existant = await prisma.registreAccessibilite.findUnique({
    where: { etablissementId },
  });
  if (existant) return existant;

  const etab = await prisma.etablissement.findUnique({
    where: { id: etablissementId },
    select: {
      raisonDisplay: true,
      siret: true,
    },
  });
  if (!etab) throw new Error("Établissement introuvable");

  const base = genererSlug(etab.raisonDisplay, etab.siret);
  const pris = await prisma.registreAccessibilite.findMany({
    where: { slugPublic: { startsWith: base } },
    select: { slugPublic: true },
  });
  return prisma.registreAccessibilite.create({
    data: {
      id: `reg_${randomUUID()}`,
      etablissementId,
      slugPublic: slugLibre(base, pris.map((r) => r.slugPublic)),
    },
  });
}

function extraireHandicaps(formData: FormData): HandicapAccessible[] {
  return formData
    .getAll("handicapsAccueillis")
    .map(String)
    .filter((h): h is HandicapAccessible =>
      (HANDICAPS as readonly string[]).includes(h),
    );
}

export async function sauverSection1(
  etablissementId: string,
  _prev: RegistreActionState,
  formData: FormData,
): Promise<RegistreActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const parsed = section1Schema.safeParse({
    prestationsFournies: formData.get("prestationsFournies"),
    handicapsAccueillis: extraireHandicaps(formData),
    servicesAdaptes: formData.get("servicesAdaptes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const r = await obtenirOuCreer(etablissementId);
  await db.registreAccessibilite.update({
    where: { id: r.id },
    data: parsed.data,
  });
  revalidatePath(`/etablissements/${etablissementId}/accessibilite`);
  return { status: "success", section: 1 };
}

export async function sauverSection2(
  etablissementId: string,
  _prev: RegistreActionState,
  formData: FormData,
): Promise<RegistreActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const parsed = section2Schema.safeParse({
    conformiteRegime: formData.get("conformiteRegime"),
    dateConformite: formData.get("dateConformite"),
    numeroAttestationAccess: formData.get("numeroAttestationAccess"),
    dateDepotAdap: formData.get("dateDepotAdap"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const r = await obtenirOuCreer(etablissementId);
  await db.registreAccessibilite.update({
    where: { id: r.id },
    data: parsed.data,
  });
  revalidatePath(`/etablissements/${etablissementId}/accessibilite`);
  return { status: "success", section: 2 };
}

export async function sauverSection3(
  etablissementId: string,
  _prev: RegistreActionState,
  formData: FormData,
): Promise<RegistreActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const parsed = section3Schema.safeParse({
    personnelForme: formData.get("personnelForme") === "on",
    dateDerniereFormation: formData.get("dateDerniereFormation"),
    organismeFormation: formData.get("organismeFormation"),
    effectifForme: formData.get("effectifForme"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const r = await obtenirOuCreer(etablissementId);
  await db.registreAccessibilite.update({
    where: { id: r.id },
    data: parsed.data,
  });
  revalidatePath(`/etablissements/${etablissementId}/accessibilite`);
  return { status: "success", section: 3 };
}

export async function sauverSection4(
  etablissementId: string,
  _prev: RegistreActionState,
  formData: FormData,
): Promise<RegistreActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const parsed = section4Schema.safeParse({
    equipementsAccessibilite: formData.get("equipementsAccessibilite"),
    modalitesMaintenance: formData.get("modalitesMaintenance"),
    dernierControleMaintenance: formData.get("dernierControleMaintenance"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const r = await obtenirOuCreer(etablissementId);
  await db.registreAccessibilite.update({
    where: { id: r.id },
    data: parsed.data,
  });
  revalidatePath(`/etablissements/${etablissementId}/accessibilite`);
  return { status: "success", section: 4 };
}

/**
 * Publie le registre : rend accessible l'URL publique `/accessibilite/[slug]`.
 * On ne bloque pas sur un champ manquant pour rester pédagogique, mais on
 * alerte si le contenu minimal n'est pas renseigné.
 */
export async function publierRegistre(
  etablissementId: string,
): Promise<RegistreActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const r = await obtenirOuCreer(etablissementId);

  const manque: string[] = [];
  if (!r.prestationsFournies) manque.push("prestations");
  if (!r.conformiteRegime) manque.push("régime de conformité");
  if (manque.length > 0) {
    return {
      status: "error",
      message: `Champs manquants pour publier : ${manque.join(", ")}.`,
    };
  }

  await db.registreAccessibilite.update({
    where: { id: r.id },
    data: { publie: true, publieLe: new Date() },
  });
  revalidatePath(`/etablissements/${etablissementId}/accessibilite`);
  revalidatePath(`/accessibilite/${r.slugPublic}`);
  return { status: "success", section: "publie" };
}

export async function depublierRegistre(
  etablissementId: string,
): Promise<void> {
  const { db } = await assertEtablissementDuCompte(etablissementId);
  const r = await db.registreAccessibilite.findUnique({
    where: { etablissementId },
  });
  if (!r) return;
  await db.registreAccessibilite.update({
    where: { id: r.id },
    data: { publie: false, publieLe: null },
  });
  revalidatePath(`/etablissements/${etablissementId}/accessibilite`);
  revalidatePath(`/accessibilite/${r.slugPublic}`);
}
