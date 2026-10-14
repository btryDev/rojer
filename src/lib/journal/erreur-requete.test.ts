import { describe, expect, it } from "vitest";
import { ligneErreurRequete } from "./erreur-requete";

describe("ligneErreurRequete", () => {
  const contexte = {
    routerKind: "App Router",
    routePath: "/acces/[token]",
    routeType: "render",
    renderSource: "react-server-components",
  };

  it("rend une seule ligne de JSON, pile comprise", () => {
    const erreur = new Error("boum\nsur deux lignes");
    const ligne = ligneErreurRequete(erreur, { method: "GET", path: "/acces/abc" }, contexte);
    expect(ligne).not.toContain("\n");
    const lu = JSON.parse(ligne);
    expect(lu).toMatchObject({
      niveau: "error",
      evenement: "erreur_requete",
      methode: "GET",
      route: "/acces/[token]",
      typeRoute: "render",
      nom: "Error",
      message: "boum\nsur deux lignes",
    });
    expect(lu.pile).toContain("boum");
  });

  it("ne journalise ni le chemin réel ni la requête, qui portent des jetons", () => {
    const ligne = ligneErreurRequete(
      new Error("x"),
      { method: "GET", path: "/acces/JETON-SECRET?code=OTP-SECRET" },
      contexte,
    );
    expect(ligne).not.toContain("JETON-SECRET");
    expect(ligne).not.toContain("OTP-SECRET");
  });

  it("garde le digest d'une erreur passée par React", () => {
    const erreur = Object.assign(new Error("masquée"), { digest: "123456" });
    expect(JSON.parse(ligneErreurRequete(erreur, {}, {})).digest).toBe("123456");
  });

  it("accepte une valeur levée qui n'est pas une Error", () => {
    expect(JSON.parse(ligneErreurRequete("chaîne levée", {}, {})).message).toBe("chaîne levée");
  });
});
