"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatutVerification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { cleRapport, getStorage } from "@/lib/storage";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { estEnRetard } from "@/lib/dates/retard";
import {
  estResultatRealise,
  rapportMetadataSchema,
  STATUT_DEPUIS_RESULTAT,
} from "./schema";
import { validerFichier } from "./validator";

export type UploadRapportState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; rapportId: string };

/**
 * Server action d'upload d'un rapport sur une vérification.
 *
 * Flux :
 *  1. Valide métadonnées (Zod) et fichier (MIME/taille).
 *  2. Écrit le fichier via l'abstraction `FileStorage`.
 *  3. Crée la ligne `RapportVerification` et met à jour la `Verification`
 *     parente dans une **transaction** ; si la base refuse, le fichier tout
 *     juste écrit est nettoyé (best-effort).
 *  4. Régénère le calendrier pour recalculer la prochaine échéance.
 *
 * Le résultat « non vérifiable » suit un chemin distinct — cf. le commentaire
 * de `STATUT_DEPUIS_RESULTAT` : le contrôle n'a pas eu lieu, donc ni
 * `dateRealisee`, ni report de l'échéance.
 */
export async function uploadRapport(
  verificationId: string,
  _prev: UploadRapportState,
  formData: FormData,
): Promise<UploadRapportState> {
  // 1. Métadonnées
  const parsed = rapportMetadataSchema.safeParse({
    dateRapport: formData.get("dateRapport"),
    organismeVerif: formData.get("organismeVerif"),
    resultat: formData.get("resultat"),
    commentaires: formData.get("commentaires"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 2. Fichier
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File)) {
    return {
      status: "error",
      message: "Aucun fichier reçu",
      fieldErrors: { fichier: ["Sélectionnez un fichier à uploader"] },
    };
  }
  const val = validerFichier(fichier);
  if (!val.ok) {
    return {
      status: "error",
      message: val.erreur,
      fieldErrors: { fichier: [val.erreur] },
    };
  }

  // 3. Contexte vérification. `datePrevue` et `statut` sont lus ici car le
  //    cas « non vérifiable » en dépend : on n'a pas le droit d'inventer une
  //    nouvelle échéance, on garde celle qui court.
  const verif = await prisma.verification.findUnique({
    where: { id: verificationId },
    select: {
      id: true,
      etablissementId: true,
      datePrevue: true,
      dateRealisee: true,
      salarieId: true,
    },
  });
  if (!verif) {
    return { status: "error", message: "Vérification introuvable" };
  }
  await assertEtablissementOwnership(verif.etablissementId);

  // LA FRONTIÈRE MÉDICALE, TENUE ICI ET NON SEULEMENT À L'ÉCRAN.
  //
  // D'un titre de salarié, l'outil ne garde que l'existence, la date et
  // l'échéance — jamais le document (ADR-023 § 2, `docs/rgpd.md` § 2.3,
  // CLAUDE.md). Trois documents l'affirmaient ; rien ne l'empêchait.
  //
  // La garde ne vivait que dans un ternaire JSX de la fiche de vérification.
  // Un appel direct à cette action serveur — elle est exposée en RPC —, ou une
  // refonte de cet écran, déposait le fichier sans un mot : le buffer partait
  // au stockage et le `RapportVerification` était créé. C'est-à-dire
  // l'attestation médicale d'une personne dans le système de fichiers,
  // exactement ce que la décision produit interdit.
  //
  // Elle porte sur le PORTEUR, pas sur le drapeau `pieceMedicale` : le
  // référentiel compte dix-huit titres salarié non encore encodés, dont la
  // plupart ne sont pas médicaux, et aucun d'eux n'a de document à déposer ici
  // non plus.
  if (verif.salarieId !== null) {
    return {
      status: "error",
      message:
        "Cette échéance concerne le titre d'une personne. Rojer en enregistre " +
        "l'existence et les dates, jamais le document : conservez l'original " +
        "de votre côté.",
    };
  }

  // 4. Lire le fichier en buffer + stocker
  const buffer = Buffer.from(await fichier.arrayBuffer());
  const rapportId = `rap_${randomUUID()}`;
  const cle = cleRapport(verif.etablissementId, rapportId, fichier.name);

  const storage = getStorage();
  await storage.put(cle, buffer, val.mime);

  // 5. Effet du résultat sur la ligne de suivi.
  const resultat = parsed.data.resultat;
  let majVerification: {
    dateRealisee?: Date;
    statut: StatutVerification;
  };
  if (estResultatRealise(resultat)) {
    majVerification = {
      dateRealisee: parsed.data.dateRapport,
      statut: STATUT_DEPUIS_RESULTAT[resultat],
    };
  } else {
    // Non vérifiable : le contrôle reste dû. `dateRealisee` n'est jamais
    // écrite — rien n'a été vérifié — et `datePrevue` n'est pas repoussée :
    // l'échéance réglementaire qui courait court toujours. Elle est seulement
    // requalifiée « à replanifier », ou « dépassée » si la date est passée.
    const cycleOuvert = verif.dateRealisee === null;
    majVerification = {
      statut:
        cycleOuvert && estEnRetard(verif.datePrevue, new Date())
          ? "depassee"
          : "a_planifier",
    };
  }

  // 6. Persistance DB (rapport + mise à jour vérification) dans une
  // transaction pour éviter un état incohérent si la mise à jour casse.
  try {
    await prisma.$transaction([
      prisma.rapportVerification.create({
        data: {
          id: rapportId,
          etablissementId: verif.etablissementId,
          verificationId: verif.id,
          dateRapport: parsed.data.dateRapport,
          organismeVerif: parsed.data.organismeVerif,
          resultat: parsed.data.resultat,
          commentaires: parsed.data.commentaires,
          fichierCle: cle,
          fichierNomOriginal: fichier.name,
          fichierMime: val.mime,
          fichierTaille: val.taille,
        },
      }),
      prisma.verification.update({
        where: { id: verif.id },
        data: majVerification,
      }),
    ]);
  } catch (err) {
    // Nettoyage best-effort du fichier si la DB a échoué.
    await storage.delete(cle).catch(() => {});
    throw err;
  }

  // 7. Régénération du calendrier. Elle est désormais idempotente (ADR-012) :
  // elle recale la prochaine échéance sans supprimer la ligne de suivi, donc
  // sans emporter le rapport qui vient d'être déposé.
  //
  // ET ELLE NE PEUT PLUS FAIRE ÉCHOUER LE DÉPÔT. Le rapport est commité et le
  // fichier est écrit : un recalage qui échoue rendait pourtant une erreur à
  // l'utilisateur, qui redéposait — et obtenait DEUX rapports pour un seul
  // contrôle. Le calendrier est marqué périmé, la prochaine ouverture le
  // reprend, et le dépôt reste ce qu'il est : acquis.
  await regenererApresMutation(verif.etablissementId, "rapports/upload");

  revalidatePath(`/etablissements/${verif.etablissementId}/calendrier`);
  revalidatePath(`/etablissements/${verif.etablissementId}/registre`);
  revalidatePath(`/etablissements/${verif.etablissementId}/verifications/${verif.id}`);
  revalidatePath(`/etablissements/${verif.etablissementId}`);

  return { status: "success", rapportId };
}

/**
 * Retire un rapport du registre.
 *
 * Cinq opérations s'enchaînaient sans transaction : `delete`, suppression du
 * fichier, `count`, `update` de la vérification, régénération. Une coupure
 * après le `delete` laissait une vérification `realisee_conforme`, avec une
 * `dateRealisee`, sans le moindre justificatif — exactement l'état qu'un
 * contrôle ne pardonne pas.
 *
 * Ordre retenu : tout ce qui touche la base dans une transaction, puis
 * seulement le fichier. Un fichier orphelin se rattrape ; une ligne de
 * registre sans pièce, non.
 */
export async function supprimerRapport(rapportId: string): Promise<void> {
  const rap = await prisma.rapportVerification.findUnique({
    where: { id: rapportId },
    select: {
      id: true,
      etablissementId: true,
      verificationId: true,
      fichierCle: true,
      verification: { select: { datePrevue: true } },
    },
  });
  if (!rap) return;
  await assertEtablissementOwnership(rap.etablissementId);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.rapportVerification.delete({ where: { id: rapportId } });

    // Si c'était le seul rapport lié à la vérification, la réalisation n'est
    // plus prouvée : la ligne de suivi retourne à un cycle ouvert.
    const restants = await tx.rapportVerification.count({
      where: { verificationId: rap.verificationId },
    });
    if (restants === 0) {
      await tx.verification.update({
        where: { id: rap.verificationId },
        data: {
          dateRealisee: null,
          statut: estEnRetard(rap.verification.datePrevue, now)
            ? "depassee"
            : "a_planifier",
        },
      });
    }
  });

  // La base a tranché : on peut libérer le fichier.
  await getStorage().delete(rap.fichierCle).catch(() => {});
  // La suppression est commitée et le fichier libéré : le recalage ne peut
  // plus, en échouant, faire remonter une erreur sur une opération faite.
  await regenererApresMutation(rap.etablissementId, "rapports/suppression");

  revalidatePath(`/etablissements/${rap.etablissementId}/calendrier`);
  revalidatePath(`/etablissements/${rap.etablissementId}/registre`);
  revalidatePath(
    `/etablissements/${rap.etablissementId}/verifications/${rap.verificationId}`,
  );
  redirect(`/etablissements/${rap.etablissementId}/registre`);
}
