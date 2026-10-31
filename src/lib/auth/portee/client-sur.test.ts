// `clientBorneSur` (ADR-051) : le client borné construit sur un AUTRE client
// brut — celui du serveur MCP stdio. Le vrai module, sans la simulation de
// `vitest.setup.ts`.

import { describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/auth/portee/client");
const { clientBorneSur } = await import("./client");

describe("clientBorneSur", () => {
  it("étend le client brut REÇU, pas celui de l'application", () => {
    const $extends = vi.fn(() => ({ etendu: true }));
    const client = clientBorneSur({ $extends } as never, { type: "compte", userId: "user-9" });
    expect($extends).toHaveBeenCalledTimes(1);
    expect(client).toEqual({ etendu: true });
  });

  it("refuse une portée sans identifiant", () => {
    const $extends = vi.fn();
    expect(() => clientBorneSur({ $extends } as never, { type: "compte", userId: "" })).toThrow(/portée/);
    expect($extends).not.toHaveBeenCalled();
  });
});
