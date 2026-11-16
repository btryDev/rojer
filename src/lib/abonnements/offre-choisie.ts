import "server-only";
// L'offre choisie sur la page publique (« Choisir Pro », mensuel ou annuel),
// gardée de l'inscription jusqu'à l'abonnement (retours de test du
// 2026-11-16) : le choix se perdait, et l'écran d'essai ne parlait que
// d'Essentiel. Un cookie du navigateur, posé à l'inscription : l'essai se fait
// toujours sur Essentiel (ADR-053 § 8) ; ce choix ne fait que se dire sur
// l'écran d'essai et se présélectionner sur la page Abonnement. Rien n'est
// facturé sur sa foi. Une valeur inconnue est ignorée.

import { cookies } from "next/headers";
import { estLookupKey, formuleDeLookupKey, type CleFormule, type Periodicite } from "./formules";
import { DUREE_ESSAI_JOURS } from "@/lib/stripe/parcours";

export const COOKIE_OFFRE_CHOISIE = "rojer-offre-choisie";

/** Garde l'offre (une clé de prix : `rojer_pro_annuel`…) si elle en est une. */
export async function retenirOffreChoisie(valeur: FormDataEntryValue | null): Promise<void> {
  if (!estLookupKey(valeur)) return;
  (await cookies()).set(COOKIE_OFFRE_CHOISIE, valeur, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Le temps de l'essai, et deux semaines de plus (activation tardive).
    maxAge: 60 * 60 * 24 * (DUREE_ESSAI_JOURS + 14),
  });
}

/** L'offre choisie sur la page publique, ou `null`. */
export async function lireOffreChoisie(): Promise<{ formule: CleFormule; periodicite: Periodicite } | null> {
  return formuleDeLookupKey((await cookies()).get(COOKIE_OFFRE_CHOISIE)?.value);
}
