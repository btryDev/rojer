// `CLES_STOCKEES` doit énumérer TOUTES les colonnes du schéma qui portent une
// clé de stockage : une colonne oubliée, c'est un fichier que la suppression
// d'un établissement laisse derrière elle — le défaut que ce module corrige
// (2026-09-27). Le relevé lit `schema.prisma` : une colonne `…Cle` ajoutée
// demain fait échouer ce test tant qu'elle n'est pas collectée.
//
// Et chaque colonne énumérée doit être LUE par `clesDesEtablissements` : le
// test exécute la collecte sur un client simulé qui rend une clé par colonne.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLES_STOCKEES, clesDesEtablissements } from "./fichiers";

const schema = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "prisma", "schema.prisma"),
  "utf8",
);

/** Modèle → colonnes `String` dont le nom finit par `Cle`, lues au schéma. */
function colonnesDeCle(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let modele: string | null = null;
  for (const ligne of schema.split("\n")) {
    const m = /^model (\w+) \{/.exec(ligne);
    if (m) modele = m[1];
    else if (/^\}/.test(ligne)) modele = null;
    else if (modele) {
      const c = /^\s+(\w+Cle)\s+String\??/.exec(ligne);
      if (c) (out[modele] ??= []).push(c[1]);
    }
  }
  return out;
}

describe("les fichiers stockés qu'une suppression emporte", () => {
  it("toute colonne de clé du schéma est collectée — et rien d'imaginaire", () => {
    const attendu = Object.fromEntries(
      Object.entries(CLES_STOCKEES).map(([m, c]) => [m, [...c].sort()]),
    );
    const lu = Object.fromEntries(
      Object.entries(colonnesDeCle()).map(([m, c]) => [m, c.sort()]),
    );
    expect(lu).toEqual(attendu);
    // Borne basse : le relevé voit des colonnes, sinon il ne contrôle rien.
    expect(Object.keys(lu).length).toBeGreaterThanOrEqual(4);
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
      registreAccessibilite: table("RegistreAccessibilite"),
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
