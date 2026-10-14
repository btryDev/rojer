import { beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fonctions, sansCommentairesNiChaines } from "./tenancy-sonde";

/**
 * Les secrets se tirent au CSPRNG et se comparent en temps constant.
 *
 * ## Pourquoi ce fichier
 *
 * Vérification ASVS 5.0.0 du 2026-10-13 (V6.5.3, V11.2.1, V11.5.1) : passer
 * `generateToken` et `generateOtp` sur `Math.random`, et `verifyOtp` sur `===`,
 * laissait les 97 tests de `access-tokens/` et `signatures/` VERTS. Le code
 * était juste ; rien ne le tenait.
 *
 * ## Ce qui est vérifié
 *
 *  1. Statique : aucun `Math.random` dans le code des modules qui tirent ou
 *     vérifient un secret ; les fonctions de tirage appellent `randomBytes` /
 *     `randomInt` importés de `node:crypto` ; les comparaisons appellent
 *     `timingSafeEqual`.
 *  2. Comportement : `node:crypto` est espionné (les vraies fonctions restent
 *     appelées). Le tirage d'un jeton DOIT passer par `randomBytes` (≥ 32
 *     octets), celui d'un OTP par `randomInt`, et `verifyOtp` comme la clé MCP
 *     par `timingSafeEqual`. Plus la forme des valeurs, et une distribution
 *     grossière — qui n'attraperait pas un `Math.random` bien déguisé, d'où
 *     l'espion.
 */

const crypto = vi.hoisted(() => ({
  randomBytes: vi.fn(),
  randomInt: vi.fn(),
  timingSafeEqual: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const reel = await importOriginal<typeof import("node:crypto")>();
  crypto.randomBytes.mockImplementation(reel.randomBytes as never);
  crypto.randomInt.mockImplementation(reel.randomInt as never);
  crypto.timingSafeEqual.mockImplementation(reel.timingSafeEqual);
  const surcharge = { ...reel, ...crypto };
  return { ...surcharge, default: surcharge };
});

import { generateToken } from "@/lib/access-tokens/token";
import { generateOtp, hashOtp, verifyOtp } from "@/lib/signatures/otp";
import { clesEgales, resoudreScopeDepuisCle } from "@/lib/mcp/acces-http";

const RACINE = join(process.cwd(), "src/lib");
const MODULES_SECRETS = ["access-tokens", "signatures", "mcp", "auth"];

const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");
const corpsDe = (chemin: string, nom: string) => {
  const fn = fonctions(lire(chemin)).find((f) => f.nom === nom);
  if (!fn) throw new Error(`${chemin}:${nom} introuvable — la garde ne garde plus`);
  return fn.corps;
};
const importeDeCrypto = (chemin: string, nom: string) =>
  new RegExp(`import\\s*\\{[^}]*\\b${nom}\\b[^}]*\\}\\s*from\\s*["'](?:node:)?crypto["']`).test(
    lire(chemin),
  );

beforeEach(() => {
  crypto.randomBytes.mockClear();
  crypto.randomInt.mockClear();
  crypto.timingSafeEqual.mockClear();
});

describe("statique — le hasard et les comparaisons de secrets", () => {
  it("aucun Math.random dans les modules qui tirent ou vérifient un secret", () => {
    const fichiers = MODULES_SECRETS.flatMap((m) =>
      execSync(`find "${join(RACINE, m)}" -name "*.ts" -not -name "*.test.ts"`)
        .toString()
        .trim()
        .split("\n"),
    );
    expect(fichiers.length).toBeGreaterThan(10);
    const fautifs = fichiers.filter((f) =>
      /\bMath\s*\.\s*random\b/.test(sansCommentairesNiChaines(readFileSync(f, "utf8"))),
    );
    expect(fautifs, "Math.random n'est pas un générateur cryptographique.").toEqual([]);
  });

  it("le jeton d'accès et l'OTP se tirent par node:crypto", () => {
    expect(corpsDe("access-tokens/token.ts", "generateToken")).toMatch(/\brandomBytes\(/);
    expect(importeDeCrypto("access-tokens/token.ts", "randomBytes")).toBe(true);
    expect(corpsDe("signatures/otp.ts", "generateOtp")).toMatch(/\brandomInt\(/);
    expect(importeDeCrypto("signatures/otp.ts", "randomInt")).toBe(true);
  });

  it("verifyOtp et la clé MCP se comparent par timingSafeEqual, jamais par ===", () => {
    const otp = corpsDe("signatures/otp.ts", "verifyOtp");
    expect(otp).toMatch(/\btimingSafeEqual\(/);
    expect(importeDeCrypto("signatures/otp.ts", "timingSafeEqual")).toBe(true);
    // Les seules égalités tolérées portent sur des longueurs.
    const egalites = otp.split("\n").filter((l) => /[!=]==/.test(l));
    expect(egalites.filter((l) => !/\.length\b|OTP_LENGTH/.test(l))).toEqual([]);
    expect(otp).not.toMatch(/\.equals\(/);

    const cles = corpsDe("mcp/acces-http.ts", "clesEgales");
    expect(cles).toMatch(/\btimingSafeEqual\(/);
    expect(cles).not.toMatch(/[!=]==|\.equals\(/);
    expect(importeDeCrypto("mcp/acces-http.ts", "timingSafeEqual")).toBe(true);
    const resolution = corpsDe("mcp/acces-http.ts", "resoudreScopeDepuisCle");
    expect(resolution).toMatch(/\bclesEgales\(/);
    expect(resolution).not.toMatch(/cleAttendue\s*[!=]==|[!=]==\s*\w*\.?cleAttendue/);
  });
});

describe("comportement — jeton d'accès", () => {
  it("passe par randomBytes, 32 octets au moins", () => {
    generateToken();
    expect(crypto.randomBytes).toHaveBeenCalledTimes(1);
    expect(crypto.randomBytes.mock.calls[0][0]).toBeGreaterThanOrEqual(32);
  });

  it("rend 43 caractères base64url, tous distincts sur 2 000 tirages", () => {
    const jetons = Array.from({ length: 2000 }, generateToken);
    for (const j of jetons) expect(j).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Set(jetons).size).toBe(2000);
  });

  it("couvre l'alphabet de façon à peu près uniforme", () => {
    // Les 42 premiers caractères portent 6 bits pleins chacun (le 43ᵉ n'en
    // porte que 4) : 2 000 × 42 = 84 000 tirages sur 64 symboles, ~1 312 chacun.
    const freq = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      for (const c of generateToken().slice(0, 42)) freq.set(c, (freq.get(c) ?? 0) + 1);
    }
    expect(freq.size).toBe(64);
    for (const [c, n] of freq) {
      expect(n, `fréquence de « ${c} »`).toBeGreaterThan(1000);
      expect(n, `fréquence de « ${c} »`).toBeLessThan(1650);
    }
  });
});

describe("comportement — OTP", () => {
  it("passe par randomInt sur [0, 10⁶[", () => {
    generateOtp();
    expect(crypto.randomInt).toHaveBeenCalledWith(0, 1_000_000);
  });

  it("rend six chiffres, chaque premier chiffre à peu près aussi fréquent", () => {
    const freq = new Array(10).fill(0);
    for (let i = 0; i < 10_000; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
      freq[Number(otp[0])]++;
    }
    for (const n of freq) {
      expect(n).toBeGreaterThan(800);
      expect(n).toBeLessThan(1200);
    }
  });

  it("verifyOtp compare par timingSafeEqual, et tranche juste", () => {
    const otp = "042917";
    expect(verifyOtp(otp, hashOtp(otp))).toBe(true);
    expect(crypto.timingSafeEqual).toHaveBeenCalledTimes(1);
    expect(verifyOtp("042918", hashOtp(otp))).toBe(false);
    expect(verifyOtp("42917", hashOtp(otp))).toBe(false);
  });
});

describe("comportement — clé MCP", () => {
  const config = {
    cleAttendue: "k".repeat(40),
    etablissementId: "etab-1",
    hotesAutorises: [],
    originesAutorisees: [],
  };

  it("la clé fournie est comparée par timingSafeEqual", () => {
    expect(resoudreScopeDepuisCle("k".repeat(40), config)).toEqual({
      etablissementId: "etab-1",
    });
    expect(crypto.timingSafeEqual).toHaveBeenCalledTimes(1);
  });

  it("refuse une clé fausse, même de même longueur ou préfixe de la bonne", () => {
    expect(resoudreScopeDepuisCle("k".repeat(39) + "x", config)).toBeNull();
    expect(resoudreScopeDepuisCle("k".repeat(20), config)).toBeNull();
    expect(clesEgales("a", "b")).toBe(false);
    expect(crypto.timingSafeEqual).toHaveBeenCalled();
  });
});
