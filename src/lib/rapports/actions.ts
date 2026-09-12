"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatutVerification } from "@prisma/client";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { cleRapport, getStorage } from "@/lib/storage";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { estCyclique, prochaineEcheance } from "@/lib/calendrier/periodicite";
import { estEnRetard } from "@/lib/dates/retard";
import {
  estResultatRealise,
  rapportMetadataSchema,
  RESULTATS_REALISES,
  STATUT_DEPUIS_RESULTAT,
  type ResultatRealise,
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
 * Levée quand la ligne de suivi a changé entre la lecture et l'écriture — un
 * dépôt ou une suppression concurrents l'ont fait rouler. La transaction est
 * annulée ; rien n'est écrit, l'utilisateur recommence sur l'état à jour.
 */
export class LigneModifieeEntreTemps extends Error {
  constructor() {
    super(
      "Cette échéance a été modifiée pendant l'enregistrement. Rechargez la page et recommencez.",
    );
    this.name = "LigneModifieeEntreTemps";
  }
}

/**
 * Server action d'upload d'un rapport sur une vérification.
 *
 * Flux :
 *  1. Valide métadonnées (Zod) et fichier (MIME/taille).
 *  2. Écrit le fichier via l'abstraction `FileStorage`.
 *  3. Crée la ligne `RapportVerification` et FAIT ROULER la `Verification`
 *     parente dans une **transaction** (ADR-034) ; si la base refuse, le
 *     fichier tout juste écrit est nettoyé (best-effort).
 *  4. Régénère le calendrier — il ne roule plus rien, il réaligne le reste.
 *
 * CE QUE « ROULER » VEUT DIRE. La ligne ne porte que l'échéance ouverte. Le
 * rapport reçoit l'échéance qu'il honorait (`echeanceHonoree` = la
 * `datePrevue` lue), et la ligne passe à l'échéance suivante : date du rapport
 * + périodicité, statut « planifiée ». Le résultat du contrôle vit sur le
 * rapport, pas sur la ligne.
 *
 * Trois cas ne font pas rouler :
 *  - « non vérifiable » — le contrôle n'a pas eu lieu, l'échéance qui courait
 *    court toujours (cf. `STATUT_DEPUIS_RESULTAT`) ;
 *  - un rapport ANTIDATÉ — plus ancien qu'un rapport réalisé déjà déposé : il
 *    est conservé et daté, mais la ligne ne recule pas vers un passé qu'un
 *    rapport plus récent a déjà dépassé (ADR-034 § 3) ;
 *  - une obligation sans rendez-vous suivant (`mise_en_service_uniquement`,
 *    `autre`) : le one-shot est consommé, la ligne garde le statut réalisé.
 *
 * `dateRealisee` n'est PLUS écrite : la dernière réalisation se lit sur les
 * rapports (`derniere-realisation.ts`). La colonne reste gelée jusqu'au N5.
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

  // 3. Contexte vérification. `datePrevue` et `statut` sont ce que le
  //    roulement lit ET ce sur quoi l'écriture est conditionnée (lot 1) ;
  //    `periodicite` donne le pas.
  const verif = await prisma.verification.findUnique({
    where: { id: verificationId },
    select: {
      id: true,
      etablissementId: true,
      datePrevue: true,
      statut: true,
      periodicite: true,
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

  // 4. Le rapport réalisé le plus récent déjà déposé : c'est lui qui dit si
  //    celui-ci est antidaté. Lu avant la transaction ; l'écriture
  //    conditionnée sur la ligne rattrape un dépôt concurrent.
  const dernierRealise = await prisma.rapportVerification.findFirst({
    where: {
      verificationId: verif.id,
      resultat: { in: [...RESULTATS_REALISES] },
    },
    // `createdAt` en second : deux rapports du même jour, sinon, ne se
    // départagent pas.
    orderBy: [{ dateRapport: "desc" }, { createdAt: "desc" }],
    select: { dateRapport: true },
  });

  // 5. Lire le fichier en buffer + stocker
  const buffer = Buffer.from(await fichier.arrayBuffer());
  const rapportId = `rap_${randomUUID()}`;
  const cle = cleRapport(verif.etablissementId, rapportId, fichier.name);

  const storage = getStorage();
  await storage.put(cle, buffer, val.mime);

  // 6. Effet du résultat sur la ligne de suivi.
  const resultat = parsed.data.resultat;
  const dateRapport = parsed.data.dateRapport;
  let echeanceHonoree: Date | null = null;
  let majVerification: {
    datePrevue?: Date;
    dateRealisee?: null;
    statut: StatutVerification;
  };
  if (!estResultatRealise(resultat)) {
    // Non vérifiable : le contrôle reste dû. Rien n'a été vérifié, et
    // `datePrevue` n'est pas repoussée : l'échéance réglementaire qui courait
    // court toujours. Elle est seulement requalifiée « à replanifier », ou
    // « dépassée » si la date est passée. Une ligne DÉJÀ soldée — le one-shot
    // réalisé, seul à garder un statut réalisé (ADR-034) — n'est pas
    // déclassée par un déplacement sans contrôle.
    const dejaSoldee = (Object.values(STATUT_DEPUIS_RESULTAT) as string[]).includes(
      verif.statut,
    );
    majVerification = {
      statut: dejaSoldee
        ? verif.statut
        : estEnRetard(verif.datePrevue, new Date())
          ? "depassee"
          : "a_planifier",
    };
  } else if (
    dernierRealise !== null &&
    dateRapport.getTime() <= dernierRealise.dateRapport.getTime()
  ) {
    // Antidaté (ou doublon du même jour) : la pièce entre au registre, la
    // ligne ne bouge pas. Elle n'honorait aucune échéance connue.
    majVerification = { statut: verif.statut };
  } else {
    echeanceHonoree = verif.datePrevue;
    majVerification = rouler(
      verif.datePrevue,
      verif.periodicite as Periodicite,
      dateRapport,
      resultat,
    );
  }

  // 7. Persistance DB (rapport + roulement de la ligne) dans une transaction.
  //    L'écriture sur la ligne est CONDITIONNÉE sur ce qu'on a lu : si un
  //    autre dépôt l'a fait rouler entre-temps, `echeanceHonoree` et la date
  //    calculée sont fausses, et on n'écrit rien.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.rapportVerification.create({
        data: {
          id: rapportId,
          etablissementId: verif.etablissementId,
          verificationId: verif.id,
          dateRapport,
          echeanceHonoree,
          organismeVerif: parsed.data.organismeVerif,
          resultat,
          commentaires: parsed.data.commentaires,
          fichierCle: cle,
          fichierNomOriginal: fichier.name,
          fichierMime: val.mime,
          fichierTaille: val.taille,
        },
      });
      const { count } = await tx.verification.updateMany({
        where: {
          id: verif.id,
          datePrevue: verif.datePrevue,
          statut: verif.statut,
        },
        data: majVerification,
      });
      if (count !== 1) throw new LigneModifieeEntreTemps();
    });
  } catch (err) {
    // Nettoyage best-effort du fichier si la DB a échoué.
    await storage.delete(cle).catch(() => {});
    if (err instanceof LigneModifieeEntreTemps) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  // 8. Régénération du calendrier. Elle est idempotente (ADR-012) et ne roule
  // rien (ADR-034) : elle réaligne le reste sans toucher au dépôt.
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
 * Ce que devient la ligne quand un rapport réalisé, le plus récent, est
 * déposé : l'échéance suivante s'ouvre. Pour une obligation sans rendez-vous
 * suivant, la ligne garde son échéance et prend le statut du résultat — c'est
 * le seul cas où un statut réalisé reste sur la ligne.
 */
function rouler(
  datePrevue: Date,
  periodicite: Periodicite,
  dateRapport: Date,
  resultat: ResultatRealise,
): { datePrevue: Date; dateRealisee: null; statut: StatutVerification } {
  const prochaine = prochaineEcheance(dateRapport, periodicite);
  // `dateRealisee: null` ÉTEINT la colonne gelée sur une ligne d'avant
  // l'ADR-034. Sans cela, une ligne qui vient de rouler gardait une ancienne
  // date de réalisation, et `estVerificationEnRetard` — qui sort encore sur
  // `dateRealisee !== null` jusqu'au N3 — la tenait pour jamais en retard,
  // tant que la régénération n'avait pas tourné.
  if (prochaine === null) {
    return {
      datePrevue,
      dateRealisee: null,
      statut: STATUT_DEPUIS_RESULTAT[resultat],
    };
  }
  return { datePrevue: prochaine, dateRealisee: null, statut: "planifiee" };
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
 *
 * LA LIGNE RECULE D'UN CYCLE (ADR-034) si le rapport retiré est celui qui
 * l'avait fait rouler — le rapport réalisé le plus récent. Elle revient à
 * l'échéance qu'il honorait (`echeanceHonoree`) ; à défaut — rapport d'avant
 * N2 —, à l'échéance que le rapport réalisé précédent engendre, ou, s'il n'y
 * en a pas, elle garde sa date. Un rapport non vérifiable ou antidaté n'avait
 * rien fait rouler : la ligne ne lui doit rien.
 */
export async function supprimerRapport(rapportId: string): Promise<void> {
  const rap = await prisma.rapportVerification.findUnique({
    where: { id: rapportId },
    select: {
      id: true,
      etablissementId: true,
      verificationId: true,
      fichierCle: true,
      dateRapport: true,
      resultat: true,
      echeanceHonoree: true,
      verification: {
        select: { datePrevue: true, statut: true, periodicite: true },
      },
    },
  });
  if (!rap) return;
  await assertEtablissementOwnership(rap.etablissementId);

  const now = new Date();
  let conflit = false;
  await prisma.$transaction(async (tx) => {
    await tx.rapportVerification.delete({ where: { id: rapportId } });

    if (!estResultatRealise(rap.resultat)) return;

    const dernier = await tx.rapportVerification.findFirst({
      where: {
        verificationId: rap.verificationId,
        resultat: { in: [...RESULTATS_REALISES] },
      },
      // `createdAt` départage deux rapports du même jour : sans lui, « le
      // dernier » n'est pas déterministe, et c'est de lui que dépend le statut
      // rendu à la ligne.
      orderBy: [{ dateRapport: "desc" }, { createdAt: "desc" }],
      select: { id: true, dateRapport: true, resultat: true },
    });
    // Un rapport réalisé plus récent (ou du même jour) subsiste : le retiré
    // n'avait pas fait rouler la ligne — mais L'ÉCHÉANCE QU'IL HONORAIT SE
    // TRANSMET, et c'est le défaut bloquant relevé le 2026-09-12. Le rapport
    // suivant honorait une échéance que le retiré avait engendrée ; elle
    // n'existe plus. Sans ce report, supprimer deux rapports du plus ancien au
    // plus récent laissait la ligne sur une échéance future, sans aucune
    // pièce : le retard était blanchi par l'ordre des suppressions.
    if (dernier !== null && dernier.dateRapport.getTime() >= rap.dateRapport.getTime()) {
      if (rap.echeanceHonoree !== null) {
        // Le successeur immédiat : le plus ANCIEN des réalisés qui restent et
        // qui ne sont pas antérieurs au retiré.
        const successeur = await tx.rapportVerification.findFirst({
          where: {
            verificationId: rap.verificationId,
            resultat: { in: [...RESULTATS_REALISES] },
            dateRapport: { gte: rap.dateRapport },
          },
          orderBy: [{ dateRapport: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        if (successeur !== null) {
          await tx.rapportVerification.update({
            where: { id: successeur.id },
            data: { echeanceHonoree: rap.echeanceHonoree },
          });
        }
      }
      return;
    }

    const periodicite = rap.verification.periodicite as Periodicite;
    const cyclique = estCyclique(periodicite);
    // L'échéance qui rouvre : celle que le rapport retiré honorait. Quand un
    // rapport réalisé plus ANCIEN subsiste, il en engendre une autre — on
    // garde la PLUS TARDIVE des deux, sinon la ligne annoncerait un retard
    // qu'un contrôle encore prouvé a déjà levé (relecture du 2026-09-12).
    const depuisHonoree = rap.echeanceHonoree;
    const depuisDernier =
      dernier !== null && cyclique
        ? prochaineEcheance(dernier.dateRapport, periodicite)
        : null;
    const candidates = [depuisHonoree, depuisDernier].filter(
      (d): d is Date => d !== null,
    );
    const datePrevue =
      candidates.length === 0
        ? rap.verification.datePrevue
        : candidates.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));

    let statut: StatutVerification;
    if (!cyclique && dernier !== null) {
      // One-shot : le rapport précédent l'avait déjà consommé.
      statut = STATUT_DEPUIS_RESULTAT[dernier.resultat as ResultatRealise];
    } else if (estEnRetard(datePrevue, now)) {
      statut = "depassee";
    } else {
      statut = dernier !== null ? "planifiee" : "a_planifier";
    }

    const { count } = await tx.verification.updateMany({
      where: {
        id: rap.verificationId,
        datePrevue: rap.verification.datePrevue,
        statut: rap.verification.statut,
      },
      // `dateRealisee: null` n'est pas une écriture de la colonne gelée, c'est
      // sa mise à mort pour cette ligne : la réconciliation la lit en REPLI
      // quand aucun rapport réalisé ne reste, et une ligne d'avant l'ADR-034
      // ressusciterait sinon la réalisation qu'on vient de retirer.
      data: { datePrevue, dateRealisee: null, statut },
    });
    // CONFLIT : quelqu'un a fait bouger la ligne entre la lecture et ici — un
    // dépôt concurrent, une autre suppression. On ne LÈVE PAS : la suppression
    // du rapport, elle, est légitime et déjà faite, et une exception ici
    // remonterait en page d'erreur, sans le message, pour un retrait qui a
    // réussi. Le recul est simplement abandonné ; le calendrier est marqué
    // pour reprise juste après (`regenererApresMutation`), et la ligne sera
    // recalée depuis les rapports qui restent.
    if (count !== 1) conflit = true;
  });
  if (conflit) {
    console.warn(
      `[rapports] recul abandonné : la ligne ${rap.verificationId} a changé pendant la suppression du rapport ${rapportId}`,
    );
  }

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
