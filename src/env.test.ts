import { describe, expect, it } from "vitest";
import { ErreurEnvironnement, validerEnvironnement, validerEnvironnementAuDemarrage } from "./env";

// Validation au démarrage (audit Next.js du 2026-10-14, M6). Ce qu'on éprouve :
// une variable requise manquante est NOMMÉE, sa valeur jamais citée ; une
// optionnelle absente passe ; le build n'exige rien.

const BASE = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://u:secret-db@localhost:5433/duerp",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_xxx",
};

function erreurDe(env: Record<string, string | undefined>): ErreurEnvironnement {
  try {
    validerEnvironnement(env);
  } catch (e) {
    if (e instanceof ErreurEnvironnement) return e;
    throw e;
  }
  throw new Error("aucune erreur levée");
}

describe("validerEnvironnement", () => {
  it("accepte le minimum, toutes les optionnelles absentes", () => {
    expect(() => validerEnvironnement(BASE)).not.toThrow();
  });

  it("nomme chaque variable requise manquante", () => {
    const e = erreurDe({ NODE_ENV: "development" });
    expect(e.variables.sort()).toEqual([
      "DATABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
    ]);
    expect(e.message).toContain("DATABASE_URL : absente");
  });

  it("une variable posée vide est absente", () => {
    expect(erreurDe({ ...BASE, DATABASE_URL: "  " }).variables).toEqual(["DATABASE_URL"]);
  });

  it("ne cite jamais une valeur dans le message", () => {
    const e = erreurDe({ ...BASE, DATABASE_URL: "mysql://u:secret-db@h/x" });
    expect(e.variables).toEqual(["DATABASE_URL"]);
    expect(e.message).not.toContain("secret-db");
  });

  it("vérifie la forme d'une optionnelle posée, pas sa présence", () => {
    expect(erreurDe({ ...BASE, STORAGE_DRIVER: "s3" }).variables).toEqual(["STORAGE_DRIVER"]);
    expect(erreurDe({ ...BASE, PUBLIC_APP_URL: "rojer.fr" }).variables).toEqual([
      "PUBLIC_APP_URL",
    ]);
    expect(erreurDe({ ...BASE, APP_ENV: "prod" }).variables).toEqual(["APP_ENV"]);
    expect(() =>
      validerEnvironnement({ ...BASE, STORAGE_DRIVER: "supabase", PUBLIC_APP_URL: "https://rojer.fr" }),
    ).not.toThrow();
  });

  it("exige APP_ENV d'une production hors Vercel, pas d'une production Vercel", () => {
    const prod = { ...BASE, NODE_ENV: "production" };
    expect(erreurDe(prod).variables).toEqual(["APP_ENV"]);
    expect(() => validerEnvironnement({ ...prod, VERCEL_ENV: "production" })).not.toThrow();
    expect(() => validerEnvironnement({ ...prod, APP_ENV: "production" })).not.toThrow();
  });
});

describe("validerEnvironnementAuDemarrage", () => {
  it("n'exige rien pendant next build", () => {
    expect(() =>
      validerEnvironnementAuDemarrage({ NEXT_PHASE: "phase-production-build" }),
    ).not.toThrow();
  });

  it("lève hors build", () => {
    expect(() => validerEnvironnementAuDemarrage({ NODE_ENV: "development" })).toThrow(
      ErreurEnvironnement,
    );
  });
});

describe("toutes les fautes en une fois", () => {
  it("signale APP_ENV avec une requise manquante, pas au démarrage suivant", () => {
    const e = erreurDe({ NODE_ENV: "production", DATABASE_URL: BASE.DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL: BASE.NEXT_PUBLIC_SUPABASE_URL });
    expect(e.variables.sort()).toEqual(["APP_ENV", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  });
});
