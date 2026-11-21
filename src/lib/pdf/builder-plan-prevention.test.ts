// Les données du PDF d'un plan de prévention (2026-11-19) : le plan se lit
// DANS l'établissement de l'appelant, et seules les signatures en vigueur
// sont lues.

import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { construirePlanPreventionData } from "./builder-plan-prevention";

const PLAN = {
  numero: 7,
  statut: "valide",
  entrepriseExterieureRaison: "Clim Services",
  entrepriseExterieureSiret: null,
  efChefNom: "Paul Durand",
  efEffectifIntervenant: 2,
  euChefNom: "Claire Martin",
  euChefFonction: null,
  dateDebut: new Date("2026-11-20T07:00:00Z"),
  dateFin: new Date("2026-11-21T16:00:00Z"),
  dureeHeuresEstimee: 450,
  heuresPrevisiblesRevisees: null,
  heuresPrevisiblesReviseesLe: null,
  lieux: "Cuisine",
  naturesTravaux: "Groupe froid",
  travauxDangereux: false,
  inspectionDate: null,
  inspectionParticipants: null,
  lignes: [],
  phasesDangereuses: [],
  adaptationMateriels: null,
  instructionsTravailleurs: null,
  organisationSecours: null,
  participationCroisee: null,
};

function dbSimulee(plan: typeof PLAN | null) {
  const db = {
    etablissement: {
      findFirst: vi.fn(async () => ({
        raisonDisplay: "Le Comptoir",
        adresse: "1 rue des Lilas",
        siret: null,
        entreprise: { raisonSociale: "Btry SAS" },
      })),
    },
    planPrevention: { findFirst: vi.fn(async () => plan) },
    signature: { findMany: vi.fn(async () => []) },
    // « Brouillon » ou non (2026-11-19) : les liens partis du plan.
    accessToken: { count: vi.fn(async () => 1) },
  };
  return { db, client: db as unknown as Prisma.TransactionClient };
}

describe("construirePlanPreventionData", () => {
  it("cherche le plan dans l'établissement donné, et les seules signatures actives", async () => {
    const { db, client } = dbSimulee(PLAN);
    const data = await construirePlanPreventionData(client, "etab-1", "plan-1");
    expect(db.planPrevention.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "plan-1", etablissementId: "etab-1" } }),
    );
    expect(db.signature.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          etablissementId: "etab-1",
          objetType: "plan_prevention",
          objetId: "plan-1",
          active: true,
        },
      }),
    );
    expect(data?.numero).toBe(7);
    expect(data?.entreprise).toBe("Btry SAS");
    expect(data?.raisonsEcrit.length).toBeGreaterThan(0);
  });

  it("aucune adresse électronique n'est lue : ni celle du chef EE, ni celle des signataires", async () => {
    const { db, client } = dbSimulee(PLAN);
    await construirePlanPreventionData(client, "etab-1", "plan-1");
    const selectPlan = (db.planPrevention.findFirst.mock.calls[0] as unknown[])[0] as { select: object };
    const selectSig = (db.signature.findMany.mock.calls[0] as unknown[])[0] as { select: object };
    expect(Object.keys(selectPlan.select)).not.toContain("efChefEmail");
    expect(Object.keys(selectSig.select)).not.toContain("signataireEmail");
  });

  it("un plan hors de l'établissement (autre compte) : null, donc 404", async () => {
    const { client } = dbSimulee(null);
    expect(await construirePlanPreventionData(client, "etab-1", "plan-d-autrui")).toBeNull();
  });
});
