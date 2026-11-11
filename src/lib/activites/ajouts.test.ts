// Ajouts et retraits d'un « oui » (ADR-060) — transaction simulée.
//
// Prouvé ici : le choix de l'unité (dédiée s'il reste une place, sinon
// l'unité type, sinon la transverse), l'idempotence, la cotation par défaut
// non saisie, les filtres du retrait (non coté, sans action), la remise à
// valider des étapes. Non prouvé : les index uniques et la sémantique des
// filtres relationnels de Prisma, qu'il faut une vraie base pour observer.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiviteNonCouverte } from "@/lib/referentiels/types";

const h = vi.hoisted(() => ({ places: 0, lots: [] as { nom: string; lignes: Record<string, unknown>[] }[] }));

vi.mock("@/lib/abonnements/quotas", () => ({ placesSousLePlafond: async () => h.places }));
vi.mock("@/lib/auth/portee/lot-verifie", () => ({
  creerEnLotVerifie: async (_tx: unknown, nom: string, lignes: Record<string, unknown>[]) => {
    h.lots.push({ nom, lignes });
    return { count: lignes.length };
  },
}));

const { ajouterPourActivite, retirerPourActivites, synchroniserAjouts, questionsTransversesDe } = await import("./ajouts");

const ACTIVITE: ActiviteNonCouverte = {
  id: "com-decoupe-viande",
  libelle: "Découpe",
  question: "?",
  cequiManque: "…",
  pourquoi: "…",
  aFaire: {
    uniteExistante: "com-mise-rayon",
    uniteDediee: { nom: "Laboratoire de découpe", description: "d" },
    risques: ["Scies à ruban", "Froid"],
    questionsTransverses: ["q-biologique", "q-inexistante"],
  },
};

type Appel = { modele: string; op: string; arg: Record<string, unknown> };

function faussetx(o: { deja?: number; creee?: string | null; typee?: string | null; transverse?: string | null } = {}) {
  const appels: Appel[] = [];
  const note = (modele: string, op: string, rendu: (a: Record<string, unknown>) => unknown) =>
    vi.fn(async (arg: Record<string, unknown>) => {
      appels.push({ modele, op, arg });
      return rendu(arg);
    });
  const tx = {
    risque: {
      count: note("risque", "count", () => o.deja ?? 0),
      deleteMany: note("risque", "deleteMany", () => ({ count: 2 })),
    },
    uniteTravail: {
      findFirst: note("uniteTravail", "findFirst", (a) => {
        const w = a.where as Record<string, unknown>;
        if ("activiteId" in w) return o.creee ? { id: o.creee } : null;
        if (w.estTransverse === true) return o.transverse === null ? null : { id: o.transverse ?? "u-transverse" };
        return o.typee === null ? null : { id: o.typee ?? "u-rayon" };
      }),
      create: note("uniteTravail", "create", () => ({ id: "u-dediee" })),
      deleteMany: note("uniteTravail", "deleteMany", () => ({ count: 0 })),
    },
    duerp: {
      findUnique: note("duerp", "findUnique", () => ({
        etapesValidees: { activite: "2026-11-11T00:00:00.000Z", unites: "2026-11-11T00:00:00.000Z", risques: "2026-11-11T00:00:00.000Z" },
      })),
      update: note("duerp", "update", () => ({})),
    },
  };
  return { tx: tx as never, appels };
}

const P = { duerpId: "d1", compteId: "c1", activite: ACTIVITE };

beforeEach(() => {
  h.places = 0;
  h.lots = [];
});

describe("ajouterPourActivite", () => {
  it("crée l'unité dédiée s'il reste une place, et y met les risques", async () => {
    h.places = 1;
    const { tx, appels } = faussetx();
    expect(await ajouterPourActivite(tx, P)).toBe(true);
    const creation = appels.find((a) => a.modele === "uniteTravail" && a.op === "create")!;
    expect(creation.arg.data).toMatchObject({ duerpId: "d1", nom: "Laboratoire de découpe", activiteId: ACTIVITE.id });
    expect(h.lots[0].lignes.map((l) => l.uniteId)).toEqual(["u-dediee", "u-dediee"]);
  });

  it("sans place, complète l'unité type désignée, sans en créer", async () => {
    h.places = 0;
    const { tx, appels } = faussetx();
    await ajouterPourActivite(tx, P);
    expect(appels.some((a) => a.op === "create")).toBe(false);
    expect(h.lots[0].lignes[0].uniteId).toBe("u-rayon");
  });

  it("sans unité dédiée prévue, ne crée rien même s'il reste de la place", async () => {
    h.places = 99;
    const { tx, appels } = faussetx();
    await ajouterPourActivite(tx, { ...P, activite: { ...ACTIVITE, aFaire: { ...ACTIVITE.aFaire, uniteDediee: undefined } } });
    expect(appels.some((a) => a.op === "create")).toBe(false);
    expect(h.lots[0].lignes[0].uniteId).toBe("u-rayon");
  });

  it("l'unité type supprimée : les risques vont aux risques transverses", async () => {
    const { tx } = faussetx({ typee: null });
    await ajouterPourActivite(tx, P);
    expect(h.lots[0].lignes[0].uniteId).toBe("u-transverse");
  });

  it("reprend l'unité déjà créée pour l'activité", async () => {
    h.places = 1;
    const { tx, appels } = faussetx({ creee: "u-ancienne" });
    await ajouterPourActivite(tx, P);
    expect(appels.some((a) => a.op === "create")).toBe(false);
    expect(h.lots[0].lignes[0].uniteId).toBe("u-ancienne");
  });

  it("idempotent : des ajouts déjà présents, rien n'est écrit", async () => {
    h.places = 1;
    const { tx, appels } = faussetx({ deja: 2 });
    expect(await ajouterPourActivite(tx, P)).toBe(false);
    expect(appels.some((a) => a.op === "create")).toBe(false);
    expect(h.lots).toEqual([]);
  });

  it("ajoute des risques non cotés, à la cotation d'un risque personnalisé, marqués de leur origine", async () => {
    const { tx } = faussetx();
    await ajouterPourActivite(tx, P);
    expect(h.lots[0].nom).toBe("Risque");
    for (const l of h.lots[0].lignes) {
      expect(l).toMatchObject({ activiteId: ACTIVITE.id, gravite: 2, probabilite: 2, maitrise: 2 });
      expect(l).not.toHaveProperty("cotationSaisie");
    }
    expect(h.lots[0].lignes.map((l) => l.libelle)).toEqual(ACTIVITE.aFaire.risques);
  });
});

describe("retirerPourActivites", () => {
  it("ne retire que les risques non cotés et sans action, puis l'unité créée vide", async () => {
    const { tx, appels } = faussetx();
    expect(await retirerPourActivites(tx, { duerpId: "d1", activiteIds: ["a"] })).toBe(true);
    const [risques, unites] = appels.filter((a) => a.op === "deleteMany");
    expect(risques.arg.where).toMatchObject({
      activiteId: { in: ["a"] },
      unite: { duerpId: "d1" },
      cotationSaisie: false,
      actions: { none: {} },
    });
    expect(unites.arg.where).toMatchObject({
      duerpId: "d1",
      activiteId: { in: ["a"] },
      aucunRisqueJustif: null,
      risques: { none: {} },
    });
  });

  it("aucune activité : aucune requête", async () => {
    const { tx, appels } = faussetx();
    expect(await retirerPourActivites(tx, { duerpId: "d1", activiteIds: [] })).toBe(false);
    expect(appels).toEqual([]);
  });
});

describe("synchroniserAjouts", () => {
  function db(tx: unknown) {
    return { $transaction: async (f: (t: unknown) => unknown) => f(tx) } as never;
  }

  it("un « oui » qui ajoute remet « Unités » et « Risques » à valider, pas « Votre activité »", async () => {
    const { tx, appels } = faussetx();
    await synchroniserAjouts(db(tx), { ...P, exercee: true });
    const maj = appels.find((a) => a.modele === "duerp" && a.op === "update")!;
    expect(maj.arg.data).toEqual({ etapesValidees: { activite: "2026-11-11T00:00:00.000Z" } });
  });

  it("rien n'a bougé : les validations restent", async () => {
    const { tx, appels } = faussetx({ deja: 1 });
    await synchroniserAjouts(db(tx), { ...P, exercee: true });
    expect(appels.some((a) => a.modele === "duerp")).toBe(false);
  });

  it("« non » et silence retirent", async () => {
    for (const exercee of [false, null]) {
      const { tx, appels } = faussetx();
      await synchroniserAjouts(db(tx), { ...P, exercee });
      expect(appels.filter((a) => a.op === "deleteMany")).toHaveLength(2);
      expect(appels.some((a) => a.op === "create")).toBe(false);
    }
  });

  it("un doublon concurrent (index unique) n'est pas une erreur ; une autre erreur remonte", async () => {
    const { Prisma } = await import("@prisma/client");
    const doublon = new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" });
    const echoue = (e: unknown) => ({ $transaction: async () => { throw e; } }) as never;
    await expect(synchroniserAjouts(echoue(doublon), { ...P, exercee: true })).resolves.toBeUndefined();
    await expect(synchroniserAjouts(echoue(new Error("panne")), { ...P, exercee: true })).rejects.toThrow("panne");
  });
});

describe("questionsTransversesDe", () => {
  it("résout les questions connues, ignore les autres", () => {
    const qs = questionsTransversesDe(ACTIVITE);
    expect(qs.map((q) => q.id)).toEqual(["q-biologique"]);
    expect(qs[0].question).toMatch(/denrées crues/);
  });
});
