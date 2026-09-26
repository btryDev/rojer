import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
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
import { envoiEnService } from "@/lib/email";
import { generateOtp, hashOtp, otpExpirationDate } from "@/lib/signatures/otp";

/**
 * **Ce module n'est volontairement pas `"use server"`.** `emettreAccessToken`
 * vivait dans `./actions.ts`, donc était un point d'entrée réseau qui
 * acceptait le sujet et le corps du courriel en texte libre : un compte
 * gratuit pouvait envoyer en boucle, depuis l'expéditeur Rojer et à n'importe
 * quelle adresse, un « Facture impayée, cliquez… » portant un lien `/acces/…`
 * légitime. Ici, seul du code serveur l'atteint. Son unique appelant,
 * `demanderSignature`, valide ses entrées et DÉRIVE le texte du courriel de
 * l'objet signé (`@/lib/signatures/libelle-document`).
 *
 * Trois barrières restent ici quand même, parce que c'est le seul endroit par
 * où passe tout envoi de lien et qu'un appelant futur ne les aura pas
 * forcément posées :
 * - la validation des entrées (`emissionSchema`) — adresse valide, longueurs
 *   bornées, aucun saut de ligne dans le sujet ni dans le nom ;
 * - la limite de fréquence, comptée EN BASE (voir plus bas) ;
 * - l'appartenance de l'objet à l'établissement.
 */

// ── Limite de fréquence ────────────────────────────────────────────────────
//
// COMPTÉE EN BASE, SUR LES `AccessToken` ÉMIS DANS L'HEURE. Un compteur en
// mémoire ne survit pas à une fonction serverless : chaque instance aurait
// le sien, et le suivant repartirait de zéro. Chaque lien émis est une ligne
// `AccessToken` avec son `createdAt` — la table EST déjà le journal des
// envois, il suffit de la compter. Aucune migration.
//
// LES SEUILS (décision) :
// - 10 liens par heure et par établissement. Un plan de prévention appelle
//   deux signatures, un permis de feu deux, un rapport une ou deux : une
//   matinée chargée d'une TPE — un plan, deux permis, et deux renvois après
//   une adresse mal tapée — tient sous 10. Au-delà, ce n'est plus l'usage
//   d'un site de moins de cinquante salariés.
// - 20 liens par heure et par utilisateur, tous établissements confondus.
//   Sans ce second plafond, la limite par établissement se contourne en
//   ouvrant des établissements (un compte en tient plusieurs, ADR-028). 20,
//   c'est deux sites au plafond dans la même heure.
//
// Le compte précède l'écriture sans verrou : des demandes simultanées
// peuvent dépasser le seuil du nombre de requêtes parallèles. C'est une
// borne contre l'envoi en boucle, pas un quota facturé ; un verrou n'y
// ajouterait rien qu'on puisse mesurer.
export const LIMITE_LIENS_PAR_ETABLISSEMENT_PAR_HEURE = 10;
export const LIMITE_LIENS_PAR_UTILISATEUR_PAR_HEURE = 20;
const UNE_HEURE_MS = 60 * 60 * 1000;

/** Aucun caractère de contrôle — saut de ligne, retour chariot, tabulation,
 *  NUL… : ils n'ont rien à faire dans un nom ou un sujet, et dans un sujet
 *  ils ouvrent l'injection d'en-tête. */
const SANS_CONTROLE = /^[^\p{Cc}]*$/u;

export const emissionSchema = z.object({
  etablissementId: z.string().min(1).max(100),
  scope: z.enum(ScopeAccessToken),
  objetType: z.string().min(1).max(64),
  objetId: z.string().min(1).max(100),
  emailDestinataire: z.string().trim().toLowerCase().email().max(254),
  nomDestinataire: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(SANS_CONTROLE)
    .optional(),
  prestataireId: z.string().min(1).max(100).optional(),
  sujetMail: z.string().trim().min(1).max(200).regex(SANS_CONTROLE),
  messageMail: z.string().trim().min(1).max(2000),
});

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

export type EmissionResultat =
  | { ok: true; accessTokenId: string; expireLe: Date }
  | { ok: false; raison: "frequence" | "envoi_hors_service"; message: string };

/**
 * Ce que le demandeur lit quand l'envoi n'est pas en service. Vrai à la
 * lettre : le refus arrive avant la création du jeton.
 */
export const MESSAGE_ENVOI_HORS_SERVICE =
  "La demande n'a pas été envoyée : l'envoi d'e-mails n'est pas encore en service dans Rojer. Aucun lien n'a été créé.";

export async function emettreAccessToken(
  entree: EmissionTokenParams,
): Promise<EmissionResultat> {
  const user = await requireUser();
  // `parse` et non `safeParse` : l'appelant légitime a déjà validé, une
  // entrée invalide ici est une faute de programmation, pas une saisie.
  const params = emissionSchema.parse(entree);
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

  // ~~Le jeton créé, puis l'envoi qui lève~~ (C38, 2026-09-26) : en
  // production, sans driver réel, chaque demande laissait un jeton orphelin et
  // rendait l'erreur générique de Next. L'envoi se sait hors service AVANT
  // toute écriture.
  if (!envoiEnService()) {
    return { ok: false, raison: "envoi_hors_service", message: MESSAGE_ENVOI_HORS_SERVICE };
  }

  // Limite de fréquence, avant toute écriture et tout envoi.
  const depuis = new Date(Date.now() - UNE_HEURE_MS);
  const [parEtablissement, parUtilisateur] = await Promise.all([
    prisma.accessToken.count({
      where: {
        etablissementId: params.etablissementId,
        createdAt: { gte: depuis },
      },
    }),
    prisma.accessToken.count({
      where: { createdByUserId: user.id, createdAt: { gte: depuis } },
    }),
  ]);
  if (
    parEtablissement >= LIMITE_LIENS_PAR_ETABLISSEMENT_PAR_HEURE ||
    parUtilisateur >= LIMITE_LIENS_PAR_UTILISATEUR_PAR_HEURE
  ) {
    return {
      ok: false,
      raison: "frequence",
      message:
        "Trop de liens envoyés dans l'heure. Réessayez un peu plus tard.",
    };
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
      emailDestinataire: params.emailDestinataire,
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
    ok: true,
    accessTokenId: access.id,
    expireLe,
  };
}
