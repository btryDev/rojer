import { describe, expect, it } from "vitest";
import { lireHotesAutorises } from "./hotes";

/**
 * Liste des hôtes acceptés — une garde de sécurité, pas une commodité.
 *
 * `lireHotesAutorises` alimente la validation `Host`/`Origin`, qui protège de
 * la reliaison DNS. Trop permissive, elle laisse une page web visitée par
 * l'utilisateur faire parler son navigateur au serveur. ~~`lireHotePublic`~~
 * [2026-11-21, ADR-062 : retiré ; l'identifiant de ressource est
 * `PUBLIC_APP_URL` + `/api/mcp`, `mcp/oauth.ts`.]
 */

const env = (over: Record<string, string | undefined> = {}) =>
  over as unknown as NodeJS.ProcessEnv;

describe("lireHotesAutorises", () => {
  it("n'accepte pas la boucle locale en production (audit S8, ADR-062 § 9)", () => {
    const hotes = lireHotesAutorises(env({ NODE_ENV: "production", PUBLIC_APP_URL: "https://rojer.fr" }));
    expect(hotes).toEqual(["rojer.fr"]);
  });

  it("accepte toujours la boucle locale, pour le développement", () => {
    expect(lireHotesAutorises(env())).toEqual(
      expect.arrayContaining(["localhost", "127.0.0.1"]),
    );
  });

  it("retient les hôtes déclarés à la main", () => {
    expect(lireHotesAutorises(env({ MCP_HOTES: "rojer.fr, mcp.rojer.fr" }))).toEqual(
      expect.arrayContaining(["rojer.fr", "mcp.rojer.fr"]),
    );
  });

  it("réduit une URL déclarée à son seul hôte", () => {
    // La validation compare des noms d'hôte : un schéma ou un chemin laissé
    // dans la liste ne correspondrait jamais, et fermerait le serveur au
    // domaine qu'on croyait avoir ouvert.
    const hotes = lireHotesAutorises(env({ MCP_HOTES: "https://rojer.fr/api" }));
    expect(hotes).toContain("rojer.fr");
    expect(hotes).not.toContain("https://rojer.fr/api");
  });

  it("ne répète pas un hôte déclaré deux fois", () => {
    const hotes = lireHotesAutorises(
      env({ MCP_HOTES: "rojer.fr,rojer.fr", PUBLIC_APP_URL: "https://rojer.fr" }),
    );
    expect(hotes.filter((h) => h === "rojer.fr")).toHaveLength(1);
  });

  it("ignore les entrées vides d'une liste mal ponctuée", () => {
    const hotes = lireHotesAutorises(env({ MCP_HOTES: "rojer.fr,,  ,mcp.rojer.fr" }));
    expect(hotes).not.toContain("");
    expect(hotes).toEqual(expect.arrayContaining(["rojer.fr", "mcp.rojer.fr"]));
  });
});

describe("lireHotesAutorises — PUBLIC_APP_URL", () => {
  // Audit Next.js du 2026-10-14, H5 : sans `MCP_HOTES`, la production tire
  // son hôte de `PUBLIC_APP_URL`.
  it("retient l'hôte de PUBLIC_APP_URL, sans schéma ni port", () => {
    const hotes = lireHotesAutorises(env({ PUBLIC_APP_URL: "https://app.rojer.fr:443/" }));
    expect(hotes).toContain("app.rojer.fr");
  });

  it("n'ajoute rien quand c'est la boucle locale, déjà admise en développement", () => {
    expect(lireHotesAutorises(env({ PUBLIC_APP_URL: "http://localhost:3000" }))).toEqual(["localhost", "127.0.0.1"]);
  });

  it("ignore une PUBLIC_APP_URL illisible plutôt que de lever", () => {
    expect(lireHotesAutorises(env({ PUBLIC_APP_URL: "pas une url" }))).toEqual([
      "localhost",
      "127.0.0.1",
    ]);
  });
});
