import { describe, it, expect } from "vitest";
import { entetesSecurite, politiqueContenu } from "./entetes";

const PROD = {
  supabaseUrl: "https://abcd.supabase.co",
  developpement: false,
};

function valeur(nom: string, opts = PROD): string | undefined {
  return entetesSecurite(opts).find(
    (e) => e.key.toLowerCase() === nom.toLowerCase(),
  )?.value;
}

describe("entetesSecurite", () => {
  it("interdit l'encadrement par les deux mécanismes", () => {
    expect(valeur("X-Frame-Options")).toBe("DENY");
    expect(valeur("Content-Security-Policy")).toBe("frame-ancestors 'none'");
  });

  it("la CSP bloquante ne porte QUE frame-ancestors", () => {
    // Le reste de la politique n'a été regardé dans aucun navigateur : le
    // rendre bloquant sans l'avoir observé casserait des pages en silence.
    expect(valeur("Content-Security-Policy")).not.toMatch(/script-src|default-src/);
    expect(valeur("Content-Security-Policy-Report-Only")).toMatch(
      /default-src 'self'/,
    );
  });

  it("pose nosniff, la politique de référent et HSTS", () => {
    expect(valeur("X-Content-Type-Options")).toBe("nosniff");
    expect(valeur("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valeur("Strict-Transport-Security")).toMatch(/^max-age=\d{8,}/);
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
      const csp = politiqueContenu({ supabaseUrl, developpement: false });
      expect(csp).toMatch(/connect-src 'self'(;|$)/);
    }
  });
});
