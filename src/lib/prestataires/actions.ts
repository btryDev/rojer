"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import {
  getStorage,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_ECHEC_ENREGISTREMENT,
  stockageEnService,
} from "@/lib/storage";
import { validerFichier } from "@/lib/rapports/validator";
import { DomainePrestataire } from "@prisma/client";
import {
  prestataireSchema,
  remiseAttestationSchema,
  DOMAINES_PRESTATAIRE,
} from "./schema";
import {
  clePiecePrestataire,
  deletePiecesPrestataire,
  type TypePiecePrestataire,
} from "./storage";

export type PrestataireActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; prestataireId: string };

function extraireDomaines(formData: FormData): DomainePrestataire[] {
  const brut = formData.getAll("domaines").map(String);
  return brut.filter((d): d is DomainePrestataire =>
    (DOMAINES_PRESTATAIRE as readonly string[]).includes(d),
  );
}

export async function creerPrestataire(
  etablissementId: string,
  _prev: PrestataireActionState,
  formData: FormData,
): Promise<PrestataireActionState> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = prestataireSchema.safeParse({
    raisonSociale: formData.get("raisonSociale"),
    siret: formData.get("siret"),
    estOrganismeAgree: formData.get("estOrganismeAgree") === "on",
    domaines: extraireDomaines(formData),
    contactNom: formData.get("contactNom"),
    contactEmail: formData.get("contactEmail"),
    contactTelephone: formData.get("contactTelephone"),
    attestationUrssafValableJusquA: formData.get("attestationUrssafValableJusquA"),
    attestationUrssafRemiseLe: formData.get("attestationUrssafRemiseLe"),
    attestationUrssafEmiseLe: formData.get("attestationUrssafEmiseLe"),
    assuranceRcProValableJusquA: formData.get("assuranceRcProValableJusquA"),
    kbisDateEmission: formData.get("kbisDateEmission"),
    notesInternes: formData.get("notesInternes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prestataireId = `pre_${randomUUID()}`;
  // Le stockage n'est demandé que si une pièce est jointe : un prestataire
  // sans pièce se crée même sur un serveur sans stockage configuré. Une pièce
  // jointe, elle, est refusée avec le motif exact (2026-09-27).
  const storage = stockageEnService() ? getStorage() : null;

  // Upload des pièces éventuelles
  const piecesUploadees: Array<{
    champ: string;
    cle: string;
    nom: string;
  }> = [];

  async function traiterPiece(
    type: TypePiecePrestataire,
    champFormData: string,
    champCle: "attestationUrssafCle" | "assuranceRcProCle" | "kbisCle",
    champNom: "attestationUrssafNom" | "assuranceRcProNom" | "kbisNom",
  ): Promise<
    | { cle: string; nom: string; cleChamp: typeof champCle; nomChamp: typeof champNom }
    | null
    | { error: string }
  > {
    const fichier = formData.get(champFormData);
    if (!(fichier instanceof File) || fichier.size === 0) return null;

    const val = validerFichier(fichier);
    if (!val.ok) return { error: val.erreur };
    if (!storage) return { error: MESSAGE_DEPOT_NON_CONFIGURE };

    const cle = clePiecePrestataire(
      etablissementId,
      prestataireId,
      type,
      fichier.name,
    );
    const buffer = Buffer.from(await fichier.arrayBuffer());
    // Même règle que le dépôt d'un rapport (2026-09-27) : l'échec d'écriture
    // rend un message métier sur le champ ; les pièces déjà écrites sont
    // reprises par l'appelant, rien n'est écrit en base.
    try {
      await storage.put(cle, buffer, val.mime);
    } catch (e) {
      console.error(`[prestataires/depot] écriture du fichier impossible (${cle})`, e);
      return { error: MESSAGE_ECHEC_ENREGISTREMENT };
    }
    piecesUploadees.push({ champ: champCle, cle, nom: fichier.name });
    return { cle, nom: fichier.name, cleChamp: champCle, nomChamp: champNom };
  }

  try {
    const urssaf = await traiterPiece(
      "urssaf",
      "attestationUrssaf",
      "attestationUrssafCle",
      "attestationUrssafNom",
    );
    if (urssaf && "error" in urssaf) {
      await Promise.all(piecesUploadees.map((p) => storage?.delete(p.cle).catch(() => {})));
      return {
        status: "error",
        message: urssaf.error,
        fieldErrors: { attestationUrssaf: [urssaf.error] },
      };
    }

    const rcPro = await traiterPiece(
      "rcpro",
      "assuranceRcPro",
      "assuranceRcProCle",
      "assuranceRcProNom",
    );
    if (rcPro && "error" in rcPro) {
      await Promise.all(piecesUploadees.map((p) => storage?.delete(p.cle).catch(() => {})));
      return {
        status: "error",
        message: rcPro.error,
        fieldErrors: { assuranceRcPro: [rcPro.error] },
      };
    }

    const kbis = await traiterPiece("kbis", "kbis", "kbisCle", "kbisNom");
    if (kbis && "error" in kbis) {
      await Promise.all(piecesUploadees.map((p) => storage?.delete(p.cle).catch(() => {})));
      return {
        status: "error",
        message: kbis.error,
        fieldErrors: { kbis: [kbis.error] },
      };
    }

    await prisma.prestataire.create({
      data: {
        id: prestataireId,
        etablissementId,
        raisonSociale: parsed.data.raisonSociale,
        siret: parsed.data.siret,
        estOrganismeAgree: parsed.data.estOrganismeAgree,
        domaines: parsed.data.domaines,
        contactNom: parsed.data.contactNom,
        contactEmail: parsed.data.contactEmail,
        contactTelephone: parsed.data.contactTelephone,
        attestationUrssafCle: urssaf && !("error" in urssaf) ? urssaf.cle : null,
        attestationUrssafNom: urssaf && !("error" in urssaf) ? urssaf.nom : null,
        attestationUrssafValableJusquA: parsed.data.attestationUrssafValableJusquA,
        attestationUrssafRemiseLe: parsed.data.attestationUrssafRemiseLe,
        attestationUrssafEmiseLe: parsed.data.attestationUrssafEmiseLe,
        assuranceRcProCle: rcPro && !("error" in rcPro) ? rcPro.cle : null,
        assuranceRcProNom: rcPro && !("error" in rcPro) ? rcPro.nom : null,
        assuranceRcProValableJusquA: parsed.data.assuranceRcProValableJusquA,
        kbisCle: kbis && !("error" in kbis) ? kbis.cle : null,
        kbisNom: kbis && !("error" in kbis) ? kbis.nom : null,
        kbisDateEmission: parsed.data.kbisDateEmission,
        notesInternes: parsed.data.notesInternes,
      },
    });
  } catch (err) {
    // Nettoyage best-effort des fichiers uploadés si la création DB a cassé.
    await Promise.all(piecesUploadees.map((p) => storage?.delete(p.cle).catch(() => {})));
    throw err;
  }

  revalidatePath(`/etablissements/${etablissementId}/prestataires`);
  revalidatePath(`/etablissements/${etablissementId}`);

  return { status: "success", prestataireId };
}

export type RemiseAttestationState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success" };

/**
 * Enregistre les deux dates de l'attestation de vigilance (art. D. 8222-5) :
 * remise et émission. Seules ces deux colonnes sont écrites — la pièce, sa
 * validité et le reste de la fiche ne bougent pas. Un champ vidé efface la
 * date : l'écran redit alors « non renseignée ».
 */
export async function enregistrerDatesAttestation(
  etablissementId: string,
  prestataireId: string,
  _prev: RemiseAttestationState,
  formData: FormData,
): Promise<RemiseAttestationState> {
  await assertEtablissementOwnership(etablissementId);

  const parsed = remiseAttestationSchema.safeParse({
    attestationUrssafRemiseLe: formData.get("attestationUrssafRemiseLe"),
    attestationUrssafEmiseLe: formData.get("attestationUrssafEmiseLe"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Dates invalides",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { count } = await prisma.prestataire.updateMany({
    where: { id: prestataireId, etablissementId },
    data: {
      attestationUrssafRemiseLe: parsed.data.attestationUrssafRemiseLe ?? null,
      attestationUrssafEmiseLe: parsed.data.attestationUrssafEmiseLe ?? null,
    },
  });
  if (count === 0) {
    return { status: "error", message: "Prestataire introuvable" };
  }

  revalidatePath(`/etablissements/${etablissementId}/prestataires/${prestataireId}`);
  revalidatePath(`/etablissements/${etablissementId}/prestataires`);
  revalidatePath(`/etablissements/${etablissementId}`);
  return { status: "success" };
}

export async function supprimerPrestataire(
  etablissementId: string,
  prestataireId: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);

  const prestataire = await prisma.prestataire.findFirst({
    where: { id: prestataireId, etablissementId },
    select: {
      id: true,
      attestationUrssafCle: true,
      assuranceRcProCle: true,
      kbisCle: true,
    },
  });
  if (!prestataire) return;

  await prisma.prestataire.delete({ where: { id: prestataire.id } });
  await deletePiecesPrestataire(prestataire);

  revalidatePath(`/etablissements/${etablissementId}/prestataires`);
  revalidatePath(`/etablissements/${etablissementId}`);
  redirect(`/etablissements/${etablissementId}/prestataires`);
}
