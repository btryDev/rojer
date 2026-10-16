// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DESCRIPTION_CATEGORIE } from "@/lib/equipements/labels";
import { AideCategorie } from "./AideCategorie";

// L'aide de la catégorie sur la fiche de l'appareil (contrôle visuel E2) : le
// même composant que le formulaire, et la fiche le pose. La page est un
// composant serveur lié à la base ; on vérifie donc le rendu du composant, et
// que la fiche l'appelle sur la catégorie de l'appareil.

afterEach(cleanup);

describe("AideCategorie", () => {
  it("rend l'aide d'une catégorie qui en a une — gaz, défibrillateur", () => {
    for (const c of ["INSTALLATION_GAZ", "DEFIBRILLATEUR"] as const) {
      const { container } = render(<AideCategorie categorie={c} />);
      expect(container.textContent).toBe(DESCRIPTION_CATEGORIE[c]);
      cleanup();
    }
  });

  it("sur la fiche, l'aide prend le corps explicatif de la charte (12,5 px, 1,55, 62ch)", () => {
    const { container } = render(<AideCategorie categorie="DEFIBRILLATEUR" gabarit="fiche" />);
    const cls = container.querySelector("p")!.className;
    expect(cls).toContain("text-[12.5px]");
    expect(cls).toContain("leading-[1.55]");
    expect(cls).toContain("max-w-[62ch]");
  });

  it("la fiche de l'appareil pose l'aide de sa catégorie", () => {
    const fiche = readFileSync(
      join(process.cwd(), "src/app/etablissements/[id]/equipements/[equipementId]/page.tsx"),
      "utf8",
    );
    expect(fiche).toMatch(/<AideCategorie\s+categorie=\{eq\.categorie\}\s+gabarit="fiche"\s*\/>/);
  });
});
