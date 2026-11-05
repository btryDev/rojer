import "server-only";
// Pourquoi la saisie est fermée sur un site, s'il y a lieu (ADR-053 § 14, lot
// D) : lecture seule, abonnement, ou site gelé. Lu pour l'annoncer dès
// l'ouverture des pages (`FermerLaSaisie`) ; le refus reste au serveur.

import { getOptionalCompte } from "@/lib/auth/compte";
import { droitsDuCompte } from "./saisie";
import { motifDuGel } from "./quotas";

/**
 * `annonce` : à dire ici — le gel n'a pas d'autre bandeau ; la lecture seule
 * et l'abonnement ont déjà le leur (`BandeauAbonnementDuCompte`).
 */
export async function saisieFermeeDuSite(etablissementId: string): Promise<{ motif: string; annonce: boolean } | null> {
  const c = await getOptionalCompte();
  if (!c) return null;
  if (c.compte.role === "lecture") return { motif: "Accès en lecture seule.", annonce: false };
  const droits = await droitsDuCompte(c.db, c.compte.compteId);
  if (!droits.saisie) return { motif: droits.bandeau?.message ?? "La saisie est fermée pour ce compte.", annonce: false };
  const gel = await motifDuGel(c.db, c.compte.compteId, { etablissementId });
  return gel ? { motif: gel, annonce: true } : null;
}
