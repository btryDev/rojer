import { describe, expect, it } from "vitest";
import { CHEMIN_DE_RETOUR_PAR_DEFAUT, cheminDeRetour } from "./chemin-de-retour";

/**
 * Le `next` d'une connexion vient de l'URL : n'importe qui peut forger un
 * lien `/login?next=…` et l'envoyer à un utilisateur. Ce qui en ressort ne
 * doit jamais quitter l'application (audit du 2026-10-13, C1 et C2).
 */
describe("chemin de retour après connexion", () => {
  it("garde un chemin interne, requête et ancre comprises", () => {
    expect(cheminDeRetour("/entreprises")).toBe("/entreprises");
    expect(cheminDeRetour("/etablissements/etab_1/duerp?onglet=2#risques")).toBe(
      "/etablissements/etab_1/duerp?onglet=2#risques",
    );
    expect(cheminDeRetour("/auth/reinitialisation")).toBe(
      "/auth/reinitialisation",
    );
  });

  it("retombe sur le défaut quand rien n'est donné", () => {
    for (const v of [null, undefined, "", 42, new File([], "x")]) {
      expect(cheminDeRetour(v)).toBe(CHEMIN_DE_RETOUR_PAR_DEFAUT);
    }
  });

  it("refuse tout ce qui sortirait de l'origine", () => {
    for (const v of [
      "https://evil.tld",
      "http://evil.tld/entreprises",
      "//evil.tld",
      "///evil.tld",
      "/\\evil.tld",
      "\\\\evil.tld",
      "/entreprises\\..\\evil",
      "@evil.tld",
      "evil.tld",
      "javascript:alert(1)",
      "/\tevil.tld",
      "/\n/evil.tld",
      "/entreprises\u0000",
      "/\u007f",
      // Segments point : la résolution d'URL les retire et FABRIQUE un « // »
      // que la chaîne brute ne contenait pas (revue du lot, bloquant).
      "/.//evil.tld",
      "/..//evil.tld",
      "/a/..//evil.tld",
      "/%2e//evil.tld",
      "/%2e%2e//evil.tld",
      "/.///evil.tld",
      `/${"a".repeat(2048)}`,
    ]) {
      expect(cheminDeRetour(v), JSON.stringify(v)).toBe(
        CHEMIN_DE_RETOUR_PAR_DEFAUT,
      );
    }
  });
});
