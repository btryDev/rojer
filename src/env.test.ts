import { describe, expect, it } from "vitest";
import {
  ErreurEnvironnement,
  avertissementsEnvironnement,
  validerEnvironnement,
  validerEnvironnementAuDemarrage,
} from "./env";

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
    expect(erreurDe({ ...BASE, STORAGE_DRIVER: "ftp" }).variables).toEqual(["STORAGE_DRIVER"]);
    expect(erreurDe({ ...BASE, PUBLIC_APP_URL: "rojer.fr" }).variables).toEqual([
      "PUBLIC_APP_URL",
    ]);
    expect(erreurDe({ ...BASE, APP_ENV: "prod" }).variables).toEqual(["APP_ENV"]);
    // EXPORTS_SIMULTANES : une valeur fausse retombait en silence sur 1.
    for (const v of ["0", "-1", "2.5", "deux"]) {
      expect(erreurDe({ ...BASE, EXPORTS_SIMULTANES: v }).variables).toEqual(["EXPORTS_SIMULTANES"]);
    }
    expect(() => validerEnvironnement({ ...BASE, EXPORTS_SIMULTANES: "3" })).not.toThrow();
    // Pilote d'e-mails : un nom connu, et la clé Mailpace avec lui.
    expect(erreurDe({ ...BASE, EMAIL_DRIVER: "resend" }).variables).toEqual(["EMAIL_DRIVER"]);
    // La clé manquante n'arrête pas le démarrage : `email/index.ts` refuse
    // l'envoi avant toute écriture, comme pour les autres règles de contexte.
    expect(() => validerEnvironnement({ ...BASE, EMAIL_DRIVER: "mailpace" })).not.toThrow();
    expect(() =>
      validerEnvironnement({ ...BASE, EMAIL_DRIVER: "mailpace", MAILPACE_API_KEY: "cle" }),
    ).not.toThrow();
    expect(() =>
      validerEnvironnement({ ...BASE, STORAGE_DRIVER: "supabase", PUBLIC_APP_URL: "https://rojer.fr" }),
    ).not.toThrow();
  });

  // APP_ENV absente d'une production non Vercel : un avertissement, pas une
  // faute — en faire une faute fermait toute la prod si Vercel n'exposait pas
  // ses variables système (revue du 2026-10-14, B1).
  it("signale APP_ENV d'une production hors Vercel sans fermer le serveur", () => {
    const prod = { ...BASE, NODE_ENV: "production" };
    expect(() => validerEnvironnement(prod)).not.toThrow();
    expect(avertissementsEnvironnement(prod)).toHaveLength(1);
    expect(avertissementsEnvironnement(prod)[0]).toMatch(/^APP_ENV absente/);
    expect(avertissementsEnvironnement({ ...prod, VERCEL_ENV: "production" })).toEqual([]);
    expect(avertissementsEnvironnement({ ...prod, APP_ENV: "production" })).toEqual([]);
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
  it("nomme toutes les requises manquantes en une fois", () => {
    const e = erreurDe({ NODE_ENV: "production", DATABASE_URL: BASE.DATABASE_URL });
    expect(e.variables.sort()).toEqual([
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
    ]);
  });
});
