import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Next 16 renomme `middleware` en `proxy` (fichier et export) et déprécie
 * l'ancien nom ; s'il trouve les deux fichiers, le build échoue (audit du
 * 2026-10-13, C6).
 *
 * L'emplacement compte autant que le nom : le fichier se place au niveau de
 * `app/`, donc dans `src/`. Un premier renommage a laissé `proxy.ts` à la
 * racine, où vivait `middleware.ts` : le build passait, ne listait plus
 * « Proxy », et plus aucune page n'exigeait de session. Rien d'autre ne l'aurait
 * signalé.
 */
describe("convention proxy de Next 16", () => {
  it("la garde vit dans src/proxy.ts, et nulle part ailleurs", () => {
    expect(existsSync(join(RACINE, "src", "app"))).toBe(true);
    expect(existsSync(join(RACINE, "src", "proxy.ts"))).toBe(true);
    for (const ailleurs of ["proxy.ts", "middleware.ts", "src/middleware.ts"]) {
      expect(existsSync(join(RACINE, ailleurs)), ailleurs).toBe(false);
    }
  });

  it("exporte `proxy` et un matcher", async () => {
    const garde = await import(join(RACINE, "src", "proxy.ts"));
    expect(typeof garde.proxy).toBe("function");
    expect(garde.config.matcher).toHaveLength(1);
  });
});
