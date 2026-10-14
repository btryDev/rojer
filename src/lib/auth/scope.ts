import "server-only";
// Helpers de scoping par utilisateur (ADR-005).
// Toute lecture/écriture d'une entité doit vérifier que l'entreprise racine
// appartient bien au user connecté. On passe par ces helpers pour éviter de
// dupliquer les WHERE clauses un peu partout.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOptionalUser, requireUser } from "./require-user";

/**
 * Récupère une entreprise appartenant au user connecté, ou 404.
 * Utilisé dans les pages /entreprises/[id] et les actions qui reçoivent
 * un entrepriseId en paramètre.
 */
export async function requireEntreprise(entrepriseId: string) {
  const user = await requireUser();
  const entreprise = await prisma.entreprise.findFirst({
    where: { id: entrepriseId, userId: user.id },
  });
  if (!entreprise) notFound();
  return { user, entreprise };
}

/**
 * Récupère un établissement dont l'entreprise appartient au user connecté,
 * ou 404. Utilisé par toutes les pages /etablissements/[id]/... et les
 * actions qui reçoivent un etablissementId.
 */
export async function requireEtablissement(etablissementId: string) {
  const user = await requireUser();
  const etablissement = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    include: { entreprise: true },
  });
  if (!etablissement) notFound();
  return { user, etablissement };
}

/**
 * Récupère un DUERP dont l'établissement appartient au user, ou 404.
 */
export async function requireDuerp(duerpId: string) {
  const user = await requireUser();
  const duerp = await prisma.duerp.findFirst({
    where: {
      id: duerpId,
      etablissement: { entreprise: { userId: user.id } },
    },
    include: { etablissement: { include: { entreprise: true } } },
  });
  if (!duerp) notFound();
  return { user, duerp };
}

/**
 * Récupère une unité de travail dont le DUERP → établissement → entreprise
 * appartient au user, ou 404.
 *
 * Les server actions du wizard DUERP ne reçoivent souvent qu'un `uniteId`
 * (une entité « profonde », à deux jointures de l'entreprise). Sans ce
 * helper, chaque action devait remonter la chaîne à la main — et ne le
 * faisait pas. On retourne aussi `duerpId` / `etablissementId` déjà résolus,
 * pour que l'appelant n'ait pas à requêter une seconde fois pour construire
 * ses `revalidatePath`.
 */
export async function requireUnite(uniteId: string) {
  const user = await requireUser();
  const unite = await prisma.uniteTravail.findFirst({
    where: {
      id: uniteId,
      duerp: { etablissement: { entreprise: { userId: user.id } } },
    },
    include: { duerp: { select: { id: true, etablissementId: true } } },
  });
  if (!unite) notFound();
  return {
    user,
    unite,
    duerpId: unite.duerpId,
    etablissementId: unite.duerp.etablissementId,
  };
}

/**
 * Récupère un risque dont l'unité → DUERP → établissement → entreprise
 * appartient au user, ou 404. Trois jointures : c'est l'entité la plus
 * profonde du modèle DUERP, et celle que les actions de cotation et de
 * suppression manipulaient jusqu'ici sur un `id` brut reçu du client.
 */
export async function requireRisque(risqueId: string) {
  const user = await requireUser();
  const risque = await prisma.risque.findFirst({
    where: {
      id: risqueId,
      unite: { duerp: { etablissement: { entreprise: { userId: user.id } } } },
    },
    include: {
      unite: {
        select: {
          id: true,
          duerpId: true,
          duerp: { select: { etablissementId: true } },
        },
      },
    },
  });
  if (!risque) notFound();
  return {
    user,
    risque,
    uniteId: risque.uniteId,
    duerpId: risque.unite.duerpId,
    etablissementId: risque.unite.duerp.etablissementId,
  };
}

/**
 * Récupère une action corrective (modèle unifié, ADR-002) dont
 * l'établissement appartient au user, ou 404.
 */
export async function requireAction(actionId: string) {
  const user = await requireUser();
  const action = await prisma.action.findFirst({
    where: {
      id: actionId,
      etablissement: { entreprise: { userId: user.id } },
    },
  });
  if (!action) notFound();
  return { user, action, etablissementId: action.etablissementId };
}

/**
 * Alias de lecture pour le wizard DUERP : une « mesure » de prévention au
 * sens L. 4121-2 est une `Action` rattachée à un risque depuis l'absorption
 * du modèle `Mesure` (ADR-002). Le nom est conservé pour que les appels dans
 * `lib/actions/actions.ts` restent lisibles, mais c'est bien le même garde —
 * on ne recrée pas un second concept.
 */
export const requireMesure = requireAction;

/**
 * Récupère une occurrence de vérification dont l'établissement appartient au
 * user, ou 404. Utilisé avant de créer une action corrective depuis un écart.
 */
export async function requireVerification(verificationId: string) {
  const user = await requireUser();
  const verification = await prisma.verification.findFirst({
    where: {
      id: verificationId,
      etablissement: { entreprise: { userId: user.id } },
    },
  });
  if (!verification) notFound();
  return { user, verification, etablissementId: verification.etablissementId };
}

/**
 * Vérifie (sans retourner l'entité) qu'un etablissementId appartient au user.
 * Utile dans les server actions où on veut juste un garde-fou.
 */
export async function assertEtablissementOwnership(etablissementId: string) {
  const user = await requireUser();
  const exists = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    select: { id: true },
  });
  if (!exists) notFound();
  return user;
}

/**
 * Vérifie qu'un entrepriseId appartient au user.
 */
export async function assertEntrepriseOwnership(entrepriseId: string) {
  const user = await requireUser();
  const exists = await prisma.entreprise.findFirst({
    where: { id: entrepriseId, userId: user.id },
    select: { id: true },
  });
  if (!exists) notFound();
  return user;
}

/**
 * Nom du cookie qui porte l'établissement actif (ADR-028).
 *
 * Le mécanisme le plus sobre qui réponde à la question posée. Il n'y a ni
 * table ni colonne parce qu'il n'y a rien à conserver : l'établissement actif
 * n'est pas un fait du dossier, c'est l'endroit où ce navigateur-ci travaillait
 * la dernière fois. Les URL portent déjà l'identifiant partout où il compte —
 * les deux layouts résolvent l'établissement par le chemin, jamais par ce
 * cookie. Ce cookie ne sert qu'à répondre « où est-ce que j'atterris ? » quand
 * l'URL ne le dit pas : l'accueil, `/entreprises`, un signet d'avant.
 */
export const COOKIE_ETABLISSEMENT_ACTIF = "etablissement-actif";

/**
 * L'établissement actif du user connecté, ou `null` si le parcours
 * d'onboarding n'a pas encore été complété.
 *
 * Depuis l'ADR-028, un compte peut en porter plusieurs : « l'établissement du
 * compte » n'existe plus, et cette fonction rend un DÉFAUT RAISONNABLE, pas une
 * vérité. Deux étages :
 *
 *  1. le cookie `etablissement-actif`, posé par le sélecteur de la barre haute ;
 *  2. à défaut, le plus ancien — celui qu'a créé l'onboarding.
 *
 * **La valeur du cookie est une entrée utilisateur**, au même titre qu'un
 * paramètre d'URL : elle est revalidée par le même prédicat que tout le reste
 * du produit — `entreprise: { userId }` — et jamais lue par un `findUnique` sur
 * l'identifiant seul. Un cookie forgé désignant l'établissement d'un autre
 * compte ne ramène donc rien, et le repli joue : on sert le sien, jamais celui
 * d'en face. Le repli couvre du même geste le cas ordinaire — l'établissement
 * a été supprimé depuis, le cookie survit à ce qu'il désignait.
 *
 * Version "optional" : ne déclenche pas de redirect vers /login — à
 * combiner avec `getOptionalUser()`.
 */
export async function getOptionalUserEtablissement(): Promise<{
  id: string;
  raisonDisplay: string;
  entrepriseId: string;
} | null> {
  const user = await getOptionalUser();
  if (!user) return null;

  const champs = {
    id: true,
    raisonDisplay: true,
    entrepriseId: true,
  } as const;

  const demande = (await cookies()).get(COOKIE_ETABLISSEMENT_ACTIF)?.value;
  if (demande) {
    const actif = await prisma.etablissement.findFirst({
      where: { id: demande, entreprise: { userId: user.id } },
      select: champs,
    });
    if (actif) return actif;
  }

  return prisma.etablissement.findFirst({
    where: { entreprise: { userId: user.id } },
    orderBy: { createdAt: "asc" },
    select: champs,
  });
}
