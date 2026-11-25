import "server-only";
// ADR-063 § 7, point 1 : l'écran du rendez-vous annonce la fin connue de la
// formule Pro — une résiliation (copie de Rojer) ou une baisse planifiée vers
// une formule sans rendez-vous (relue chez Stripe, que la copie ne garde pas).

import { lireBaissePrevue } from "@/lib/abonnements/baisse";
import { finPrevueDe } from "@/lib/abonnements/droits";
import { FORMULES, formuleDeLookupKey } from "@/lib/abonnements/formules";

type Ligne = {
  stripeSubscriptionId: string | null;
  finPrevueLe: Date | null;
  resilieEnFinDePeriode: boolean;
  finPeriode: Date | null;
};

/**
 * Le jour où la formule Pro s'arrête, s'il est connu. Stripe injoignable : rien
 * n'est annoncé (noté) — la tâche quotidienne annule de toute façon au jour dit.
 */
export async function finDuProPrevue(ligne: Ligne | null): Promise<Date | null> {
  if (!ligne) return null;
  const resiliation = finPrevueDe(ligne);
  if (resiliation) return resiliation;
  try {
    const baisse = await lireBaissePrevue(ligne.stripeSubscriptionId);
    // Une formule visée inconnue (prix sans `lookup_key`) n'est pas dite une
    // fin : la tâche quotidienne n'annulera qu'au vu de la copie (relecture).
    const visee = baisse ? formuleDeLookupKey(baisse.lookupKey) : null;
    if (!baisse || !visee) return null;
    return FORMULES[visee.formule].quotas.heuresExpertParAn > 0 ? null : baisse.le;
  } catch (e) {
    console.error(`[rendez-vous] baisse prévue non lue : ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
