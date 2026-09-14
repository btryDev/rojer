// Le garde commun des neuf appels directs — cinq modules d'actions serveur — qui
// régénèrent le calendrier après une mutation.
//
// Il était sans test — relevé en relecture le 2026-09-11 —, alors qu'il porte à
// lui seul la promesse que ces neuf appels tiennent : une mutation
// commitée n'est jamais présentée comme un échec parce que le recalage qui la
// suit a échoué. Sans lui, l'utilisateur voit une erreur, redépose son rapport,
// et en obtient deux.

import { beforeEach, describe, expect, it, vi } from "vitest";

const genererCalendrier = vi.fn();
const regenererSansInvalider = vi.fn();
const marquerCalendrierPerime = vi.fn();
const calendrierDesynchronise = vi.fn();

vi.mock("./actions", () => ({ genererCalendrier, regenererSansInvalider }));
vi.mock("./reconciliation", () => ({ marquerCalendrierPerime }));
vi.mock("./queries", () => ({ calendrierDesynchronise }));

const { regenererApresMutation, assurerCalendrierAJour } = await import(
  "./regeneration-sure"
);

beforeEach(() => {
  genererCalendrier.mockReset();
  regenererSansInvalider.mockReset();
  marquerCalendrierPerime.mockReset();
  calendrierDesynchronise.mockReset();
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

describe("assurerCalendrierAJour — la réparation à l'affichage", () => {
  /**
   * Revue du 2026-09-14 : le tableau de bord, porte d'entrée du produit,
   * lisait un calendrier jamais généré ou périmé sans jamais le réparer ; seule
   * la page Calendrier le faisait. Une fonction pour les deux.
   */
  it("ne régénère rien d'un calendrier à jour", async () => {
    calendrierDesynchronise.mockResolvedValue(false);

    await expect(assurerCalendrierAJour("etab-1")).resolves.toBe(false);
    expect(regenererSansInvalider).not.toHaveBeenCalled();
  });

  it("régénère, SANS invalidation, un calendrier jamais généré ou périmé", async () => {
    // Pendant un rendu, Next refuse `revalidatePath` : c'est la variante sans
    // invalidation qui doit servir, jamais `genererCalendrier`.
    calendrierDesynchronise.mockResolvedValue(true);
    regenererSansInvalider.mockResolvedValue({});

    await expect(assurerCalendrierAJour("etab-1")).resolves.toBe(true);
    expect(regenererSansInvalider).toHaveBeenCalledWith("etab-1");
    expect(genererCalendrier).not.toHaveBeenCalled();
  });

  it("n'échoue JAMAIS : la page s'affiche sur les lignes en base", async () => {
    // Le repère n'est pas posé : l'affichage suivant retentera de lui-même.
    calendrierDesynchronise.mockResolvedValue(true);
    regenererSansInvalider.mockRejectedValue(new Error("base indisponible"));

    await expect(assurerCalendrierAJour("etab-1")).resolves.toBe(false);
  });
});
