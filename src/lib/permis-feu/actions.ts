"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resoudreBatimentOptionnel } from "@/lib/batiments/queries";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { NatureTravauxPointChaud } from "@prisma/client";
import { NATURES_TRAVAUX, permisFeuSchema } from "./schema";
import { nextNumeroPermisFeu } from "./queries";
import { porteUneTraceDeSignature } from "@/lib/signatures/trace";
import { revoquerLiensEnVol } from "@/lib/access-tokens/revocation";

export type PermisFeuActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; permisFeuId: string; numero: number };

function extraireNatures(formData: FormData): NatureTravauxPointChaud[] {
  return formData
    .getAll("naturesTravaux")
    .map(String)
    .filter((n): n is NatureTravauxPointChaud =>
      (NATURES_TRAVAUX as readonly string[]).includes(n),
    );
}

function extraireMesures(formData: FormData): string[] {
  return formData.getAll("mesuresValidees").map(String);
}

export async function creerPermisFeu(
  etablissementId: string,
  _prev: PermisFeuActionState,
  formData: FormData,
): Promise<PermisFeuActionState> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = permisFeuSchema.safeParse({
    prestataireId: formData.get("prestataireId"),
    prestataireRaison: formData.get("prestataireRaison"),
    prestataireContact: formData.get("prestataireContact"),
    prestataireEmail: formData.get("prestataireEmail"),
    donneurOrdreNom: formData.get("donneurOrdreNom"),
    donneurOrdreFonction: formData.get("donneurOrdreFonction"),
    dateDebut: formData.get("dateDebut"),
    dateFin: formData.get("dateFin"),
    lieu: formData.get("lieu"),
    batimentId: formData.get("batimentId"),
    naturesTravaux: extraireNatures(formData),
    descriptionTravaux: formData.get("descriptionTravaux"),
    mesuresValidees: extraireMesures(formData),
    mesuresNotes: formData.get("mesuresNotes"),
    dureeSurveillanceMinutes: formData.get("dureeSurveillanceMinutes"),
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

  const numero = await nextNumeroPermisFeu(etablissementId);
  const id = `pf_${randomUUID()}`;

  const permis = await prisma.permisFeu.create({
    data: {
      id,
      etablissementId,
      numero,
      prestataireId: parsed.data.prestataireId,
      prestataireRaison: parsed.data.prestataireRaison,
      prestataireContact: parsed.data.prestataireContact,
      prestataireEmail: parsed.data.prestataireEmail,
      donneurOrdreNom: parsed.data.donneurOrdreNom,
      donneurOrdreFonction: parsed.data.donneurOrdreFonction,
      dateDebut: parsed.data.dateDebut,
      dateFin: parsed.data.dateFin,
      lieu: parsed.data.lieu,
      batimentId: batiment.id,
      naturesTravaux: parsed.data.naturesTravaux,
      descriptionTravaux: parsed.data.descriptionTravaux,
      mesuresValidees: parsed.data.mesuresValidees,
      mesuresNotes: parsed.data.mesuresNotes,
      dureeSurveillanceMinutes: parsed.data.dureeSurveillanceMinutes,
      statut: "attente_signatures",
    },
  });

  revalidatePath(`/etablissements/${etablissementId}/permis-feu`);
  return { status: "success", permisFeuId: permis.id, numero: permis.numero };
}

export async function marquerEnCours(permisFeuId: string): Promise<void> {
  const permis = await prisma.permisFeu.findUnique({
    where: { id: permisFeuId },
    select: { etablissementId: true },
  });
  if (!permis) return;
  await assertEtablissementOwnership(permis.etablissementId);
  await prisma.permisFeu.update({
    where: { id: permisFeuId },
    data: { statut: "en_cours" },
  });
  revalidatePath(`/etablissements/${permis.etablissementId}/permis-feu/${permisFeuId}`);
}

export async function marquerTermine(permisFeuId: string): Promise<void> {
  const permis = await prisma.permisFeu.findUnique({
    where: { id: permisFeuId },
    select: { etablissementId: true },
  });
  if (!permis) return;
  await assertEtablissementOwnership(permis.etablissementId);
  await prisma.permisFeu.update({
    where: { id: permisFeuId },
    data: { statut: "termine" },
  });
  // Un permis terminé ne se signe plus (`etat-signable.ts`) : ses liens
  // encore ouverts tombent avec lui.
  await revoquerLiensEnVol({
    etablissementId: permis.etablissementId,
    objetType: "permis_feu",
    objetId: permisFeuId,
    motif: "Permis de feu terminé",
  });
  revalidatePath(`/etablissements/${permis.etablissementId}/permis-feu/${permisFeuId}`);
}

export async function supprimerPermisFeu(permisFeuId: string): Promise<void> {
  const permis = await prisma.permisFeu.findUnique({
    where: { id: permisFeuId },
    select: { etablissementId: true, statut: true },
  });
  if (!permis) return;
  await assertEtablissementOwnership(permis.etablissementId);
  // On ne supprime pas un permis déjà signé : on l'annule à la place pour
  // conserver la piste d'audit. LE STATUT NE LE DISAIT PAS : un permis est
  // créé en `attente_signatures` et y reste une fois signé, rien n'écrivant
  // `valide`. Le critère est donc le fait en base — une signature posée ou un
  // lien émis (`porteUneTraceDeSignature`) —, et seul un permis vierge
  // s'efface.
  const etabId = permis.etablissementId;
  const effacable =
    (permis.statut === "attente_signatures" || permis.statut === "brouillon") &&
    !(await porteUneTraceDeSignature("permis_feu", permisFeuId, etabId));
  if (effacable) {
    await prisma.permisFeu.delete({ where: { id: permisFeuId } });
  } else {
    await prisma.permisFeu.update({
      where: { id: permisFeuId },
      data: { statut: "annule" },
    });
  }
  await revoquerLiensEnVol({
    etablissementId: etabId,
    objetType: "permis_feu",
    objetId: permisFeuId,
    motif: effacable ? "Permis de feu supprimé" : "Permis de feu annulé",
  });
  revalidatePath(`/etablissements/${etabId}/permis-feu`);
  redirect(`/etablissements/${etabId}/permis-feu`);
}
