// Classe ASVS 5.0.0 V14.3.2 (audit du 2026-10-13) : un document personnel
// servi par une route — PDF, ZIP, fichier déposé, export JSON — ne reste dans
// aucun cache, ni partagé ni du navigateur. `Cache-Control: no-store`.
//
// Le défaut trouvé : la version figée d'un DUERP sortait en
// `private, max-age=60`, seule réponse personnelle à ne pas être en
// `no-store`. Ce test relève TOUTES les `route.ts` de `src/app` plutôt que de
// lister celles qu'on connaît : une route ajoutée demain est dans la classe
// tant qu'elle n'a pas été exemptée ici, avec son motif.
//
// Analyse statique, et ce qu'elle ne prouve pas : elle lit le source, pas la
// réponse. Une route qui calculerait sa valeur de `Cache-Control` échapperait
// à la lecture littérale — d'où la règle « toute valeur écrite est no-store ».

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP = path.resolve(__dirname, "../../app");

/** Routes hors de la classe : rien de personnel n'y est servi. Chemin → motif. */
const EXEMPTIONS: Record<string, string> = {
  "api/duerp/import/template/route.ts":
    "gabarit XLSX vierge, identique pour tous : aucune donnée de compte",
  "api/accessibilite/[slug]/affiche/route.ts":
    "affiche du registre PUBLIC d'accessibilité, faite pour être imprimée et vue de tous",
  "auth/deconnexion/route.ts":
    "déconnexion puis redirection (no-store posé à part) : aucun document dans la réponse",
  "auth/verification/route.ts":
    "vérification d'un jeton puis redirection : aucun document dans la réponse",
  "api/mcp/[cle]/route.ts":
    "protocole MCP (JSON-RPC en POST, `force-dynamic`), pas un document téléchargé — hors classe, voir le rapport du lot",
};

function routes(): string[] {
  return (readdirSync(APP, { recursive: true }) as string[])
    .filter((f) => path.basename(f) === "route.ts")
    .map((f) => f.split(path.sep).join("/"))
    .sort();
}

/** Les valeurs littérales de Cache-Control écrites dans le source. */
function valeursCacheControl(source: string): string[] {
  return [...source.matchAll(/["']cache-control["']\s*:\s*["'`]([^"'`]*)["'`]/gi)].map(
    (m) => m[1],
  );
}

describe("routes de documents personnels — Cache-Control: no-store", () => {
  const toutes = routes();

  it("borne basse : le relevé trouve des routes, dont celles qu'on sait personnelles", () => {
    expect(toutes.length).toBeGreaterThanOrEqual(10);
    expect(toutes).toContain("duerp/[id]/versions/[numero]/pdf/route.ts");
    expect(toutes).toContain("api/rapports/[id]/fichier/route.ts");
  });

  it("aucune exemption ne vise une route disparue", () => {
    for (const f of Object.keys(EXEMPTIONS)) expect(toutes).toContain(f);
  });

  it.each(routes().filter((f) => !(f in EXEMPTIONS)))(
    "%s répond no-store (ou passe par servirFichier ou reponsePdf)",
    (f) => {
      const source = readFileSync(path.join(APP, f), "utf8");
      const valeurs = valeursCacheControl(source);
      // Délégué à servir.ts (fichiers déposés) ou à pdf/reponse.ts (PDF,
      // audit Next.js du 2026-10-14, B8), qui sont tenus plus bas.
      const parServir = /\b(?:servirFichier|reponsePdf)\(/.test(source);
      // Au moins un chemin : no-store écrit, ou délégué.
      expect(parServir || valeurs.length > 0, `${f} : aucun Cache-Control`).toBe(true);
      // Et aucune valeur écrite qui ne le soit pas.
      for (const v of valeurs) expect(v, f).toBe("no-store");
    },
  );

  it("servir.ts, par où passent les fichiers déposés, répond no-store", () => {
    const source = readFileSync(path.resolve(__dirname, "../storage/servir.ts"), "utf8");
    expect(valeursCacheControl(source)).toEqual(["no-store"]);
  });

  it("pdf/reponse.ts, par où passent les PDF, et le 503 des exports répondent no-store", () => {
    for (const f of ["../pdf/reponse.ts", "../exports/limite.ts"]) {
      const source = readFileSync(path.resolve(__dirname, f), "utf8");
      expect(valeursCacheControl(source), f).toEqual(["no-store"]);
    }
  });
});
