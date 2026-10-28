// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LegalBadge, Textes } from "./LegalBadge";
import { TexteSource } from "./TexteSource";
import { DansAide } from "./dans-aide";
import { livre, sousUnLivreFerme, texteVisible } from "@/test/livre";

// Le composant commun de toutes les sources d'article : un livre, replié
// (2026-10-28). On tient ce qu'il affiche, ce qu'il annonce au lecteur
// d'écran, et le regroupement de plusieurs sources sous un seul livre.
//
// [2026-10-28 : le livre est un `<details>` natif, commun à `LegalBadge`,
// `Textes` et `TexteSource`. Replié, le texte est dans le DOM sans être
// affiché : « pas lu avant d'ouvrir » se teste par `sousUnLivreFerme` /
// `texteVisible`, et l'ouverture par un clic sur le `<summary>`.]

afterEach(cleanup);

const REFERENCE =
  "R. 157-1, 1° (obligation de détenir un défibrillateur automatisé externe dans les ERP des catégories 1 à 4)";

describe("LegalBadge — le droit derrière un livre (2026-10-28)", () => {
  it("le livre dit « Texte », la référence complète reste au nom accessible", () => {
    const { container } = render(
      <LegalBadge reference={REFERENCE} href="https://www.legifrance.gouv.fr/x" />,
    );
    const l = livre(container, `Texte : ${REFERENCE}`);
    expect(l.textContent).toBe("Texte");
    expect(l.textContent).not.toContain("§");
    expect(container.querySelectorAll("summary")).toHaveLength(1);
  });

  it("la référence s'imprime en tête du panneau, une fois déplié", () => {
    const { container } = render(
      <LegalBadge reference="Art. R. 4224-14 CT" href="https://www.legifrance.gouv.fr/x" />,
    );
    const ref = screen.getByText("Art. R. 4224-14 CT");
    expect(sousUnLivreFerme(ref)).toBe(true);
    expect(texteVisible(container)).not.toContain("Art. R. 4224-14 CT");
    fireEvent.click(livre(container, "Texte : Art. R. 4224-14 CT"));
    expect(sousUnLivreFerme(ref)).toBe(false);
    expect(texteVisible(container)).toContain("Art. R. 4224-14 CT");
  });

  it("`libelle` remplace « Texte », sans répéter la référence au nom accessible", () => {
    const { container } = render(
      <LegalBadge reference="GN 10" libelle="GN 10" href="https://www.legifrance.gouv.fr/x" />,
    );
    const l = container.querySelector("summary")!;
    expect(l.textContent).toBe("GN 10");
    expect(l.getAttribute("aria-label")).toBeNull();
  });

  it("`defaultOpen` le présente ouvert ; dans une aide d'écran aussi", () => {
    const { container, unmount } = render(
      <LegalBadge reference="R. 1" extrait="Citation" defaultOpen />,
    );
    expect(container.querySelector("details")!.open).toBe(true);
    unmount();
    const aide = render(
      <DansAide.Provider value>
        <LegalBadge reference="R. 2" extrait="Citation" />
      </DansAide.Provider>,
    );
    expect(aide.container.querySelector("details")!.open).toBe(true);
  });
});

describe("Textes — plusieurs sources sous un seul livre", () => {
  it("un seul livre ; au dépli, chaque source avec sa référence et son lien", () => {
    const { container } = render(
      <Textes>
        <LegalBadge reference="Art. R. 4512-6 CT" href="https://www.legifrance.gouv.fr/a" />
        <LegalBadge reference="Arrêté du 19 mars 1993" extrait="Un plan de prévention est établi par écrit" />
      </Textes>,
    );
    // Les sources n'ajoutent pas de livre.
    expect(container.querySelectorAll("summary")).toHaveLength(1);
    expect(container.querySelector("summary")!.textContent).toBe("Textes");
    expect(texteVisible(container)).not.toContain("Arrêté du 19 mars 1993");
    fireEvent.click(livre(container, "Textes : les articles cités"));
    const vu = texteVisible(container);
    expect(vu).toContain("Art. R. 4512-6 CT");
    expect(vu).toContain("Arrêté du 19 mars 1993");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("TexteSource — le même livre, pour une citation composée", () => {
  it("même `<details>`, même panneau que `LegalBadge`", () => {
    const a = render(<TexteSource articles={["R. 4463-8"]}>Citation</TexteSource>);
    const b = render(<LegalBadge reference="R. 4463-8" extrait="Citation" />);
    const panneau = (c: Element) => c.querySelector("details > div")!.className;
    expect(panneau(a.container)).toBe(panneau(b.container));
    expect(a.container.querySelector("summary")!.textContent).toBe("Ce que dit le texte");
    expect(texteVisible(a.container)).not.toContain("Citation");
    fireEvent.click(livre(a.container, "Ce que dit le texte"));
    expect(texteVisible(a.container)).toContain("Citation");
    expect(texteVisible(a.container)).toContain("R. 4463-8");
  });
});

describe("LegalBadge — le lien vers la source annonce le nouvel onglet (F4)", () => {
  it("« Lire la source officielle » dit au lecteur d'écran qu'il ouvre un onglet", () => {
    const { container } = render(
      <LegalBadge reference="R. 4224-14" href="https://www.legifrance.gouv.fr/x" />,
    );
    fireEvent.click(livre(container, "Texte : R. 4224-14"));
    const lien = screen.getByRole("link");
    expect(lien.getAttribute("target")).toBe("_blank");
    expect(lien.textContent).toContain("(nouvel onglet)");
    expect(lien.querySelector(".sr-only")?.textContent).toContain("(nouvel onglet)");
  });
});
