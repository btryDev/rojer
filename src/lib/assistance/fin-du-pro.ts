import "server-only";
// ADR-063 § 7, point 1 : l'écran du rendez-vous annonce la fin connue de la
// formule Pro — une résiliation (copie de Rojer) ou une baisse planifiée vers
// une formule sans rendez-vous (relue chez Stripe, que la copie ne garde pas).

import { lireBaissePrevue } from "@/lib/abonnements/baisse";
import { finPrevueDe } from "@/lib/abonnements/droits";
import { FORMULES } from "@/lib/abonnements/formules";
import { formuleDesPlafonds } from "@/lib/abonnements/quotas";

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
    if (!baisse) return null;
    return FORMULES[formuleDesPlafonds(baisse.lookupKey)].quotas.heuresExpertParAn > 0 ? null : baisse.le;
  } catch (e) {
    console.error(`[rendez-vous] baisse prévue non lue : ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
