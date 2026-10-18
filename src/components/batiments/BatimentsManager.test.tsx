// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MAX_ZONES } from "@/lib/batiments/schema";
import type { BatimentListe } from "@/lib/batiments/queries";

/**
 * Ce que le formulaire d'ajout d'une zone doit à celui qui le remplit.
 *
 * Deux choses, et la première est un piège de React 19 : un
 * `<form action={…}>` est remis à blanc dès que l'action rend la main — **y
 * compris quand elle refuse**. Le nom tapé pour une quatrième zone
 * disparaissait donc avec le message qui expliquait le refus. Vérifié en
 * jsdom, et la parade aussi : `form.reset()` ne vide pas un champ, il le
 * ramène à son défaut ; en tenant le défaut synchronisé avec la frappe, la
 * remise à blanc devient un geste sans effet. Un champ *contrôlé* (`value`)
 * n'y suffirait pas — le DOM repart au défaut et l'état React ne le sait pas.
 *
 * La seconde : la borne se dit avant qu'on la heurte.
 */

const refus = {
  status: "error" as const,
  message: "Un établissement compte 3 zones au plus.",
  fieldErrors: { nom: ["Un établissement compte 3 zones au plus."] },
};

vi.mock("@/lib/batiments/actions", () => ({
  creerBatiment: async () => refus,
  modifierBatiment: async () => refus,
  supprimerBatiment: async () => refus,
}));

import { BatimentsManager } from "./BatimentsManager";

afterEach(cleanup);
beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

function zones(n: number): BatimentListe[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `z${i}`,
    nom: `Zone ${i + 1}`,
    complementAdresse: null,
    ordre: i,
    nbEquipements: 0,
  }));
}

function taper(el: HTMLInputElement, valeur: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(el, valeur);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const souffler = () => new Promise((r) => setTimeout(r, 40));

describe("un refus ne fait pas retaper ce qui a été saisi", () => {
  it("le nom et le complément survivent au refus qui les explique", async () => {
    render(<BatimentsManager etablissementId="e1" batiments={zones(2)} />);

    const nom = screen.getByLabelText(/^Nom/) as HTMLInputElement;
    const complement = screen.getByLabelText(
      /Complément d'adresse/,
    ) as HTMLInputElement;
    taper(nom, "Annexe");
    taper(complement, "3 rue du Fort");
    await souffler();

    screen.getByRole("button", { name: /Ajouter/ }).click();
    await souffler();

    // Le message est là…
    expect(screen.getByText(/Un établissement compte 3 zones au plus/)).toBeTruthy();
    // … et ce qu'on avait tapé aussi.
    expect(nom.value).toBe("Annexe");
    expect(complement.value).toBe("3 rue du Fort");
  });
});

describe("la borne se dit avant qu'on la heurte", () => {
  it("annonce ce qu'il reste tant qu'il reste de la place", () => {
    render(<BatimentsManager etablissementId="e1" batiments={zones(2)} />);
    expect(screen.getByText(/il en reste une à poser/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ajouter/ })).toBeTruthy();
  });

  it("au plafond, la porte est annoncée fermée et le formulaire retiré", () => {
    render(
      <BatimentsManager etablissementId="e1" batiments={zones(MAX_ZONES)} />,
    );
    expect(screen.getByText(/zones au plus/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Ajouter$/ })).toBeNull();
  });

  it("un dossier ancien qui porte déjà plus que le plafond garde ses zones", () => {
    // La borne vaut à l'ajout, jamais à la lecture (ADR-029) : les quatre
    // lieux restent listés, seul le formulaire disparaît.
    render(<BatimentsManager etablissementId="e1" batiments={zones(4)} />);
    expect(screen.getAllByText(/^Zone \d$/)).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /^Ajouter$/ })).toBeNull();
  });
});

describe("un dossier ancien : le nom stocké se lit traduit, se renomme tel quel (revue du 2026-10-17)", () => {
  const ancien: BatimentListe[] = [
    { id: "z0", nom: "Bâtiment principal", complementAdresse: null, ordre: 0, nbEquipements: 0 },
    { id: "z1", nom: "Cuisine", complementAdresse: null, ordre: 1, nbEquipements: 0 },
  ];

  it("la liste dit « Zone principale », le champ de renommage préremplit « Bâtiment principal »", async () => {
    render(<BatimentsManager etablissementId="e1" batiments={ancien} />);
    expect(screen.getByText("Zone principale")).toBeTruthy();
    screen.getAllByRole("button", { name: /Renommer/ })[0].click();
    await souffler();
    const champ = document.getElementById("nom-z0") as HTMLInputElement;
    // Préremplir « Zone principale » ferait lever l'unicité (P2002) au
    // dossier qui porte aussi une zone de ce nom.
    expect(champ.value).toBe("Bâtiment principal");
  });
});
