import "server-only";
import { headers } from "next/headers";
import { ipPourLimite } from "@/lib/securite/ip-client";
import { cleLimite, consommer, LIMITES, messageTropDeTentatives, type Verdict } from "@/lib/securite/limite-debit";

/**
 * La limite par réseau (/64 en IPv6, `ipPourLimite`) de la page d'un lien
 * (`/acces/[token]`) et de ses actions — demande de code, signature,
 * proposition — pour tous les scopes de lien (2026-11-21, décision de la
 * propriétaire). Comptée AVANT la lecture du jeton : la réponse est la même,
 * que le jeton existe ou non.
 */
async function limiter(action: "lien-page" | "lien-action"): Promise<Verdict> {
  const ip = ipPourLimite(await headers()) ?? "inconnue";
  return consommer([
    {
      cle: cleLimite(action, "ip", ip),
      limite: action === "lien-page" ? LIMITES.lienPageIp : LIMITES.lienActionIp,
    },
  ]);
}

/** La page d'un lien : 30 affichages par 10 minutes et par réseau. */
export function limiterPageDuLien(): Promise<Verdict> {
  return limiter("lien-page");
}

/**
 * Une action d'un lien : 10 par 10 minutes et par réseau. `null` : elle
 * passe ; sinon le message uniforme à rendre.
 */
export async function refusActionDuLien(): Promise<string | null> {
  const v = await limiter("lien-action");
  return v.ok ? null : messageTropDeTentatives(v.reessayerDansSecondes);
}
