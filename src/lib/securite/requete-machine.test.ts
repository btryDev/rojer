import { describe, expect, it } from "vitest";
import { appelAutorise, lireCorpsBorne } from "./requete-machine";

const SECRET = "s".repeat(32);

describe("appelAutorise", () => {
  it("seul « Bearer <secret> » exact est autorisé", () => {
    expect(appelAutorise(`Bearer ${SECRET}`, SECRET)).toBe(true);
    for (const faux of [null, "", SECRET, `Bearer ${SECRET}x`, `bearer ${SECRET}`, `Bearer ${SECRET.slice(1)}`]) {
      expect(appelAutorise(faux, SECRET)).toBe(false);
    }
  });
});

describe("lireCorpsBorne", () => {
  const morceaux = (...parties: string[]) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        for (const p of parties) c.enqueue(new TextEncoder().encode(p));
        c.close();
      },
    });

  it("rend le corps brut, octet pour octet", async () => {
    const corps = '{"é":"€"}';
    expect(await lireCorpsBorne(new Request("http://x", { method: "POST", body: corps }), 1024)).toBe(corps);
  });

  it("refuse un corps annoncé trop gros, sans le lire", async () => {
    const r = new Request("http://x", { method: "POST", body: "x", headers: { "content-length": "999999" } });
    expect(await lireCorpsBorne(r, 10)).toBeNull();
  });

  it("refuse un corps envoyé par morceaux sans taille annoncée, compté en octets", async () => {
    const r = new Request("http://x", { method: "POST", body: morceaux("€€", "€€"), duplex: "half" } as RequestInit);
    // 4 caractères, 12 octets.
    expect(await lireCorpsBorne(r, 10)).toBeNull();
  });
});
