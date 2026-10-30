import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { motDePasseDivulgue } from "./mot-de-passe-divulgue";

/**
 * Mots de passe divulgués (ASVS V6.2.12) par k-anonymat : seuls cinq
 * caractères de l'empreinte partent, la comparaison se fait ici.
 */
const MDP = "un-mot-de-passe-quelconque";
const SHA = createHash("sha1").update(MDP).digest("hex").toUpperCase();

function service(corps: string, statut = 200) {
  return vi.fn<typeof fetch>(async () => new Response(corps, { status: statut }));
}

describe("motDePasseDivulgue", () => {
  it("n'envoie que les cinq premiers caractères de l'empreinte", async () => {
    const appel = service("");
    await motDePasseDivulgue(MDP, appel);
    const url = String(appel.mock.calls[0][0]);
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${SHA.slice(0, 5)}`);
    expect(url).not.toContain(SHA.slice(5));
    expect(url).not.toContain(MDP);
  });

  it("divulgué quand le suffixe figure avec un compte positif", async () => {
    expect(await motDePasseDivulgue(MDP, service(`AAAA:3\r\n${SHA.slice(5)}:42\r\n`))).toBe(true);
  });

  it("absent quand le suffixe n'y est pas, ou seulement en remplissage (compte nul)", async () => {
    expect(await motDePasseDivulgue(MDP, service("AAAA:3\r\nBBBB:1"))).toBe(false);
    expect(await motDePasseDivulgue(MDP, service(`${SHA.slice(5)}:0`))).toBe(false);
  });

  it("service en panne ou injoignable : indéterminé, sans lever", async () => {
    expect(await motDePasseDivulgue(MDP, service("", 503))).toBeNull();
    const injoignable = vi.fn<typeof fetch>(async () => {
      throw new DOMException("délai dépassé", "TimeoutError");
    });
    expect(await motDePasseDivulgue(MDP, injoignable)).toBeNull();
  });
});
