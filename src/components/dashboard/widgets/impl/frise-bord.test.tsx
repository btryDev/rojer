// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { DashboardBundle } from "../types";

// Le lien de provenance lit l'URL courante par `next/navigation`, absent hors
// du routeur : un lien nu suffit à ce que ces tests regardent — attributs
// compris, dont `data-marqueur`.
vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({
    href,
    children,
    ...reste
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}));

import { BlocFrise } from "./board";

/** Le 15 septembre 2026, à midi à Paris. */
const AUJOURDHUI = new Date("2026-09-15T10:00:00.000Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const ventilation = {
  parFamille: { controle: 0, travaux: 0, operations: 0, papiers: 0, personnel: 0 },
  total: 0,
};

const bundle = (evenementsHorizon: unknown[]) =>
  ({
    etablissementId: "etab-1",
    aujourdhui: AUJOURDHUI,
    evenementsHorizon,
    echeances: {
      retards: ventilation,
      sous30j: ventilation,
      verifsAPlanifier: 0,
      verifsEnRetardSansEcheance: 0,
    },
    echeancesEtablissement: { retards: ventilation },
    equipementsEtablissement: [],
    nbVerifs: 0,
  }) as unknown as DashboardBundle;

const operation = (id: string, debut: string, fin: string) => ({
  id,
  libelle: `Permis de feu n°${id} — Cuisine`,
  date: jour(debut),
  dateFin: jour(fin),
  tone: "ok",
  equipement: "",
  type: "permis-feu",
  famille: "operations",
  href: `/etablissements/etab-1/permis-feu/${id}`,
});

const enFrise = (evenements: unknown[]) => {
  const rendu = render(<BlocFrise bundle={bundle(evenements)} />);
  fireEvent.click(screen.getByRole("button", { name: "Revenir à la frise" }));
  return rendu.container.textContent ?? "";
};

const scrollTo = vi.fn();
beforeEach(() => {
  // jsdom ne connaît ni `matchMedia` ni le défilement d'un élément.
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  Element.prototype.scrollTo = scrollTo as unknown as Element["scrollTo"];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  scrollTo.mockReset();
});

describe("frise du tableau de bord — une opération hors du cadrage d'ouverture", () => {
  /**
   * 2026-09-15. La frise s'ouvre cadrée sur aujourd'hui : une opération non
   * terminée dont le point tombe plus à gauche — commencée avant la fenêtre,
   * ou il y a trois semaines — était hors de l'écran sans que rien ne le dise.
   */
  it("la nomme sous la frise, avec un moyen d'y aller", () => {
    const texte = enFrise([operation("3", "2026-04-01", "2026-09-25")]);
    expect(texte).toContain(
      "Une opération non terminée est hors de l'écran, à gauche de la frise : « Permis de feu n°3 — Cuisine ».",
    );
    expect(screen.getByRole("button", { name: "Y aller" })).toBeTruthy();
  });

  it("les compte quand elles sont plusieurs", () => {
    const texte = enFrise([
      operation("3", "2026-04-01", "2026-09-25"),
      operation("4", "2026-08-25", "2026-10-10"),
    ]);
    expect(texte).toContain(
      "2 opérations non terminées sont hors de l'écran, à gauche de la frise.",
    );
  });

  it("ne dit rien d'une opération visible à l'ouverture", () => {
    const texte = enFrise([operation("5", "2026-09-10", "2026-09-25")]);
    expect(texte).not.toContain("hors de l'écran");
  });

  it("« Y aller » défile jusqu'à la première et lui donne le focus", () => {
    enFrise([operation("4", "2026-08-25", "2026-10-10")]);
    fireEvent.click(screen.getByRole("button", { name: "Y aller" }));
    // Fenêtre ouverte au 1er juin ; le 25 août est à 85 jours, 10 px par jour,
    // posé à la marge d'ouverture (130 px). Mouvement réduit : pas d'animation.
    expect(scrollTo).toHaveBeenCalledWith({ left: 720, behavior: "auto" });
    expect(document.activeElement?.getAttribute("data-marqueur")).toBe("4");
  });
});
