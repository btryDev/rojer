// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import type { CarnetActionState } from "@/lib/carnet-sanitaire/actions";

/**
 * Quand les trois formulaires du carnet sanitaire se referment.
 *
 * Le contrat du 2026-10-12, gardé :
 *   - une CORRECTION réussie referme le formulaire — la carte montre le
 *     résultat —, et la suivante aussi ;
 *   - une correction refusée le laisse ouvert, avec son message ;
 *   - une SAISIE réussie ne le referme pas (on enchaîne les relevés) ;
 *   - rouvert après une correction réussie, le formulaire reste ouvert : le
 *     succès déjà vu ne le referme pas une seconde fois.
 *
 * Et un défaut corrigé le 2026-10-13 : l'ancien `useEffect` dépendait de
 * l'objet corrigé ; un parent re-rendu avec un nouvel objet (revalidation)
 * refermait seul un formulaire rouvert. Le rendu du parent ne le referme
 * plus.
 *
 * Le faux serveur rend une copie NEUVE à chaque appel, comme une vraie
 * action serveur : c'est l'identité de l'état qui dit qu'une réponse est
 * nouvelle. Un faux qui rendrait toujours le même objet laisserait passer
 * un hook qui compare `status` au lieu de l'état.
 */

const { action, reglage } = vi.hoisted(() => {
  const reglage: { reponse: unknown } = { reponse: { status: "success" } };
  return {
    reglage,
    action: vi.fn(async () => ({ ...(reglage.reponse as object) })),
  };
});

vi.mock("@/lib/carnet-sanitaire/actions", () => ({
  ajouterAnalyseLegionelle: action,
  modifierAnalyseLegionelle: action,
  ajouterReleve: action,
  modifierReleve: action,
  creerPointReleve: action,
  modifierPointReleve: action,
}));

import { AjoutAnalyseForm } from "./AjoutAnalyseForm";
import { AjoutReleveForm } from "./AjoutReleveForm";
import { AjoutPointReleveForm } from "./AjoutPointReleveForm";

afterEach(cleanup);
beforeEach(() => {
  action.mockClear();
  reglage.reponse = { status: "success" };
});

const souffler = () => new Promise((r) => setTimeout(r, 40));

const refus: CarnetActionState = {
  status: "error",
  message: "Refus du serveur",
};

type Cas = {
  nom: string;
  correction: () => ReactElement;
  saisie: () => ReactElement;
  ouvrirCorrection: RegExp;
  ouvrirSaisie: RegExp;
  soumettre: RegExp;
};

const CAS: Cas[] = [
  {
    nom: "analyse de légionelles",
    correction: () => (
      <AjoutAnalyseForm
        etablissementId="e1"
        analyse={{
          id: "a1",
          dateAnalyse: "2026-01-10",
          laboratoire: "Labo",
          valeurUfcParL: 10,
          commentaire: null,
          rapportNom: null,
        }}
      />
    ),
    saisie: () => <AjoutAnalyseForm etablissementId="e1" />,
    ouvrirCorrection: /^Modifier$/,
    ouvrirSaisie: /Enregistrer une analyse/,
    soumettre: /^Enregistrer (la correction|l'analyse)$/,
  },
  {
    nom: "relevé de température",
    correction: () => (
      <AjoutReleveForm
        etablissementId="e1"
        pointReleveId="p1"
        seuilMinCelsius={50}
        typeReseau="ECS"
        releve={{
          id: "r1",
          dateReleve: "2026-01-10",
          temperatureCelsius: 55,
          operateur: null,
          commentaire: null,
        }}
      />
    ),
    saisie: () => (
      <AjoutReleveForm
        etablissementId="e1"
        pointReleveId="p1"
        seuilMinCelsius={50}
        typeReseau="ECS"
      />
    ),
    ouvrirCorrection: /^Modifier$/,
    ouvrirSaisie: /Saisir un relevé/,
    soumettre: /^Enregistrer (la correction|le relevé)$/,
  },
  {
    nom: "point de relevé",
    correction: () => (
      <AjoutPointReleveForm
        etablissementId="e1"
        point={{
          id: "p1",
          nom: "Évier",
          localisation: null,
          batimentId: null,
          typeReseau: "ECS",
          seuilMinCelsius: 50,
        }}
      />
    ),
    saisie: () => <AjoutPointReleveForm etablissementId="e1" />,
    ouvrirCorrection: /^Modifier le point$/,
    ouvrirSaisie: /Ajouter un point de relevé/,
    soumettre: /^(Enregistrer|Ajouter) le point$/,
  },
];

function formulaire() {
  return document.querySelector("form");
}

async function soumettre(c: Cas) {
  screen.getByRole("button", { name: c.soumettre }).click();
  await souffler();
}

describe.each(CAS)("formulaire du carnet — $nom", (c) => {
  it("une correction réussie referme le formulaire", async () => {
    render(c.correction());
    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();
    expect(formulaire()).not.toBeNull();

    await soumettre(c);

    expect(action).toHaveBeenCalledTimes(1);
    expect(formulaire()).toBeNull();
    expect(screen.getByRole("button", { name: c.ouvrirCorrection })).toBeTruthy();
  });

  it("une correction refusée laisse le formulaire ouvert, avec le message", async () => {
    reglage.reponse = refus;
    render(c.correction());
    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();

    await soumettre(c);

    expect(action).toHaveBeenCalledTimes(1);
    expect(formulaire()).not.toBeNull();
    expect(screen.getByText("Refus du serveur")).toBeTruthy();
  });

  it("rouvert après une correction réussie, il reste ouvert", async () => {
    render(c.correction());
    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();
    await soumettre(c);
    expect(formulaire()).toBeNull();

    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();
    expect(formulaire()).not.toBeNull();
  });

  it("une seconde correction réussie referme encore le formulaire", async () => {
    render(c.correction());
    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();
    await soumettre(c);
    expect(formulaire()).toBeNull();

    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();
    await soumettre(c);

    expect(action).toHaveBeenCalledTimes(2);
    expect(formulaire()).toBeNull();
  });

  it("rouvert, il ne se referme pas quand le parent se re-rend avec un nouvel objet", async () => {
    const { rerender } = render(c.correction());
    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();
    await soumettre(c);
    screen.getByRole("button", { name: c.ouvrirCorrection }).click();
    await souffler();
    expect(formulaire()).not.toBeNull();

    // `c.correction()` construit un objet neuf : c'est ce que fait une
    // revalidation de la page.
    rerender(c.correction());
    await souffler();

    expect(formulaire()).not.toBeNull();
  });

  it("une saisie réussie ne referme pas le formulaire", async () => {
    render(c.saisie());
    screen.getByRole("button", { name: c.ouvrirSaisie }).click();
    await souffler();

    // Une saisie vide laisse des champs `required` vides (température du
    // relevé, nom du point) : jsdom bloque alors la soumission.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    for (const champ of document.querySelectorAll<HTMLInputElement>(
      "input[required]",
    )) {
      if (champ.value) continue;
      setter.call(champ, champ.type === "number" ? "55" : "Évier");
      champ.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await souffler();

    await soumettre(c);

    expect(action).toHaveBeenCalledTimes(1);
    expect(formulaire()).not.toBeNull();
  });
});
