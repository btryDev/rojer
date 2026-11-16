import { describe, expect, it, vi } from "vitest";

// Le nom et l'adresse de la facture (audit du 2026-11-16) : posés depuis
// l'entreprise là où ils manquent, jamais par-dessus ce que le client a saisi.

vi.mock("server-only", () => ({}));

import { identiteAPoser, poserIdentiteDeFacturation } from "./identite-facturation";

const entreprise = { raisonSociale: "Brasserie du Port SARL", adresse: "3 quai Est, 13002 Marseille" };

describe("identiteAPoser", () => {
  it("client de l'essai (nom = adresse e-mail, sans adresse) : la raison sociale et l'adresse de l'entreprise", () => {
    expect(identiteAPoser({ name: "a@b.fr", email: "a@b.fr", address: null }, entreprise)).toEqual({
      name: "Brasserie du Port SARL",
      address: { line1: "3 quai Est, 13002 Marseille", country: "FR" },
    });
  });

  it("nom et adresse saisis par le client (Checkout, portail) : rien n'est écrasé", () => {
    expect(identiteAPoser({ name: "Autre SAS", email: "a@b.fr", address: { line1: "1 rue X" } }, entreprise)).toBeNull();
  });

  it("l'un sans l'autre : seul ce qui manque", () => {
    expect(identiteAPoser({ name: "Autre SAS", email: "a@b.fr", address: null }, entreprise)).toEqual({
      address: { line1: "3 quai Est, 13002 Marseille", country: "FR" },
    });
    expect(identiteAPoser({ name: null, email: "a@b.fr", address: { line1: "1 rue X" } }, entreprise)).toEqual({ name: "Brasserie du Port SARL" });
  });

  it("aucune entreprise encore, ou des champs vides : rien", () => {
    expect(identiteAPoser({ name: "a@b.fr", email: "a@b.fr" }, null)).toBeNull();
    expect(identiteAPoser({ name: "a@b.fr", email: "a@b.fr" }, { raisonSociale: " ", adresse: "" })).toBeNull();
  });
});

describe("poserIdentiteDeFacturation", () => {
  const db = (e: typeof entreprise | null) => ({ entreprise: { findFirst: vi.fn(async () => e) } }) as never;

  it("met à jour le client Stripe seulement s'il y a quelque chose à poser", async () => {
    const update = vi.fn();
    const stripe = (client: object) => ({ customers: { retrieve: vi.fn(async () => client), update } }) as never;
    await poserIdentiteDeFacturation(stripe({ name: "a@b.fr", email: "a@b.fr" }), db(entreprise), "cus_1");
    expect(update).toHaveBeenCalledWith("cus_1", expect.objectContaining({ name: "Brasserie du Port SARL" }));
    update.mockClear();
    await poserIdentiteDeFacturation(stripe({ name: "X", email: "a@b.fr", address: { line1: "1" } }), db(entreprise), "cus_1");
    await poserIdentiteDeFacturation(stripe({ deleted: true }), db(entreprise), "cus_1");
    expect(update).not.toHaveBeenCalled();
  });

  it("Stripe muet : l'erreur remonte (l'appelant ne prélève pas)", async () => {
    const stripe = { customers: { retrieve: vi.fn(async () => Promise.reject(new Error("réseau"))), update: vi.fn() } } as never;
    await expect(poserIdentiteDeFacturation(stripe, db(entreprise), "cus_1")).rejects.toThrow();
  });
});
