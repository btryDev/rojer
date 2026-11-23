import { describe, expect, it } from "vitest";
import { fermeParLaBaisse, ouvertParLaMontee, sensDuChangement } from "./changement";

describe("sensDuChangement", () => {
  it("la formule d'abord, puis le rythme", () => {
    expect(sensDuChangement("rojer_essentiel_mensuel", "rojer_pro_mensuel")).toBe("montee");
    expect(sensDuChangement("rojer_essentiel_mensuel", "rojer_essentiel_annuel")).toBe("montee");
    expect(sensDuChangement("rojer_essentiel_annuel", "rojer_pro_mensuel")).toBe("montee");
    expect(sensDuChangement("rojer_pro_mensuel", "rojer_essentiel_annuel")).toBe("baisse");
    expect(sensDuChangement("rojer_pro_annuel", "rojer_pro_mensuel")).toBe("baisse");
    expect(sensDuChangement("rojer_pro_annuel", "rojer_pro_annuel")).toBe("identique");
  });

  it("une clé inconnue : pas de sens", () => {
    expect(sensDuChangement(null, "rojer_pro_mensuel")).toBeNull();
    expect(sensDuChangement("rojer_pro_mensuel", "rojer_surmesure_mensuel")).toBeNull();
  });
});

describe("ce qu'un changement ouvre ou ferme, dit dans la fenêtre (2026-11-23)", () => {
  it("monter d'Essentiel à Pro : sites, personnes, volumes, assistant, expert ; un simple changement de rythme n'ouvre rien", () => {
    expect(ouvertParLaMontee("essentiel", "pro")).toEqual([
      "5 établissements au lieu de 1",
      "5 utilisateurs au lieu de 1",
      "Volumes d'usage triplés",
      "Connecter un assistant IA",
      "L'expert : vos questions, et 1 h de rendez-vous par an",
    ]);
    expect(ouvertParLaMontee("pro", "pro")).toEqual([]);
  });

  it("baisser de Pro à Essentiel : ce qui passe en lecture seule (jamais les personnes, qui bloquent), volumes, assistant, expert", () => {
    expect(
      fermeParLaBaisse("pro", "essentiel", [
        { quota: "etablissements", utilise: 3, plafond: 1 },
        { quota: "prestataires", utilise: 11, plafond: 10 },
        { quota: "membres", utilise: 2, plafond: 1 },
      ]),
    ).toEqual([
      "2 établissements sur 3 passent en lecture seule, les plus récents : consultables et exportables, plus modifiables",
      "1 prestataire sur 11 passe en lecture seule, le plus récent : consultables et exportables, plus modifiables",
      "Volumes d'usage divisés par trois (permis de feu, plans de prévention, signatures, stockage)",
      "L'assistant IA connecté est débranché",
      "Plus de question à l'expert ni de rendez-vous annuel",
    ]);
  });
});
