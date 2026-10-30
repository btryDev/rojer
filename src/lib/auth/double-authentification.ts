import "server-only";

import QRCode from "qrcode";
import { auth } from "./better-auth";

/**
 * Ce que nos actions de double authentification (ADR-052 § 7) ajoutent au
 * plugin `twoFactor` de Better Auth : lire le code saisi, préparer l'écran
 * d'activation, oublier les appareils de confiance. Le reste — secret,
 * vérification, verrou — est au plugin.
 */

/**
 * Préfixe des identifiants d'« appareil de confiance » que le plugin écrit
 * dans `AuthVerification` (`trust-device-<aléa>`, valeur = l'id du compte).
 * Écrit en dur par Better Auth, non exporté : à relire à chaque montée de
 * version (`double-authentification.test.ts` le compare au code du paquet).
 */
export const PREFIXE_APPAREIL_DE_CONFIANCE = "trust-device-";

/**
 * Oublier tous les appareils de confiance du compte. Better Auth ne les
 * efface qu'un par un, celui du navigateur qui désactive ; on passe par son
 * adaptateur (table `AuthVerification`, hors compte) plutôt que par le client
 * Prisma brut, réservé à `better-auth.ts` (ADR-051).
 */
export async function oublierAppareilsDeConfiance(userId: string): Promise<void> {
  const { adapter } = await auth.$context;
  await adapter.deleteMany({
    model: "verification",
    where: [
      { field: "value", value: userId },
      { field: "identifier", operator: "starts_with", value: PREFIXE_APPAREIL_DE_CONFIANCE },
    ],
  });
}

export type CodeSaisi =
  | { genre: "application"; valeur: string }
  | { genre: "secours"; valeur: string };

/**
 * Un seul champ pour les deux sortes de code : six chiffres viennent de
 * l'application ; dix lettres et chiffres, d'un code de secours — rendu sous
 * la forme où Better Auth le garde (`abcde-12345`), casse comprise. Espaces
 * et tirets saisis sont ignorés : on recopie un code comme on le lit.
 */
export function codeSaisi(brut: string): CodeSaisi | null {
  const nu = brut.replace(/[\s-]/g, "");
  if (/^\d{6}$/.test(nu)) return { genre: "application", valeur: nu };
  if (/^[A-Za-z0-9]{10}$/.test(nu)) {
    return { genre: "secours", valeur: `${nu.slice(0, 5)}-${nu.slice(5)}` };
  }
  return null;
}

export type DonneesActivation = {
  /** Le QR code de l'URI `otpauth://`, en image intégrée (rien ne sort). */
  qr: string;
  /** La clé à saisir à la main, par groupes de quatre. */
  cle: string;
  codesSecours: string[];
};

/**
 * L'écran d'activation, calculé ici : le QR code se dessine côté serveur,
 * sans service tiers (le secret ne quitte pas l'app), et la clé est relue
 * dans l'URI plutôt qu'à côté — l'image et le texte disent la même chose.
 */
export async function donneesActivation(
  totpURI: string,
  codesSecours: string[],
): Promise<DonneesActivation> {
  const secret = new URL(totpURI).searchParams.get("secret");
  if (!secret) throw new Error("URI TOTP sans secret");
  const qr = await QRCode.toDataURL(totpURI, { margin: 1, width: 208, errorCorrectionLevel: "M" });
  return { qr, cle: secret.match(/.{1,4}/g)!.join(" "), codesSecours };
}
