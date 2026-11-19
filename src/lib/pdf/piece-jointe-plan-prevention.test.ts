// Le PDF du plan, prêt à joindre (2026-11-19) : un PDF en base64 au nom
// admis par Mailpace, ou `null` — jamais une levée.

import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { pieceJointePlanPrevention } from "./piece-jointe-plan-prevention";

const PLAN = {
  numero: 1,
  statut: "valide",
  entrepriseExterieureRaison: "Clim Services",
  entrepriseExterieureSiret: null,
  efChefNom: "Paul Durand",
  efEffectifIntervenant: 2,
  euChefNom: "Claire Martin",
  euChefFonction: null,
  dateDebut: new Date("2026-11-20T07:00:00Z"),
  dateFin: new Date("2026-11-21T16:00:00Z"),
  dureeHeuresEstimee: 12,
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

function db(plan: unknown, etab: () => Promise<unknown> = async () => ({
  raisonDisplay: "Le Comptoir",
  adresse: "1 rue des Lilas",
  siret: null,
  entreprise: { raisonSociale: "Btry SAS" },
})) {
  return {
    etablissement: { findFirst: vi.fn(etab) },
    planPrevention: { findFirst: vi.fn(async () => plan) },
    signature: { findMany: vi.fn(async () => []) },
  } as unknown as Prisma.TransactionClient;
}

describe("pieceJointePlanPrevention", () => {
  it("un PDF en base64, nommé avec un seul point", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const p = await pieceJointePlanPrevention(db(PLAN), "etab-1", "plan-1");
    expect(p?.name).toBe("Plan_prevention_PP-001_Le_Comptoir.pdf");
    expect(p?.contentType).toBe("application/pdf");
    expect(Buffer.from(p!.content, "base64").subarray(0, 5).toString()).toBe("%PDF-");
    // Le rendu est journalisé sous son origine.
    expect(String(info.mock.calls.at(-1)?.[0])).toMatch(/"origine":"courriel"/);
    info.mockRestore();
  }, 30_000);

  it("plan introuvable dans l'établissement : null", async () => {
    expect(await pieceJointePlanPrevention(db(null), "etab-1", "plan-1")).toBeNull();
  });

  it("une lecture en échec : null et une ligne de journal, sans lever", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const p = await pieceJointePlanPrevention(
      db(PLAN, async () => {
        throw new Error("base indisponible");
      }),
      "etab-1",
      "plan-1",
    );
    expect(p).toBeNull();
    expect(String(err.mock.calls[0]?.[1])).toBe("base indisponible");
    err.mockRestore();
  });
});
