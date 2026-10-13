import { prisma } from "@/lib/prisma";
import type { AccessToken, Prisma } from "@prisma/client";
import { OTP_ESSAIS_MAX } from "@/lib/signatures/otp";
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
 * Remplace le code OTP d'un token : nouveau hash, nouvelle expiration, et
 * compteur d'essais remis à son maximum.
 *
 * La remise à zéro du compteur est volontaire — un nouveau code mérite ses
 * essais — mais elle serait un contournement de l'anti-bruteforce si le
 * renvoi était illimité. C'est l'appelant qui doit avoir vérifié
 * `renvoiOtpAutorise` (délai minimal entre deux envois) avant d'arriver
 * ici. Un token déjà révoqué pour épuisement d'essais ne repasse pas par
 * ce chemin : `verifierAccessToken` le rejette en amont.
 */
export async function renouvelerOtp(
  accessTokenId: string,
  params: { otpHash: string; otpExpireLe: Date },
): Promise<void> {
  await prisma.accessToken.update({
    where: { id: accessTokenId },
    data: {
      otpHash: params.otpHash,
      otpExpireLe: params.otpExpireLe,
      otpEssaisRestants: OTP_ESSAIS_MAX,
    },
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
