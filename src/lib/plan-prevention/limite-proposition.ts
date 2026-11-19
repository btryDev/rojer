import { ipPourLimite } from "@/lib/securite/ip-client";
import { cleLimite, consommer, LIMITES, type Verdict } from "@/lib/securite/limite-debit";

/**
 * La limite des propositions de modification d'un plan (ADR-061 § 3), par
 * RÉSEAU (/64 en IPv6, `ipPourLimite`), comme les autres limites par IP.
 * À part de l'action, qui garde l'adresse complète pour la preuve.
 */
export function limiterProposition(entetes: { get(nom: string): string | null }): Promise<Verdict> {
  return consommer([
    { cle: cleLimite("proposition-plan", "ip", ipPourLimite(entetes) ?? "inconnue"), limite: LIMITES.propositionPlanIp },
  ]);
}
