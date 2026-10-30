"use server";

import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import {
  getStorage,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_ECHEC_ENREGISTREMENT,
  stockageEnService,
} from "@/lib/storage";
import { validerFichier } from "@/lib/rapports/validator";
import { libererFichiers } from "@/lib/suppression/fichiers";
import type { DomainePrestataire } from "@prisma/client";
import {
  prestataireSchema,
  remiseAttestationSchema,
  DOMAINES_PRESTATAIRE,
  type PrestataireInput,
} from "./schema";
import {
  clePiecePrestataire,
  deletePiecesPrestataire,
  type TypePiecePrestataire,
} from "./storage";
import { estSiretEnDouble, MESSAGE_SIRET_EN_DOUBLE } from "./siret-en-double";
import { piecesRemplacees } from "./pieces";

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

/**
 * La saisie du formulaire de fiche, lue par la création ET la modification :
 * un seul schéma, un seul relevé des champs (2026-10-12).
 */
function lireSaisie(formData: FormData) {
  return prestataireSchema.safeParse({
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
}

/** Les trois pièces : le champ du formulaire, et leurs deux colonnes. */
const CHAMPS_PIECES = [
  { type: "urssaf", champ: "attestationUrssaf", cle: "attestationUrssafCle", nom: "attestationUrssafNom" },
  { type: "rcpro", champ: "assuranceRcPro", cle: "assuranceRcProCle", nom: "assuranceRcProNom" },
  { type: "kbis", champ: "kbis", cle: "kbisCle", nom: "kbisNom" },
] as const satisfies readonly { type: TypePiecePrestataire; champ: string; cle: string; nom: string }[];

type ColonnePiece =
  | (typeof CHAMPS_PIECES)[number]["cle"]
  | (typeof CHAMPS_PIECES)[number]["nom"];

/**
 * Écrit au stockage les pièces jointes au formulaire — aucune, une, deux ou
 * trois. Une pièce absente du formulaire n'est pas touchée : c'est ce qui
 * permet à « Modifier » de remplacer une seule pièce sans effacer les autres.
 *
 * Le stockage n'est demandé que si une pièce est jointe : un prestataire
 * sans pièce se crée même sur un serveur sans stockage configuré. Une pièce
 * jointe, elle, est refusée avec le motif exact, sur son champ (2026-09-27).
 * En cas de refus, les pièces déjà écrites par cet appel sont reprises, et
 * l'appelant n'écrit rien en base.
 */
async function deposerPieces(
  etablissementId: string,
  prestataireId: string,
  formData: FormData,
): Promise<
  | { ok: true; colonnes: Partial<Record<ColonnePiece, string>>; cles: string[] }
  | { ok: false; champ: string; message: string }
> {
  const storage = stockageEnService() ? getStorage() : null;
  const colonnes: Partial<Record<ColonnePiece, string>> = {};
  const cles: string[] = [];
  for (const piece of CHAMPS_PIECES) {
    const fichier = formData.get(piece.champ);
    if (!(fichier instanceof File) || fichier.size === 0) continue;

    const val = await validerFichier(fichier);
    let erreur: string | null = null;
    if (!val.ok) erreur = val.erreur;
    else if (!storage) erreur = MESSAGE_DEPOT_NON_CONFIGURE;
    else {
      const cle = clePiecePrestataire(etablissementId, prestataireId, piece.type, fichier.name);
      // Même règle que le dépôt d'un rapport (2026-09-27) : l'échec
      // d'écriture rend un message métier sur le champ.
      try {
        await storage.put(cle, Buffer.from(await fichier.arrayBuffer()), val.mime);
        cles.push(cle);
        colonnes[piece.cle] = cle;
        colonnes[piece.nom] = fichier.name;
      } catch (e) {
        console.error(`[prestataires/depot] écriture du fichier impossible (${cle})`, e);
        erreur = MESSAGE_ECHEC_ENREGISTREMENT;
      }
    }
    if (erreur) {
      await Promise.all(cles.map((c) => storage?.delete(c).catch(() => {})));
      return { ok: false, champ: piece.champ, message: erreur };
    }
  }
  return { ok: true, colonnes, cles };
}

/** Les colonnes de la fiche tirées de la saisie. Un champ facultatif vidé
 *  s'écrit `null` : en modification, il EFFACE la valeur — un `undefined`
 *  laisserait Prisma garder l'ancienne. */
function colonnesDeLaSaisie(d: PrestataireInput) {
  return {
    raisonSociale: d.raisonSociale,
    siret: d.siret ?? null,
    estOrganismeAgree: d.estOrganismeAgree,
    domaines: d.domaines,
    contactNom: d.contactNom,
    contactEmail: d.contactEmail,
    contactTelephone: d.contactTelephone ?? null,
    attestationUrssafValableJusquA: d.attestationUrssafValableJusquA ?? null,
    attestationUrssafRemiseLe: d.attestationUrssafRemiseLe ?? null,
    attestationUrssafEmiseLe: d.attestationUrssafEmiseLe ?? null,
    assuranceRcProValableJusquA: d.assuranceRcProValableJusquA ?? null,
    kbisDateEmission: d.kbisDateEmission ?? null,
    notesInternes: d.notesInternes ?? null,
  };
}

/** SIRET déjà présent dans l'annuaire de l'établissement : le message sur le
 *  champ. Avant le 2026-10-12, la violation de `@@unique([etablissementId,
 *  siret])` remontait telle quelle — page d'erreur générique, saisie perdue. */
const erreurSiret = (): PrestataireActionState => ({
  status: "error",
  message: MESSAGE_SIRET_EN_DOUBLE,
  fieldErrors: { siret: [MESSAGE_SIRET_EN_DOUBLE] },
});

export async function creerPrestataire(
  etablissementId: string,
  _prev: PrestataireActionState,
  formData: FormData,
): Promise<PrestataireActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);

  const parsed = lireSaisie(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prestataireId = `pre_${randomUUID()}`;
  const depot = await deposerPieces(etablissementId, prestataireId, formData);
  if (!depot.ok) {
    return {
      status: "error",
      message: depot.message,
      fieldErrors: { [depot.champ]: [depot.message] },
    };
  }

  try {
    await db.prestataire.create({
      data: {
        id: prestataireId,
        etablissementId,
        ...colonnesDeLaSaisie(parsed.data),
        ...depot.colonnes,
      },
    });
  } catch (err) {
    // Les fichiers écrits ne sont référencés par aucune ligne : on les reprend.
    await libererFichiers(depot.cles, "prestataires/creation");
    if (estSiretEnDouble(err)) return erreurSiret();
    throw err;
  }

  revalidatePath(`/etablissements/${etablissementId}/prestataires`);
  revalidatePath(`/etablissements/${etablissementId}`);

  return { status: "success", prestataireId };
}

/**
 * Modifier une fiche (2026-10-12, audit des modules, B4) : identité,
 * contacts, domaines, validités et dates de vigilance, notes — et le
 * REMPLACEMENT d'une pièce. Mêmes validations que la création (`lireSaisie`),
 * même périmètre (`etablissementId` vérifié, puis la fiche cherchée DANS cet
 * établissement).
 *
 * ~~L'HISTORIQUE QUE LE MODÈLE PERMET : AUCUN.~~ [2026-10-12 : `PiecePrestataire`,
 * voir la fin de ce paragraphe.] `Prestataire` porte une colonne
 * par pièce, pas une liste. ~~Une pièce remplacée n'est plus référencée par
 * aucune ligne ; la garder au stockage ferait un fichier que plus rien ne
 * relit ni ne purge (`suppression/fichiers.ts`). Elle est donc libérée APRÈS
 * l'écriture en base, et l'écran le dit avant l'envoi.~~ [2026-10-12,
 * relecture indépendante : l'attestation d'un semestre passé est la seule
 * preuve que la vigilance a été faite À CE MOMENT-LÀ, si la solidarité de
 * L. 8222-2 est recherchée ; la détruire au remplacement détruisait la
 * preuve. Elle N'EST PLUS LIBÉRÉE : elle reste au stockage, sans ligne qui la
 * référence — donc ni affichée, ni jointe au ZIP, ni emportée par la purge
 * d'une suppression (`suppression/fichiers.ts`). L'écran dit ce qui est vrai.]
 * ~~Lister les attestations successives — et les purger avec le reste —
 * demande un modèle de pièces (migration additive) : non fait ici.~~
 * [2026-10-12, fait : la pièce remplacée s'inscrit en `PiecePrestataire`,
 * DANS LA MÊME TRANSACTION que l'écriture de la fiche — jamais une fiche à
 * jour dont l'ancienne clé ne serait plus référencée nulle part. Elle est
 * listée sur la fiche, jointe au ZIP de contrôle, et purgée avec le reste
 * (`CLES_STOCKEES`).]
 *
 * Aucun champ de la fiche n'entre dans une empreinte de signature
 * (`signatures/hash-objet.ts` ne connaît pas le prestataire). Aucun calendrier
 * à régénérer : la création n'en régénère pas, les échéances de vigilance se
 * lisent à chaque affichage (`calendrier/echeances.ts`).
 */
export async function modifierPrestataire(
  etablissementId: string,
  prestataireId: string,
  _prev: PrestataireActionState,
  formData: FormData,
): Promise<PrestataireActionState> {
  const { db } = await assertEtablissementDuCompte(etablissementId);

  const existant = await db.prestataire.findFirst({
    where: { id: prestataireId, etablissementId },
    select: {
      id: true,
      // Ce que la fiche dit des pièces AVANT l'écriture : c'est ce qui
      // s'inscrit en `PiecePrestataire` si l'une est remplacée.
      attestationUrssafCle: true,
      attestationUrssafNom: true,
      attestationUrssafValableJusquA: true,
      assuranceRcProCle: true,
      assuranceRcProNom: true,
      assuranceRcProValableJusquA: true,
      kbisCle: true,
      kbisNom: true,
    },
  });
  if (!existant) return { status: "error", message: "Prestataire introuvable" };

  const parsed = lireSaisie(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const depot = await deposerPieces(etablissementId, existant.id, formData);
  if (!depot.ok) {
    return {
      status: "error",
      message: depot.message,
      fieldErrors: { [depot.champ]: [depot.message] },
    };
  }

  const remplacees = piecesRemplacees(existant, depot.colonnes);
  try {
    // Transaction interactive, et non par lot : `creerEnLotVerifie` (ADR-051)
    // lit le prestataire avant d'insérer ses pièces, dans la transaction.
    await db.$transaction(async (tx) => {
      await tx.prestataire.update({
        where: { id: existant.id },
        data: { ...colonnesDeLaSaisie(parsed.data), ...depot.colonnes },
      });
      await creerEnLotVerifie(
        tx,
        "PiecePrestataire",
        remplacees.map((r) => ({ prestataireId: existant.id, ...r })),
      );
    });
  } catch (err) {
    await libererFichiers(depot.cles, "prestataires/modification");
    if (estSiretEnDouble(err)) return erreurSiret();
    throw err;
  }

  // Les pièces remplacées ne sont PAS libérées (2026-10-12) : elles sont
  // inscrites en `PiecePrestataire`, voir plus haut.

  revalidatePath(`/etablissements/${etablissementId}/prestataires/${existant.id}`);
  revalidatePath(`/etablissements/${etablissementId}/prestataires`);
  revalidatePath(`/etablissements/${etablissementId}`);
  return { status: "success", prestataireId: existant.id };
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
  const { db } = await assertEtablissementDuCompte(etablissementId);

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

  const { count } = await db.prestataire.updateMany({
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
  const { db } = await assertEtablissementDuCompte(etablissementId);

  const prestataire = await db.prestataire.findFirst({
    where: { id: prestataireId, etablissementId },
    select: {
      id: true,
      attestationUrssafCle: true,
      assuranceRcProCle: true,
      kbisCle: true,
      // Lues AVANT la suppression : la cascade emporte les lignes, pas les
      // fichiers (2026-10-12).
      piecesPrecedentes: { select: { fichierCle: true } },
    },
  });
  if (!prestataire) return;

  await db.prestataire.delete({ where: { id: prestataire.id } });
  await deletePiecesPrestataire(prestataire);

  revalidatePath(`/etablissements/${etablissementId}/prestataires`);
  revalidatePath(`/etablissements/${etablissementId}`);
  redirect(`/etablissements/${etablissementId}/prestataires`);
}
