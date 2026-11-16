import { describe, expect, it, vi } from "vitest";

// Le témoin extérieur (audit du 2026-11-16) : un battement par jour, sans
// donnée ; jamais d'erreur levée — un témoin injoignable alerte de lui-même.

vi.mock("server-only", () => ({}));

import { adresseDuTemoin, battre } from "./temoin";

describe("témoin des tâches", () => {
  it("l'adresse : absente ou vide = aucune ; espaces retirés", () => {
    expect(adresseDuTemoin({})).toBeNull();
    expect(adresseDuTemoin({ TEMOIN_TACHES_URL: "  " })).toBeNull();
    expect(adresseDuTemoin({ TEMOIN_TACHES_URL: " https://hc-ping.com/x " })).toBe("https://hc-ping.com/x");
  });

  it("sans adresse : rien n'est appelé", async () => {
    const envoyer = vi.fn();
    expect(await battre(null, envoyer)).toBe(false);
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("un appel vide à l'adresse ; un témoin injoignable ne lève pas", async () => {
    const envoyer = vi.fn(async () => new Response(null, { status: 200 }));
    expect(await battre("https://hc-ping.com/x", envoyer as never)).toBe(true);
    expect(envoyer).toHaveBeenCalledWith("https://hc-ping.com/x", expect.objectContaining({ method: "GET" }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await battre("https://hc-ping.com/x", (async () => Promise.reject(new Error("réseau"))) as never)).toBe(false);
  });
});
