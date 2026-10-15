// Résultats d'un rapport de vérification, leurs libellés, et ce qu'ils valent
// pour la ligne de suivi. MODULE PUR, sans zod : lu par le moteur de
// calendrier et par des composants clients. Sorti de `schema.ts` le
// 2026-10-14 (audit Next.js, M8) — `/login` chargeait zod par
// ui-kit → StatusPill → calendrier/etats → rapports/schema.

// Type seul : effacé à la compilation.
import type { StatutVerification } from "@prisma/client";

export const RESULTATS = [
  "conforme",
  "observations_mineures",
  "ecart_majeur",
  "non_verifiable",
] as const;

export type Resultat = (typeof RESULTATS)[number];

export const LABEL_RESULTAT: Record<Resultat, string> = {
  conforme: "Conforme",
  observations_mineures: "Observations mineures",
  ecart_majeur: "Écart majeur",
  non_verifiable: "Non vérifiable",
};

/**
 * Correspondance entre résultat saisi et statut Prisma de la Verification.
 *
 * ⚠ Trois résultats seulement. « Non vérifiable » n'y figure pas, et ce n'est
 * pas un oubli : la vérification **n'a pas eu lieu**. L'ancienne table la
 * mappait sur `a_planifier`, et `lib/rapports/actions.ts` écrivait ce statut
 * *avec* une `dateRealisee` — la vérification passait donc pour réalisée alors
 * que rien n'avait été contrôlé, et la prochaine échéance était repoussée
 * d'une période entière à compter de la date du rapport. Deux mensonges pour
 * un contrôle qui n'a pas pu se faire.
 *
 * Le traitement de « non vérifiable » est donc explicite côté action :
 * le rapport est conservé (c'est une pièce, le prestataire s'est déplacé), il
 * ne compte pas comme réalisation, et l'échéance ne bouge pas.
 */
/** Résultats qui valent réalisation du contrôle. */
export const RESULTATS_REALISES = [
  "conforme",
  "observations_mineures",
  "ecart_majeur",
] as const;

export type ResultatRealise = (typeof RESULTATS_REALISES)[number];

export function estResultatRealise(r: Resultat): r is ResultatRealise {
  return (RESULTATS_REALISES as readonly string[]).includes(r);
}

export const STATUT_DEPUIS_RESULTAT: Record<
  ResultatRealise,
  StatutVerification
> = {
  conforme: "realisee_conforme",
  observations_mineures: "realisee_observations",
  ecart_majeur: "realisee_ecart_majeur",
};

/**
 * La même table, lue depuis une chaîne quelconque — le résultat d'un rapport
 * tel qu'une lecture l'a ramené. `null` si le résultat est absent ou ne vaut
 * pas réalisation.
 *
 * Le réconciliateur et le calendrier réécrivaient chacun cette table en
 * `switch` : trois copies d'une correspondance qu'un résultat ajouté aurait
 * désaccordées (revue du 2026-09-14). Module pur, sûr côté client.
 */
export function statutDepuisResultat(
  resultat: string | null | undefined,
): (typeof STATUT_DEPUIS_RESULTAT)[ResultatRealise] | null {
  return resultat != null &&
    (RESULTATS_REALISES as readonly string[]).includes(resultat)
    ? STATUT_DEPUIS_RESULTAT[resultat as ResultatRealise]
    : null;
}
