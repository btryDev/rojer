// Le choix du pilote par les variables d'environnement, et le refus du disque
// local en production (patron de `email/index.ts`).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __oublierPiloteStockage,
  getStorage,
  StockageNonConfigure,
  stockageEnService,
} from "./index";
import { LocalFileStorage } from "./local";
import { S3FileStorage } from "./s3";

const VARIABLES = [
  "NODE_ENV",
  "CELLAR_ADDON_HOST",
  "CELLAR_ADDON_KEY_ID",
  "CELLAR_ADDON_KEY_SECRET",
  "STORAGE_DRIVER",
  "STORAGE_BUCKET",
  "STORAGE_LOCAL_PATH",
] as const;
let avant: Record<string, string | undefined>;

function poser(env: Partial<Record<(typeof VARIABLES)[number], string>>) {
  for (const v of VARIABLES) {
    if (v === "NODE_ENV") continue;
    delete process.env[v];
  }
  vi.stubEnv("NODE_ENV", env.NODE_ENV ?? "development");
  for (const [k, v] of Object.entries(env)) if (k !== "NODE_ENV" && v !== undefined) process.env[k] = v;
  __oublierPiloteStockage();
}

beforeEach(() => {
  avant = Object.fromEntries(VARIABLES.map((v) => [v, process.env[v]]));
});
afterEach(() => {
  vi.unstubAllEnvs();
  for (const v of VARIABLES) {
    if (v === "NODE_ENV") continue;
    if (avant[v] === undefined) delete process.env[v];
    else process.env[v] = avant[v];
  }
  __oublierPiloteStockage();
});

describe("getStorage — le pilote selon les variables", () => {
  it("développement, rien de posé : le disque local", () => {
    poser({ NODE_ENV: "development" });
    expect(stockageEnService()).toBe(true);
    expect(getStorage()).toBeInstanceOf(LocalFileStorage);
  });

  it.each([undefined, "local"])(
    "production, STORAGE_DRIVER = %s : refusé, avec le motif exact",
    (driver) => {
      poser({ NODE_ENV: "production", STORAGE_DRIVER: driver });
      expect(stockageEnService()).toBe(false);
      expect(() => getStorage()).toThrow(StockageNonConfigure);
      expect(() => getStorage()).toThrow(/en production : le disque du serveur est en lecture seule et éphémère/);
      expect(() => getStorage()).toThrow(/Poser STORAGE_DRIVER=s3 et ses variables/);
    },
  );

  it("un pilote inconnu est refusé", () => {
    poser({ NODE_ENV: "production", STORAGE_DRIVER: "ftp" });
    expect(() => getStorage()).toThrow(/non supporté : ftp/);
  });

  it("aucune variable de stockage n'est exposée au navigateur", () => {
    // Une clé de stockage ne se préfixe jamais NEXT_PUBLIC_ : Next l'inlinerait
    // dans le bundle client.
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "index.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET|ROLE|STORAGE)/);
  });
});

// Cellar (Clever Cloud, 2026-10-30) : le pilote s3, ses variables, et rien de
// sensible dans un refus.
describe("pilote s3 (Cellar)", () => {
  const S3_COMPLET = {
    STORAGE_DRIVER: "s3",
    STORAGE_BUCKET: "rojer-pieces",
    CELLAR_ADDON_HOST: "cellar-c2.services.clever-cloud.com",
    CELLAR_ADDON_KEY_ID: "id-de-test",
    CELLAR_ADDON_KEY_SECRET: "secret-qui-ne-doit-pas-sortir",
  };

  it("complet : en service, en production comme en développement", () => {
    for (const NODE_ENV of ["production", "development"]) {
      poser({ ...S3_COMPLET, NODE_ENV });
      expect(stockageEnService()).toBe(true);
      expect(getStorage()).toBeInstanceOf(S3FileStorage);
    }
  });

  it.each(["STORAGE_BUCKET", "CELLAR_ADDON_HOST", "CELLAR_ADDON_KEY_ID", "CELLAR_ADDON_KEY_SECRET"] as const)(
    "sans %s : hors service, le refus nomme la variable, jamais le secret",
    (manquante) => {
      poser({ ...S3_COMPLET, NODE_ENV: "production", [manquante]: undefined });
      expect(stockageEnService()).toBe(false);
      const e = (() => {
        try {
          getStorage();
        } catch (x) {
          return x as Error;
        }
        throw new Error("aucun refus");
      })();
      expect(e).toBeInstanceOf(StockageNonConfigure);
      expect(e.message).toContain(manquante);
      expect(e.message).not.toContain("secret-qui-ne-doit-pas-sortir");
    },
  );

  it("un hôte en http:// est refusé : les fichiers ne transitent jamais en clair", () => {
    poser({ ...S3_COMPLET, NODE_ENV: "production", CELLAR_ADDON_HOST: "http://cellar.exemple.fr" });
    expect(stockageEnService()).toBe(false);
    expect(() => getStorage()).toThrow(/https/);
  });
});
