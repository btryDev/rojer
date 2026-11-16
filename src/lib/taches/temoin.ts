import "server-only";
// Le témoin des tâches (audit Stripe du 2026-11-16) : une crontab arrêtée ne
// se signale pas d'elle-même — les alertes partent de la crontab. Le seul
// guet fiable est AU-DEHORS : un service de surveillance « par battement »
// (healthchecks.io, Better Stack Heartbeat…) qui attend un appel par jour et
// prévient quand il ne vient plus. La tâche du jour l'appelle quand elle a
// fini sans échec ; une tâche en échec n'appelle pas (l'alerte part déjà par
// e-mail, et le témoin, sans battement, alerte aussi).
//
// `TEMOIN_TACHES_URL` : l'adresse que le service donne. Absente : rien
// n'est appelé (le démarrage le signale, `env.ts`). L'appel ne porte rien :
// ni donnée, ni bilan — une requête vide.

import { fetchAvecDelai } from "@/lib/reseau/delai";

export function adresseDuTemoin(env: Record<string, string | undefined> = process.env): string | null {
  return env.TEMOIN_TACHES_URL?.trim() || null;
}

/** Donne le battement du jour. Ne lève jamais : un témoin injoignable alertera de lui-même. */
export async function battre(url: string | null = adresseDuTemoin(), envoyer: typeof fetch = fetchAvecDelai(10_000)): Promise<boolean> {
  if (!url) return false;
  try {
    const r = await envoyer(url, { cache: "no-store" });
    // Une adresse mal recopiée ou révoquée répond 404 : le témoin n'est alors
    // jamais armé, et rien d'autre ne le dirait.
    if (!r.ok) console.error(`témoin des tâches : réponse ${r.status}, vérifier TEMOIN_TACHES_URL`);
    return r.ok;
  } catch {
    console.error("témoin des tâches injoignable");
    return false;
  }
}
