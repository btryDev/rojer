// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { EvenementGrille } from "@/lib/calendrier/grille";

// Le lien de provenance lit l'URL courante par `next/navigation`, absent hors
// du routeur : un lien nu suffit à ce que ces tests regardent.
vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { VueMois } from "./VueMois";

afterEach(cleanup);

// Midi en heure locale : le jour civil ne dépend pas du fuseau du processus.
const AUJOURDHUI = new Date(2026, 8, 15, 12);

const operation = (debut: Date, fin: Date): EvenementGrille => ({
  id: "permis-feu-3",
  libelle: "Permis de feu n°3 — Cuisine",
  equipement: "travaux par point chaud",
  tone: "ok",
  date: debut,
  dateFin: fin,
  famille: "operations",
  href: "/etablissements/etab-1/permis-feu/3",
});

const texteDuMois = (e: EvenementGrille) =>
  render(
    <VueMois
      mois={AUJOURDHUI}
      evenements={[e]}
      aujourdhui={AUJOURDHUI}
      hrefEvenement={() => "#"}
      onPrecedent={() => {}}
      onSuivant={() => {}}
    />,
  ).container.textContent ?? "";

describe("grille du mois — une opération posée sur sa fin", () => {
  /**
   * Relecture du 2026-09-15 : posée sur le jour de sa fin, la pastille se
   * relisait comme le début des travaux. Elle le dit en tête.
   */
  it("porte « Fin · » en tête de son libellé", () => {
    const texte = texteDuMois(
      operation(new Date(2026, 2, 12, 12), new Date(2026, 8, 25, 12)),
    );
    expect(texte).toContain("Fin · Permis de feu n°3 — Cuisine");
  });

  it("n'en dit rien d'une opération posée sur son début", () => {
    const texte = texteDuMois(
      operation(new Date(2026, 8, 20, 12), new Date(2026, 9, 20, 12)),
    );
    expect(texte).toContain("Permis de feu n°3 — Cuisine");
    expect(texte).not.toContain("Fin ·");
  });
});
