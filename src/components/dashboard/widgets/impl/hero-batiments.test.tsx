// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ILLUSTRATIONS_BATIMENT } from "@/lib/etablissements/illustration";
import { HeroBatiments, PLANCHES } from "./hero-batiments";

afterEach(cleanup);

const zone = (id: string, nom: string, nbEquipements = 2, nbEnRetard = 0) => ({
  id,
  nom,
  complementAdresse: null,
  ordre: 0,
  nbEquipements,
  nbEnRetard,
});

function rendu(batiments: ReturnType<typeof zone>[]) {
  return render(<HeroBatiments batiments={batiments} illustration="restaurant" legende="" />)
    .container;
}

// 2026-10-17, ADR-029 amendée : un établissement = un bâtiment ; ses zones en
// sont des subdivisions. Le hero nomme les ZONES : le nom historique de la
// première (« Bâtiment principal ») ne s'y lit jamais comme un second bâtiment.
describe("hero : les zones, jamais un second bâtiment", () => {
  it("un dossier ancien sous une seule zone : « Zone principale », pas « Bâtiment principal »", () => {
    const texte = rendu([zone("z1", "Bâtiment principal")]).textContent ?? "";
    expect(texte).toContain("Zone principale");
    expect(texte).not.toContain("Bâtiment principal");
  });

  it("une étiquette par zone, avec son nom", () => {
    const c = rendu([zone("z1", "Salle"), zone("z2", "Cuisine"), zone("z3", "Réserve")]);
    const etiquettes = [...c.querySelectorAll("li")].map((li) => li.textContent);
    expect(etiquettes).toHaveLength(3);
    expect(etiquettes.join("|")).toMatch(/Salle.*\|.*Cuisine.*\|.*Réserve/);
  });
});

describe("hero : l'étiquette dit l'état de la zone sans le rejuger", () => {
  it("une zone sans équipement n'est jamais « À jour »", () => {
    const texte = rendu([zone("z1", "Terrasse", 0, 0)]).textContent ?? "";
    expect(texte).toContain("Sans objet");
    expect(texte).not.toContain("À jour");
  });

  it("une zone en retard dit combien, pour qui ne voit pas le rond", () => {
    const c = rendu([zone("z1", "Cuisine", 4, 2)]);
    expect(c.querySelector(".sr-only")?.textContent).toMatch(/^2 /);
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
