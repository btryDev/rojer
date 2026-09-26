// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * Deux états du même geste ne se contredisent pas.
 *
 * « 8 équipements ajoutés » s'affichait pendant que le bouton disait encore
 * « Création… ». Le motif nu — un `setMessage` après un `await`, dans une
 * transition — ne le reproduit pas : mesuré, React 19 valide les deux
 * ensemble. Ce qui le reproduit, et que ce test tient, c'est le SECOND clic :
 * le message du premier passage survivait à l'ouverture du second, et
 * s'affichait donc en toutes lettres au-dessus d'un bouton en cours.
 *
 * La règle vaut quelle que soit la cause : une opération en cours n'a pas de
 * résultat, donc pas de message.
 */

let debloquer: (() => void) | null = null;

vi.mock("@/lib/equipements/actions", () => ({
  creerEquipementsDepuisPreRemplissage: async () => {
    await new Promise<void>((r) => {
      debloquer = r;
    });
    return { created: 8 };
  },
}));

import { PreRemplissagePanel } from "./PreRemplissagePanel";

afterEach(cleanup);

const suggestions = [
  {
    categorie: "EXTINCTEUR" as const,
    libelle: "Extincteurs",
    raison: "Tout établissement",
  },
];

const souffler = () => new Promise((r) => setTimeout(r, 30));

describe("le bouton et le message ne se contredisent jamais", () => {
  it("pendant la création, aucun message de résultat n'est affiché", async () => {
    render(
      <PreRemplissagePanel etablissementId="e1" suggestions={suggestions} />,
    );

    // Premier passage, mené jusqu'au bout : le message apparaît.
    screen.getByRole("button", { name: /Créer/ }).click();
    await souffler();
    debloquer!();
    await souffler();
    expect(screen.getByText(/8 équipements ajoutés/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Créer/ })).toBeTruthy();

    // Second passage : c'est ici que les deux se croisaient.
    screen.getByRole("button", { name: /Créer/ }).click();
    await souffler();

    expect(screen.getByRole("button").textContent).toContain("Création…");
    expect(screen.queryByText(/8 équipements ajoutés/)).toBeNull();

    debloquer!();
    await souffler();
    // Et le résultat revient quand il est vrai.
    expect(screen.getByText(/8 équipements ajoutés/)).toBeTruthy();
  });
});

describe("la mention de sur-application s'affiche avec la raison (C39)", () => {
  it("rendue dans le même paragraphe que la citation", () => {
    render(
      <PreRemplissagePanel
        etablissementId="e1"
        suggestions={[
          {
            categorie: "EXTINCTEUR" as const,
            libelle: "Extincteurs portatifs",
            raison:
              "Vérification annuelle (Arrêté du 25 juin 1980, art. MS 38 § 4 — livre II, établissements des quatre premières catégories).",
            mention: "En 5ᵉ catégorie, l'échéance est maintenue par sur-application assumée.",
          },
        ]}
      />,
    );
    const p = screen.getByText(/MS 38 § 4 — livre II/);
    expect(p.textContent).toContain("sur-application assumée");
  });
});
