import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/layout/AppSidebar", () => ({ AppSidebar: () => null }));
const chargeurs = vi.hoisted(() => ({
  chargerSidebarCounts: vi.fn(),
  getEtatModules: vi.fn(),
}));
vi.mock("@/lib/navigation/sidebar-counts", () => ({
  chargerSidebarCounts: chargeurs.chargerSidebarCounts,
}));
vi.mock("@/lib/etablissements/modules", () => ({ getEtatModules: chargeurs.getEtatModules }));

import { SidebarAvecPastilles, SidebarComplete } from "./SidebarAvecPastilles";

const etablissement = {
  id: "e1",
  raisonDisplay: "Le Comptoir",
  adresse: "1 rue",
  effectifSurSite: 8,
  entrepriseId: "en1",
  estERP: true,
};

type Proprietes = Record<string, unknown>;
const props = (el: unknown) => (el as ReactElement<Proprietes>).props;

afterEach(() => vi.clearAllMocks());

describe("SidebarAvecPastilles", () => {
  it("affiche tout de suite une barre inerte, sans pastilles ni état des registres", () => {
    const repli = props(props(SidebarAvecPastilles({ etablissement })).fallback);
    expect(repli.enAttente).toBe(true);
    expect(repli.counts).toBeUndefined();
    expect(repli.modules).toBeUndefined();
  });

  it("la barre complète porte les pastilles et l'état des registres, interactive", async () => {
    chargeurs.chargerSidebarCounts.mockResolvedValue({ enRetardTotal: 3 });
    chargeurs.getEtatModules.mockResolvedValue({ estERP: true });
    const p = props(await SidebarComplete({ etablissement }));
    expect(p.counts).toEqual({ enRetardTotal: 3 });
    expect(p.modules).toEqual({ estERP: true });
    expect(p.enAttente).toBeUndefined();
    // Les mêmes chargeurs que le shell DUERP (ADR-015), avec le régime ERP.
    expect(chargeurs.chargerSidebarCounts).toHaveBeenCalledWith("e1");
    expect(chargeurs.getEtatModules).toHaveBeenCalledWith("e1", true);
  });

  it("une lecture en échec laisse la barre, utilisable et sans pastilles, plutôt que l'écran d'erreur", async () => {
    chargeurs.chargerSidebarCounts.mockRejectedValue(new Error("délai dépassé"));
    chargeurs.getEtatModules.mockResolvedValue({ estERP: true });
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const p = props(await SidebarComplete({ etablissement }));
    expect(p.counts).toBeUndefined();
    expect(p.enAttente).toBeUndefined();
    expect(journal).toHaveBeenCalled();
    journal.mockRestore();
  });
});
