import { prisma } from "@/lib/prisma";
import type { AccessToken, Prisma } from "@prisma/client";
import { sha256Hex } from "@/lib/signatures/hash";
import {
  OTP_ENVOIS_MAX_PAR_HEURE,
  OTP_ESSAIS_MAX,
  OTP_FENETRE_ENVOIS_MS,
} from "@/lib/signatures/otp";
import { hashToken } from "./token";

/**
 * Vérifie un token clair venu d'une URL publique `/acces/[token]`.
 * Retourne l'entité `AccessToken` si le token est valide (non expiré, non
 * révoqué, non consommé pour les scopes à usage unique), ou une raison
 * d'échec exploitable côté UI.
 */

export type TokenValide = { ok: true; token: AccessToken };
export type TokenInvalide =
  | { ok: false; raison: "inexistant" }
  | { ok: false; raison: "expire"; expireLe: Date }
  | { ok: false; raison: "revoque"; motif: string | null }
  | { ok: false; raison: "deja_utilise"; utiliseLe: Date };

export async function verifierAccessToken(
  tokenClair: string,
): Promise<TokenValide | TokenInvalide> {
  if (!tokenClair || tokenClair.length < 30) return { ok: false, raison: "inexistant" };
  const tokenHash = hashToken(tokenClair);
  const token = await prisma.accessToken.findUnique({ where: { tokenHash } });
  if (!token) return { ok: false, raison: "inexistant" };
  if (token.revoqueLe)
    return { ok: false, raison: "revoque", motif: token.revoqueMotif };
  if (token.expireLe.getTime() < Date.now())
    return { ok: false, raison: "expire", expireLe: token.expireLe };
  // `consultation` est multi-usage ; `signature` et `depot_rapport` mono-usage.
  if (
    token.utiliseLe &&
    (token.scope === "signature" || token.scope === "depot_rapport")
  ) {
    return { ok: false, raison: "deja_utilise", utiliseLe: token.utiliseLe };
  }
  return { ok: true, token };
}

/**
 * Réserve un essai de code AVANT de le comparer — et c'est tout le correctif.
 *
 * ~~`decrementOtpEssais`~~ (retiré le 2026-10-12) décrémentait APRÈS une
 * comparaison faite sur le compteur lu au début de la requête, et ne
 * révoquait qu'au passage exact à 0. Dix soumissions parallèles lisaient
 * toutes « 3 essais », comparaient toutes leur code, puis décrémentaient :
 * dix codes éprouvés pour trois promis, et la limite d'un code à six chiffres
 * se contournait en tirant en rafale (audit du 2026-10-12).
 *
 * La décrémentation est donc CONDITIONNELLE ET ATOMIQUE : une seule écriture
 * `otpEssaisRestants > 0` → `- 1`, que la base sérialise. Une requête qui ne
 * l'obtient pas ne compare rien. Le bon code consomme lui aussi son essai :
 * c'est le prix d'une borne qui tient, et il ne coûte rien — le lien est
 * consommé dans la foulée.
 *
 * `restants` est relu après coup pour le message ; sous concurrence il peut
 * être plus bas que ce que cette requête a laissé, jamais plus haut.
 */
export async function reserverEssaiOtp(
  accessTokenId: string,
): Promise<{ ok: true; restants: number } | { ok: false }> {
  const r = await prisma.accessToken.updateMany({
    where: {
      id: accessTokenId,
      otpEssaisRestants: { gt: 0 },
      revoqueLe: null,
      utiliseLe: null,
    },
    data: { otpEssaisRestants: { decrement: 1 } },
  });
  if (r.count !== 1) return { ok: false };
  const t = await prisma.accessToken.findUnique({
    where: { id: accessTokenId },
    select: { otpEssaisRestants: true },
  });
  return { ok: true, restants: Math.max(0, t?.otpEssaisRestants ?? 0) };
}

/**
 * Révoque un lien dont le dernier essai vient d'échouer. Conditionnelle :
 * un lien consommé entre-temps par le bon code garde sa trace « utilisé », et
 * une révocation antérieure garde son motif.
 */
export async function revoquerOtpEpuise(accessTokenId: string): Promise<void> {
  await prisma.accessToken.updateMany({
    where: {
      id: accessTokenId,
      otpEssaisRestants: { lte: 0 },
      revoqueLe: null,
      utiliseLe: null,
    },
    data: {
      revoqueLe: new Date(),
      revoqueMotif: `OTP épuisé (${OTP_ESSAIS_MAX} essais)`,
    },
  });
}

/**
 * Remplace le code OTP d'un token : nouveau hash, nouvelle expiration.
 *
 * ~~et compteur d'essais remis à son maximum~~ (retiré le 2026-10-13, ASVS
 * 5.0.0 V6.6.3). La remise à trois était dite volontaire — « un nouveau code
 * mérite ses essais » —, mais elle faisait du nombre de codes éprouvables sur
 * un lien une fonction du nombre de renvois : trois par code, un code par
 * minute, sur un lien de 72 h. LE COMPTEUR EST CELUI DU LIEN, nouveaux codes
 * compris : trois codes éprouvés au total, quelle que soit la cadence des
 * renvois. Ce que le signataire y perd est étroit — un code expiré ne consomme
 * aucun essai (`poserSignatureAvecToken` le refuse avant la réservation), seul
 * celui qui s'est trompé puis a redemandé un code garde ses essais restants —
 * et le mail comme la page disent « au total ».
 *
 * CONDITIONNELLE, comme la réservation d'un essai : le code n'est remplacé que
 * s'il est encore celui que l'appelant a lu (`otpExpireLeLu`), et le lien ni
 * révoqué, ni consommé, ni épuisé. Deux renvois simultanés lisaient le même
 * code, passaient tous deux le délai de 60 s (`renvoiOtpAutorise`) et
 * envoyaient deux codes ; un seul obtient désormais l'écriture. Rend `false`
 * si un autre renvoi l'a devancé ou si le lien n'accepte plus de code.
 */
export async function renouvelerOtp(
  accessTokenId: string,
  params: { otpHash: string; otpExpireLe: Date; otpExpireLeLu: Date | null },
): Promise<boolean> {
  const r = await prisma.accessToken.updateMany({
    where: {
      id: accessTokenId,
      otpExpireLe: params.otpExpireLeLu,
      otpEssaisRestants: { gt: 0 },
      revoqueLe: null,
      utiliseLe: null,
    },
    data: {
      otpHash: params.otpHash,
      otpExpireLe: params.otpExpireLe,
    },
  });
  return r.count === 1;
}

/** La clé du quota d'une adresse : son empreinte, jamais l'adresse en clair. */
function empreinteAdresse(emailDestinataire: string): string {
  return sha256Hex(emailDestinataire.trim().toLowerCase());
}

export type ReservationEnvoiOtp = { ok: true } | { ok: false; possibleLe: Date };

/**
 * Réserve l'envoi d'un code à une adresse — ADR-006, « max 5 envois d'OTP /
 * heure / email » (ASVS 5.0.0 V6.6.3, 2026-10-13). À appeler AVANT de toucher
 * au code : un refus laisse le code précédent valable.
 *
 * Ce qui compte : les liens à code émis vers cette adresse dans l'heure — leur
 * premier code part avec eux (`emission.ts`) —, plus les renvois de la fenêtre
 * en cours (`QuotaEnvoiOtp`). Les premiers sont LUS : ils ne passent pas par
 * ici, et seul un titulaire de compte en crée, sous sa propre limite. Les
 * seconds sont RÉSERVÉS, et c'est là que tient la garde : le chemin d'un
 * porteur de lien, le seul qui se rejoue sans compte, est le renvoi.
 *
 * La réservation est une écriture CONDITIONNELLE, que la base sérialise sur la
 * ligne de l'adresse — `envois < plafond` → `+ 1` —, comme la réservation d'un
 * essai (`reserverEssaiOtp`). Dix renvois simultanés vers une même adresse en
 * obtiennent cinq, pas dix. La ligne naît par `INSERT … ON CONFLICT DO
 * NOTHING` (atomique aussi), et la fenêtre — fixe, une heure — se rouvre par
 * une écriture conditionnée à son ancienneté, qu'une seule requête obtient.
 */
export async function reserverEnvoiOtp(
  emailDestinataire: string,
  maintenant: Date,
): Promise<ReservationEnvoiOtp> {
  const empreinte = empreinteAdresse(emailDestinataire);
  const ouverture = new Date(maintenant.getTime() - OTP_FENETRE_ENVOIS_MS);

  const liensRecents = await prisma.accessToken.findMany({
    where: {
      emailDestinataire,
      createdAt: { gte: ouverture },
      scope: { in: ["signature", "depot_rapport"] },
    },
    select: { createdAt: true },
  });
  const plafond = OTP_ENVOIS_MAX_PAR_HEURE - liensRecents.length;

  await prisma.quotaEnvoiOtp.createMany({
    data: [{ empreinteAdresse: empreinte, fenetreDebut: maintenant, envois: 0 }],
    skipDuplicates: true,
  });
  await prisma.quotaEnvoiOtp.updateMany({
    where: { empreinteAdresse: empreinte, fenetreDebut: { lte: ouverture } },
    data: { fenetreDebut: maintenant, envois: 0 },
  });
  if (plafond > 0) {
    const r = await prisma.quotaEnvoiOtp.updateMany({
      where: { empreinteAdresse: empreinte, envois: { lt: plafond } },
      data: { envois: { increment: 1 } },
    });
    if (r.count === 1) return { ok: true };
  }

  // Refusé : quand un envoi redeviendra possible. Les renvois se libèrent à la
  // fin de leur fenêtre, les liens une heure après leur émission ; si les seuls
  // liens suffisent à remplir le plafond, c'est le plus ancien qui libère.
  if (plafond <= 0) {
    const plusAncien = Math.min(...liensRecents.map((l) => l.createdAt.getTime()));
    return { ok: false, possibleLe: new Date(plusAncien + OTP_FENETRE_ENVOIS_MS) };
  }
  const q = await prisma.quotaEnvoiOtp.findUnique({
    where: { empreinteAdresse: empreinte },
    select: { fenetreDebut: true },
  });
  return {
    ok: false,
    possibleLe: new Date((q?.fenetreDebut ?? maintenant).getTime() + OTP_FENETRE_ENVOIS_MS),
  };
}

/**
 * Rend la place d'un envoi réservé puis non fait — le renvoi devancé par un
 * autre sur le même lien (`renouvelerOtp` rendu `false`). Sans elle, un
 * double clic consommait deux des cinq envois de l'heure pour un seul code
 * parti. Relative (`- 1`) et non absolue : elle commute avec les réservations
 * concurrentes, comme elles.
 */
export async function rendreEnvoiOtp(emailDestinataire: string): Promise<void> {
  await prisma.quotaEnvoiOtp.updateMany({
    where: { empreinteAdresse: empreinteAdresse(emailDestinataire), envois: { gt: 0 } },
    data: { envois: { decrement: 1 } },
  });
}

/**
 * Consomme un jeton à usage unique — le pendant atomique de la réservation.
 *
 * ~~`marquerUtilise`~~ (retiré le 2026-10-12) écrivait `utiliseLe` sans
 * condition, APRÈS la création de la signature : deux soumissions
 * simultanées du bon code passaient toutes deux `verifierAccessToken` et
 * posaient deux signatures. La consommation porte désormais la condition
 * `utiliseLe IS NULL AND revoqueLe IS NULL`, et elle se fait dans la même
 * transaction que la signature, AVANT elle : une seule requête l'obtient, la
 * seconde ne crée rien. Rend `false` si le jeton n'était plus consommable.
 */
export async function consommerJeton(
  client: Prisma.TransactionClient,
  accessTokenId: string,
  meta: { ip?: string; userAgent?: string },
): Promise<boolean> {
  const r = await client.accessToken.updateMany({
    where: { id: accessTokenId, utiliseLe: null, revoqueLe: null },
    data: {
      utiliseLe: new Date(),
      derniereUtilisationIp: meta.ip,
      derniereUtilisationUserAgent: meta.userAgent?.slice(0, 500),
    },
  });
  return r.count === 1;
}
