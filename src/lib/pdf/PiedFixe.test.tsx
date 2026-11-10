// Le pied de page fixe tient sur un long document ; le pied `render` ne
// tenait pas (lot pdf-a1, 2026-11-10, issues react-pdf #3416 et #3452).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import { PiedFixe } from "./PiedFixe";
import { stylesCommuns as s } from "./styles";

/** Une `<Page>` de `n` lignes sous le style commun (et son `lineHeight`). */
function longDocument(pied: React.ReactNode, n = 700) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {Array.from({ length: n }, (_, i) => (
          <Text key={i}>Ligne {i}</Text>
        ))}
        {pied}
      </Page>
    </Document>
  );
}

describe("PiedFixe", () => {
  it("se rend sur un document de plusieurs dizaines de feuilles", async () => {
    const pdf = await renderToBuffer(longDocument(<PiedFixe texte="Établissement" />));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  // Le témoin : le même document avec un pied `render` plante en 4.5.1. Si ce
  // test casse, la bibliothèque a corrigé le défaut — la numérotation
  // redevient possible, à relire avant de l'y remettre.
  it("témoin : un pied `render` sur le même document plante encore", async () => {
    const piedDynamique = (
      <Text style={s.footer} fixed render={({ pageNumber }) => `page ${pageNumber}`} />
    );
    await expect(renderToBuffer(longDocument(piedDynamique))).rejects.toThrow(/unsupported number/);
  });

  it("aucun PDF du produit n'emploie plus la prop `render`", () => {
    const dossier = join(process.cwd(), "src/lib/pdf");
    const fautifs = readdirSync(dossier)
      .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
      .filter((f) => /\brender=\{/.test(readFileSync(join(dossier, f), "utf8")));
    expect(fautifs).toEqual([]);
  });
});
