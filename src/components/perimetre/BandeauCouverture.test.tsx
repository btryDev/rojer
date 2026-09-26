// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { CouvertureEtablissement } from "@/lib/perimetre/couverture";
import { BandeauCouverture } from "./BandeauCouverture";

afterEach(cleanup);

/** Les deux manques que `axeDuerp` et `axeSecteurParDefaut` produisent
 *  ensemble — même axe, deux faits distincts, tous deux vrais. */
const deuxFoisSecteurDuerp: CouvertureEtablissement = {
  manques: [
    {
      axe: "secteur_duerp",
      motif: "Le document unique nomme 2 activités que son référentiel ne couvre pas.",
      consequence: "Ce que le document ne traite pas y est écrit.",
    },
    {
      axe: "secteur_duerp",
      motif:
        "Le document unique s'appuie sur le référentiel « Restauration », qui ne correspond pas à votre code d'activité.",
      consequence: "Votre code d'activité désigne le référentiel « Commerce de détail ».",
    },
  ],
  indeterminations: [],
};

function rendre(couverture: CouvertureEtablissement) {
  return render(
    <BandeauCouverture
      couverture={couverture}
      entrepriseId="e"
      hrefEtablissement="/etablissements/x/modifier"
    />,
  );
}

describe("BandeauCouverture", () => {
  it("rend les deux manques d'un même axe, sans en perdre un", () => {
    rendre(deuxFoisSecteurDuerp);
    expect(screen.getByText(/nomme 2 activités/)).toBeTruthy();
    expect(screen.getByText(/ne correspond pas à votre code/)).toBeTruthy();
  });

  it("ne duplique aucune clé React", () => {
    // Le défaut relevé en revue : la clé valait `e.axe`, et deux entrées
    // portent `secteur_duerp` — par construction, puisque les deux faits sont
    // vrais en même temps. React rendait bien les deux au premier passage,
    // mais déclare le doublon non supporté : la garantie de coexistence
    // reposait sur un comportement non garanti, et l'avertissement polluait
    // chaque rendu serveur concerné.
    const erreurs: unknown[][] = [];
    const spy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        erreurs.push(args);
      });
    try {
      rendre(deuxFoisSecteurDuerp);
    } finally {
      spy.mockRestore();
    }
    const texte = erreurs.map((a) => a.map(String).join(" ")).join("\n");
    expect(texte).not.toMatch(/same key|clé|duplicate/i);
    expect(texte).toBe("");
  });

  it("ne rend rien quand il n'y a rien à signaler", () => {
    const { container } = rendre({ manques: [], indeterminations: [] });
    expect(container.textContent).toBe("");
  });

  it("sépare les faits établis des questions ouvertes", () => {
    rendre({
      manques: [
        {
          axe: "categorie_erp",
          motif: "Cet établissement relève de la 2ᵉ catégorie.",
          consequence: "Le livre II s'applique en entier.",
        },
      ],
      indeterminations: [
        {
          axe: "categorie_erp",
          motif: "La catégorie n'est pas renseignée.",
          quoiFaire: "Elle figure sur votre arrêté d'ouverture.",
        },
      ],
    });
    // Deux blocs, deux tons : les rabattre sur un seul en perdrait une moitié.
    expect(screen.getAllByRole("note")).toHaveLength(2);
  });
});
