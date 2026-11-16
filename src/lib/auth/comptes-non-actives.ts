import "server-only";
// Les inscriptions jamais activées (retours de test du 2026-11-16, audit de
// l'entrée) : une adresse mal tapée laissait un compte mort, sans moyen de le
// corriger, et l'adresse d'un tiers gardée sans durée. Au bout de
// `JOURS_AVANT_PURGE` jours sans activation, la tâche quotidienne l'efface.
//
// Sans risque pour un compte qui sert : un compte non activé n'a jamais pu se
// connecter (`requireEmailVerification`, mot de passe tiré au hasard à
// l'inscription) — ni compte, ni signature, ni invitation envoyée. Le filtre
// le redit quand même : une ligne qui porterait un de ces liens est laissée.
// Sessions, identifiants et double authentification partent avec la
// personne (cascade).

import { prisma } from "@/lib/prisma";
import { ajouterJours } from "@/lib/dates";
import { JOURS_AVANT_PURGE } from "./inscription";

export { JOURS_AVANT_PURGE };

export async function purgerComptesNonActives(maintenant: Date): Promise<{ supprimes: number }> {
  const { count } = await prisma.user.deleteMany({
    where: {
      emailVerified: false,
      createdAt: { lt: ajouterJours(maintenant, -JOURS_AVANT_PURGE) },
      membres: { none: {} },
      signatures: { none: {} },
      accessTokensEmis: { none: {} },
      demandesAssistance: { none: {} },
      acceptationsConditions: { none: {} },
      invitationsEmises: { none: {} },
    },
  });
  return { supprimes: count };
}
