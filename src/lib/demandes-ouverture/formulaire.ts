// Le formulaire « Me prévenir » de `/bientot` (2026-11-23, `lib/ouverture.ts`) :
// ce que la page et l'action partagent. Hors du module `"use server"`, qui
// n'exporte que des fonctions async.

import { z } from "zod";

/**
 * Le champ piège : caché aux personnes (hors écran, hors tabulation, ignoré
 * des lecteurs d'écran), rempli par les robots qui remplissent tout. Rempli,
 * l'action répond le même succès sans rien écrire. Un nom ordinaire, que
 * l'auto-remplissage d'un navigateur ne connaît pas.
 */
export const CHAMP_PIEGE = "site_internet";

/** L'adresse, ramenée en minuscules : une même adresse n'a qu'une ligne. */
export const schemaDemandeOuverture = z.object({
  email: z
    .string("Saisissez votre adresse e-mail.")
    .trim()
    .min(1, "Saisissez votre adresse e-mail.")
    .max(254, "Adresse e-mail trop longue.")
    .pipe(z.email("Adresse e-mail invalide."))
    .transform((e) => e.toLowerCase()),
});

/** `email` posé : c'est noté, à cette adresse. */
export type EtatDemandeOuverture = { erreur?: string; email?: string };
