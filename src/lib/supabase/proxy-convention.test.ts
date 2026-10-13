import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Next 16 renomme `middleware` en `proxy` (fichier et export) et déprécie
 * l'ancien nom ; s'il trouve les deux fichiers, le build échoue (audit du
 * 2026-10-13, C6). La garde d'authentification ne doit vivre que sous le nom
 * en vigueur.
 */
describe("convention proxy de Next 16", () => {
  it("la garde vit dans proxy.ts, plus dans middleware.ts", () => {
    expect(existsSync(join(RACINE, "proxy.ts"))).toBe(true);
    for (const ancien of ["middleware.ts", "src/middleware.ts"]) {
      expect(existsSync(join(RACINE, ancien)), ancien).toBe(false);
    }
  });

  it("exporte `proxy` et un matcher", async () => {
    const module = await import(join(RACINE, "proxy.ts"));
    expect(typeof module.proxy).toBe("function");
    expect(module.config.matcher).toHaveLength(1);
  });
});
