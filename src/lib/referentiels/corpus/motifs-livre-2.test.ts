// Les motifs partagés du livre II ne s'écrivent qu'une fois (2026-10-17, revue
// indépendante de `lot/ref-a-corpus-titre-1`).
//
// Un motif recopié dans quarante entrées se corrige dans quarante entrées, ou
// dans une seule et pas les autres. Ce test lit le SOURCE des corpus : chaque
// constante de `motifs-livre-2.ts` doit y être écrite en toutes lettres une
// seule fois, dans ce module, et employée par son nom ailleurs.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as MOTIFS from "./motifs-livre-2";

const DOSSIER = path.join(process.cwd(), "src/lib/referentiels/corpus");

function sources(): { fichier: string; texte: string }[] {
  return readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => ({
      fichier: f,
      // Les `historique` gardent l'ancien motif rayé (règle 11) : ce n'est pas une recopie.
      texte: readFileSync(path.join(DOSSIER, f), "utf8")
        .split("\n")
        .filter((l) => !l.trimStart().startsWith("historique:"))
        .join("\n"),
    }));
}

/** Les occurrences en toutes lettres d'un texte, échappé comme dans un littéral. */
function recopies(texte: string, src: { fichier: string; texte: string }[]): string[] {
  const tete = JSON.stringify(texte).slice(1, -1);
  return src.flatMap((s) => {
    const n = s.texte.split(tete).length - 1;
    return n > 0 ? [`${s.fichier} ×${n}`] : [];
  });
}

describe("motifs du livre II — une phrase, une constante", () => {
  const src = sources();
  it.each(Object.entries(MOTIFS))("%s n'est écrit qu'une fois, dans motifs-livre-2.ts", (_nom, texte) => {
    expect(recopies(texte, src)).toEqual(["motifs-livre-2.ts ×1"]);
  });

  it("cassure : une recopie en toutes lettres est vue", () => {
    const texte = MOTIFS.MOTIF_DOTATION_MOYEN_DE_SECOURS;
    const avecRecopie = [...src, { fichier: "copie.ts", texte: `motif: ${JSON.stringify(texte)},` }];
    expect(recopies(texte, avecRecopie)).toContain("copie.ts ×1");
  });
});
