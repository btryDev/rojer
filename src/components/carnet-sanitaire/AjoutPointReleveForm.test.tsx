// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * Le type de point préremplit les seuils (2026-10-14, chantier § 5), qui
 * restent modifiables ; un point d'avant le type peut le rester.
 */

vi.mock("@/lib/carnet-sanitaire/actions", () => ({
  creerPointReleve: vi.fn(async () => ({ status: "success" })),
  modifierPointReleve: vi.fn(async () => ({ status: "success" })),
}));

import { AjoutPointReleveForm } from "./AjoutPointReleveForm";

afterEach(cleanup);
const souffler = () => new Promise((r) => setTimeout(r, 20));

const champ = (nom: string) => document.querySelector<HTMLInputElement>(`[name="${nom}"]`)!;
async function choisirType(valeur: string) {
  const select = document.querySelector<HTMLSelectElement>('select[name="typePoint"]')!;
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!.call(select, valeur);
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await souffler();
}

describe("AjoutPointReleveForm — le type préremplit la plage", () => {
  it("un point neuf n'a ni type ni seuil tant qu'on n'a pas dit où il est", async () => {
    render(<AjoutPointReleveForm etablissementId="e1" />);
    screen.getByRole("button", { name: /Ajouter un point de relevé/ }).click();
    await souffler();
    const select = document.querySelector<HTMLSelectElement>('select[name="typePoint"]')!;
    expect(select.value).toBe("");
    expect(select.required).toBe(true);
    expect(champ("seuilMinCelsius").value).toBe("");
    expect(champ("seuilMaxCelsius").value).toBe("");
  });

  it("douche : maximum 50, pas de minimum ; sortie de stockage : minimum 55, pas de maximum", async () => {
    render(<AjoutPointReleveForm etablissementId="e1" />);
    screen.getByRole("button", { name: /Ajouter un point de relevé/ }).click();
    await souffler();

    await choisirType("PUISAGE_TOILETTE");
    expect(champ("seuilMinCelsius").value).toBe("");
    expect(champ("seuilMaxCelsius").value).toBe("50");

    await choisirType("SORTIE_STOCKAGE");
    expect(champ("seuilMinCelsius").value).toBe("55");
    expect(champ("seuilMaxCelsius").value).toBe("");

    await choisirType("EAU_FROIDE");
    expect(champ("seuilMaxCelsius").value).toBe("20");
  });

  it("un point d'avant le type s'ouvre « non précisé », avec son réseau et son minimum", async () => {
    render(
      <AjoutPointReleveForm
        etablissementId="e1"
        point={{
          id: "p1",
          nom: "Retour",
          localisation: null,
          batimentId: null,
          typeReseau: "ECS_BOUCLAGE",
          typePoint: null,
          seuilMinCelsius: 55,
          seuilMaxCelsius: null,
        }}
      />,
    );
    screen.getByRole("button", { name: /Modifier le point/ }).click();
    await souffler();
    const select = document.querySelector<HTMLSelectElement>('select[name="typePoint"]')!;
    expect(select.value).toBe("");
    expect(select.required).toBe(false);
    expect(champ("typeReseau").value).toBe("ECS_BOUCLAGE");
    expect(champ("seuilMinCelsius").value).toBe("55");
    expect(champ("seuilMaxCelsius").value).toBe("");

    // Préciser le type propose ses seuils, et le réseau n'est plus envoyé à part.
    await choisirType("RETOUR_BOUCLE");
    expect(champ("seuilMinCelsius").value).toBe("50");
    expect(document.querySelector('[name="typeReseau"]')).toBeNull();
  });

  it("l'aide cite l'article 36, ses conditions, son alternative, et le repère de Rojer", async () => {
    render(<AjoutPointReleveForm etablissementId="e1" />);
    screen.getByRole("button", { name: /Ajouter un point de relevé/ }).click();
    await souffler();
    const aide = document.getElementById("aide-seuils")!.textContent!;
    expect(aide).toContain("article 36 de l'arrêté du 23 juin 1978");
    expect(aide).toContain("plus de 3 litres");
    expect(aide).toContain("tubes finaux");
    expect(aide).toContain("400 litres");
    expect(aide).toContain("élévation quotidienne");
    expect(aide).toContain("repère de Rojer");
    expect(aide).toContain("50 °C au plus");
    expect(aide).toContain("60 °C au plus");
  });
});
