// Ce qu'une route appelée par une machine, sans session, partage avec les
// autres : la comparaison du secret présenté, et la lecture bornée du corps.
// Servi aux tâches (`/api/taches/chaque-minute`), au webhook Stripe et à la
// synchronisation de l'agenda du préventeur (ADR-064).

import { createHash, timingSafeEqual } from "node:crypto";

/** L'en-tête `Authorization: Bearer <secret>` est-il le bon ? Comparaison à temps constant. */
export function appelAutorise(entete: string | null, secret: string): boolean {
  const recu = /^Bearer (.+)$/.exec(entete ?? "")?.[1] ?? "";
  const empreinte = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(empreinte(recu), empreinte(secret));
}

/**
 * Le corps brut, lu au plus `max` octets — que l'expéditeur annonce sa
 * taille ou l'envoie par morceaux. `null` : trop gros.
 */
export async function lireCorpsBorne(request: Request, max: number): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  if (!request.body) return "";
  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let taille = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    taille += value.byteLength;
    if (taille > max) {
      await lecteur.cancel();
      return null;
    }
    morceaux.push(value);
  }
  return Buffer.concat(morceaux).toString("utf8");
}
