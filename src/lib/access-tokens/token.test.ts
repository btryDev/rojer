import { describe, expect, it } from "vitest";
import {
  generateToken,
  hashToken,
  ttlHoursFor,
  expirationFromNow,
} from "./token";

describe("AccessToken", () => {
  it("génère un token base64url de longueur ≥ 40", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(40);
  });

  it("deux tokens ne collisionnent pas", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it("hash stable pour un même token", () => {
    const t = "abcdefghijklmnop";
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t).length).toBe(64);
  });

  it("TTL signature < TTL consultation", () => {
    expect(ttlHoursFor("signature")).toBeLessThan(ttlHoursFor("consultation"));
    expect(ttlHoursFor("depot_rapport")).toBe(168); // default 7j
  });

  it("un lien de signature vit 7 jours (décision du 2026-11-19, 72 h avant)", () => {
    expect(ttlHoursFor("signature")).toBe(168);
  });

  it("calcule l'expiration dans le futur", () => {
    const now = new Date("2026-04-23T12:00:00Z");
    const exp = expirationFromNow(72, now);
    expect(exp.toISOString()).toBe("2026-04-26T12:00:00.000Z");
  });
});
