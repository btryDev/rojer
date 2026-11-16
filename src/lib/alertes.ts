import "server-only";
// Les alertes d'exploitation de Rojer (ADR-053 § 5, amendé le 2026-11-10) :
// un e-mail à l'adresse `ALERTES_EMAIL`, pour ce qui demande un geste humain
// — un événement ou une relecture Stripe en échec durable, un litige, un
// remboursement. Toujours au journal aussi ; sans adresse ou sans envoi en
// service, au journal seulement. Ne lève jamais : une alerte manquée ne
// doit pas faire échouer ce qui l'a levée.
//
// Le texte est écrit par Rojer : des identifiants Stripe et des montants,
// jamais une charge utile reçue ni une donnée de l'utilisateur.

import { envoiEnService, motifErreur, sendMail } from "@/lib/email";
import { cleJourCivil } from "@/lib/dates";

export function adresseDesAlertes(env: Record<string, string | undefined> = process.env): string | null {
  return env.ALERTES_EMAIL?.trim() || null;
}

export async function alerter(sujet: string, lignes: string[]): Promise<void> {
  console.error(`ALERTE — ${sujet} — ${lignes.join(" ; ")}`);
  const to = adresseDesAlertes();
  if (!to || !envoiEnService()) return;
  try {
    await sendMail({ to, subject: `[Rojer] ${sujet}`, text: [...lignes, "", "— Rojer (alerte automatique)"].join("\n") });
  } catch (e) {
    console.error(`alerte non envoyée — ${motifErreur(e)}`);
  }
}

/** Les alertes déjà parties aujourd'hui, par clé (ce processus). */
const parties = new Map<string, string>();

/**
 * Une alerte qui se répéterait à chaque relecture (événements Stripe en
 * rafale, rapprochement, reprise d'un jour) : une fois par jour civil et par
 * clé, pour ce processus — chaque instance peut donc en envoyer une
 * (revue du 2026-11-16 : un double abonnement envoyait un e-mail par
 * événement). Le problème qui dure se redit le lendemain.
 */
export async function alerterUneFoisParJour(
  cle: string,
  sujet: string,
  lignes: string[],
  maintenant: Date = new Date(),
): Promise<void> {
  const jour = cleJourCivil(maintenant);
  if (parties.get(cle) === jour) return;
  parties.set(cle, jour);
  await alerter(sujet, lignes);
}

/** Pour les tests. */
export function oublierLesAlertesDuJour() {
  parties.clear();
}
