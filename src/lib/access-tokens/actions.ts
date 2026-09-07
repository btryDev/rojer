"use server";

import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { objetAppartientAEtablissement } from "@/lib/signatures/appartenance";
import { ScopeAccessToken } from "@prisma/client";
import {
  expirationFromNow,
  generateToken,
  hashToken,
  ttlHoursFor,
} from "./token";
import { envoyerMailAcces, urlAccesPourToken } from "./mail";
import { generateOtp, hashOtp, otpExpirationDate } from "@/lib/signatures/otp";

/**
 * Émet un token d'accès externe et envoie par email le lien magique au
 * destinataire (+ OTP si scope = signature ou depot_rapport).
 *
 * ── Ni le lien ni le code ne reviennent à l'appelant ─────────────────────
 *
 * Les deux facteurs n'existent qu'à deux endroits : leurs empreintes en base,
 * et le message adressé au destinataire. Aucun des deux ne figure dans ce
 * retour, et c'est leur absence du **type** `EmissionResultat` qui le tient :
 * un champ mis à `null` se remet à la première occasion, un champ retiré fait
 * échouer la compilation de qui le lit.
 *
 * Ce retour valait auparavant `otpClair: otp`, sans condition, en plus du
 * lien. Or c'est une server action, appelée depuis le navigateur du
 * demandeur : le code remontait donc à celui-là même dont la signature du
 * tiers doit être indépendante. Un demandeur tenant les deux facteurs signe
 * lui-même à la place du signataire, et il en sort une `Signature`
 * `otp_email` qu'un `/verifier/<id>` public confirme. La séparation des
 * canaux — lien et code ne partent qu'à la boîte du destinataire — était la
 * seule chose qui distinguait cette signature d'une case cochée par le
 * donneur d'ordre.
 *
 * Le lien seul ne signe pas, il lui manque le code : le rendre était donc une
 * fuite moindre, pas une fuite nulle. Il sort quand même, et pour une raison
 * qui vaut d'être retenue — « un reliquat de debug qui sert accessoirement un
 * besoin produit » est exactement la forme qu'avait `otpClair`, et c'est
 * cette ambiguïté qui l'a fait survivre. On ne la reconduit pas d'un cran.
 *
 * ── Ce que ce retrait emporte, et par où ça doit revenir ─────────────────
 *
 * La copie manuelle du lien disparaît : un demandeur dont le courriel rebondit
 * n'a plus de recours depuis cet écran. Le besoin est réel et il est reconnu —
 * mais il doit revenir par un chemin nommé et tracé, un « renvoyer le lien »
 * visible, décidé pour lui-même. **Il ne revient pas en remettant une valeur
 * dans ce retour.** Qui lira ce code plus tard et croira réparer un oubli
 * lira d'abord ce paragraphe.
 *
 * Le besoin d'essayer le flux en local, lui, est entier et servi : sans SMTP
 * aucun message ne part, et `/dev/boite-mail` donne à lire le message tel que
 * le destinataire le recevrait — les deux facteurs ensemble, au même endroit
 * que lui. Voir `src/lib/email/dev-outbox.ts`, y compris pour ce qui rend
 * cette page impossible à atteindre en production.
 *
 * Ce qui reste rendu ne porte aucun secret : l'identifiant de l'`AccessToken`
 * (qui n'autorise rien — c'est l'empreinte du jeton clair qui fait foi) et la
 * fin de validité du lien.
 */

export type EmissionTokenParams = {
  etablissementId: string;
  scope: ScopeAccessToken;
  objetType: string;
  objetId: string;
  emailDestinataire: string;
  nomDestinataire?: string;
  prestataireId?: string;
  sujetMail: string;
  messageMail: string;
};

export type EmissionResultat = {
  accessTokenId: string;
  expireLe: Date;
};

export async function emettreAccessToken(
  params: EmissionTokenParams,
): Promise<EmissionResultat> {
  const user = await requireUser();
  await assertEtablissementOwnership(params.etablissementId);

  // `etablissementId` et `objetId` arrivent du même appel, et jusqu'ici rien
  // ne vérifiait qu'ils avaient un rapport entre eux : posséder son propre
  // établissement suffisait à faire émettre un jeton désignant le document
  // d'un autre client. C'est une server action, donc un point d'entrée
  // réseau — ces paramètres ne sont pas ceux qu'un formulaire a envoyés, ce
  // sont ceux que l'appelant a choisis.
  //
  // Le refus arrive avant la moindre écriture et avant le moindre envoi : ni
  // jeton en base, ni mail parti, ni code émis.
  if (
    !(await objetAppartientAEtablissement(
      params.objetType,
      params.objetId,
      params.etablissementId,
    ))
  ) {
    notFound();
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const ttl = ttlHoursFor(params.scope);
  // Horloge lue une seule fois : l'expiration du lien et celle du code
  // partent du même instant.
  const maintenant = new Date();
  const expireLe = expirationFromNow(ttl, maintenant);

  // OTP uniquement pour scopes à preuve (signature, dépôt de rapport).
  const besoinOtp =
    params.scope === "signature" || params.scope === "depot_rapport";
  const otp = besoinOtp ? generateOtp() : null;
  const otpHash = otp ? hashOtp(otp) : null;
  // Le code a sa propre expiration (10 minutes), bien plus courte que celle
  // du lien (72 h pour une signature, 7 jours pour un dépôt). Sans cette
  // date, le code à 6 chiffres restait valable aussi longtemps que le lien
  // — l'email annonçait 10 minutes, le code en durait des jours.
  const otpExpireLe = otp ? otpExpirationDate(maintenant) : null;

  const access = await prisma.accessToken.create({
    data: {
      id: `atk_${randomUUID()}`,
      tokenHash,
      etablissementId: params.etablissementId,
      scope: params.scope,
      objetType: params.objetType,
      objetId: params.objetId,
      prestataireId: params.prestataireId,
      emailDestinataire: params.emailDestinataire.toLowerCase().trim(),
      nomDestinataire: params.nomDestinataire,
      otpHash,
      otpExpireLe,
      expireLe,
      createdByUserId: user.id,
    },
  });

  const urlAcces = urlAccesPourToken(token);
  await envoyerMailAcces({
    to: params.emailDestinataire,
    nom: params.nomDestinataire,
    sujet: params.sujetMail,
    message: params.messageMail,
    urlAcces,
    otp,
    expireLe,
  });

  return {
    accessTokenId: access.id,
    expireLe,
  };
}

/**
 * Révoque un token (bouton « Annuler l'accès »).
 *
 * `updateMany` plutôt qu'`update` : la clause porte à la fois sur
 * l'identifiant du token et sur l'établissement dont on vient de vérifier
 * l'appartenance. Avec `update`, l'identifiant seul faisait foi — un user
 * pouvait présenter son propre établissement et révoquer le lien d'accès
 * d'un tiers.
 */
export async function revoquerAccessToken(
  etablissementId: string,
  accessTokenId: string,
  motif: string,
): Promise<void> {
  await assertEtablissementOwnership(etablissementId);
  await prisma.accessToken.updateMany({
    where: { id: accessTokenId, etablissementId },
    data: { revoqueLe: new Date(), revoqueMotif: motif },
  });
}
