import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compterLignesAvecPreuve,
  lignesVisees,
  type LigneVisee,
  type PrescriptionAPreuver,
} from "./preuves";

// La suppression d'une prescription : ce que le serveur refuse de détruire.
// La règle est pure (`preuves.ts`) et se teste sur les trois scénarios de la
// revue ; l'action est tenue sur un client simulé qui rend les lignes visées.

const h = vi.hoisted(() => {
  const etat = {
    prescription: null as Record<string, unknown> | null,
    lignes: [] as {
      statut: string;
      rapports: { dateRapport: Date }[];
      _count: { actions: number };
    }[],
  };
  const prisma = {
    prescriptionParticuliere: {
      findFirst: vi.fn(async () => etat.prescription),
      delete: vi.fn(async () => ({})),
    },
    verification: {
      findMany: vi.fn(async () => etat.lignes),
    },
  };
  return { etat, prisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => undefined),
}));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: vi.fn(async () => undefined),
}));

const { supprimerPrescription } = await import("./actions");

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Une demande d'assureur qui rend le maintien en état d'un portail semestriel. */
const renforcement = (dateDocument: string): PrescriptionAPreuver => ({
  id: "presc-1",
  effet: "renforce_periodicite",
  obligationId: "porte-auto-maintien-en-etat",
  equipementId: "eq-portail",
  dateDocument: jour(dateDocument),
});

const ligne = (rapports: string[], over: Partial<LigneVisee> = {}): LigneVisee => ({
  statut: "planifiee",
  rapports: rapports.map((d) => ({ dateRapport: jour(d) })),
  nbActions: 0,
  ...over,
});

beforeEach(() => {
  h.etat.prescription = null;
  h.etat.lignes = [];
  vi.clearAllMocks();
});

describe("preuves faites sous l'acte (2026-09-15)", () => {
  it("SAISIE ERRONÉE sur une ligne déjà contrôlée : les rapports antérieurs à l'acte ne comptent pas", () => {
    // Le portail porte des rapports de 2025 ; la prescription, posée par
    // erreur, est datée de 2026. La régénération lui a inscrit la ligne : le
    // compte par `prescriptionId` valait 1 dès la création, et la suppression
    // tournait en rond. Aucun rapport n'a été fait sous elle.
    expect(
      compterLignesAvecPreuve(renforcement("2026-09-01"), [
        ligne(["2025-03-10", "2025-09-12"]),
      ]),
    ).toBe(0);
  });

  it("LEVÉE avec un rapport postérieur à l'acte : il compte, que la ligne la porte encore ou non", () => {
    // Levée, la prescription ne marque plus la ligne (`prescriptionId` à
    // `null`) : l'ancien compte tombait à zéro. Le rapport de mars 2026 a été
    // fait au rythme qu'elle imposait.
    expect(
      compterLignesAvecPreuve(renforcement("2025-12-01"), [
        ligne(["2025-06-01", "2026-03-15"]),
      ]),
    ).toBe(1);
  });

  it("RATTRAPÉE par le référentiel : même règle, les rapports faits sous l'acte comptent", () => {
    // La prescription reste affichée active, mais le référentiel impose déjà un
    // rythme au moins aussi strict : elle ne surcharge plus, la ligne perd son
    // marquage. Le rapport du jour même de l'acte compte — « à partir de ».
    expect(
      compterLignesAvecPreuve(renforcement("2026-01-10"), [
        ligne(["2026-01-10"]),
        ligne([]),
      ]),
    ).toBe(1);
  });

  it("une action seule ne compte pas sur un renforcement ; tout compte sur une obligation sur mesure", () => {
    const action = ligne([], { nbActions: 1 });
    expect(compterLignesAvecPreuve(renforcement("2026-01-10"), [action])).toBe(0);
    expect(
      compterLignesAvecPreuve(
        { ...renforcement("2026-01-10"), effet: "obligation_sur_mesure", obligationId: null },
        [action, ligne(["2020-01-01"]), ligne([], { statut: "realisee_conforme" })],
      ),
    ).toBe(3);
  });

  it("les lignes visées : obligation × appareil, toutes les lignes de l'obligation sans appareil, ses propres lignes sur mesure", () => {
    expect(lignesVisees("etab-1", renforcement("2026-01-10"))).toEqual({
      etablissementId: "etab-1",
      obligationId: "porte-auto-maintien-en-etat",
      equipementId: "eq-portail",
    });
    expect(
      lignesVisees("etab-1", { ...renforcement("2026-01-10"), equipementId: null }),
    ).toEqual({ etablissementId: "etab-1", obligationId: "porte-auto-maintien-en-etat" });
    expect(
      lignesVisees("etab-1", {
        ...renforcement("2026-01-10"),
        effet: "obligation_sur_mesure",
        obligationId: null,
      }),
    ).toEqual({ etablissementId: "etab-1", obligationId: "prescription:presc-1" });
    expect(
      lignesVisees("etab-1", { ...renforcement("2026-01-10"), obligationId: null }),
    ).toBeNull();
  });
});

describe("supprimerPrescription", () => {
  const poser = (dateDocument: string, rapports: string[]) => {
    h.etat.prescription = { ...renforcement(dateDocument) };
    h.etat.lignes = [
      {
        statut: "planifiee",
        rapports: rapports.map((d) => ({ dateRapport: jour(d) })),
        _count: { actions: 0 },
      },
    ];
  };

  it("accepte la saisie erronée posée sur une ligne contrôlée avant l'acte", async () => {
    poser("2026-09-01", ["2025-03-10"]);
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("success");
    expect(h.prisma.prescriptionParticuliere.delete).toHaveBeenCalledTimes(1);
  });

  it("refuse, sans renvoi circulaire, dès qu'un rapport a été fait sous l'acte", async () => {
    poser("2025-12-01", ["2026-03-15"]);
    const res = await supprimerPrescription("etab-1", "presc-1");
    expect(res.status).toBe("error");
    expect(h.prisma.prescriptionParticuliere.delete).not.toHaveBeenCalled();
    const message = res.status === "error" ? res.message : "";
    expect(message).toContain("01/12/2025");
    // Le message ne renvoie ni à « annuler la levée » ni à une suppression
    // ultérieure : il dit ce qui reste et comment arrêter l'effet.
    expect(message).not.toMatch(/annul/i);
  });

  it("lit les lignes par cible, jamais par `prescriptionId`", async () => {
    poser("2026-09-01", []);
    await supprimerPrescription("etab-1", "presc-1");
    expect(h.prisma.verification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          etablissementId: "etab-1",
          obligationId: "porte-auto-maintien-en-etat",
          equipementId: "eq-portail",
        },
      }),
    );
  });
});
