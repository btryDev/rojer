// En-têtes EFFECTIVEMENT SERVIS par Next, chemin par chemin (ASVS V3.2.1,
// audit du 2026-10-13).
//
// `storage/servir.test.ts` lit l'objet `Response` de la route : il y voyait
// `Content-Security-Policy: sandbox` alors que le client recevait
// `frame-ancestors 'none'` seul. Sous `next start` (Next 16.3.8,
// `server/send-response.js`), les en-têtes de `next.config.ts` sont posés
// AVANT que la route réponde, et un en-tête de la route n'est ajouté que s'il
// est absent : pour une même clé, la configuration l'emporte. Entre deux
// règles de la configuration, la dernière qui correspond l'emporte
// (`server/lib/router-utils/resolve-routes.js`, `resHeaders[key] = value`).
//
// Ce test rejoue ces deux règles sur `nextConfig.headers()`, avec le
// compilateur de chemins de Next lui-même (`buildCustomRoute`), et non une
// réimplémentation. Le `next start` + `curl -sI` du 2026-10-13 en est la
// contre-épreuve (rapport du lot).

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildCustomRoute } = require("next/dist/server/lib/router-utils/filesystem.js") as {
  buildCustomRoute: (
    type: "header",
    item: { source: string; headers: { key: string; value: string }[] },
  ) => { match: (chemin: string) => false | Record<string, string>; headers: { key: string; value: string }[] };
};
import nextConfig from "../../../next.config";

const RACINE = path.resolve(__dirname, "../../..");

/** Les en-têtes que Next sert pour `chemin`, la route ayant posé `route`. */
async function entetesServis(
  chemin: string,
  route: Record<string, string> = {},
): Promise<Map<string, string>> {
  const regles = (await nextConfig.headers!()).map((r) => buildCustomRoute("header", r));
  const servis = new Map<string, string>();
  for (const regle of regles) {
    if (!regle.match(chemin)) continue;
    // La dernière règle qui correspond remplace la valeur d'une même clé.
    for (const { key, value } of regle.headers) servis.set(key.toLowerCase(), value);
  }
  // La route n'ajoute que ce que la configuration n'a pas posé.
  for (const [key, value] of Object.entries(route)) {
    if (!servis.has(key.toLowerCase())) servis.set(key.toLowerCase(), value);
  }
  return servis;
}

/** Les `route.ts` de `src/app` qui servent un fichier déposé, en chemin d'exemple. */
function routesDeFichiers(): { fichier: string; chemin: string }[] {
  const app = path.join(RACINE, "src/app");
  return (readdirSync(app, { recursive: true }) as string[])
    .filter((f) => f.endsWith(`${path.sep}route.ts`))
    .filter((f) => /\bservirFichier\(/.test(readFileSync(path.join(app, f), "utf8")))
    .map((f) => ({
      fichier: f,
      chemin:
        "/" +
        path
          .dirname(f)
          .split(path.sep)
          .filter((s) => !/^\(.*\)$/.test(s)) // groupes de routes : hors URL
          .map((s) => (/^\[.*\]$/.test(s) ? "x1" : s))
          .join("/"),
    }));
}

describe("en-têtes servis — fichiers déposés", () => {
  const routes = routesDeFichiers();

  it("borne basse : les routes de fichiers sont bien trouvées", () => {
    // Pas la liste : seulement de quoi savoir que le relevé n'est pas vide.
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes.map((r) => r.chemin)).toContain("/api/rapports/x1/fichier");
  });

  it.each(routesDeFichiers().map((r) => [r.chemin, r.fichier]))(
    "%s reçoit sandbox ET frame-ancestors 'none' (%s)",
    async (chemin) => {
      // Ce que pose `servirFichier` : la configuration doit porter la même
      // politique, sinon c'est la sienne qui sort.
      const csp = (
        await entetesServis(chemin, { "Content-Security-Policy": "sandbox" })
      ).get("content-security-policy");
      const directives = (csp ?? "").split(";").map((d) => d.trim());
      expect(directives).toContain("sandbox");
      expect(directives).toContain("frame-ancestors 'none'");
    },
  );

  it("la politique tient sans la route : 401, 404, redirection reçoivent la même", async () => {
    const csp = (await entetesServis("/api/rapports/x1/fichier")).get(
      "content-security-policy",
    );
    expect(csp).toMatch(/(^|; )sandbox(;|$)/);
  });

  it("couche voisine : une page n'est pas mise en sandbox", async () => {
    const servis = await entetesServis("/entreprises");
    expect(servis.get("content-security-policy")).toBe("frame-ancestors 'none'");
  });

  it("couche voisine : un chemin proche mais non servi par servirFichier n'hérite pas", async () => {
    const servis = await entetesServis("/api/rapports/x1");
    expect(servis.get("content-security-policy")).toBe("frame-ancestors 'none'");
  });
});
