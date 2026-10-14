import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

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
