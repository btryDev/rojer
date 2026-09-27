// Un serveur sans stockage configuré ne dit pas « fichier introuvable » :
// rien n'est perdu, rien ne peut être lu (2026-09-27, `lot/stockage-supabase`).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rapportVerification: {
      findFirst: async () => ({ fichierCle: "rapports/e1/r1.pdf", fichierNomOriginal: "r.pdf" }),
    },
  },
}));

import { __oublierPiloteStockage } from "@/lib/storage";
import { calculerHashObjet } from "./hash-objet";

beforeEach(() => __oublierPiloteStockage());
afterEach(() => {
  vi.unstubAllEnvs();
  __oublierPiloteStockage();
});

describe("empreinte d'un rapport à signer, selon le stockage", () => {
  it("stockage non configuré : sa propre raison", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORAGE_DRIVER", "local");
    expect(await calculerHashObjet("rapport_verification", "r1", "e1")).toEqual({
      ok: false,
      raison: "stockage_non_configure",
    });
  });

  it("fichier absent d'un stockage configuré : « fichier introuvable »", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STORAGE_DRIVER", "local");
    vi.stubEnv("STORAGE_LOCAL_PATH", "/tmp/rojer-stockage-inexistant-pour-test");
    expect(await calculerHashObjet("rapport_verification", "r1", "e1")).toEqual({
      ok: false,
      raison: "fichier_introuvable",
    });
  });
});
