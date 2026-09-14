// Onboarding — le calendrier naît avec le premier établissement.
//
// Revue du 2026-09-14 : l'onboarding créait l'entreprise et l'établissement,
// puis conduisait à la déclaration des équipements, sans rien générer. Un
// bureau sans appareil, qui doit pourtant ses obligations d'établissement
// (ADR-022), n'avait aucune ligne en base, et son tableau de bord se disait
// vide tant que personne n'ouvrait la page Calendrier.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const ordre: string[] = [];
  const tx = {
    entreprise: {
      create: vi.fn(async () => {
        ordre.push("entreprise");
        return { id: "ent-1" };
      }),
    },
    etablissement: {
      create: vi.fn(async () => {
        ordre.push("etablissement");
        return { id: "etab-1", entrepriseId: "ent-1" };
      }),
    },
  };
  return {
    ordre,
    tx,
    regenererApresMutation: vi.fn(async () => {
      ordre.push("generation");
      return true;
    }),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: typeof h.tx) => Promise<unknown>) => fn(h.tx),
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/auth/scope", () => ({
  getOptionalUserEtablissement: vi.fn(async () => null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    h.ordre.push("redirection");
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: h.regenererApresMutation,
}));

const { finaliserOnboarding } = await import("./actions");

function formulaire(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("raisonSociale", "Cabinet Martin");
  fd.set("adresse", "12 rue des halles, 44000 Nantes");
  fd.set("codeNaf", "69.10Z");
  fd.set("effectifSurSite", "6");
  fd.set("estEtablissementTravail", "true");
  for (const [k, v] of Object.entries(over)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  h.ordre.length = 0;
  h.regenererApresMutation.mockClear();
});

describe("finaliserOnboarding — le calendrier naît avec l'établissement", () => {
  it("génère le calendrier du nouvel établissement, APRÈS sa création et AVANT la redirection", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.regenererApresMutation).toHaveBeenCalledWith("etab-1", "onboarding");
    expect(h.ordre).toEqual(["entreprise", "etablissement", "generation", "redirection"]);
  });

  it("ne génère rien quand le formulaire est refusé", async () => {
    const res = await finaliserOnboarding(
      { status: "idle" },
      formulaire({ raisonSociale: "" }),
    );

    expect(res.status).toBe("error");
    expect(h.regenererApresMutation).not.toHaveBeenCalled();
  });
});
