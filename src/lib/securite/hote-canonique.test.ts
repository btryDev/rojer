import { describe, expect, it } from "vitest";
import { redirectionWww } from "./hote-canonique";

const PUBLIQUE = "https://rojer.fr";

describe("redirectionWww", () => {
  it("renvoie www vers l'adresse publique, chemin et paramètres compris", () => {
    expect(redirectionWww("www.rojer.fr", "/conditions", "?source=stripe", PUBLIQUE)).toBe(
      "https://rojer.fr/conditions?source=stripe",
    );
    expect(redirectionWww("www.rojer.fr", "/", "", PUBLIQUE)).toBe("https://rojer.fr/");
  });

  it("ignore la casse et le port de l'hôte demandé", () => {
    expect(redirectionWww("WWW.Rojer.FR:443", "/login", "", PUBLIQUE)).toBe("https://rojer.fr/login");
  });

  it("accepte une adresse publique écrite avec un « / » final", () => {
    expect(redirectionWww("www.rojer.fr", "/conditions", "", "https://rojer.fr/")).toBe(
      "https://rojer.fr/conditions",
    );
  });

  it("laisse passer l'adresse publique elle-même et tout autre hôte", () => {
    expect(redirectionWww("rojer.fr", "/", "", PUBLIQUE)).toBeNull();
    expect(redirectionWww("app-818c5cef-038d-4b93-bf27-efc6a78b9e1c.cleverapps.io", "/", "", PUBLIQUE)).toBeNull();
    expect(redirectionWww("www.www.rojer.fr", "/", "", PUBLIQUE)).toBeNull();
    expect(redirectionWww("wwwrojer.fr", "/", "", PUBLIQUE)).toBeNull();
  });

  it("ne touche pas au développement local", () => {
    expect(redirectionWww("127.0.0.1:3005", "/", "", "http://localhost:3000")).toBeNull();
    expect(redirectionWww("localhost:3000", "/", "", "http://localhost:3000")).toBeNull();
  });

  it("ne renvoie rien sans hôte ni adresse publique lisible", () => {
    expect(redirectionWww(null, "/", "", PUBLIQUE)).toBeNull();
    expect(redirectionWww("www.rojer.fr", "/", "", null)).toBeNull();
    expect(redirectionWww("www.rojer.fr", "/", "", "pas une adresse")).toBeNull();
  });

  it("ne renvoie jamais vers un autre hôte, même avec un chemin en « // »", () => {
    const cible = redirectionWww("www.rojer.fr", "//ailleurs.example/piege", "", PUBLIQUE);
    expect(cible).not.toBeNull();
    expect(new URL(cible!).host).toBe("rojer.fr");
  });
});
