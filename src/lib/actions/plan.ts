"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAction, requireVerification } from "@/lib/auth/scope";
import { estActionEnRetard, estActionOuverte } from "@/lib/dates/retard";
import { actionVerificationSchema, cloturerActionSchema } from "./schema";
import { assertOrigineActionValide } from "./origine";
import { constaterEpiDuCompte } from "@/lib/etablissements/epi-constate";
import { obligationParId } from "@/lib/referentiels/conformite";
import {
  clePieceDePoint,
  getStorage,
  MESSAGE_DEPOT_NON_CONFIGURE,
  MESSAGE_ECHEC_ENREGISTREMENT,
  stockageEnService,
} from "@/lib/storage";
import { validerFichier } from "@/lib/rapports/validator";
import { libererFichiers } from "@/lib/suppression/fichiers";
import {
  appareilDesignable,
  estControleDEnsemble,
  recoitDesPoints,
} from "@/lib/points-a-corriger/regles";

/**
 * Server actions du plan d'actions unifié (étape 8).
 *
 * Ces actions complètent `src/lib/actions/actions.ts` (qui gère les
 * mesures DUERP via le wizard) en couvrant les parcours :
 *   - création d'un point à corriger depuis un contrôle (ADR-048)
 *   - ~~modification d'une action (statut, échéance, responsable, type)~~
 *     [2026-10-12 : `modifierActionPlan` prenait un patch que nul écran
 *     n'envoyait ; il reprend désormais le formulaire et le schéma de la
 *     création, et le statut ne se change plus que par un geste nommé]
 *   - modification d'une action ouverte (le formulaire de création, prérempli)
 *   - clôture d'une action avec justificatif obligatoire, réouverture
 *   - abandon d'une action qui ne vient pas du DUERP
 *   - suppression
 *
 * Les actions DUERP existantes (rattachées à un `Risque`) restent éditables
 * via le wizard pour ne pas casser l'UX existante ; la vue unifiée en
 * lecture les affiche sans spécificité.
 *
 * Cloisonnement : `verificationId` et `actionId` viennent du client, et la
 * RLS PostgreSQL n'est pas effective (le rôle Prisma la contourne). Chaque
 * action commence donc par `requireVerification` / `requireAction`, qui
 * remontent jusqu'à `Entreprise.userId` et répondent 404 quand l'objet
 * appartient à un autre client — sans révéler qu'il existe.
 */

export type ActionPlanState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; actionId: string };

/**
 * Une action se lit sur le plan, le calendrier, le tableau de bord, la fiche
 * de son contrôle et celle de son appareil (ADR-048) : tout le dossier est
 * revalidé, plutôt qu'une liste de chemins qu'un écran neuf rendrait fausse.
 */
function revalidateAction(etablissementId: string): void {
  revalidatePath(`/etablissements/${etablissementId}`, "layout");
}

/** Le formulaire d'une action, lu par la création et par la correction :
 *  une seule lecture, un seul schéma. */
function lireFormulaireAction(formData: FormData) {
  return actionVerificationSchema.safeParse({
    libelle: formData.get("libelle"),
    description: formData.get("description"),
    type: formData.get("type"),
    criticite: formData.get("criticite"),
    echeance: formData.get("echeance"),
    responsable: formData.get("responsable"),
  });
}

/**
 * Crée un POINT À CORRIGER (ADR-048) — une action issue d'une vérification.
 *
 * Le contrôle vient du formulaire (`verificationId`) : la fiche d'un
 * équipement propose ses contrôles et les contrôles d'ensemble qui le
 * couvrent. Tout ce qui vient du client est revérifié ici :
 *   - le contrôle appartient au compte (`requireVerification`) et reçoit des
 *     points (`recoitDesPoints` : ni titre de salarié, ni ligne éteinte, ni
 *     appareil retiré) ;
 *   - le rapport d'origine, s'il est donné, est un rapport DE CE contrôle ;
 *   - l'appareil, s'il est donné, n'est admis que pour un contrôle
 *     d'ensemble, et seulement s'il est actif, du même établissement et d'une
 *     catégorie que le contrôle couvre (`appareilDesignable`).
 */
export async function creerPointACorriger(
  _prev: ActionPlanState,
  formData: FormData,
): Promise<ActionPlanState> {
  const verificationId = formData.get("verificationId");
  if (typeof verificationId !== "string" || verificationId === "") {
    return { status: "error", message: "Choisissez le contrôle qui a relevé ce point." };
  }
  const { db, verification: verif } = await requireVerification(verificationId);

  const parsed = lireFormulaireAction(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Trois lectures indépendantes, en une fois : l'appareil de la ligne, le
  // rapport d'origine (borné à CE contrôle), l'appareil désigné (borné à CET
  // établissement, et seulement pour un contrôle d'ensemble).
  const rapportOrigineId = champFacultatif(formData.get("rapportOrigineId"));
  const equipementId = champFacultatif(formData.get("equipementId"));
  const [equipementDeLaLigne, rapport, appareil] = await Promise.all([
    verif.equipementId
      ? db.equipement.findUnique({ where: { id: verif.equipementId }, select: { actif: true } })
      : null,
    rapportOrigineId
      ? db.rapportVerification.findFirst({
          where: { id: rapportOrigineId, verificationId: verif.id },
          select: { id: true },
        })
      : null,
    equipementId && estControleDEnsemble(verif)
      ? db.equipement.findFirst({
          where: { id: equipementId, etablissementId: verif.etablissementId },
          select: { categorie: true, actif: true },
        })
      : null,
  ]);
  if (!recoitDesPoints({ ...verif, appareilActif: equipementDeLaLigne?.actif ?? null })) {
    return { status: "error", message: "Ce contrôle ne reçoit plus de point à corriger." };
  }
  if (rapportOrigineId && !rapport) {
    return { status: "error", message: "Rapport d'origine introuvable." };
  }
  if (equipementId) {
    const obligation = obligationParId(verif.obligationId);
    if (!obligation || !appareil || !appareilDesignable(obligation, appareil)) {
      return { status: "error", message: "Cet appareil ne peut pas être désigné par ce contrôle." };
    }
  }

  // Statut initial : une action dont l'échéance est déjà passée naît « en
  // cours » plutôt qu'« ouverte ». Le prédicat vient de `lib/dates/retard`
  // (ADR-011) : comparer l'échéance à `new Date()` brut faisait basculer en
  // retard une action créée le jour même de son échéance dès 02:00 à Paris,
  // parce qu'une date civile est stockée à minuit UTC. Une échéance du jour
  // n'est jamais en retard.
  const estDepassee = estActionEnRetard(
    { statut: "ouverte", echeance: parsed.data.echeance ?? null },
    new Date(),
  );

  assertOrigineActionValide({ risqueId: null, verificationId: verif.id });
  const a = await db.action.create({
    data: {
      etablissementId: verif.etablissementId,
      verificationId: verif.id,
      rapportOrigineId,
      equipementId,
      libelle: parsed.data.libelle,
      description: parsed.data.description,
      type: parsed.data.type,
      criticite: parsed.data.criticite,
      echeance: parsed.data.echeance,
      responsable: parsed.data.responsable,
      statut: estDepassee ? "en_cours" : "ouverte",
    },
  });

  await constaterEpiDuCompte(db, verif.etablissementId);
  revalidateAction(verif.etablissementId);
  return { status: "success", actionId: a.id };
}

/** Un champ facultatif d'identifiant : chaîne vide ou absente → `null`. */
function champFacultatif(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Corriger une action du plan : le formulaire de la création, prérempli, et le
 * même schéma (`actionVerificationSchema`). Jusqu'au 2026-10-12 la fonction
 * existait sans écran — une action mal saisie ne se corrigeait qu'en la
 * supprimant (audit du 2026-10-12).
 *
 * Deux refus, chacun dit à l'écran :
 *   - une mesure du DUERP se corrige dans le DUERP, où elle a été saisie : sa
 *     création n'est pas ce formulaire, et son libellé peut venir du
 *     référentiel (`referentielMesureId`) ;
 *   - une action levée ou abandonnée se rouvre d'abord. Corriger le libellé
 *     d'une action levée réécrirait ce que son justificatif atteste.
 *
 * Un champ vidé redevient `null` : le schéma rend `undefined` pour un champ
 * vide, ce qui à la création veut dire « pas de valeur » et, à une mise à
 * jour Prisma, « ne touche pas ».
 */
export async function modifierActionPlan(
  actionId: string,
  _prev: ActionPlanState,
  formData: FormData,
): Promise<ActionPlanState> {
  const { db, action: existante, etablissementId } = await requireAction(actionId);

  if (existante.risqueId) {
    return {
      status: "error",
      message:
        "Cette action est une mesure du DUERP : elle se corrige depuis le risque, dans le DUERP.",
    };
  }
  if (!estActionOuverte(existante)) {
    return {
      status: "error",
      message: "Rouvrez l'action avant de la corriger.",
    };
  }

  const parsed = lireFormulaireAction(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await db.action.update({
    where: { id: actionId },
    data: {
      libelle: parsed.data.libelle,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      criticite: parsed.data.criticite ?? null,
      echeance: parsed.data.echeance ?? null,
      responsable: parsed.data.responsable ?? null,
    },
  });
  await constaterEpiDuCompte(db, etablissementId);

  revalidateAction(etablissementId);
  redirect(`/etablissements/${etablissementId}/actions/${actionId}`);
}

export async function cloturerAction(
  actionId: string,
  _prev: ActionPlanState,
  formData: FormData,
): Promise<ActionPlanState> {
  const { db, action: existante } = await requireAction(actionId);

  const parsed = cloturerActionSchema.safeParse({
    commentaire: formData.get("commentaire"),
    rapportId: formData.get("rapportId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Avant toute écriture au stockage : une action levée, ou abandonnée (dans
  // un autre onglet), ne se clôture pas — l'abandon se défait d'abord.
  if (existante.statut === "levee") {
    return { status: "error", message: "Déjà corrigée" };
  }
  if (!estActionOuverte(existante)) {
    return { status: "error", message: "Abandonnée : rouvrez-la avant de la marquer corrigée." };
  }

  // `rapportId` vient lui aussi du formulaire : sans contrôle, une clôture
  // pouvait s'adosser au rapport d'un autre client (et le faire apparaître
  // comme justificatif dans le dossier de conformité). On exige un rapport
  // du même établissement que l'action.
  if (parsed.data.rapportId) {
    const rapport = await db.rapportVerification.findFirst({
      where: {
        id: parsed.data.rapportId,
        etablissementId: existante.etablissementId,
      },
      select: { id: true },
    });
    if (!rapport) {
      return { status: "error", message: "Rapport justificatif introuvable" };
    }
  }

  // LA PIÈCE (ADR-048) : facultative, pour un point à corriger seulement, aux
  // règles du fichier d'un rapport (`validerFichier` : type réel, taille).
  // Écrite AVANT la base, effacée si la base refuse — comme un rapport.
  const piece = await lirePiece(formData, existante);
  if (piece.status === "error") return piece;

  // `updateMany` borné aux statuts OUVERTS (`estActionOuverte`) : deux
  // clôtures simultanées (double envoi, deux onglets) ne s'écrasent pas, et
  // un point abandonné dans un autre onglet ne se corrige pas sans être
  // rouvert. La seconde ne trouve plus de ligne, et sa pièce, que plus rien
  // ne référencerait, est libérée.
  let ecrites: number;
  try {
    ({ count: ecrites } = await db.action.updateMany({
      where: { id: actionId, statut: { in: ["ouverte", "en_cours"] } },
      data: {
        statut: "levee",
        leveeLe: new Date(),
        leveeCommentaire: parsed.data.commentaire,
        leveeRapportId: parsed.data.rapportId,
        ...(piece.status === "piece"
          ? {
              leveeFichierCle: piece.cle,
              leveeFichierNom: piece.nom,
              leveeFichierMime: piece.mime,
              leveeFichierTaille: piece.taille,
            }
          : {}),
      },
    }));
  } catch (err) {
    if (piece.status === "piece") await libererFichiers([piece.cle], "points/correction");
    throw err;
  }
  if (ecrites === 0) {
    if (piece.status === "piece") await libererFichiers([piece.cle], "points/correction");
    return { status: "error", message: "Déjà corrigée" };
  }

  // Une mesure de protection individuelle levée vaut « EPI fournis ».
  await constaterEpiDuCompte(db, existante.etablissementId);
  revalidateAction(existante.etablissementId);
  return { status: "success", actionId };
}

type LecturePiece =
  | { status: "aucune" }
  | { status: "piece"; cle: string; nom: string; mime: string; taille: number }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

/** La pièce d'une correction, validée et stockée — ou aucune. */
async function lirePiece(
  formData: FormData,
  action: { id: string; etablissementId: string; verificationId: string | null },
): Promise<LecturePiece> {
  const fichier = formData.get("piece");
  if (!(fichier instanceof File) || fichier.size === 0) return { status: "aucune" };
  if (action.verificationId === null) {
    return { status: "error", message: "Une mesure du DUERP ne porte pas de pièce ici." };
  }
  if (!stockageEnService()) {
    return { status: "error", message: MESSAGE_DEPOT_NON_CONFIGURE };
  }
  const val = await validerFichier(fichier);
  if (!val.ok) {
    return { status: "error", message: val.erreur, fieldErrors: { piece: [val.erreur] } };
  }
  const cle = clePieceDePoint(action.etablissementId, action.id, fichier.name);
  try {
    await getStorage().put(cle, Buffer.from(await fichier.arrayBuffer()), val.mime);
  } catch (e) {
    console.error(`[points/correction] écriture de la pièce impossible (${cle})`, e);
    return { status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT };
  }
  return { status: "piece", cle, nom: fichier.name, mime: val.mime, taille: val.taille };
}

/**
 * Rouvrir une action levée ou abandonnée — une clôture faite par erreur ne se
 * défaisait pas (audit du 2026-10-12). Le justificatif, sa date et le rapport
 * choisi partent : une action rouverte n'est plus levée, et garder la preuve
 * d'une levée qui n'a plus cours la ferait lire comme telle. L'écran le dit
 * avant le geste.
 */
export async function rouvrirAction(actionId: string): Promise<void> {
  const { db, action, etablissementId } = await requireAction(actionId);
  if (estActionOuverte(action)) return;

  // Borné à ce qui a été lu (statut, pièce) : si le point a été rouvert puis
  // corrigé de nouveau entre-temps, avec une autre pièce, on n'efface pas
  // cette pièce-là en libérant l'ancienne — elle resterait orpheline.
  const { count } = await db.action.updateMany({
    where: { id: actionId, statut: action.statut, leveeFichierCle: action.leveeFichierCle },
    data: {
      statut: "ouverte",
      leveeLe: null,
      leveeCommentaire: null,
      leveeRapportId: null,
      leveeFichierCle: null,
      leveeFichierNom: null,
      leveeFichierMime: null,
      leveeFichierTaille: null,
    },
  });
  // La pièce de la correction défaite part avec elle — après la base
  // (`suppression/fichiers.ts`).
  if (count > 0 && action.leveeFichierCle) {
    await libererFichiers([action.leveeFichierCle], "points/reouverture");
  }
  revalidateAction(etablissementId);
}

/**
 * Abandonner une action ouverte : elle sort du plan (ni retard, ni compte des
 * ouvertes) et reste au dossier. Le statut existait au modèle sans qu'aucun
 * écran ne l'atteigne ; il ne passait que par le patch de
 * `modifierActionPlan`, que rien n'appelait.
 *
 * Refusé pour une mesure du DUERP : la version figée ne connaît que « en
 * place » et « prévue » (`snapshot-builder.ts`), et y imprimerait une mesure
 * abandonnée comme prévue.
 */
export async function abandonnerAction(actionId: string): Promise<void> {
  const { db, action, etablissementId } = await requireAction(actionId);
  if (action.risqueId) {
    throw new Error("Une mesure du DUERP ne s'abandonne pas depuis le plan d'actions");
  }
  if (!estActionOuverte(action)) return;

  await db.action.update({
    where: { id: actionId },
    data: { statut: "abandonnee" },
  });
  revalidateAction(etablissementId);
}

export async function supprimerActionPlan(actionId: string): Promise<void> {
  const { db, action, etablissementId } = await requireAction(actionId);

  await db.action.delete({ where: { id: actionId } });
  if (action.leveeFichierCle) {
    await libererFichiers([action.leveeFichierCle], "points/suppression");
  }
  revalidateAction(etablissementId);
}
