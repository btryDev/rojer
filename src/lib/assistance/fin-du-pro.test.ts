import { beforeEach, describe, expect, it, vi } from "vitest";

// ADR-063 § 7, point 1 : la fin connue du Pro — une résiliation sur la copie
// de Rojer, ou une baisse planifiée chez Stripe vers une formule sans rendez-vous.

const h = vi.hoisted(() => ({ baisse: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/abonnements/baisse", () => ({ lireBaissePrevue: h.baisse }));

const { finDuProPrevue } = await import("./fin-du-pro");

const LE = new Date("2026-12-10T00:00:00Z");
const LIGNE = { stripeSubscriptionId: "sub_1", finPrevueLe: null, resilieEnFinDePeriode: false, finPeriode: LE };

beforeEach(() => {
  vi.clearAllMocks();
  h.baisse.mockResolvedValue(null);
});

describe("finDuProPrevue", () => {
  it("une résiliation se lit sur la copie, sans appeler Stripe", async () => {
    expect(await finDuProPrevue({ ...LIGNE, resilieEnFinDePeriode: true })).toEqual(LE);
    expect(h.baisse).not.toHaveBeenCalled();
  });

  it("une baisse planifiée vers une formule sans rendez-vous : sa date", async () => {
    h.baisse.mockResolvedValue({ priceId: "p", lookupKey: "rojer_essentiel_annuel", le: LE });
    expect(await finDuProPrevue(LIGNE)).toEqual(LE);
    expect(h.baisse).toHaveBeenCalledWith("sub_1");
  });

  it("un changement qui garde le rendez-vous (Pro annuel vers mensuel) n'est pas une fin", async () => {
    h.baisse.mockResolvedValue({ priceId: "p", lookupKey: "rojer_pro_mensuel", le: LE });
    expect(await finDuProPrevue(LIGNE)).toBeNull();
  });

  it("une formule visée inconnue (prix sans clé) n'est pas dite une fin", async () => {
    h.baisse.mockResolvedValue({ priceId: "p", lookupKey: null, le: LE });
    expect(await finDuProPrevue(LIGNE)).toBeNull();
  });

  it("Stripe injoignable : rien n'est annoncé", async () => {
    h.baisse.mockRejectedValue(new Error("réseau"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await finDuProPrevue(LIGNE)).toBeNull();
  });

  it("sans ligne d'abonnement : rien", async () => {
    expect(await finDuProPrevue(null)).toBeNull();
  });
});
