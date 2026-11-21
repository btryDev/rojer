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

  it("la fiche d'abord, puis les risques dans l'ordre proposé, puis ceux qui disparaîtraient ; l'inchangé omis", () => {
    expect(b.map((l) => l.type)).toEqual(["fiche", "modifie", "ajoute", "supprime"]);
  });

  it("ne marque changé que le champ qui change", () => {
    const m = b.find((l) => l.type === "modifie");
    expect(m).toMatchObject({
      nom: "Sol glissant",
      changements: { risque: null, eu: null, ee: { avant: "Panneaux", apres: "Panneaux et balisage" } },
    });
  });

  it("en tableau : une ligne par écart, chaque risque par son nom (2026-11-21)", () => {
    expect(lignesDEcart(b)).toEqual([
      { cle: "fiche-efChefNom", quoi: expect.any(String), avant: "Jean Testeur", apres: "Paul Testeur", details: [], genre: "modifie" },
      { cle: "l2-ee", quoi: "« Sol glissant » · sa mesure", avant: "Panneaux", apres: "Panneaux et balisage", details: [], genre: "modifie" },
      { cle: "ajout-2", quoi: "Risque ajouté", avant: "", apres: "Produits corrosifs", details: ["Sa mesure : Fiches de sécurité"], genre: "ajoute" },
      { cle: "suppr-l3", quoi: "« Bruit de la hotte »", avant: "Bruit de la hotte", apres: "Supprimé", details: [], genre: "supprime" },
    ]);
  });
});

describe("le tableau des écarts : ce qui se lit avant de décider (relecture du 2026-11-21)", () => {
  it("un risque ajouté porte, sous « Proposé », ce qui sera écrit à l'acceptation — rempli seulement", () => {
    const p = {
      ...proposition,
      lignes: [
        ...proposition.lignes.slice(0, 2),
        { risque: "Poussières", mesureEntrepriseUtilisatrice: "Aspiration", mesureEntrepriseExterieure: null, famille: "BIOLOGIQUE", lieu: "Réserve", frequence: "" },
      ],
    } as Proposition;
    const ajout = lignesDEcart(bandeauDeLaProposition(plan, p)).find((l) => l.genre === "ajoute");
    expect(ajout?.apres).toBe("Poussières");
    expect(ajout?.details).toEqual(["Famille : Biologique", "Lieu : Réserve", "Votre mesure : Aspiration"]);
  });

  it("A, B, C ; A supprimé, le lieu de C modifié : la ligne nomme C, pas un rang", () => {
    const abc: PlanComparable = {
      ...plan,
      lignes: ["A", "B", "C"].map((r) => ({
        id: r,
        risque: r,
        mesureEntrepriseUtilisatrice: null,
        mesureEntrepriseExterieure: null,
        famille: null,
        lieu: r === "C" ? "Cuisine" : null,
        frequence: null,
      })),
    };
    const p = {
      fiche: { ...proposition.fiche, efChefNom: "Jean Testeur" },
      lignes: [
        { id: "B", risque: "B", mesureEntrepriseUtilisatrice: null, mesureEntrepriseExterieure: null },
        { id: "C", risque: "C", mesureEntrepriseUtilisatrice: null, mesureEntrepriseExterieure: null, lieu: "Cour" },
      ],
    } as unknown as Proposition;
    expect(lignesDEcart(bandeauDeLaProposition(abc, p)).map((l) => [l.quoi, l.avant, l.apres])).toEqual([
      ["« C » · lieu", "Cuisine", "Cour"],
      ["« A »", "A", "Supprimé"],
    ]);
  });
});
