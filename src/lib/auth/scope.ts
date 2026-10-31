import "server-only";
// Helpers de scoping par utilisateur (ADR-005).
// Toute lecture/écriture d'une entité doit vérifier que l'entreprise racine
// appartient bien au user connecté. On passe par ces helpers pour éviter de
// dupliquer les WHERE clauses un peu partout.

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requireUser } from "./require-user";
import { getOptionalCompte, requireCompte } from "./compte";
import { etablissementDuRendu } from "@/lib/etablissements/queries";
import { cache } from "react";

/**
 * Récupère un établissement dont l'entreprise appartient au user connecté,
 * ou 404. Utilisé par toutes les pages /etablissements/[id]/... et les
 * actions qui reçoivent un etablissementId.
 *
 * Appelée sans lire son résultat, elle reste la garde d'appartenance : une
 * page qui n'a besoin d'aucun champ de l'établissement l'appelle pour le 404
 * (depuis le 2026-10-25, le fil d'Ariane ne lui demande plus son nom).
 *
 * Mémoïsé par `cache()` sur le rendu (audit Next.js du 2026-10-14, H2) : la
 * barre latérale (vigilance prestataires) et la page le demandent dans le même
 * rendu. Clé primitive, portée de la requête HTTP ; hors rendu RSC — une
 * action serveur —, la garde s'exécute à chaque appel, comme avant.
 *
 * [2026-10-29, plan performance] La lecture est celle de `getEtablissement`
 * (`etablissementDuRendu`) : la garde et la page ne lisent plus
 * l'établissement deux fois. [2026-10-31 : bornée au compte par le client
 * `db` (ADR-051) ; le prédicat écrit qu'elle garde encore est un doublon,
 * à retirer avec les autres prédicats écrits (ADR-051 § 7).]
 */
export const requireEtablissement = cache(async function requireEtablissement(
  etablissementId: string,
) {
  const { user, db } = await requireCompte();
  const etablissement = await etablissementDuRendu(db, etablissementId, user.id);
  if (!etablissement) notFound();
  return { user, db, etablissement };
});

/**
 * Récupère un DUERP dont l'établissement appartient au user, ou 404.
 */
export async function requireDuerp(duerpId: string) {
  const { user, db } = await requireCompte();
  const duerp = await db.duerp.findFirst({
    where: {
      id: duerpId,
      etablissement: { entreprise: { userId: user.id } },
    },
    include: { etablissement: { include: { entreprise: true } } },
  });
  if (!duerp) notFound();
  return { user, db, duerp };
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
  const { user, db } = await requireCompte();
  const unite = await db.uniteTravail.findFirst({
    where: {
      id: uniteId,
      duerp: { etablissement: { entreprise: { userId: user.id } } },
    },
    include: { duerp: { select: { id: true, etablissementId: true } } },
  });
  if (!unite) notFound();
  return {
    user,
    db,
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
  const { user, db } = await requireCompte();
  const risque = await db.risque.findFirst({
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
    db,
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
  const { user, db } = await requireCompte();
  const action = await db.action.findFirst({
    where: {
      id: actionId,
      etablissement: { entreprise: { userId: user.id } },
    },
  });
  if (!action) notFound();
  return { user, db, action, etablissementId: action.etablissementId };
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
  const { user, db } = await requireCompte();
  const verification = await db.verification.findFirst({
    where: {
      id: verificationId,
      etablissement: { entreprise: { userId: user.id } },
    },
  });
  if (!verification) notFound();
  return { user, db, verification, etablissementId: verification.etablissementId };
}

/**
 * Les quatre gardes des routes de fichiers déposés (audit Next.js du
 * 2026-10-14, B6) : chacune recodait son `findFirst` d'appartenance. Même
 * prédicat que celles-ci — la chaîne complète jusqu'à `Entreprise.userId`,
 * dans la requête même — et même réponse pour une ligne inexistante et pour
 * celle d'un autre compte (404) : pas d'oracle d'existence.
 */

/** Un rapport de vérification dont l'établissement appartient au user, ou 404. */
export async function requireRapportVerification(rapportId: string) {
  const { user, db } = await requireCompte();
  const rapport = await db.rapportVerification.findFirst({
    where: { id: rapportId, etablissement: { entreprise: { userId: user.id } } },
  });
  if (!rapport) notFound();
  return { user, db, rapport };
}

/** Une analyse de légionelles dont le carnet appartient au user, ou 404. */
export async function requireAnalyseLegionelle(analyseId: string) {
  const { user, db } = await requireCompte();
  const analyse = await db.analyseLegionelle.findFirst({
    where: {
      id: analyseId,
      carnet: { etablissement: { entreprise: { userId: user.id } } },
    },
  });
  if (!analyse) notFound();
  return { user, db, analyse };
}

/** Un prestataire dont l'établissement appartient au user, ou 404. */
export async function requirePrestataire(prestataireId: string) {
  const { user, db } = await requireCompte();
  const prestataire = await db.prestataire.findFirst({
    where: { id: prestataireId, etablissement: { entreprise: { userId: user.id } } },
  });
  if (!prestataire) notFound();
  return { user, db, prestataire };
}

/**
 * Une pièce remplacée de CE prestataire, dont l'établissement appartient au
 * user, ou 404 — une pièce rattachée à un autre de ses prestataires aussi.
 */
export async function requirePiecePrestataire(pieceId: string, prestataireId: string) {
  const { user, db } = await requireCompte();
  const piece = await db.piecePrestataire.findFirst({
    where: {
      id: pieceId,
      prestataireId,
      prestataire: { etablissement: { entreprise: { userId: user.id } } },
    },
  });
  if (!piece) notFound();
  return { user, db, piece };
}

/**
 * Une lecture en SQL brut (`$queryRaw`), bornée au propriétaire : la ligne dont
 * `colonneEtablissement` désigne l'établissement appartient à l'utilisateur de
 * la session. La forme SQL de `etablissement: { entreprise: { userId } }`, pour
 * les lectures que Prisma n'exprime pas (`DISTINCT ON`, `LATERAL`…).
 *
 * LE PRÉDICAT EST OBLIGATOIRE, ET C'EST LE HELPER QUI EXÉCUTE (revue du
 * 2026-10-31) : l'extension du client borné NE borne PAS le SQL brut, le
 * prédicat est la seule borne de la requête. Le gabarit le reçoit, et une
 * requête où il n'apparaît pas — son texte ET la valeur du compte — est
 * refusée avant d'être envoyée ; rendre le client à l'appelant aurait permis
 * d'écrire la requête sans lui.
 *
 * LIMITE : le contrôle vérifie la PRÉSENCE du prédicat, pas sa CONJONCTION.
 * `… = ${id} OR ${proprietaire}`, ou une sous-requête parmi d'autres qui
 * l'omet, passeraient. Cela, la revue le tient (ADR-051 § 5) : le helper ne
 * lit pas le SQL.
 *
 *   requireLectureSqlProprietaire<{ annee: number }>('r."etablissementId"', (proprietaire) =>
 *     Prisma.sql`SELECT … FROM "RapportVerification" r WHERE ${proprietaire}`);
 *
 * [2026-10-27, plan performance, lot 1a ; 2026-10-31, exécution par le helper.]
 */
export async function requireLectureSqlProprietaire<T>(
  colonneEtablissement: string,
  gabarit: (proprietaire: Prisma.Sql) => Prisma.Sql,
): Promise<T[]> {
  if (!/^[A-Za-z_]\w*\."[A-Za-z_]\w*"$/.test(colonneEtablissement)) {
    throw new Error(`Colonne SQL invalide : « ${colonneEtablissement} »`);
  }
  const { user, db } = await requireCompte();
  const proprietaire = Prisma.sql`EXISTS (
    SELECT 1 FROM "Etablissement" e_p
    JOIN "Entreprise" en_p ON en_p."id" = e_p."entrepriseId"
    WHERE e_p."id" = ${Prisma.raw(colonneEtablissement)} AND en_p."userId" = ${user.id}::uuid
  )`;
  const requete = gabarit(proprietaire);
  if (!requete.sql.includes(proprietaire.sql) || !requete.values.includes(user.id))
    throw new Error("Requête SQL brute sans le prédicat propriétaire : refusée");
  return db.$queryRaw<T[]>(requete);
}

/**
 * Vérifie (sans retourner l'entité) qu'un etablissementId appartient au user.
 * Utile dans les server actions où on veut juste un garde-fou.
 */
export async function assertEtablissementOwnership(etablissementId: string) {
  return (await assertEtablissementDuCompte(etablissementId)).user;
}

/**
 * La même garde, qui rend aussi le client borné au compte (ADR-051) : le
 * module qui la passe lit et écrit ensuite par `db`, sans relire la session.
 */
export async function assertEtablissementDuCompte(etablissementId: string) {
  const { user, db } = await requireCompte();
  const exists = await db.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    select: { id: true },
  });
  if (!exists) notFound();
  return { user, db };
}

/** Vérifie qu'un entrepriseId appartient au user ; rend aussi le client borné au compte (ADR-051). */
export async function assertEntrepriseDuCompte(entrepriseId: string) {
  const { user, db } = await requireCompte();
  const exists = await db.entreprise.findFirst({
    where: { id: entrepriseId, userId: user.id },
    select: { id: true },
  });
  if (!exists) notFound();
  return { user, db };
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
 *
 * Mémoïsé par `cache()` sur le rendu (audit Next.js du 2026-10-14, H2, M2) :
 * l'accueil et l'en-tête public le lisent dans le même rendu. Sans argument,
 * la clé est vide — une entrée par requête HTTP, jamais partagée entre deux.
 * Hors rendu RSC (actions serveur), il s'exécute à chaque appel.
 */
export const getOptionalUserEtablissement = cache(
  async function getOptionalUserEtablissement(): Promise<{
    id: string;
    raisonDisplay: string;
    entrepriseId: string;
  } | null> {
    const compte = await getOptionalCompte();
    if (!compte) return null;
    const { user, db } = compte;

    const champs = {
      id: true,
      raisonDisplay: true,
      entrepriseId: true,
    } as const;

    const demande = (await cookies()).get(COOKIE_ETABLISSEMENT_ACTIF)?.value;
    if (demande) {
      const actif = await db.etablissement.findFirst({
        where: { id: demande, entreprise: { userId: user.id } },
        select: champs,
      });
      if (actif) return actif;
    }

    return db.etablissement.findFirst({
      where: { entreprise: { userId: user.id } },
      orderBy: { createdAt: "asc" },
      select: champs,
    });
  },
);
