"use server";

import type { Db } from "@/lib/auth/compte";
import { abandonnerFichiers, deposerFichier } from "@/lib/abonnements/stockage";
import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { ouvrirAuGel } from "@/lib/abonnements/gel-saisie";
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
import { PIECES, piecesRemplacees } from "./pieces";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { motifDuGel, prendreQuota, refusQuota, RefusQuota } from "@/lib/abonnements/quotas";

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

/** Une pièce lue a changé entre la lecture et l'écriture (modification simultanée). */
class PiecesChangees extends Error {}
const MESSAGE_FICHE_CHANGEE =
  "Cette fiche a été modifiée entre-temps. Rechargez la page, puis recommencez.";
/** Suppression bornée : relire autant de fois qu'une modification simultanée change une clé. */
const ESSAIS_SUR_CHANGEMENT = 3;

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
  db: Db,
  compteId: string,
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
  // Un prestataire gelé (au-delà du plafond, ADR-053 § 14) l'est indépendamment
  // de son site : refusé avant tout téléversement, comme le site l'est par
  // `deposerFichier`.
  let gelVerifie = false;
  for (const piece of CHAMPS_PIECES) {
    const fichier = formData.get(piece.champ);
    if (!(fichier instanceof File) || fichier.size === 0) continue;
    if (!gelVerifie) {
      gelVerifie = true;
      const gel = await motifDuGel(db, compteId, { prestataireId });
      if (gel) return { ok: false, champ: piece.champ, message: gel };
    }

    const val = await validerFichier(fichier);
    let erreur: string | null = null;
    if (!val.ok) erreur = val.erreur;
    else if (!storage) erreur = MESSAGE_DEPOT_NON_CONFIGURE;
    else {
      const cle = clePiecePrestataire(etablissementId, prestataireId, piece.type, fichier.name);
      // Même règle que le dépôt d'un rapport (2026-09-27) : l'échec
      // d'écriture rend un message métier sur le champ.
      try {
        // Le plafond de stockage de la formule (ADR-053 § 14), avant d'écrire.
        const refus = await deposerFichier(db, compteId, cle, Buffer.from(await fichier.arrayBuffer()), val.mime, { etablissementId });
        if (refus) erreur = refus;
        else {
          cles.push(cle);
          colonnes[piece.cle] = cle;
          colonnes[piece.nom] = fichier.name;
        }
      } catch (e) {
        console.error(`[prestataires/depot] écriture du fichier impossible (${cle})`, e);
        erreur = MESSAGE_ECHEC_ENREGISTREMENT;
      }
    }
    if (erreur) {
      await abandonnerFichiers(db, cles, "prestataires/depot-refuse");
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
  await verifierSaisie();
  const { compte, db } = await assertEtablissementDuCompte(etablissementId);

  const parsed = lireSaisie(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Plafond de la formule (ADR-053 § 14), avant de déposer les pièces.
  const auPlafond = await refusQuota(db, compte.compteId, "prestataires");
  if (auPlafond) return { status: "error", message: auPlafond };

  const prestataireId = `pre_${randomUUID()}`;
  const depot = await deposerPieces(db, compte.compteId, etablissementId, prestataireId, formData);
  if (!depot.ok) {
    return {
      status: "error",
      message: depot.message,
      fieldErrors: { [depot.champ]: [depot.message] },
    };
  }

  try {
    await db.$transaction(async (tx) => {
      await prendreQuota(tx, compte.compteId, "prestataires");
      await tx.prestataire.create({
        data: {
          id: prestataireId,
          etablissementId,
          ...colonnesDeLaSaisie(parsed.data),
          ...depot.colonnes,
        },
      });
    });
  } catch (err) {
    // Les fichiers écrits ne sont référencés par aucune ligne : on les reprend.
    await abandonnerFichiers(db, depot.cles, "prestataires/creation");
    if (err instanceof RefusQuota) return { status: "error", message: err.motif };
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
/** L'écriture bornée n'a rien trouvé : fiche supprimée, ou pièce changée entre-temps. */
async function refusModificationConcurrente(
  db: Db,
  prestataireId: string,
  etablissementId: string,
): Promise<PrestataireActionState> {
  const encore = await db.prestataire.findFirst({ where: { id: prestataireId, etablissementId }, select: { id: true } });
  return { status: "error", message: encore ? MESSAGE_FICHE_CHANGEE : "Prestataire introuvable" };
}

export async function modifierPrestataire(
  etablissementId: string,
  prestataireId: string,
  _prev: PrestataireActionState,
  formData: FormData,
): Promise<PrestataireActionState> {
  await verifierSaisie();
  const { compte, db } = await assertEtablissementDuCompte(etablissementId);

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

  const depot = await deposerPieces(db, compte.compteId, etablissementId, existant.id, formData);
  if (!depot.ok) {
    return {
      status: "error",
      message: depot.message,
      fieldErrors: { [depot.champ]: [depot.message] },
    };
  }

  const remplacees = piecesRemplacees(existant, depot.colonnes);
  // Bornée aux pièces lues (audit de sécurité du 2026-11-10, comme la photo
  // d'établissement) : chaque pièce déposée ne remplace que celle qu'on a
  // lue. Sinon, de deux modifications simultanées, la seconde écrasait la
  // clé de la première sans l'inscrire nulle part — un fichier stocké, hors
  // du décompte du plafond de stockage.
  // Clé, nom ET validité de la pièce remplacée : c'est ce qui s'archive en
  // `PiecePrestataire` ; une date corrigée entre-temps ne doit pas y entrer
  // périmée (preuve de vigilance, L. 8222-2).
  const lues = Object.fromEntries(
    Object.values(PIECES)
      .filter((p) => depot.colonnes[p.cle] !== undefined)
      .flatMap((p) => [p.cle, p.nom, ...(p.validite ? [p.validite] : [])])
      .map((champ) => [champ, existant[champ]]),
  );
  let ecrite = true;
  try {
    const modification = {
      where: { id: existant.id, ...lues },
      data: { ...colonnesDeLaSaisie(parsed.data), ...depot.colonnes },
    };
    // Sans pièce remplacée, une seule écriture : pas de transaction.
    // Avec, transaction interactive : `creerEnLotVerifie` (ADR-051) lit le
    // prestataire avant d'insérer ses pièces, dans la transaction.
    if (remplacees.length === 0) {
      ecrite = (await db.prestataire.updateMany(modification)).count > 0;
    } else {
      await db.$transaction(async (tx) => {
        if ((await tx.prestataire.updateMany(modification)).count === 0) {
          throw new PiecesChangees();
        }
        await creerEnLotVerifie(
          tx,
          "PiecePrestataire",
          remplacees.map((r) => ({ prestataireId: existant.id, ...r })),
        );
      });
    }
  } catch (err) {
    await abandonnerFichiers(db, depot.cles, "prestataires/modification");
    if (err instanceof PiecesChangees) return await refusModificationConcurrente(db, existant.id, etablissementId);
    if (estSiretEnDouble(err)) return erreurSiret();
    throw err;
  }
  if (!ecrite) {
    await abandonnerFichiers(db, depot.cles, "prestataires/modification-concurrente");
    return await refusModificationConcurrente(db, existant.id, etablissementId);
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
  await verifierSaisie();
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
  await verifierSaisie();
  ouvrirAuGel(); // supprimer, retirer : ouvert sur un site gelé (ADR-053 § 14)
  const { db } = await assertEtablissementDuCompte(etablissementId);

  // Bornée aux pièces lues : une modification simultanée qui remplace une
  // pièce change sa clé, et la suppression relit au lieu d'emporter la fiche
  // en laissant la nouvelle pièce hors de toute ligne (audit du 2026-11-10).
  for (let essai = 0; essai < ESSAIS_SUR_CHANGEMENT; essai++) {
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

    const { count } = await db.prestataire.deleteMany({
      where: {
        id: prestataire.id,
        attestationUrssafCle: prestataire.attestationUrssafCle,
        assuranceRcProCle: prestataire.assuranceRcProCle,
        kbisCle: prestataire.kbisCle,
      },
    });
    if (count > 0) {
      await deletePiecesPrestataire(db, prestataire);
      break;
    }
    if (essai === ESSAIS_SUR_CHANGEMENT - 1) {
      // Toujours là après chaque essai : rien n'est supprimé, et on le dit.
      throw new Error(`Suppression du prestataire ${prestataireId} abandonnée : pièce remplacée pendant chaque essai`);
    }
  }

  revalidatePath(`/etablissements/${etablissementId}/prestataires`);
  revalidatePath(`/etablissements/${etablissementId}`);
  redirect(`/etablissements/${etablissementId}/prestataires`);
}
