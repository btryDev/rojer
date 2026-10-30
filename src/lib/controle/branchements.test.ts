// Ce que ni la route du ZIP ni les pages ne permettent d'exécuter en test —
// elles rendent des PDF ou tournent côté serveur — se vérifie sur leur
// source (2026-09-27, `lot/relire-fichiers-deposes`) : les fichiers déposés
// entrent au ZIP et au README ; les deux liens mènent aux routes.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (c: string) => readFileSync(join(RACINE, c), "utf8");

describe("branchements des fichiers déposés", () => {
  const zip = lire("src/app/api/etablissements/[id]/controle-zip/route.ts");

  it("le ZIP joint les rapports et les rapports d'analyse, et le README les compte", () => {
    // ~~`"Rapports"`, `"08_Carnet_sanitaire_analyses"` en dur~~ — les noms
    // vivent dans `pieces-zip.ts` depuis le 2026-10-12 (l'écran les lit).
    expect(zip).toMatch(/joindreFichiers\(\s*zip,\s*nomDeDossier\(PIECES_ZIP\.rapports\),/);
    expect(zip).toMatch(/joindreFichiers\(\s*zip,\s*nomDeDossier\(PIECES_ZIP\.analyses\),/);
    expect(zip).toMatch(/rapportsZip,\s*rapportsSalariesEcartes,\s*analysesZip,/);
  });

  it("le ZIP lit les rapports de CET établissement, et jamais ceux d'une ligne de salarié (M1)", () => {
    // Le filtre lui-même est éprouvé dans `pieces-zip.test.ts`. La lecture vit
    // dans `controle/queries.ts` depuis le 2026-10-14 (B6).
    const queries = lire("src/lib/controle/queries.ts");
    expect(queries).toMatch(
      /rapportVerification\.findMany\(\{[\s\S]{0,600}?where: \{ \.\.\.filtreRapportsDuDossier\(etablissementId\) \},/,
    );
    expect(zip).toMatch(/rapportsDeposesDuDossier\(db, id\)/);
  });

  it("le ZIP répond en flux, avec une durée maximale posée", () => {
    expect(zip).toMatch(/new NextResponse\(zipEnFlux\(archive\.zip\)/);
    expect(zip).not.toMatch(/generateAsync/);
    expect(zip).toMatch(/export const maxDuration = \d+;/);
  });

  it("le ZIP ne lit aucun fichier déposé avant le flux, et tient une place d'export (H3)", () => {
    // Toute lecture du stockage passe par `contenuDiffere` : lue à son tour
    // dans l'archive, jamais toute d'avance (`fichiers-zip.ts`).
    const lectures = zip.match(/\.get\(/g) ?? [];
    const differees = zip.match(/contenuDiffere\(\s*\(\) => storage!\.get\(/g) ?? [];
    expect(lectures.length).toBeGreaterThan(0);
    expect(differees.length).toBe(lectures.length);
    expect(zip).toMatch(/const liberer = await reserverPlaceExport\(\);/);
    expect(zip).toMatch(/\} finally \{\s*liberer\(\);\s*\}/);
  });

  it("le carnet ouvre le rapport d'une analyse qui en a un", () => {
    const carnet = lire("src/app/etablissements/[id]/carnet-sanitaire/page.tsx");
    expect(carnet).toMatch(/a\.rapportCle && \(/);
    expect(carnet).toContain("`/api/analyses-legionelles/${a.id}/rapport`");
    expect(carnet).toContain("Ouvrir le rapport");
  });

  it("la fiche du prestataire ouvre chaque pièce fournie, par la table des pièces", () => {
    const fiche = lire("src/app/etablissements/[id]/prestataires/[prestataireId]/page.tsx");
    expect(fiche).toMatch(/LIBELLES_PIECES\.filter\(\(\[piece\]\) => p\[PIECES\[piece\]\.cle\]\)/);
    expect(fiche).toContain("href={urlPiece(p.id, piece)}");
  });
});
