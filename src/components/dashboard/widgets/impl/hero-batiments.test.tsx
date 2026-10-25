// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ILLUSTRATIONS_BATIMENT } from "@/lib/etablissements/illustration";
import { HeroEtablissement, PLANCHES } from "./hero-batiments";

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
} as unknown as Parameters<typeof HeroEtablissement>[0]["etablissement"];

const zones = [
  { id: "z1", nom: "Bâtiment principal", nbEquipements: 7 },
  { id: "z2", nom: "Terrasse", nbEquipements: 0 },
];

function texte(e = etab) {
  return (
    render(
      <HeroEtablissement etablissement={e} illustration="restaurant" nbEquipe={6} nbEquipements={7} zones={zones} />,
    ).container.textContent ?? ""
  );
}

// 2026-10-25 : la fiche du hero présente l'établissement — à la place des
// trois relevés. Rien n'y est un état de conformité.
describe("hero : la fiche de l'établissement", () => {
  it("nomme l'établissement, son activité, son régime, son effectif, son équipe et son parc", () => {
    const t = texte();
    expect(t).toContain("Le Comptoir des Halles");
    expect(t).toContain("Restaurant · 12 rue Montorgueil, 75001 Paris");
    expect(t).toContain("ERP · type N · cat. 5");
    expect(t).toContain("+ établissement de travail");
    expect(t).toContain("8 salariés");
    expect(t).toContain("6 fiches");
    expect(t).toContain("7 déclarés");
    expect(t).toContain("dans 2 zones");
  });

  it("hors ERP, le régime travail, sans précision redondante", () => {
    const t = texte({ ...etab, estERP: false });
    expect(t).toContain("Établissement de travail");
    expect(t).not.toContain("+ établissement de travail");
  });

  it("les zones sont nommées comme zones, et une zone vide le dit", () => {
    const t = texte();
    expect(t).toContain("Zone principale");
    expect(t).not.toContain("Bâtiment principal");
    expect(t).toContain("aucun équipement");
  });
});

describe("planches du bâtiment", () => {
  // Les dimensions déclarées servent au `width`/`height` de next/image : un
  // fichier remplacé sans elles déformerait le dessin.
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
