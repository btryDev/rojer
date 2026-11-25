import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/alertes", () => ({ alerter: vi.fn(), alerterUneFoisParJour: vi.fn() }));

const { silenceAdmis } = await import("./synchronisation");
const H = 60 * 60 * 1000;

describe("le silence admis de l'agent, au passage de 9 h", () => {
  it("du mardi au vendredi : 26 h (la veille au soir, plus une marge)", () => {
    expect(silenceAdmis(new Date("2026-12-01T08:00:00Z"))).toBe(26 * H); // mardi 9 h, Paris
    expect(silenceAdmis(new Date("2026-12-04T08:00:00Z"))).toBe(26 * H); // vendredi
  });

  it("le lundi couvre le week-end ; samedi et dimanche, rien n'est attendu", () => {
    expect(silenceAdmis(new Date("2026-11-30T08:00:00Z"))).toBe(74 * H); // lundi
    expect(silenceAdmis(new Date("2026-12-05T08:00:00Z"))).toBeNull(); // samedi
    expect(silenceAdmis(new Date("2026-12-06T08:00:00Z"))).toBeNull(); // dimanche
  });
});
