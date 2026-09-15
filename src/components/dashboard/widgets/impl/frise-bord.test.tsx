// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { DashboardBundle } from "../types";

// Le lien de provenance lit l'URL courante par `next/navigation`, absent hors
// du routeur : un lien nu suffit à ce que ces tests regardent.
vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { BlocFrise } from "./board";

afterEach(cleanup);

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

describe("frise du tableau de bord — une opération posée au bord gauche", () => {
  /**
   * 2026-09-15. Une opération commencée il y a plus de trois mois, finissant
   * dans dix jours, entre dans la frise au bord gauche ; la frise s'ouvre
   * cadrée sur aujourd'hui, et sa carte était hors de l'écran sans que rien
   * ne le dise.
   */
  it("la nomme sous la frise, avec un moyen d'y aller", () => {
    const texte = enFrise([operation("3", "2026-04-01", "2026-09-25")]);
    expect(texte).toContain(
      "Une opération commencée il y a plus de trois mois est posée au bord gauche de la frise : « Permis de feu n°3 — Cuisine ».",
    );
    expect(screen.getByRole("button", { name: "Y aller" })).toBeTruthy();
  });

  it("ne dit rien d'une opération commencée dans la fenêtre", () => {
    const texte = enFrise([operation("4", "2026-08-01", "2026-09-25")]);
    expect(texte).not.toContain("bord gauche");
  });
});
