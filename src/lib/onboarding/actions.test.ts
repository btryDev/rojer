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
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        void args;
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
    // « commit » marque la fin de la transaction : la génération doit venir
    // APRÈS, sur des lignes validées — placée dans le callback, elle lirait un
    // établissement que la base ne voit pas encore.
    $transaction: async (fn: (tx: typeof h.tx) => Promise<unknown>) => {
      const res = await fn(h.tx);
      h.ordre.push("commit");
      return res;
    },
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
  h.tx.etablissement.create.mockClear();
});

describe("finaliserOnboarding — le calendrier naît avec l'établissement", () => {
  it("génère le calendrier du nouvel établissement, APRÈS sa création et AVANT la redirection", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(h.regenererApresMutation).toHaveBeenCalledWith("etab-1", "onboarding");
    expect(h.ordre).toEqual([
      "entreprise",
      "etablissement",
      "commit",
      "generation",
      "redirection",
    ]);
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

// Le nombre de personnes (R. 4227-34) revient au parcours le 2026-09-21. Le
// schéma a ses tests ; ceux-ci tiennent le BRANCHEMENT — que le champ posté
// atteigne la base, et que rien n'y soit écrit quand personne n'a répondu.
// Retirer la ligne `personnesPresentesHabituellement` de l'objet `input`, ou
// le spread de l'écriture, laisse le schéma vert et crée un restaurant muet.
describe("finaliserOnboarding — le nombre de personnes atteint la base (2026-09-21)", () => {
  const restaurant = {
    codeNaf: "56.10A",
    estERP: "true",
    typeErp: "N",
    categorieErp: "N5",
  };
  const ecrit = () =>
    h.tx.etablissement.create.mock.calls[0]?.[0].data as Record<string, unknown>;

  it("écrit le nombre déclaré par un restaurant de 5ᵉ catégorie", async () => {
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ ...restaurant, personnesPresentesHabituellement: "40" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit().personnesPresentesHabituellement).toBe(40);
  });

  it("refuse le même restaurant s'il ne répond pas, et ne crée rien", async () => {
    const res = await finaliserOnboarding(
      { status: "idle" },
      formulaire(restaurant),
    );
    expect(res.status).toBe("error");
    expect(
      res.status === "error" &&
        res.fieldErrors?.personnesPresentesHabituellement?.[0],
    ).toMatch(/combien de personnes/i);
    expect(h.tx.etablissement.create).not.toHaveBeenCalled();
  });

  it("n'écrit RIEN pour un bureau, à qui la question n'est pas posée", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit()).not.toHaveProperty("personnesPresentesHabituellement");
  });
});
