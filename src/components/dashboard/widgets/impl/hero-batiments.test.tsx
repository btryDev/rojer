// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { HeroBatiments } from "./hero-batiments";

// 2026-10-17, ADR-029 amendée : un établissement = un bâtiment ; ses zones en
// sont des subdivisions. Le hero nomme les ZONES : le nom historique de la
// première (« Bâtiment principal ») ne s'y lit jamais comme un second bâtiment.

afterEach(cleanup);
// jsdom n'a pas de mise en page : le hero mesure sa piste pour le défilement.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const zone = (id: string, nom: string) => ({ id, nom, complementAdresse: null, ordre: 0, nbEquipements: 2, nbEnRetard: 0 });

function rendu(batiments: ReturnType<typeof zone>[]) {
  return render(
    <HeroBatiments nomEtablissement="Le Bistrot" logoUrl={null} batiments={batiments} srcIllustration="/x.png" legende="" />,
  ).container.textContent ?? "";
}

describe("hero : les zones, jamais un second bâtiment", () => {
  it("un dossier ancien sous une seule zone : « Zone principale », pas « Bâtiment principal »", () => {
    const texte = rendu([zone("z1", "Bâtiment principal")]);
    expect(texte).toContain("Zone principale");
    expect(texte).not.toContain("Bâtiment principal");
  });

  it("les noms choisis par le dirigeant restent les siens", () => {
    const texte = rendu([zone("z1", "Bâtiment principal"), zone("z2", "Cuisine")]);
    expect(texte).toContain("Cuisine");
    expect(texte).not.toContain("Bâtiment principal");
  });
});
