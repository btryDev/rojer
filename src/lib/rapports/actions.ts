"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { cleRapport, getStorage } from "@/lib/storage";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import {
  LigneModifieeEntreTemps,
  recalculerLigne,
} from "@/lib/calendrier/recalcul-ligne";
import {
  ORDRE_RAPPORT_PLUS_RECENT,
  WHERE_RAPPORT_REALISE,
} from "./derniere-realisation";
import { estResultatRealise, rapportMetadataSchema } from "./schema";
import { validerFichier } from "./validator";

export type UploadRapportState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; rapportId: string };

// `LigneModifieeEntreTemps` vit dans `calendrier/recalcul-ligne.ts` depuis la
// bascule de l'ADR-036 : un module `"use server"` n'exporte que des fonctions
// async, et c'est le recalcul qui la lève désormais.

/**
 * Server action d'upload d'un rapport sur une vérification.
 *
 * Flux :
 *  1. Valide métadonnées (Zod) et fichier (MIME/taille).
 *  2. Écrit le fichier via l'abstraction `FileStorage`.
 *  3. Dans une **transaction** : verrouille la ligne, crée le
 *     `RapportVerification`, puis RECALCULE la ligne depuis ses faits
 *     (`recalculerLigne`, ADR-036) ; si la base refuse, le fichier tout juste
 *     écrit est nettoyé (best-effort).
 *  4. Régénère le calendrier — il réaligne le reste.
 *
 * ~~CE QUE « ROULER » VEUT DIRE : la ligne passe à l'échéance suivante, date du
 * rapport + périodicité, statut « planifiée » ; trois cas ne font pas rouler —
 * « non vérifiable », un rapport antidaté, une obligation sans rendez-vous
 * suivant.~~ Barré le 2026-09-19 (ADR-036, lot 4) : `rouler` était un
 * deuxième calculateur de date, à côté de celui de la régénération. La date
 * sort désormais de `echeanceDeLigne`, par le même chemin que la
 * régénération, et les trois cas s'y retrouvent d'eux-mêmes : un « non
 * vérifiable » n'est pas une réalisation, un antidaté n'est pas le dernier
 * rapport réalisé, un ponctuel se solde sur le résultat (règles 2 et 3).
 *
 * CE QUI RESTE ICI : l'ÉCHÉANCE HONORÉE écrite sur le rapport — la `datePrevue`
 * ouverte au moment du dépôt, pour un rapport réalisé qui n'est pas antidaté.
 * L'ADR-034 § 5 en a besoin pour reconstruire les occurrences ; aucune date de
 * ligne ne se calcule plus depuis elle.
 *
 * La dernière réalisation se lit sur les rapports (`derniere-realisation.ts`) ;
 * la ligne ne porte plus de date de réalisation depuis le N5.
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

  // 3. Contexte vérification : de quoi refuser AVANT tout stockage. La date et
  //    le statut sont relus sous le verrou, dans la transaction.
  const verif = await prisma.verification.findUnique({
    where: { id: verificationId },
    select: {
      id: true,
      etablissementId: true,
      salarieId: true,
      archiveLe: true,
    },
  });
  if (!verif) {
    return { status: "error", message: "Vérification introuvable" };
  }
  await assertEtablissementOwnership(verif.etablissementId);

  // UNE OBLIGATION QUI NE S'APPLIQUE PLUS NE REÇOIT PAS DE RAPPORT (ADR-034).
  // Le dépôt ferait ROULER la ligne — date suivante, statut « planifiée » —
  // en laissant `archiveLe` posé : une ligne éteinte portant un rendez-vous.
  // La fiche ne proposait plus le formulaire ; cette action est exposée en
  // RPC, et c'est ici que la règle tient (relecture du 2026-09-13).
  // `!=` comme `estVerificationArchivee` : un champ absent se lit « ouverte »,
  // plutôt que de refuser tout dépôt en silence.
  if (verif.archiveLe != null) {
    return {
      status: "error",
      message:
        "Cette obligation ne s'applique plus à cette ligne : aucun rapport ne " +
        "s'y dépose.",
    };
  }

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

  const resultat = parsed.data.resultat;
  const dateRapport = parsed.data.dateRapport;

  // 5. Persistance DB dans une transaction : le rapport, puis la ligne
  //    recalculée depuis ses faits. Tout ou rien.
  try {
    await prisma.$transaction(async (tx) => {
      // LA LIGNE EST VERROUILLÉE AVANT TOUTE LECTURE, comme à la suppression
      // (revue du 2026-09-14) : deux dépôts concurrents sur la même ligne
      // s'enchaînent, et chacun lit ce que le précédent a laissé — l'échéance
      // honorée comme le dernier rapport réalisé.
      await tx.$queryRaw`SELECT 1 FROM "Verification" WHERE "id" = ${verif.id} FOR UPDATE`;
      const ligne = await tx.verification.findUnique({
        where: { id: verif.id },
        select: { datePrevue: true, archiveLe: true },
      });
      // Archivée ENTRE la lecture et ici : le refus plus haut ne lisait
      // `archiveLe` qu'avant l'envoi du fichier, et l'archivage n'écrit que ce
      // champ (relecture externe du 2026-09-13). On annule.
      if (ligne === null || ligne.archiveLe !== null) {
        throw new LigneModifieeEntreTemps();
      }

      // L'ÉCHÉANCE QUE CE RAPPORT HONORE : l'échéance OUVERTE de la ligne —
      // pour un rapport réalisé qui est le plus récent. Un « non vérifiable »
      // n'honore rien (le contrôle n'a pas eu lieu), un antidaté non plus (un
      // rapport plus récent a déjà dépassé cette échéance). Elle ne sert plus
      // à dater la ligne ; elle sert à reconstruire les occurrences (ADR-034
      // § 5).
      let echeanceHonoree: Date | null = null;
      if (estResultatRealise(resultat)) {
        const dernierRealise = await tx.rapportVerification.findFirst({
          where: { verificationId: verif.id, ...WHERE_RAPPORT_REALISE },
          // Le départage du moteur : deux rapports du même jour, sinon, ne se
          // départagent pas.
          orderBy: ORDRE_RAPPORT_PLUS_RECENT,
          select: { dateRapport: true },
        });
        if (
          dernierRealise === null ||
          dateRapport.getTime() > dernierRealise.dateRapport.getTime()
        ) {
          echeanceHonoree = ligne.datePrevue;
        }
      }

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

      // LA LIGNE SE RECALCULE DEPUIS SES FAITS — le rapport qu'on vient de
      // créer compris —, par la même décision que la régénération (ADR-036).
      await recalculerLigne(tx, verif.id);
    });
  } catch (err) {
    // Nettoyage best-effort du fichier si la DB a échoué.
    await storage.delete(cle).catch(() => {});
    if (err instanceof LigneModifieeEntreTemps) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  // 6. Régénération du calendrier. Elle est idempotente (ADR-012), et elle ne
  // déplace pas la ligne qu'on vient de recalculer : c'est la même décision,
  // sur les mêmes faits (ADR-036). Elle réaligne le reste.
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

// ~~`rouler`~~ — retirée le 2026-09-19 (ADR-036, lot 4) : la date d'une ligne
// sort de `echeanceDeLigne`, par `recalculerLigne`.

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
 * ~~LA LIGNE RECULE D'UN CYCLE (ADR-034) : sur le dernier rapport réalisé qui
 * reste, sinon sur l'échéance que le retiré honorait (`echeanceHonoree`,
 * transmise de rapport en rapport jusqu'à la tête de chaîne), « à planifier »
 * faute de savoir si elle était réelle.~~ Barré le 2026-09-19 (ADR-036,
 * lot 4). LA LIGNE SE RECALCULE DEPUIS SES FAITS (`recalculerLigne`) : s'il
 * reste un rapport réalisé, sur lui (règle 3) ; sinon sur la mise en service
 * et le premier pas (règle 4), à défaut sur l'origine du suivi (règle 5). La
 * chaîne de transmission d'`echeanceHonoree` a disparu avec : l'échéance
 * d'origine qu'elle protégeait est un FAIT stocké, `suiviDepuis`, et une vraie
 * échéance revient « planifiée », donc visible, au lieu d'être masquée en « à
 * planifier ». Un rapport non vérifiable ou antidaté ne change aucun fait de
 * date : la ligne ne bouge pas.
 */
export async function supprimerRapport(rapportId: string): Promise<void> {
  const rap = await prisma.rapportVerification.findUnique({
    where: { id: rapportId },
    select: {
      id: true,
      etablissementId: true,
      verificationId: true,
      fichierCle: true,
    },
  });
  if (!rap) return;
  await assertEtablissementOwnership(rap.etablissementId);

  await prisma.$transaction(async (tx) => {
    // LA LIGNE EST VERROUILLÉE AVANT TOUTE LECTURE, et c'est ce qui rend le
    // recalcul juste sous concurrence (revue du 2026-09-14). Deux suppressions
    // sur la même ligne — deux onglets, un double clic — lisaient chacune
    // l'état d'avant l'autre. Verrouillées, elles s'enchaînent, et chacune
    // relit ce que la précédente a laissé.
    await tx.$queryRaw`SELECT 1 FROM "Verification" WHERE "id" = ${rap.verificationId} FOR UPDATE`;
    // Relu sous le verrou : une suppression concurrente a pu l'emporter déjà.
    const retire = await tx.rapportVerification.findUnique({
      where: { id: rapportId },
      select: { id: true },
    });
    if (retire === null) return;

    await tx.rapportVerification.delete({ where: { id: rapportId } });

    // La ligne se recalcule sur ce qui reste, par la décision même de la
    // régénération : un statut réalisé ne survit pas sans rapport réalisé.
    // (~~`garderLegs: false` quand le retiré était réalisé~~ — la garde du
    // legs est partie au lot 5 de l'ADR-036, 2026-09-19.)
    //
    // Si l'écriture conditionnée ne prend pas — aucun chemin connu sous le
    // verrou —, `LigneModifieeEntreTemps` annule TOUT : le rapport reste,
    // plutôt qu'un retrait sans recalcul qui laisserait une échéance que plus
    // aucune pièce ne justifie. Le bouton de suppression ne capture pas
    // l'erreur : l'utilisateur verrait la page d'erreur générique. C'est
    // accepté pour un cas sans chemin ; une garde qui échoue fait du bruit.
    await recalculerLigne(tx, rap.verificationId);
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
