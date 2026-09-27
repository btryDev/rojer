// `CLES_STOCKEES` doit énumérer TOUTES les colonnes du schéma qui portent une
// clé de stockage : une colonne oubliée, c'est un fichier que la suppression
// d'un établissement laisse derrière elle — le défaut que ce module corrige
// (2026-09-27). Le relevé lit `schema.prisma` : une colonne `…Cle` ajoutée
// demain fait échouer ce test tant qu'elle n'est pas collectée.
//
// Et chaque colonne énumérée doit être LUE par `clesDesEtablissements` : le
// test exécute la collecte sur un client simulé qui rend une clé par colonne.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLES_STOCKEES, COLONNES_ECARTEES, clesDesEtablissements } from "./fichiers";

const schema = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "prisma", "schema.prisma"),
  "utf8",
);

/**
 * Les colonnes `String` dont le nom évoque un fichier, lues au schéma :
 * `…Cle`, `…Url`, `…Key`, `…Chemin`, `…Path`, et tout nom qui contient
 * `fichier` ou `pdf` (contre-lecture du 2026-09-27 : la première garde ne
 * voyait que `…Cle`, et `DuerpVersion.pdfUrl` lui échappait).
 */
const EVOQUE_UN_FICHIER = /(Cle|Url|Key|Chemin|Path)$|fichier|pdf/i;
function colonnesDeFichier(source: string): string[] {
  const out: string[] = [];
  let modele: string | null = null;
  for (const ligne of source.split("\n")) {
    const m = /^model (\w+) \{/.exec(ligne);
    if (m) modele = m[1];
    else if (/^\}/.test(ligne)) modele = null;
    else if (modele) {
      const c = /^\s+(\w+)\s+String\??(?:\s|$)/.exec(ligne);
      if (c && EVOQUE_UN_FICHIER.test(c[1])) out.push(`${modele}.${c[1]}`);
    }
  }
  return out.sort();
}

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
function sources(dossier: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dossier)) {
    const p = join(dossier, e);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
  }
  return out;
}

describe("les fichiers stockés qu'une suppression emporte", () => {
  it("toute colonne qui évoque un fichier est collectée ou écartée avec son motif", () => {
    const connues = [
      ...Object.entries(CLES_STOCKEES).flatMap(([m, cs]) => cs.map((c) => `${m}.${c}`)),
      ...Object.keys(COLONNES_ECARTEES),
    ].sort();
    expect(colonnesDeFichier(schema)).toEqual(connues);
    // Borne basse : le relevé voit des colonnes, sinon il ne contrôle rien.
    expect(colonnesDeFichier(schema).length).toBeGreaterThanOrEqual(10);
    for (const [col, e] of Object.entries(COLONNES_ECARTEES))
      expect(e.motif.trim(), col).not.toBe("");
  });

  it("le relevé voit une colonne nouvelle — éprouvé sur « photoUrl »", () => {
    const avecPhoto = schema.replace(
      "model Prestataire {",
      "model Prestataire {\n  photoUrl String?",
    );
    expect(colonnesDeFichier(avecPhoto)).toContain("Prestataire.photoUrl");
  });

  it("une colonne écartée comme « jamais écrite » ne l'est toujours pas", () => {
    const ici = join(RACINE, "src", "lib", "suppression", "fichiers.ts");
    const code = sources(join(RACINE, "src"))
      .filter((f) => f !== ici)
      .map((f) =>
        readFileSync(f, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, ""),
      )
      .join("\n");
    for (const [col, e] of Object.entries(COLONNES_ECARTEES)) {
      if (!e.jamaisEcrite) continue;
      const champ = col.split(".")[1];
      expect(
        new RegExp(`\\b${champ}\\b`).test(code),
        `${col} apparaît dans le code : si elle est écrite, la collecter (CLES_STOCKEES).`,
      ).toBe(false);
    }
  });

  it("chaque colonne énumérée est lue par la collecte", async () => {
    const table = (modele: keyof typeof CLES_STOCKEES) => ({
      findMany: async () => [
        Object.fromEntries(CLES_STOCKEES[modele].map((c) => [c, `${modele}.${c}`])),
      ],
    });
    const tx = {
      rapportVerification: table("RapportVerification"),
      prestataire: table("Prestataire"),
      analyseLegionelle: table("AnalyseLegionelle"),
    };
    const cles = await clesDesEtablissements(tx as never, ["e"]);
    const attendues = Object.entries(CLES_STOCKEES).flatMap(([m, cs]) =>
      cs.map((c) => `${m}.${c}`),
    );
    expect(cles.sort()).toEqual(attendues.sort());
  });

  it("aucun établissement : aucune lecture, aucune clé", async () => {
    expect(await clesDesEtablissements({} as never, [])).toEqual([]);
  });
});
