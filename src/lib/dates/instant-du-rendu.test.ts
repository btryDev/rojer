import { describe, expect, it } from "vitest";
import { instantDuRendu } from "./instant-du-rendu";

// Hors rendu RSC, `cache()` de React n'a pas de dispatcher : on ne peut pas
// éprouver ici le partage entre le layout et la page (il se mesure, cf.
// `docs/revues/audit-nextjs-2026-10-14.md`, H2). On éprouve ce qui tient
// partout : l'instant rendu est un objet À SOI.
describe("instantDuRendu", () => {
  it("rend un Date neuf à chaque appel : le modifier ne touche pas les autres", () => {
    const a = instantDuRendu();
    const b = instantDuRendu();
    expect(a).not.toBe(b);
    const avant = b.getTime();
    a.setFullYear(1990);
    expect(b.getTime()).toBe(avant);
  });

  it("lit l'horloge, hors rendu, comme un new Date()", () => {
    const avant = Date.now();
    const t = instantDuRendu().getTime();
    expect(t).toBeGreaterThanOrEqual(avant);
    expect(t).toBeLessThanOrEqual(Date.now());
  });
});
