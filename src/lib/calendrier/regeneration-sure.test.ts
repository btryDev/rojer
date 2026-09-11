// Le garde commun des neuf appels — six modules d'actions serveur — qui
// régénèrent le calendrier après une mutation.
//
// Il était sans test — relevé en relecture le 2026-09-11 —, alors qu'il porte à
// lui seul la promesse que ces neuf appels tiennent : une mutation
// commitée n'est jamais présentée comme un échec parce que le recalage qui la
// suit a échoué. Sans lui, l'utilisateur voit une erreur, redépose son rapport,
// et en obtient deux.

import { beforeEach, describe, expect, it, vi } from "vitest";

const genererCalendrier = vi.fn();
const marquerCalendrierPerime = vi.fn();

vi.mock("./actions", () => ({ genererCalendrier }));
vi.mock("./reconciliation", () => ({ marquerCalendrierPerime }));

const { regenererApresMutation } = await import("./regeneration-sure");

beforeEach(() => {
  genererCalendrier.mockReset();
  marquerCalendrierPerime.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("regenererApresMutation", () => {
  it("rend vrai quand le recalage passe, et ne marque rien", async () => {
    genererCalendrier.mockResolvedValue({});

    await expect(regenererApresMutation("etab-1", "test")).resolves.toBe(true);
    expect(genererCalendrier).toHaveBeenCalledWith("etab-1");
    expect(marquerCalendrierPerime).not.toHaveBeenCalled();
  });

  it("n'échoue JAMAIS : un recalage qui lève rend faux au lieu de propager", async () => {
    // C'est toute la raison d'être du module. Si l'exception remontait, l'action
    // serveur échouerait sur une mutation déjà commitée.
    genererCalendrier.mockRejectedValue(new Error("base indisponible"));

    await expect(regenererApresMutation("etab-1", "test")).resolves.toBe(false);
  });

  it("marque le calendrier périmé quand le recalage échoue", async () => {
    // Sans cette marque, le calendrier n'est ni vide ni périmé en version :
    // l'auto-réparation à l'ouverture ne le reprendrait jamais, il resterait
    // juste faux.
    genererCalendrier.mockRejectedValue(new Error("base indisponible"));

    await regenererApresMutation("etab-1", "test");
    expect(marquerCalendrierPerime).toHaveBeenCalledWith("etab-1");
  });
});
