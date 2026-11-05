import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { TAILLE_MAX_OCTETS } from "@/lib/rapports/validator";

/** "25mb" → octets (les seules unités écrites dans next.config). */
function octets(taille: unknown): number {
  const m = /^(\d+)(kb|mb)$/.exec(String(taille));
  if (!m) throw new Error(`taille illisible : ${String(taille)}`);
  return Number(m[1]) * 1024 ** (m[2] === "mb" ? 2 : 1);
}

/**
 * Audit du proxy (2026-11-05) : quand un proxy tourne, Next coupe le corps de
 * la requête à `proxyClientMaxBodySize` (10 Mo par défaut) avant l'action.
 * Laissé au défaut, il tronquait les rapports de 10 à 20 Mo que l'action
 * déclare accepter.
 */
describe("next.config : taille des corps de requête", () => {
  it("le proxy laisse passer tout ce que les actions serveur acceptent", () => {
    const actions = octets(nextConfig.experimental?.serverActions?.bodySizeLimit);
    expect(octets(nextConfig.experimental?.proxyClientMaxBodySize)).toBe(actions);
  });

  it("un rapport de la taille maximale tient dans la limite", () => {
    expect(octets(nextConfig.experimental?.proxyClientMaxBodySize)).toBeGreaterThan(TAILLE_MAX_OCTETS);
  });
});

/**
 * Audit du 2026-10-13 (B2) : la production répondait `x-powered-by: Next.js`.
 * L'en-tête n'apprend rien à l'utilisateur et dit à un attaquant quel cadre
 * viser ; Next l'émet par défaut, seule la configuration le retire.
 */
describe("next.config", () => {
  it("n'annonce pas le cadre dans un en-tête x-powered-by", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
