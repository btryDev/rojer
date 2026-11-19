import { describe, expect, it } from "vitest";
import {
  OTP_DELAI_RENVOI_SECONDES,
  generateOtp,
  hashOtp,
  otpEstExpire,
  otpExpirationDate,
  renvoiOtpAutorise,
  verifyOtp,
} from "./otp";

describe("OTP", () => {
  it("génère un code à 6 chiffres", () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it("vérifie un OTP valide", () => {
    const otp = generateOtp();
    const h = hashOtp(otp);
    expect(verifyOtp(otp, h)).toBe(true);
  });

  it("rejette un OTP incorrect", () => {
    const otp = "123456";
    const h = hashOtp(otp);
    expect(verifyOtp("999999", h)).toBe(false);
    expect(verifyOtp("12345", h)).toBe(false); // longueur
    expect(verifyOtp("1234567", h)).toBe(false);
  });

  it("rejette un hash mal formé", () => {
    expect(verifyOtp("123456", "notahash")).toBe(false);
  });

  it("calcule une expiration 10 minutes après now", () => {
    const now = new Date("2026-04-23T12:00:00Z");
    const exp = otpExpirationDate(now);
    expect(exp.toISOString()).toBe("2026-04-23T12:10:00.000Z");
  });
});

describe("expiration du code", () => {
  const emisLe = new Date("2026-04-23T12:00:00Z");
  const expireLe = otpExpirationDate(emisLe);

  it("accepte un code dans sa fenêtre de validité", () => {
    expect(otpEstExpire(expireLe, new Date("2026-04-23T12:00:01Z"))).toBe(false);
    expect(otpEstExpire(expireLe, new Date("2026-04-23T12:09:59Z"))).toBe(false);
  });

  it("accepte encore le code à la seconde exacte de l'expiration", () => {
    expect(otpEstExpire(expireLe, new Date("2026-04-23T12:10:00Z"))).toBe(false);
  });

  it("refuse le code une seconde après l'expiration", () => {
    expect(otpEstExpire(expireLe, new Date("2026-04-23T12:10:01Z"))).toBe(true);
  });

  it("refuse un code bien après, alors que le lien lui court encore des jours", () => {
    // C'est exactement le défaut corrigé : le lien de signature vit ~~72 h~~
    // 7 jours (2026-11-19),
    // le code ne doit pas vivre aussi longtemps.
    expect(otpEstExpire(expireLe, new Date("2026-04-25T09:00:00Z"))).toBe(true);
  });

  it("traite une expiration absente comme périmée (fail closed)", () => {
    expect(otpEstExpire(null, new Date("2026-04-23T12:00:01Z"))).toBe(true);
  });
});

describe("renvoi d'un nouveau code", () => {
  const emisLe = new Date("2026-04-23T12:00:00Z");
  const expireLe = otpExpirationDate(emisLe);

  it("refuse un renvoi immédiat et annonce l'attente restante", () => {
    const r = renvoiOtpAutorise(expireLe, new Date("2026-04-23T12:00:10Z"));
    expect(r.autorise).toBe(false);
    if (!r.autorise) {
      expect(r.attendreSecondes).toBe(OTP_DELAI_RENVOI_SECONDES - 10);
    }
  });

  it("autorise le renvoi une fois le délai écoulé", () => {
    const r = renvoiOtpAutorise(expireLe, new Date("2026-04-23T12:01:00Z"));
    expect(r.autorise).toBe(true);
  });

  it("autorise le renvoi quand le code est expiré", () => {
    // Le cas d'usage : le destinataire ouvre son mail le lendemain, le lien
    // est encore valide mais son code est mort — il doit pouvoir en obtenir
    // un nouveau, sinon le document devient impossible à signer.
    const r = renvoiOtpAutorise(expireLe, new Date("2026-04-24T08:00:00Z"));
    expect(r.autorise).toBe(true);
  });

  it("autorise le renvoi sur un token sans expiration enregistrée", () => {
    const r = renvoiOtpAutorise(null, new Date("2026-04-23T12:00:01Z"));
    expect(r.autorise).toBe(true);
  });
});
