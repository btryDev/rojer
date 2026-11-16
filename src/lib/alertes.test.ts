import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const envoi = vi.hoisted(() => ({ sendMail: vi.fn(async () => undefined) }));
vi.mock("@/lib/email", () => ({ envoiEnService: () => true, motifErreur: () => "x", sendMail: envoi.sendMail }));

const { alerterUneFoisParJour, oublierLesAlertesDuJour } = await import("./alertes");

beforeEach(() => {
  vi.stubEnv("ALERTES_EMAIL", "alertes@exemple.fr");
  vi.spyOn(console, "error").mockImplementation(() => {});
  envoi.sendMail.mockClear();
  oublierLesAlertesDuJour();
});

describe("alerterUneFoisParJour (2026-11-16)", () => {
  it("une fois par clé et par jour civil de Paris ; le lendemain, de nouveau ; une autre clé, à part", async () => {
    const matin = new Date("2026-11-16T08:00:00Z");
    const soir = new Date("2026-11-16T21:00:00Z");
    const lendemain = new Date("2026-11-17T08:00:00Z");
    await alerterUneFoisParJour("plusieurs:cus_A", "s", ["l"], matin);
    await alerterUneFoisParJour("plusieurs:cus_A", "s", ["l"], soir);
    expect(envoi.sendMail).toHaveBeenCalledTimes(1);
    await alerterUneFoisParJour("plusieurs:cus_B", "s", ["l"], soir);
    expect(envoi.sendMail).toHaveBeenCalledTimes(2);
    await alerterUneFoisParJour("plusieurs:cus_A", "s", ["l"], lendemain);
    expect(envoi.sendMail).toHaveBeenCalledTimes(3);
  });
});
