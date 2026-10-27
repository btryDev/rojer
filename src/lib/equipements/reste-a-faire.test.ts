import { describe, expect, it } from "vitest";
import { resteAFaireDuParc } from "./reste-a-faire";

const href = (id: string) => `/e/${id}/modifier`;

describe("resteAFaireDuParc", () => {
  it("nomme la question et mène à la fiche de l'appareil", () => {
    const lignes = resteAFaireDuParc({
      appareilsMuets: [{ equipementId: "a", libelle: "Minipelle", champ: "sertAuLevageDePersonnes" }],
      nbEquipements: 1,
      nbSuggestions: 0,
      hrefModifier: href,
    });
    expect(lignes).toEqual([
      {
        genre: "questions",
        cle: "questions-a",
        titre: "Minipelle : répondre à une question",
        questions: ["L'appareil sert-il à lever des personnes ?"],
        href: "/e/a/modifier",
      },
    ]);
  });

  it("regroupe les questions d'un même appareil, une ligne par appareil", () => {
    const lignes = resteAFaireDuParc({
      appareilsMuets: [
        { equipementId: "a", libelle: "Minipelle", champ: "sertAuLevageDePersonnes" },
        { equipementId: "a", libelle: "Minipelle", champ: "estMuParForceHumaine" },
        { equipementId: "b", libelle: "Nacelle", champ: "estMuParForceHumaine" },
      ],
      nbEquipements: 2,
      nbSuggestions: 0,
      hrefModifier: href,
    });
    expect(lignes.map((l) => l.titre)).toEqual([
      "Minipelle : répondre à 2 questions",
      "Nacelle : répondre à une question",
    ]);
  });

  it("propose les suggestions tant qu'aucun équipement n'est déclaré", () => {
    const lignes = resteAFaireDuParc({
      appareilsMuets: [],
      nbEquipements: 0,
      nbSuggestions: 3,
      hrefModifier: href,
    });
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      genre: "suggestions",
      detail: "3 équipements souvent présents dans votre activité : cochez ceux que vous avez.",
    });
  });

  // Le défaut relevé le 2026-10-27 : une suggestion écartée restait à vie.
  it("ne garde plus les suggestions dès le premier équipement déclaré", () => {
    const lignes = resteAFaireDuParc({
      appareilsMuets: [],
      nbEquipements: 1,
      nbSuggestions: 3,
      hrefModifier: href,
    });
    expect(lignes).toEqual([]);
  });

  it("ne dit rien quand il ne reste rien", () => {
    expect(
      resteAFaireDuParc({ appareilsMuets: [], nbEquipements: 0, nbSuggestions: 0, hrefModifier: href }),
    ).toEqual([]);
  });
});
