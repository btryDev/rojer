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
    expect(zip).toMatch(/joindreFichiers\(\s*zip,\s*"Rapports",/);
    expect(zip).toMatch(/joindreFichiers\(\s*zip,\s*"08_Carnet_sanitaire_analyses",/);
    expect(zip).toMatch(/rapportsZip,\s*rapportsSalariesEcartes,\s*analysesZip,/);
  });

  it("le ZIP lit les rapports de CET établissement, et jamais ceux d'une ligne de salarié (M1)", () => {
    expect(zip).toMatch(
      /rapportVerification\.findMany\(\{[\s\S]{0,600}?where: \{ etablissementId: id, verification: \{ salarieId: null \} \}/,
    );
  });

  it("le ZIP répond en flux, avec une durée maximale posée", () => {
    expect(zip).toMatch(/new NextResponse\(zipEnFlux\(zip\)/);
    expect(zip).not.toMatch(/generateAsync/);
    expect(zip).toMatch(/export const maxDuration = \d+;/);
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
