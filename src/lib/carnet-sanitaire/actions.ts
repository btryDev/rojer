"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { resoudreBatimentOptionnel } from "@/lib/batiments/queries";
import { getStorage, cleRapport } from "@/lib/storage";
import { validerFichier } from "@/lib/rapports/validator";
import {
  analyseLegionelleSchema,
  estReleveConforme,
  pointReleveSchema,
  releveTemperatureSchema,
  resultatAnalyse,
} from "./schema";

export type CarnetActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success" };

async function obtenirOuCreerCarnet(etablissementId: string) {
  const existant = await prisma.carnetSanitaire.findUnique({
    where: { etablissementId },
  });
  if (existant) return existant;
  return prisma.carnetSanitaire.create({
    data: {
      id: `cs_${randomUUID()}`,
      etablissementId,
    },
  });
}

export async function creerPointReleve(
  etablissementId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = pointReleveSchema.safeParse({
    nom: formData.get("nom"),
    localisation: formData.get("localisation"),
    batimentId: formData.get("batimentId"),
    typeReseau: formData.get("typeReseau"),
    seuilMinCelsius: formData.get("seuilMinCelsius"),
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
  const carnet = await obtenirOuCreerCarnet(etablissementId);
  await prisma.pointReleve.create({
    data: {
      id: `pt_${randomUUID()}`,
      carnetId: carnet.id,
      ...parsed.data,
      batimentId: batiment.id,
    },
  });
  revalidatePath(`/etablissements/${etablissementId}/carnet-sanitaire`);
  return { status: "success" };
}

export async function supprimerPointReleve(
  etablissementId: string,
  pointId: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);
  // Soft delete : on garde les relevés historiques, on désactive le point.
  //
  // Le point est désactivé *via* son carnet : `assertEtablissementOwnership`
  // ne dit que « cet établissement est à moi », il ne dit rien du point de
  // relevé, dont l'identifiant vient du client. Sans le filtre de relation,
  // un utilisateur authentifié pouvait passer son propre établissement et
  // l'identifiant du point d'un tiers. `ajouterReleve`, juste dessous, fait
  // déjà ce rapprochement.
  const { count } = await prisma.pointReleve.updateMany({
    where: { id: pointId, carnet: { etablissementId } },
    data: { actif: false },
  });
  if (count === 0) throw new Error("Point de relevé introuvable");
  revalidatePath(`/etablissements/${etablissementId}/carnet-sanitaire`);
}

export async function ajouterReleve(
  etablissementId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = releveTemperatureSchema.safeParse({
    pointReleveId: formData.get("pointReleveId"),
    dateReleve: formData.get("dateReleve"),
    temperatureCelsius: formData.get("temperatureCelsius"),
    operateur: formData.get("operateur"),
    commentaire: formData.get("commentaire"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const point = await prisma.pointReleve.findUnique({
    where: { id: parsed.data.pointReleveId },
    select: { seuilMinCelsius: true, typeReseau: true, carnet: { select: { etablissementId: true } } },
  });
  if (!point || point.carnet.etablissementId !== etablissementId) {
    return { status: "error", message: "Point de relevé introuvable" };
  }
  const conforme = estReleveConforme(
    parsed.data.temperatureCelsius,
    point.seuilMinCelsius,
    point.typeReseau,
  );
  await prisma.releveTemperature.create({
    data: {
      id: `rel_${randomUUID()}`,
      pointReleveId: parsed.data.pointReleveId,
      dateReleve: parsed.data.dateReleve,
      temperatureCelsius: parsed.data.temperatureCelsius,
      conforme,
      operateur: parsed.data.operateur,
      commentaire: parsed.data.commentaire,
    },
  });
  revalidatePath(`/etablissements/${etablissementId}/carnet-sanitaire`);
  return { status: "success" };
}

export async function ajouterAnalyseLegionelle(
  etablissementId: string,
  _prev: CarnetActionState,
  formData: FormData,
): Promise<CarnetActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = analyseLegionelleSchema.safeParse({
    dateAnalyse: formData.get("dateAnalyse"),
    laboratoire: formData.get("laboratoire"),
    valeurUfcParL: formData.get("valeurUfcParL"),
    commentaire: formData.get("commentaire"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const carnet = await obtenirOuCreerCarnet(etablissementId);

  // Upload optionnel du rapport labo.
  let rapportCle: string | null = null;
  let rapportNom: string | null = null;
  const fichier = formData.get("rapport");
  if (fichier instanceof File && fichier.size > 0) {
    const val = validerFichier(fichier);
    if (!val.ok) {
      return { status: "error", message: val.erreur };
    }
    const id = randomUUID();
    const cle = cleRapport(etablissementId, `legio_${id}`, fichier.name);
    const buffer = Buffer.from(await fichier.arrayBuffer());
    await getStorage().put(cle, buffer, val.mime);
    rapportCle = cle;
    rapportNom = fichier.name;
  }

  // ~~`valeurUfcParL === undefined ||`~~ : une analyse sans valeur n'est pas
  // conforme (relecture du 2026-09-26). La colonne n'est plus lue pour
  // l'affichage — `resultatAnalyse` lit la valeur — mais elle ne doit plus
  // affirmer ce que personne n'a saisi.
  const conforme = resultatAnalyse(parsed.data.valeurUfcParL) === "sous_limite";

  // Le fichier est déjà sur le disque : si l'insert échoue, il faut le
  // reprendre, sinon le stockage accumule des rapports que plus aucune ligne
  // ne référence. Même nettoyage best-effort que les trois autres modules
  // d'upload (rapports, prestataires).
  try {
    await prisma.analyseLegionelle.create({
      data: {
        id: `ana_${randomUUID()}`,
        carnetId: carnet.id,
        dateAnalyse: parsed.data.dateAnalyse,
        laboratoire: parsed.data.laboratoire,
        valeurUfcParL: parsed.data.valeurUfcParL,
        conforme,
        rapportCle,
        rapportNom,
        commentaire: parsed.data.commentaire,
      },
    });
  } catch (e) {
    if (rapportCle) {
      await getStorage().delete(rapportCle).catch(() => {});
    }
    throw e;
  }
  revalidatePath(`/etablissements/${etablissementId}/carnet-sanitaire`);
  return { status: "success" };
}
