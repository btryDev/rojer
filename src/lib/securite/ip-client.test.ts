import { describe, expect, it } from "vitest";
import { ipClient } from "./ip-client";

const entetes = (xff?: string) => new Headers(xff === undefined ? {} : { "x-forwarded-for": xff });

describe("ipClient", () => {
  it("lit l'unique entrée posée par la plateforme (Vercel)", () => {
    expect(ipClient(entetes("203.0.113.7"))).toBe("203.0.113.7");
    expect(ipClient(entetes("2001:db8::1"))).toBe("2001:db8::1");
  });

  it("lit la DERNIÈRE entrée : celles de gauche viennent du client", () => {
    // Un attaquant qui envoie son propre X-Forwarded-For ne choisit que la
    // partie gauche : le répartiteur ajoute l'adresse qu'il voit à droite.
    expect(ipClient(entetes("1.2.3.4, 198.51.100.9"))).toBe("198.51.100.9");
    expect(ipClient(entetes("forgé,  198.51.100.9 "))).toBe("198.51.100.9");
  });

  it("rend null sans en-tête ou sur une valeur qui n'est pas une IP", () => {
    expect(ipClient(entetes())).toBeNull();
    expect(ipClient(entetes(""))).toBeNull();
    expect(ipClient(entetes("1.2.3.4, pas-une-ip"))).toBeNull();
  });
});
