// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * Le panneau ne tait plus l'échec de régénération du calendrier (2026-10-14,
 * `docs/chantiers-ouverts.md` § 0, défaut n° 6). `creerEquipementsDepuisPreRemplissage`
 * renvoie `avertissement` quand les fiches sont créées mais que le calendrier
 * n'a pas suivi ; le panneau l'ignorait. Éprouvé en retirant
 * `setAvertissement(res.avertissement ?? null)` : le premier test rougit.
 */

let reponse: { status: "success"; created: number; avertissement?: string } = {
  status: "success",
  created: 2,
};

vi.mock("@/lib/equipements/actions", () => ({
  creerEquipementsDepuisPreRemplissage: async () => reponse,
}));

import { PreRemplissagePanel } from "./PreRemplissagePanel";

afterEach(cleanup);

const suggestions = [
  { categorie: "EXTINCTEUR" as const, libelle: "Extincteurs", raison: "Tout établissement" },
  { categorie: "BAES" as const, libelle: "BAES", raison: "Tout établissement" },
];

const souffler = () => new Promise((r) => setTimeout(r, 30));
const AVERTISSEMENT = "Les équipements sont enregistrés, mais le calendrier n'a pas pu être recalculé.";

describe("le panneau de pré-remplissage dit l'échec de régénération", () => {
  it("fiches créées, calendrier non recalculé : le succès ET l'avertissement sont dits", async () => {
    reponse = { status: "success", created: 2, avertissement: AVERTISSEMENT };
    render(<PreRemplissagePanel etablissementId="e1" suggestions={suggestions} />);
    screen.getByRole("button", { name: /Créer/ }).click();
    await souffler();
    expect(screen.getByText(/2 équipements ajoutés/)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(AVERTISSEMENT);
  });

  it("sans avertissement : rien de plus que le succès", async () => {
    reponse = { status: "success", created: 2 };
    render(<PreRemplissagePanel etablissementId="e1" suggestions={suggestions} />);
    screen.getByRole("button", { name: /Créer/ }).click();
    await souffler();
    expect(screen.getByText(/2 équipements ajoutés/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
