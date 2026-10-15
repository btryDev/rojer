import { describe, it, expect } from "vitest";
import { entetesSecurite, nonceCsp, politiqueContenu } from "./entetes";

const PROD = {
  supabaseUrl: "https://abcd.supabase.co",
  developpement: false,
  nonce: "bm9uY2U=",
};

function valeur(nom: string): string | undefined {
  return entetesSecurite().find(
    (e) => e.key.toLowerCase() === nom.toLowerCase(),
  )?.value;
}

describe("entetesSecurite", () => {
  it("interdit l'encadrement par les deux mécanismes", () => {
    expect(valeur("X-Frame-Options")).toBe("DENY");
    expect(valeur("Content-Security-Policy")).toBe("frame-ancestors 'none'");
  });

  it("next.config ne pose que le plancher frame-ancestors, plus de Report-Only", () => {
    // La CSP complète est celle du proxy, à nonce : un nonce ne peut pas
    // venir d'un en-tête fixe, tiré une fois au build.
    expect(valeur("Content-Security-Policy")).not.toMatch(/script-src|default-src/);
    expect(valeur("Content-Security-Policy-Report-Only")).toBeUndefined();
  });

  it("pose nosniff, la politique de référent et HSTS", () => {
    expect(valeur("X-Content-Type-Options")).toBe("nosniff");
    expect(valeur("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valeur("Strict-Transport-Security")).toMatch(/^max-age=\d{8,}/);
  });

  it("HSTS couvre les sous-domaines de l'hôte, sans engager la liste preload", () => {
    // ASVS 5.0.0 V3.4.1, clause L2 (audit du 2026-10-13).
    const hsts = (valeur("Strict-Transport-Security") ?? "")
      .split(";")
      .map((d) => d.trim().toLowerCase());
    expect(hsts).toContain("includesubdomains");
    expect(hsts).not.toContain("preload");
  });

  it("Permissions-Policy coupe caméra, micro, géolocalisation, garde le presse-papiers", () => {
    const pp = valeur("Permissions-Policy") ?? "";
    for (const f of ["camera=()", "microphone=()", "geolocation=()"]) {
      expect(pp).toContain(f);
    }
    expect(pp).toContain("clipboard-write=(self)");
  });
});

describe("politiqueContenu", () => {
  it("autorise l'origine Supabase en connect-src, pas son chemin", () => {
    const csp = politiqueContenu({
      supabaseUrl: "https://abcd.supabase.co/auth/v1",
      developpement: false,
      nonce: "n",
    });
    expect(csp).toMatch(/connect-src 'self' https:\/\/abcd\.supabase\.co(;|$)/);
  });

  it("n'autorise 'unsafe-eval' qu'en développement", () => {
    expect(politiqueContenu(PROD)).not.toContain("'unsafe-eval'");
    expect(
      politiqueContenu({ ...PROD, developpement: true }),
    ).toContain("'unsafe-eval'");
  });

  it("une URL Supabase absente ou invalide ne produit pas de source fautive", () => {
    for (const supabaseUrl of [undefined, "", "pas une url"]) {
      const csp = politiqueContenu({ supabaseUrl, developpement: false, nonce: "n" });
      expect(csp).toMatch(/connect-src 'self'(;|$)/);
    }
  });
});

describe("politiqueContenu : scripts", () => {
  const scripts = (csp: string) =>
    csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src")) ?? "";

  it("n'admet un script qu'avec le nonce de la requête, sans 'unsafe-inline'", () => {
    const s = scripts(politiqueContenu(PROD));
    expect(s).toContain("'nonce-bm9uY2U='");
    expect(s).toContain("'strict-dynamic'");
    expect(s).not.toContain("'unsafe-inline'");
  });

  it("garde default-src, object-src, base-uri, form-action et frame-ancestors", () => {
    const csp = politiqueContenu(PROD);
    for (const d of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(csp).toContain(d);
    }
  });
});

describe("nonceCsp", () => {
  it("tire 128 bits en base64, différents à chaque appel", () => {
    const a = nonceCsp();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nonceCsp()).not.toBe(a);
  });
});
