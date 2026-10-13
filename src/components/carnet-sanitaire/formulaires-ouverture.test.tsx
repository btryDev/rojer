// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import type { CarnetActionState } from "@/lib/carnet-sanitaire/actions";

/**
 * Quand les trois formulaires du carnet sanitaire se referment.
 *
 * Le contrat, inchangé depuis le 2026-10-12 :
 *   - une CORRECTION réussie referme le formulaire — la carte montre le
 *     résultat ;
 *   - une correction refusée le laisse ouvert, avec son message ;
 *   - une SAISIE réussie ne le referme pas (on enchaîne les relevés) ;
 *   - rouvert après une correction réussie, le formulaire reste ouvert : le
 *     succès déjà vu ne le referme pas une seconde fois.
 *
 * Ce dernier cas est le piège d'une dérivation naïve (« ouvert tant que
 * l'état n'est pas un succès ») : elle refermerait le formulaire dès sa
 * réouverture.
 */

const { action, reglage } = vi.hoisted(() => {
  const reglage: { reponse: unknown } = { reponse: { status: "success" } };
  return { reglage, action: vi.fn(async () => reglage.reponse) };
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
