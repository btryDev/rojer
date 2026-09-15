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

// La géométrie de la frise se compte en jours LOCAUX : les dates des tests le
// sont aussi, à midi, pour tenir sous n'importe quel fuseau du processus
// (`TZ=America/Los_Angeles` faisait tomber une date UTC la veille).
const le = (mois: number, jour: number) => new Date(2026, mois - 1, jour, 12);
/** Le 15 septembre 2026. */
const AUJOURDHUI = le(9, 15);

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

const operation = (
  id: string,
  debut: Date,
  fin: Date,
  tone: "ok" | "alerte" = "ok",
) => ({
  id,
  libelle: `Permis de feu n°${id} — Cuisine`,
  date: debut,
  dateFin: fin,
  tone,
  equipement: "",
  type: "permis-feu",
  famille: "operations",
  href: `/etablissements/etab-1/permis-feu/${id}`,
});

const enFrise = (evenements: unknown[]) => {
  const rendu = render(<BlocFrise bundle={bundle(evenements)} />);
  fireEvent.click(screen.getByRole("button", { name: "Revenir à la frise" }));
  return () => rendu.container.textContent ?? "";
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

describe("frise du tableau de bord — une opération hors de l'écran à l'ouverture", () => {
  /**
   * 2026-09-15. La frise s'ouvre cadrée sur aujourd'hui : une opération non
   * close dont le point tombe plus à gauche — commencée avant la fenêtre, il y
   * a trois semaines, ou échue — était hors de l'écran sans que rien ne le dise.
   */
  it("la nomme sous la frise, avec un moyen d'y aller", () => {
    const texte = enFrise([operation("3", le(4, 1), le(9, 25))]);
    expect(texte()).toContain(
      "Une opération non close se trouve plus tôt sur la frise, à gauche du cadrage d'ouverture : « Permis de feu n°3 — Cuisine ».",
    );
    expect(screen.getByRole("button", { name: "Y aller" })).toBeTruthy();
  });

  it("nomme aussi une opération échue non close, posée au bord gauche", () => {
    const texte = enFrise([operation("6", le(4, 1), le(8, 20), "alerte")]);
    expect(texte()).toContain("Une opération non close se trouve plus tôt sur la frise");
  });

  it("les compte quand elles sont plusieurs", () => {
    const texte = enFrise([
      operation("3", le(4, 1), le(9, 25)),
      operation("4", le(8, 25), le(10, 10)),
    ]);
    expect(texte()).toContain(
      "2 opérations non closes se trouvent plus tôt sur la frise, à gauche du cadrage d'ouverture.",
    );
  });

  it("ne dit rien d'une opération dont le point est à l'écran, à 20 px du bord", () => {
    // Le 1er septembre : point à 920 px, écran ouvert à 930, marge de 30.
    const texte = enFrise([operation("5", le(9, 1), le(9, 25))]);
    expect(texte()).not.toContain("cadrage d'ouverture");
  });

  it("« Y aller » défile jusqu'à la première et lui donne le focus", () => {
    enFrise([operation("4", le(8, 25), le(10, 10))]);
    fireEvent.click(screen.getByRole("button", { name: "Y aller" }));
    // Fenêtre ouverte au 1er juin ; le 25 août est à 85 jours, 10 px par jour,
    // posé à la marge d'ouverture (130 px). Mouvement réduit : pas d'animation.
    expect(scrollTo).toHaveBeenCalledWith({ left: 720, behavior: "auto" });
    expect(document.activeElement?.getAttribute("data-marqueur")).toBe("4");
  });

  it("la note suit le cadrage : après « Y aller », un aller-retour d'échelle et d'autres données", () => {
    // Relecture du 2026-09-15 : effacée après « Y aller », la note le restait
    // au retour en « 90 jours », frise recadrée et opération de nouveau hors
    // de l'écran. Elle n'a plus d'état : elle suit les données et l'échelle.
    const rendu = render(
      <BlocFrise bundle={bundle([operation("4", le(8, 25), le(10, 10))])} />,
    );
    const texte = () => rendu.container.textContent ?? "";
    fireEvent.click(screen.getByRole("button", { name: "Revenir à la frise" }));
    fireEvent.click(screen.getByRole("button", { name: "Y aller" }));
    expect(texte()).toContain("« Permis de feu n°4 — Cuisine »");

    fireEvent.click(screen.getByRole("button", { name: "12 mois" }));
    // En « 12 mois », le 25 août (21 jours avant) est à l'écran.
    expect(texte()).not.toContain("cadrage d'ouverture");
    fireEvent.click(screen.getByRole("button", { name: "90 jours" }));
    expect(texte()).toContain("« Permis de feu n°4 — Cuisine »");

    // D'autres données, sans démontage (un filtre de zone) : la note les suit.
    rendu.rerender(
      <BlocFrise
        bundle={bundle([
          operation("4", le(8, 25), le(10, 10)),
          operation("7", le(8, 20), le(9, 30)),
        ])}
      />,
    );
    expect(texte()).toContain("2 opérations non closes se trouvent plus tôt sur la frise");
  });
});
