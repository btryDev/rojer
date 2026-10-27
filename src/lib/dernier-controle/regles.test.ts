import { describe, expect, it } from "vitest";
import { lireDateDeclaree, recoitUneDateDeclaree } from "./regles";

const MAINTENANT = new Date("2026-10-27T10:00:00Z");

describe("recoitUneDateDeclaree (ADR-051)", () => {
  const ligne = { archiveLe: null, salarieId: null, periodicite: "annuelle" as const };
  it("une ligne ouverte, matérielle et à rythme la reçoit", () => {
    expect(recoitUneDateDeclaree(ligne)).toBe(true);
  });
  it("pas un contrôle ponctuel : seule une pièce le solde", () => {
    expect(recoitUneDateDeclaree({ ...ligne, periodicite: "mise_en_service_uniquement" })).toBe(false);
  });
  it("pas l'échéance d'une personne, ni une ligne éteinte", () => {
    expect(recoitUneDateDeclaree({ ...ligne, salarieId: "s1" })).toBe(false);
    expect(recoitUneDateDeclaree({ ...ligne, archiveLe: MAINTENANT })).toBe(false);
  });
});

describe("lireDateDeclaree", () => {
  it("lit le jour civil de Paris", () => {
    const r = lireDateDeclaree("2026-03-15", MAINTENANT);
    expect(r).toEqual({ ok: true, date: new Date("2026-03-14T23:00:00Z") });
  });
  it("vide : retirer la date", () => {
    expect(lireDateDeclaree("", MAINTENANT)).toEqual({ ok: true, date: null });
  });
  it("accepte aujourd'hui, refuse demain", () => {
    expect(lireDateDeclaree("2026-10-27", MAINTENANT).ok).toBe(true);
    expect(lireDateDeclaree("2026-10-28", MAINTENANT).ok).toBe(false);
  });
  it("refuse une date inexistante ou mal formée", () => {
    expect(lireDateDeclaree("2026-02-30", MAINTENANT).ok).toBe(false);
    expect(lireDateDeclaree("15/03/2026", MAINTENANT).ok).toBe(false);
  });
  it("refuse au-delà de vingt ans", () => {
    expect(lireDateDeclaree("2006-10-27", MAINTENANT).ok).toBe(true);
    expect(lireDateDeclaree("2006-10-26", MAINTENANT).ok).toBe(false);
  });
});
