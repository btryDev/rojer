// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { CarteBoard } from "./CarteBoard";
import { FournisseurSectionDuWidget } from "./widgets/section-du-widget";
import { REGISTRY } from "./widgets/registry";
import { categorieDeItem } from "@/components/layout/sidebar-nav";
import { TEINTE_SECTION } from "@/components/entete-page/teintes";

afterEach(cleanup);

describe("la coiffe de section des cartes du board", () => {
  it("dans un widget, la carte nomme sa section", () => {
    const { container } = render(
      <FournisseurSectionDuWidget value="equipement-batiment">
        <CarteBoard>contenu</CarteBoard>
      </FournisseurSectionDuWidget>,
    );
    expect(container.textContent).toBe("Équipement et bâtimentcontenu");
  });

  it("hors du tableau de bord, pas de coiffe", () => {
    const { container } = render(<CarteBoard>contenu</CarteBoard>);
    expect(container.textContent).toBe("contenu");
  });

  // Une carte sans coiffe au milieu de cartes coiffées se lirait « hors
  // section ». Le tableau de bord n'en a pas (il les résume toutes) : aucun
  // widget ne doit mener à lui.
  it.each(Object.values(REGISTRY).map((d) => [d.id, d.page] as const))(
    "%s mène à une page dont la section a une teinte",
    (_id, page) => {
      const section = categorieDeItem(page);
      expect(section).not.toBeNull();
      expect(TEINTE_SECTION[section!]).toBeTruthy();
    },
  );
});
