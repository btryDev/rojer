import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  ouvert: true,
  baissePrevue: vi.fn(),
  retrieve: vi.fn(),
  membres: vi.fn(),
  invitations: vi.fn(),
}));
vi.mock("./saisie", () => ({ contexteDroits: () => ({}), offreLancee: () => m.ouvert }));
vi.mock("@/lib/stripe/config", () => ({ configurationStripe: () => ({ active: true }) }));
vi.mock("@/lib/stripe/client", () => ({ clientStripe: () => ({ subscriptions: { retrieve: m.retrieve } }) }));
vi.mock("@/lib/stripe/parcours", () => ({ baissePrevue: m.baissePrevue }));
vi.mock("@/lib/auth/membres", () => ({ membresDuCompte: m.membres, invitationsDuCompte: m.invitations }));

import type { Db } from "@/lib/auth/compte";
import { refusInvitationBaissePrevue } from "./baisse";

const db = { abonnement: { findUnique: async () => ({ stripeSubscriptionId: "sub_1" }) } } as unknown as Db;

beforeEach(() => {
  vi.clearAllMocks();
  m.ouvert = true;
  m.retrieve.mockResolvedValue({ id: "sub_1" });
  m.baissePrevue.mockResolvedValue({ priceId: "p", lookupKey: "rojer_essentiel_mensuel", le: new Date("2026-12-06") });
  m.membres.mockResolvedValue([{}]);
  m.invitations.mockResolvedValue([]);
});

describe("refusInvitationBaissePrevue", () => {
  it("une baisse vers Essentiel (1 utilisateur) est prévue et le compte en a déjà 1 : refus, qui dit quoi faire", async () => {
    expect(await refusInvitationBaissePrevue(db, "c1")).toMatch(/Essentiel.*1 utilisateur.*Gardez votre formule/);
  });

  it("les invitations en attente comptent ; sans baisse prévue, ou offre non lancée : rien", async () => {
    m.membres.mockResolvedValue([]);
    m.invitations.mockResolvedValue([{}]);
    expect(await refusInvitationBaissePrevue(db, "c1")).not.toBeNull();
    m.invitations.mockResolvedValue([]);
    expect(await refusInvitationBaissePrevue(db, "c1")).toBeNull();
    m.membres.mockResolvedValue([{}]);
    m.baissePrevue.mockResolvedValue(null);
    expect(await refusInvitationBaissePrevue(db, "c1")).toBeNull();
    m.ouvert = false;
    expect(await refusInvitationBaissePrevue(db, "c1")).toBeNull();
  });

  it("Stripe injoignable : refus (une invitation peut attendre)", async () => {
    m.retrieve.mockRejectedValue(new Error("délai"));
    expect(await refusInvitationBaissePrevue(db, "c1")).toMatch(/momentanément/);
  });
});
