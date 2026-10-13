import { randomInt, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "./hash";

/**
 * OTP à 6 chiffres, usage unique, durée de vie courte.
 *
 * - Génération : RNG cryptographique (Node crypto.randomInt).
 * - Stockage : uniquement le SHA-256. Le clair n'est jamais persisté.
 * - Vérification : comparaison en temps constant (timingSafeEqual) pour
 *   éviter les attaques par timing.
 * - 3 essais par LIEN, nouveaux codes compris (compteur porté par
 *   `AccessToken.otpEssaisRestants`, qu'un renvoi ne remet pas à 3 depuis le
 *   2026-10-13 — voir `renouvelerOtp`).
 * - 5 envois de code par adresse et par heure (`OTP_ENVOIS_MAX_PAR_HEURE`).
 * - Expiration : 10 minutes, portée par `AccessToken.otpExpireLe`.
 *
 * Ce module reste **pur** : aucune lecture base, l'horloge est injectée.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;

/** Nombre d'essais accordés pour un LIEN, nouveaux codes compris. Doit rester aligné sur le
 *  `@default(3)` de `AccessToken.otpEssaisRestants` et sur le texte de
 *  l'email (« 3 essais au total sur ce lien »). */
export const OTP_ESSAIS_MAX = 3;

/** Délai minimal entre deux envois de code sur un même lien. Sans ce
 *  garde-fou, le bouton « renvoyer un code » devient un moyen de saturer la
 *  boîte du destinataire, et de remettre à zéro le compteur d'essais à
 *  volonté (donc de rendre le bruteforce du code à 6 chiffres réaliste). */
export const OTP_DELAI_RENVOI_SECONDES = 60;

/** Plafond des envois de code par adresse et par heure — ADR-006,
 *  « Anti-abus » : « max 5 envois d'OTP / heure / email ». L'envoi du lien
 *  compte, les renvois aussi (`reserverEnvoiOtp`). */
export const OTP_ENVOIS_MAX_PAR_HEURE = 5;
export const OTP_FENETRE_ENVOIS_MS = 60 * 60 * 1000;

export function generateOtp(): string {
  // 0…999999 padded en 6 chiffres. randomInt est uniforme (pas de biais modulo).
  const n = randomInt(0, 10 ** OTP_LENGTH);
  return n.toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(otp: string): string {
  return sha256Hex(otp);
}

export function verifyOtp(saisie: string, hashAttendu: string): boolean {
  if (saisie.length !== OTP_LENGTH) return false;
  const h = hashOtp(saisie);
  if (h.length !== hashAttendu.length) return false;
  const a = Buffer.from(h, "hex");
  const b = Buffer.from(hashAttendu, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Instant d'expiration d'un code émis à `now`. À écrire dans
 *  `AccessToken.otpExpireLe` au moment de la génération. */
export function otpExpirationDate(now: Date = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

/**
 * Le code est-il périmé ?
 *
 * **`null` vaut périmé.** Deux cas produisent une expiration absente : un
 * token émis avant l'introduction de la colonne, et un enregistrement
 * incomplet. Dans les deux cas, on refuse : un code à valeur probante ne
 * peut pas être accepté « parce qu'on ne sait pas quand il a été émis ».
 * Le destinataire n'est pas bloqué pour autant — le renvoi d'un nouveau
 * code régénère `otpExpireLe`.
 *
 * L'expiration est atteinte à la seconde près : à `otpExpireLe` exactement,
 * le code est encore accepté (`<` et non `<=`), pour ne pas pénaliser une
 * validation qui part pile à la limite.
 */
export function otpEstExpire(otpExpireLe: Date | null, now: Date): boolean {
  if (otpExpireLe === null) return true;
  return otpExpireLe.getTime() < now.getTime();
}

export type RenvoiOtp =
  | { autorise: true }
  | { autorise: false; attendreSecondes: number };

/**
 * Peut-on émettre un nouveau code sur ce lien ?
 *
 * La date d'émission n'est pas stockée : elle se déduit de l'expiration,
 * qui vaut toujours « émission + OTP_TTL_MINUTES ». On autorise le renvoi
 * dès que `OTP_DELAI_RENVOI_SECONDES` se sont écoulées depuis l'émission.
 *
 * Sans expiration connue (`null`), on autorise : c'est précisément le cas
 * d'un lien ancien devenu inutilisable, que le renvoi doit pouvoir réparer.
 */
export function renvoiOtpAutorise(
  otpExpireLe: Date | null,
  now: Date,
): RenvoiOtp {
  if (otpExpireLe === null) return { autorise: true };
  const emisLe = otpExpireLe.getTime() - OTP_TTL_MINUTES * 60 * 1000;
  const ecoulesSecondes = Math.floor((now.getTime() - emisLe) / 1000);
  if (ecoulesSecondes >= OTP_DELAI_RENVOI_SECONDES) return { autorise: true };
  return {
    autorise: false,
    attendreSecondes: OTP_DELAI_RENVOI_SECONDES - ecoulesSecondes,
  };
}
