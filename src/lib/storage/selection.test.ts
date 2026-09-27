// Le choix du pilote par les variables d'environnement, et le refus du disque
// local en production (patron de `email/index.ts`).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const creer = vi.hoisted(() => vi.fn(() => ({ storage: { from: () => ({}) } })));
vi.mock("@supabase/supabase-js", () => ({ createClient: creer }));

import {
  __oublierPiloteStockage,
  getStorage,
  StockageNonConfigure,
  stockageEnService,
} from "./index";
import { LocalFileStorage } from "./local";
import { SupabaseFileStorage } from "./supabase";

const VARIABLES = [
  "NODE_ENV",
  "STORAGE_DRIVER",
  "STORAGE_BUCKET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "STORAGE_LOCAL_PATH",
] as const;
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
// Une clé service_role au format JWT : la seule forme acceptée (C47).
const CLE_SERVICE = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "service_role" })}.signature_qui_ne_doit_pas_sortir`;
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
  creer.mockClear();
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

const SUPABASE_COMPLET = {
  STORAGE_DRIVER: "supabase",
  STORAGE_BUCKET: "rojer-pieces",
  SUPABASE_SERVICE_ROLE_KEY: CLE_SERVICE,
  NEXT_PUBLIC_SUPABASE_URL: "https://projet.supabase.co",
};

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
      expect(() => getStorage()).toThrow(/STORAGE_DRIVER=supabase, STORAGE_BUCKET et SUPABASE_SERVICE_ROLE_KEY/);
    },
  );

  it("supabase, tout posé : le pilote Supabase, client construit avec la clé de service, sans session", () => {
    poser({ NODE_ENV: "production", ...SUPABASE_COMPLET });
    expect(stockageEnService()).toBe(true);
    expect(getStorage()).toBeInstanceOf(SupabaseFileStorage);
    expect(creer).toHaveBeenCalledWith("https://projet.supabase.co", CLE_SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it.each(["STORAGE_BUCKET", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"] as const)(
    "supabase sans %s : refusé, la variable nommée, aucune valeur dite",
    (manquante) => {
      poser({ NODE_ENV: "production", ...SUPABASE_COMPLET, [manquante]: undefined });
      expect(stockageEnService()).toBe(false);
      let message = "";
      try {
        getStorage();
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toContain(manquante);
      expect(message).not.toContain(CLE_SERVICE);
      expect(creer).not.toHaveBeenCalled();
    },
  );

  it("une clé collée avec blancs et guillemets est nettoyée avant d'être passée au client", () => {
    poser({
      NODE_ENV: "production",
      ...SUPABASE_COMPLET,
      SUPABASE_SERVICE_ROLE_KEY: `  "${CLE_SERVICE}"\n`,
      NEXT_PUBLIC_SUPABASE_URL: " https://projet.supabase.co\n",
    });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(stockageEnService()).toBe(true);
    getStorage();
    expect(creer).toHaveBeenCalledWith("https://projet.supabase.co", CLE_SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Le journal dit la forme et la longueur, jamais la valeur.
    const journal = info.mock.calls.map((c) => String(c[0])).join("\n");
    expect(journal).toMatch(/JWT à trois segments, rôle « service_role »/);
    expect(journal).not.toContain("signature_qui_ne_doit_pas_sortir");
    info.mockRestore();
  });

  it.each([
    ["sb_secret_nouveau_format_secret", /clé secrète au nouveau format/],
    [`${b64({ alg: "HS256" })}.${b64({ role: "anon" })}.sig`, /rôle « anon »/],
  ])("clé %s : refusée avant tout appel, motif clair, valeur tue", (cle, forme) => {
    poser({ NODE_ENV: "production", ...SUPABASE_COMPLET, SUPABASE_SERVICE_ROLE_KEY: cle });
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(stockageEnService()).toBe(false);
    let message = "";
    try {
      getStorage();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/utilisez la clé service_role au format JWT/);
    expect(message).toMatch(forme);
    expect(message).not.toContain(cle);
    expect(creer).not.toHaveBeenCalled();
    erreur.mockRestore();
  });

  it("un pilote inconnu est refusé", () => {
    poser({ NODE_ENV: "production", STORAGE_DRIVER: "s3" });
    expect(() => getStorage()).toThrow(/non supporté : s3/);
  });

  it("aucune variable de stockage n'est exposée au navigateur", () => {
    // La clé de service ne se préfixe jamais NEXT_PUBLIC_ : Next l'inlinerait
    // dans le bundle client.
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "index.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET|ROLE|STORAGE)/);
  });
});
