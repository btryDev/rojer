// Le pied de page fixe tient sur un long document ; le pied `render` ne
// tenait pas (lot pdf-a1, 2026-11-10, issues react-pdf #3416 et #3452).

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fichiersSources, sansCommentairesNiChaines } from "@/lib/interface/confirmations-natives";
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

  // Le témoin DOCUMENTE le défaut de la bibliothèque sans en dépendre (revue
  // de la PR #286) : en 4.5.1, le même document avec un pied `render` plante
  // (« unsupported number ») ; une version corrective le rendra sans erreur,
  // et ce test restera vert — c'est alors le moment de relire la
  // numérotation des pages. Tout AUTRE échec, lui, le fait tomber.
  it("témoin : un pied `render` sur un long document plante, ou passe si la bibliothèque est corrigée", async () => {
    const piedDynamique = (
      <Text style={s.footer} fixed render={({ pageNumber }) => `page ${pageNumber}`} />
    );
    const issue = await renderToBuffer(longDocument(piedDynamique)).then(
      (pdf) => ({ passe: true as const, pdf }),
      (e: Error) => ({ passe: false as const, e }),
    );
    if (issue.passe) expect(issue.pdf.subarray(0, 4).toString()).toBe("%PDF");
    else expect(issue.e.message).toMatch(/unsupported number/);
  });

  // Dans tout `src/`, sous-dossiers compris, et dans le code seul (commentaires
  // et chaînes blanchis) : la prop `render` n'est interdite qu'aux fichiers qui
  // importent @react-pdf — `render` est une prop courante d'autres
  // bibliothèques d'interface.
  it("aucun PDF du produit n'emploie plus la prop `render`", () => {
    const fautifs = fichiersSources(process.cwd())
      .filter((f) => !/\.test\.tsx?$/.test(f))
      .filter((f) => {
        const source = readFileSync(f, "utf8");
        return (
          source.includes("@react-pdf/renderer") &&
          /\brender=\{/.test(sansCommentairesNiChaines(source))
        );
      })
      .map((f) => relative(process.cwd(), f));
    expect(fautifs).toEqual([]);
  });
});
