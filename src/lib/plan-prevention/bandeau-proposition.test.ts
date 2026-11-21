import { describe, expect, it } from "vitest";
import { bandeauDeLaProposition, lignesDEcart } from "./bandeau-proposition";
import type { PlanComparable, Proposition } from "./proposition";

const plan: PlanComparable = {
  entrepriseExterieureRaison: "Nettoyage Pro SARL",
  entrepriseExterieureSiret: null,
  efChefNom: "Jean Testeur",
  efEffectifIntervenant: 1,
  entrepriseExterieureAdresse: null,
  efChefTelephone: null,
  lignes: [
    { id: "l1", risque: "Graisses chaudes", mesureEntrepriseUtilisatrice: "Hors service", mesureEntrepriseExterieure: "Gants" },
    { id: "l2", risque: "Sol glissant", mesureEntrepriseUtilisatrice: "Zone balisée", mesureEntrepriseExterieure: "Panneaux" },
    { id: "l3", risque: "Bruit de la hotte", mesureEntrepriseUtilisatrice: null, mesureEntrepriseExterieure: null },
  ].map((l) => ({ ...l, famille: null, lieu: null, frequence: null })),
};

const proposition: Proposition = {
  fiche: {
    entrepriseExterieureRaison: "Nettoyage Pro SARL",
    entrepriseExterieureSiret: null,
    efChefNom: "Paul Testeur",
    efEffectifIntervenant: 1,
  },
  lignes: [
    { id: "l1", risque: "Graisses chaudes", mesureEntrepriseUtilisatrice: "Hors service", mesureEntrepriseExterieure: "Gants" },
    { id: "l2", risque: "Sol glissant", mesureEntrepriseUtilisatrice: "Zone balisée", mesureEntrepriseExterieure: "Panneaux et balisage" },
    { risque: "Produits corrosifs", mesureEntrepriseUtilisatrice: null, mesureEntrepriseExterieure: "Fiches de sécurité" },
  ],
} as Proposition;

describe("le bandeau d'une proposition", () => {
  const b = bandeauDeLaProposition(plan, proposition);

  it("la fiche d'abord, puis les risques dans l'ordre proposé, puis ceux qui disparaîtraient", () => {
    expect(b.lignes.map((l) => l.type)).toEqual(["fiche", "inchange", "modifie", "ajoute", "supprime"]);
  });

  it("ne marque changé que le champ qui change", () => {
    const m = b.lignes.find((l) => l.type === "modifie");
    expect(m).toMatchObject({
      numero: 2,
      changements: { risque: null, eu: null, ee: { avant: "Panneaux", apres: "Panneaux et balisage" } },
    });
  });

  it("compte : fiche et risques modifiés, ajoutés, à supprimer", () => {
    expect([b.modifies, b.ajoutes, b.supprimes]).toEqual([2, 1, 1]);
  });

  it("en tableau : une ligne par écart, l'inchangé omis (2026-11-21)", () => {
    expect(lignesDEcart(b)).toEqual([
      { cle: "fiche-efChefNom", quoi: expect.any(String), avant: "Jean Testeur", apres: "Paul Testeur", genre: "modifie" },
      { cle: "l2-ee", quoi: "Risque 2 · sa mesure", avant: "Panneaux", apres: "Panneaux et balisage", genre: "modifie" },
      { cle: "ajout-2", quoi: "Risque ajouté", avant: "", apres: "Produits corrosifs", genre: "ajoute" },
      { cle: "suppr-l3", quoi: "Risque supprimé", avant: "Bruit de la hotte", apres: "Supprimé", genre: "supprime" },
    ]);
  });
});
