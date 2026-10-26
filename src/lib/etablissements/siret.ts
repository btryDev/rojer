import { z } from "zod";

/**
 * Le SIRET identifie un établissement : les neuf premiers chiffres sont le
 * SIREN de l'entreprise, les cinq derniers (le NIC) désignent le site.
 *
 * Module pur, partagé par le parcours d'onboarding (client et serveur) et par
 * la fiche établissement : une seule règle de validation pour les deux portes.
 */

/** Retire les espaces de saisie (« 123 456 789 00012 »). */
export function normaliserSiret(saisie: string): string {
  return saisie.replace(/\s+/g, "");
}

/**
 * La Poste immatricule ses bureaux sous un seul SIREN, et leurs SIRET ne
 * respectent pas la clé de Luhn : l'INSEE les valide par une somme des
 * chiffres multiple de 5.
 */
const SIREN_LA_POSTE = "356000000";

function cleDeLuhnValide(chiffres: string): boolean {
  let somme = 0;
  for (let i = 0; i < chiffres.length; i++) {
    let n = Number(chiffres[chiffres.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
  }
  return somme % 10 === 0;
}

/** Vrai si la chaîne (déjà normalisée) est un SIRET valide. */
export function estSiretValide(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  if (cleDeLuhnValide(siret)) return true;
  if (!siret.startsWith(SIREN_LA_POSTE)) return false;
  const somme = [...siret].reduce((s, c) => s + Number(c), 0);
  return somme % 5 === 0;
}

/** Le SIREN d'un SIRET valide : ses neuf premiers chiffres. */
export function sirenDuSiret(siret: string): string {
  return siret.slice(0, 9);
}

export const MESSAGE_SIRET_REQUIS = "Le SIRET de l'établissement est obligatoire.";
export const MESSAGE_SIRET_INVALIDE =
  "SIRET invalide : 14 chiffres, tels qu'ils figurent sur votre avis de situation INSEE ou votre Kbis.";

/** Champ SIRET obligatoire : espaces retirés, 14 chiffres, clé de contrôle. */
export const siretSchema = z.preprocess(
  (v) => (typeof v === "string" ? normaliserSiret(v) : v),
  z
    .string({ message: MESSAGE_SIRET_REQUIS })
    .min(1, MESSAGE_SIRET_REQUIS)
    .refine(estSiretValide, MESSAGE_SIRET_INVALIDE),
);
