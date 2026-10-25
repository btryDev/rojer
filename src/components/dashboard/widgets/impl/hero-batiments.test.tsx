// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ILLUSTRATIONS_BATIMENT } from "@/lib/etablissements/illustration";
import { HeroBatiments, PLANCHES } from "./hero-batiments";

afterEach(cleanup);

const etab = {
  id: "e1",
  raisonDisplay: "Le Comptoir des Halles",
  entrepriseId: "ent",
  adresse: "12 rue Montorgueil, 75001 Paris",
  effectifSurSite: 8,
  codeNaf: null,
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "N",
  typesErpAutres: [],
  categorieErp: "N5",
  classeIgh: null,
  entreprise: { raisonSociale: "SARL", siret: null, codeNaf: "56.10A", effectif: 8 },
} as unknown as Parameters<typeof HeroBatiments>[0]["etablissement"];

function texte(e = etab) {
  return render(<HeroBatiments etablissement={e} illustration="restaurant" />).container.textContent ?? "";
}

// 2026-10-25 : une seule fiche, qui présente l'établissement — jamais ses
// zones, qu'un dessin épinglé ferait lire comme des emplacements.
describe("hero : la fiche de l'établissement", () => {
  it("nomme l'établissement, son régime, son effectif et sa ville", () => {
    const t = texte();
    expect(t).toContain("Le Comptoir des Halles");
    expect(t).toContain("ERP · type N · cat. 5");
    expect(t).toContain("8 salariés sur site");
    expect(t).toContain("Paris");
  });

  it("hors ERP, le régime travail", () => {
    expect(texte({ ...etab, estERP: false })).toContain("Établissement de travail");
  });
});

describe("planches du bâtiment", () => {
  // Les dimensions déclarées servent au `width`/`height` de next/image : un
  // fichier remplacé sans elles déformerait le dessin, et les points
  // d'accroche, posés en pourcentage, tomberaient à côté.
  it.each(ILLUSTRATIONS_BATIMENT)("%s : le fichier existe et a les dimensions déclarées", (nom) => {
    const octets = readFileSync(join(process.cwd(), "public/illustrations/batiments", `${nom}.webp`));
    // En-tête WebP étendu (VP8X) : largeur et hauteur moins un, sur 24 bits.
    expect(octets.toString("ascii", 12, 16)).toBe("VP8X");
    const largeur = octets.readUIntLE(24, 3) + 1;
    const hauteur = octets.readUIntLE(27, 3) + 1;
    expect({ largeur, hauteur }).toEqual({
      largeur: PLANCHES[nom].largeur,
      hauteur: PLANCHES[nom].hauteur,
    });
  });
});
