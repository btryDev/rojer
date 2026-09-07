import { prisma } from "@/lib/prisma";
import type { ObjetSignable } from "@prisma/client";

/**
 * L'objet visé appartient-il bien à cet établissement ?
 *
 * **Ce module n'est volontairement pas `"use server"`**, pour la raison
 * écrite dans `./hash-objet.ts` : tout export d'un module `"use server"`
 * devient un point d'entrée appelable depuis le navigateur, et celui-ci
 * répond par oui ou non à une question portant sur des identifiants
 * arbitraires — c'est-à-dire qu'exporté ainsi, il dirait à qui le sonde
 * quels documents existent chez qui.
 *
 * ── Pourquoi cette vérification existe ───────────────────────────────────
 *
 * `emettreAccessToken` exigeait que l'appelant possède `etablissementId`,
 * mais pas que `objetId` s'y trouve. Les deux venaient du même appel, sans
 * qu'aucun lien ne soit vérifié entre eux. C'est une server action, donc un
 * point d'entrée réseau : les paramètres ne sont pas ceux qu'un formulaire a
 * envoyés, ce sont ceux que l'appelant a choisis.
 *
 * La pose de signature, elle, ne pouvait pas en profiter :
 * `calculerHashObjet` cherche l'objet dans le seul établissement porté par le
 * jeton, et un objet étranger y ressort « introuvable ». Mais la page
 * `/acces/[token]` affichait le libellé de l'objet **sans le borner à
 * l'établissement du jeton**. Un utilisateur authentifié émettait un jeton
 * vers sa propre adresse en désignant le rapport d'un autre client, ouvrait
 * le lien, et lisait le nom du fichier et l'obligation concernée.
 *
 * Les deux bouts sont refermés : ici à l'émission, et dans la page qui borne
 * désormais sa lecture. Ce n'est pas une redondance — l'un empêche le jeton
 * d'exister, l'autre empêche qu'un jeton mal formé serve à lire.
 *
 * ── Une garde automatique ne couvre pas ce chemin ────────────────────────
 *
 * `src/lib/auth/tenancy-lectures.test.ts` n'ouvre que les fichiers nommés
 * `queries.ts` sous `src/lib`, et exige `etablissementId` dans le corps de la
 * fonction. Le défaut vivait dans une page : elle ne pouvait pas le voir. Si
 * quelqu'un décale un jour la vérification ci-dessous, aucune alarme statique
 * ne sonnera — ce sont les tests d'`./isolation.test.ts`, qui tentent la
 * traversée pour de bon, qui le diront.
 *
 * ── Refus par défaut ─────────────────────────────────────────────────────
 *
 * Un `objetType` inconnu est **refusé**, jamais laissé passer. Sans cela, il
 * suffirait d'ajouter une valeur à `ObjetSignable` pour rouvrir la brèche
 * sans que rien ne le signale : le nouveau type tomberait dans un `default`
 * permissif et l'émission recommencerait à accepter n'importe quel
 * identifiant. Le coût de ce choix est qu'un type nouveau doit être inscrit
 * ici avant de pouvoir être signé — et c'est exactement le rappel voulu.
 */
export async function objetAppartientAEtablissement(
  objetType: string,
  objetId: string,
  etablissementId: string,
): Promise<boolean> {
  if (!objetId || !etablissementId) return false;

  const selectId = { select: { id: true } } as const;

  switch (objetType as ObjetSignable) {
    case "rapport_verification":
      return Boolean(
        await prisma.rapportVerification.findFirst({
          where: { id: objetId, etablissementId },
          ...selectId,
        }),
      );

    case "permis_feu":
      return Boolean(
        await prisma.permisFeu.findFirst({
          where: { id: objetId, etablissementId },
          ...selectId,
        }),
      );

    case "plan_prevention":
      return Boolean(
        await prisma.planPrevention.findFirst({
          where: { id: objetId, etablissementId },
          ...selectId,
        }),
      );

    case "registre_accessibilite":
      return Boolean(
        await prisma.registreAccessibilite.findFirst({
          where: { id: objetId, etablissementId },
          ...selectId,
        }),
      );

    case "duerp_version":
      // Une version de DUERP ne porte pas l'établissement : il se lit à
      // travers le DUERP dont elle est une version.
      return Boolean(
        await prisma.duerpVersion.findFirst({
          where: { id: objetId, duerp: { etablissementId } },
          ...selectId,
        }),
      );

    default:
      return false;
  }
}
