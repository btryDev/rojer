import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La pastille « en retard » de la barre latérale ne dit jamais un compte faux.
 *
 * Elle est rendue par le layout, qui ne répare pas le calendrier (il tourne en
 * parallèle de la page, `regeneration-sure.ts`). Sur un calendrier qui n'est
 * pas à jour, le compte de retards est celui d'avant le changement de
 * référentiel ou de moteur : `chargerSidebarCounts` ne le rend donc pas, et
 * le dit (2026-10-13, `docs/chantiers-ouverts.md` § 12).
 */

const fraicheurCalendrier = vi.fn();
const compterEnRetardParFamille = vi.fn();

vi.mock("@/lib/calendrier/fraicheur", async (importOriginal) => ({
  // `calendrierIncertain` reste la vraie règle : seule la lecture est simulée.
  ...(await importOriginal<typeof import("@/lib/calendrier/fraicheur")>()),
  fraicheurCalendrier: (id: string) => fraicheurCalendrier(id),
}));
vi.mock("@/lib/calendrier/retards", () => ({
  compterEnRetardParFamille: (id: string) => compterEnRetardParFamille(id),
}));
vi.mock("@/lib/actions/queries", () => ({
  compterActions: async () => ({ totalACouvrir: 2 }),
}));
vi.mock("@/lib/prestataires/queries", () => ({
  compterVigilanceParGravite: async () => ({ total: 1, enRetard: 0 }),
}));
vi.mock("@/lib/salaries/queries", () => ({
  compterTitresEnRetard: async () => 0,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { equipement: { count: async () => 4 } },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "user-1" }),
}));

const { chargerSidebarCounts } = await import("./sidebar-counts");

beforeEach(() => {
  fraicheurCalendrier.mockReset();
  compterEnRetardParFamille.mockReset();
  compterEnRetardParFamille.mockResolvedValue({ total: 7 });
});

describe("chargerSidebarCounts — la pastille du calendrier", () => {
  it("calendrier à jour : le nombre de retards, comme avant", async () => {
    fraicheurCalendrier.mockResolvedValue({ etat: "a_jour" });
    const c = await chargerSidebarCounts("etab-1");
    expect(c.enRetardTotal).toBe(7);
    expect(c.calendrierAMettreAJour).toBe(false);
  });

  it.each([
    { etat: "perime", sceauPose: "ancien", sceauAttendu: "courant" },
    { etat: "echec_regeneration" },
    { etat: "jamais_genere" },
  ])("calendrier « $etat » : AUCUN nombre, et le dit", async (f) => {
    fraicheurCalendrier.mockResolvedValue(f);
    const c = await chargerSidebarCounts("etab-1");
    expect(c.enRetardTotal).toBeUndefined();
    expect(c.calendrierAMettreAJour).toBe(true);
  });

  it("lit la fraîcheur de l'établissement demandé, et seulement le repère", async () => {
    // La lecture est celle de `fraicheurCalendrier` — garde de session et
    // filtre sur le propriétaire, éprouvés dans `fraicheur.test.ts`.
    fraicheurCalendrier.mockResolvedValue({ etat: "a_jour" });
    await chargerSidebarCounts("etab-42");
    expect(fraicheurCalendrier).toHaveBeenCalledWith("etab-42");
  });

  it("les autres pastilles ne bougent pas", async () => {
    fraicheurCalendrier.mockResolvedValue({ etat: "jamais_genere" });
    const c = await chargerSidebarCounts("etab-1");
    expect(c).toMatchObject({
      equipements: 4,
      actions: 2,
      prestatairesAlertes: 1,
      titresEnRetard: 0,
    });
  });
});
