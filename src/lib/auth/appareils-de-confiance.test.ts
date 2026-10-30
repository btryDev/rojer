import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { oublierAppareilsDeConfiance, PREFIXE_APPAREIL_DE_CONFIANCE } from "./appareils-de-confiance";

describe("appareils de confiance", () => {
  it("efface toutes celles du compte, et seulement elles", async () => {
    const adapter = { deleteMany: vi.fn(async () => 0) };
    await oublierAppareilsDeConfiance(adapter, "u-1");
    expect(adapter.deleteMany).toHaveBeenCalledWith({
      model: "verification",
      where: [
        { field: "value", value: "u-1" },
        { field: "identifier", operator: "starts_with", value: "trust-device-" },
      ],
    });
  });

  // Le préfixe est écrit en dur par Better Auth, non exporté : une montée de
  // version qui le changerait ferait effacer des lignes qui n'existent plus,
  // sans erreur.
  it("le préfixe est celui qu'écrit le plugin installé", () => {
    const racine = dirname(createRequire(import.meta.url).resolve("better-auth/plugins/two-factor"));
    const source = readFileSync(join(racine, "verify-two-factor.mjs"), "utf8");
    expect(source).toContain(`\`${PREFIXE_APPAREIL_DE_CONFIANCE}\${`);
  });
});
