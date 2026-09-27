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
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        void args;
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
  fd.set("effectifEntreprise", "6");
  fd.set("estEtablissementTravail", "true");
  // Les trois régimes répondus « non » : sans réponse, la porte refuse
  // (2026-09-27, A2).
  fd.set("estERP", "false");
  fd.set("estIGH", "false");
  fd.set("estHabitation", "false");
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

// Le nombre de personnes (R. 4227-34) revient au parcours le 2026-09-20. Le
// schéma a ses tests ; ceux-ci tiennent le BRANCHEMENT — que le champ posté
// atteigne la base, et que rien n'y soit écrit quand personne n'a répondu.
// Retirer la ligne `personnesPresentesHabituellement` de l'objet `input`, ou
// le spread de l'écriture, laisse le schéma vert et crée un restaurant muet.
describe("finaliserOnboarding — le nombre de personnes atteint la base (2026-09-20)", () => {
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

describe("les deux effectifs (C37)", () => {
  // L'effectif de l'entreprise était recopié de celui du site, apprentis
  // compris. Il est demandé pour lui-même : c'est sur lui que se comptent le
  // CSE et le règlement intérieur (L. 2311-2 → L. 1111-2, L. 1111-3).
  it("écrit l'effectif de l'entreprise déclaré, pas celui du site", async () => {
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ effectifSurSite: "12", effectifEntreprise: "10" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    const entreprise = h.tx.entreprise.create.mock.calls.at(-1)?.[0].data;
    const etablissement = h.tx.etablissement.create.mock.calls.at(-1)?.[0].data;
    expect(entreprise?.effectif).toBe(10);
    expect(etablissement?.effectifSurSite).toBe(12);
  });

  it("refuse un effectif d'entreprise vide plutôt que d'y lire zéro", async () => {
    const res = await finaliserOnboarding(
      { status: "idle" },
      formulaire({ effectifEntreprise: "" }),
    );
    expect(res.status).toBe("error");
    expect(
      res.status === "error" && res.fieldErrors?.effectifEntreprise?.[0],
    ).toBeTruthy();
  });
});

describe("finaliserOnboarding — un régime sans réponse ne vaut pas « non » (2026-09-27, A2)", () => {
  // `raw.estERP === "true"` faisait d'un champ vide un « non » : un ERP muet
  // naissait non-ERP. Éprouvé en rétablissant cette lecture.
  it.each(["estERP", "estIGH", "estHabitation"])(
    "%s vide : refus, et rien n'est créé",
    async (champ) => {
      const res = await finaliserOnboarding(
        { status: "idle" },
        formulaire({ [champ]: "" }),
      );
      expect(res.status).toBe("error");
      expect(h.tx.etablissement.create).not.toHaveBeenCalled();
    },
  );
});

describe("finaliserOnboarding — matières et chiffons au parcours (2026-09-27)", () => {
  // Leur silence fait afficher des lignes « à confirmer » : la question est
  // posée là où l'on répond. « Je ne sais pas encore » n'écrit rien — la
  // colonne reste `null`, jamais un `false` que personne n'a déclaré.
  // Éprouvé en retirant les deux champs de l'objet `input`.
  const ecrit = () =>
    h.tx.etablissement.create.mock.calls.at(-1)?.[0].data as Record<string, unknown>;

  it("« oui » et « non » atteignent la base", async () => {
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ manipuleMatieresR422722: "oui", chiffonsImpregnes: "non" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit().manipuleMatieresR422722).toBe(true);
    expect(ecrit().chiffonsImpregnes).toBe(false);
  });

  it("« je ne sais pas encore » n'écrit rien", async () => {
    await expect(
      finaliserOnboarding({ status: "idle" }, formulaire()),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(ecrit()).not.toHaveProperty("manipuleMatieresR422722");
    expect(ecrit()).not.toHaveProperty("chiffonsImpregnes");
  });
});

describe("finaliserOnboarding — matières « oui », pas de nombre exigé (revue du lot 1)", () => {
  // Même règle au serveur qu'au client. Éprouvé en retirant la ligne du schéma.
  it("un restaurant N5 qui manipule des matières est créé sans nombre de personnes", async () => {
    await expect(
      finaliserOnboarding(
        { status: "idle" },
        formulaire({ estERP: "true", typeErp: "N", categorieErp: "N5", manipuleMatieresR422722: "oui" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});
