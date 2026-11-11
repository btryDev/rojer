// Ajouts et retraits d'un « oui » (ADR-060) — transaction simulée.
//
// Prouvé ici : le choix de l'unité (celle des ajouts déjà là, sinon dédiée
// s'il reste une place, sinon l'unité type, jamais la transverse), la
// cotation par défaut non saisie, les filtres du retrait (ce que le dirigeant
// a touché reste), la remise à valider des étapes, le doublon concurrent
// toléré et lui seul. Non prouvé : les index uniques et la sémantique des
// filtres relationnels de Prisma, qu'il faut une vraie base pour observer.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { ActiviteNonCouverte } from "@/lib/referentiels/types";

const h = vi.hoisted(() => ({
  places: 0,
  lots: [] as { nom: string; lignes: Record<string, unknown>[]; dejaLa: number }[],
  dejaLa: 0,
}));

vi.mock("@/lib/abonnements/quotas", () => ({ placesSousLePlafond: async () => h.places }));
vi.mock("@/lib/auth/portee/lot-verifie", () => ({
  // `skipDuplicates` : les `dejaLa` premières lignes existent déjà.
  creerEnLotVerifie: async (_tx: unknown, nom: string, lignes: Record<string, unknown>[]) => {
    h.lots.push({ nom, lignes, dejaLa: h.dejaLa });
    return { count: Math.max(0, lignes.length - h.dejaLa) };
  },
}));

const { ajouterPourActivite, retirerPourActivites, synchroniserAjouts, questionsTransversesDe, estDoublonDOrigine } =
  await import("./ajouts");

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
const SANS_DEDIEE: ActiviteNonCouverte = { ...ACTIVITE, aFaire: { ...ACTIVITE.aFaire, uniteDediee: undefined } };

type Appel = { modele: string; op: string; arg: Record<string, unknown> };

function faussetx(o: { creee?: string; risqueDans?: string; typee?: string | null } = {}) {
  const appels: Appel[] = [];
  const note = (modele: string, op: string, rendu: (a: Record<string, unknown>) => unknown) =>
    vi.fn(async (arg: Record<string, unknown>) => {
      appels.push({ modele, op, arg });
      return rendu(arg);
    });
  const tx = {
    risque: {
      findFirst: note("risque", "findFirst", () => (o.risqueDans ? { uniteId: o.risqueDans } : null)),
      deleteMany: note("risque", "deleteMany", () => ({ count: 2 })),
    },
    uniteTravail: {
      findFirst: note("uniteTravail", "findFirst", (a) => {
        const w = a.where as Record<string, unknown>;
        if ("activiteId" in w) return o.creee ? { id: o.creee } : null;
        if (w.estTransverse === true) throw new Error("la transverse ne doit jamais être cherchée");
        return o.typee === null ? null : { id: o.typee ?? "u-rayon" };
      }),
      create: note("uniteTravail", "create", () => ({ id: "u-dediee" })),
      deleteMany: note("uniteTravail", "deleteMany", () => ({ count: 0 })),
    },
    duerp: {
      findUnique: note("duerp", "findUnique", () => ({
        etapesValidees: {
          activite: "2026-11-11T00:00:00.000Z",
          unites: "2026-11-11T00:00:00.000Z",
          risques: "2026-11-11T00:00:00.000Z",
        },
      })),
      update: note("duerp", "update", () => ({})),
    },
  };
  return { tx: tx as never, appels };
}

const P = { duerpId: "d1", compte: { compteId: "c1" }, activite: ACTIVITE };
const creations = (appels: Appel[]) => appels.filter((a) => a.op === "create");

beforeEach(() => {
  h.places = 0;
  h.lots = [];
  h.dejaLa = 0;
});

describe("ajouterPourActivite — l'unité", () => {
  it("crée l'unité dédiée s'il reste une place, et y met les risques", async () => {
    h.places = 1;
    const { tx, appels } = faussetx();
    expect(await ajouterPourActivite(tx, P)).toBe(true);
    expect(creations(appels)[0].arg.data).toMatchObject({
      duerpId: "d1",
      nom: "Laboratoire de découpe",
      activiteId: ACTIVITE.id,
    });
    expect(h.lots[0].lignes.map((l) => l.uniteId)).toEqual(["u-dediee", "u-dediee"]);
  });

  it("sans place, complète l'unité type désignée, sans en créer", async () => {
    const { tx, appels } = faussetx();
    await ajouterPourActivite(tx, P);
    expect(creations(appels)).toEqual([]);
    expect(h.lots[0].lignes[0].uniteId).toBe("u-rayon");
  });

  it("sans unité dédiée prévue, ne crée rien même s'il reste de la place", async () => {
    h.places = 99;
    const { tx, appels } = faussetx();
    await ajouterPourActivite(tx, { ...P, activite: SANS_DEDIEE });
    expect(creations(appels)).toEqual([]);
    expect(h.lots[0].lignes[0].uniteId).toBe("u-rayon");
  });

  it("sans place et sans unité type, n'ajoute rien — jamais aux risques transverses", async () => {
    const { tx } = faussetx({ typee: null });
    expect(await ajouterPourActivite(tx, P)).toBe(false);
    expect(h.lots).toEqual([]);
  });

  it("reprend l'unité déjà créée pour l'activité", async () => {
    h.places = 1;
    const { tx, appels } = faussetx({ creee: "u-ancienne" });
    await ajouterPourActivite(tx, P);
    expect(creations(appels)).toEqual([]);
    expect(h.lots[0].lignes[0].uniteId).toBe("u-ancienne");
  });

  it("après un « non » qui a gardé un risque coté, complète l'unité de ce risque, sans en créer une autre", async () => {
    h.places = 1;
    const { tx, appels } = faussetx({ risqueDans: "u-rayon-gardee" });
    await ajouterPourActivite(tx, P);
    expect(creations(appels)).toEqual([]);
    expect(h.lots[0].lignes.map((l) => l.uniteId)).toEqual(["u-rayon-gardee", "u-rayon-gardee"]);
  });
});

describe("ajouterPourActivite — les risques", () => {
  it("rend les risques retirés par un « non », sans doubler ceux qui sont restés", async () => {
    h.dejaLa = 1;
    const { tx } = faussetx({ risqueDans: "u-rayon" });
    expect(await ajouterPourActivite(tx, P)).toBe(true);
    expect(h.lots[0].lignes.map((l) => l.libelle)).toEqual(ACTIVITE.aFaire.risques);
  });

  it("tout est déjà là : rien n'a bougé", async () => {
    h.dejaLa = 2;
    const { tx } = faussetx({ risqueDans: "u-rayon" });
    expect(await ajouterPourActivite(tx, P)).toBe(false);
  });

  it("ajoute des risques non cotés, à la cotation d'un risque personnalisé, marqués de leur origine", async () => {
    const { tx } = faussetx();
    await ajouterPourActivite(tx, P);
    expect(h.lots[0].nom).toBe("Risque");
    for (const l of h.lots[0].lignes) {
      expect(l).toMatchObject({ activiteId: ACTIVITE.id, gravite: 2, probabilite: 2, maitrise: 2 });
      expect(l).not.toHaveProperty("cotationSaisie");
    }
  });
});

describe("retirerPourActivites", () => {
  it("ne retire que les risques que le dirigeant n'a pas touchés", async () => {
    const { tx, appels } = faussetx();
    expect(await retirerPourActivites(tx, { duerpId: "d1", activites: [ACTIVITE] })).toBe(true);
    const risques = appels.find((a) => a.modele === "risque" && a.op === "deleteMany")!;
    expect(risques.arg.where).toEqual({
      unite: { duerpId: "d1" },
      // Un libellé reformulé n'est plus « ce que Rojer a mis ».
      OR: [{ activiteId: ACTIVITE.id, libelle: { in: ACTIVITE.aFaire.risques } }],
      cotationSaisie: false,
      actions: { none: {} },
      interventions: { none: {} },
      description: null,
      nombreSalariesExposes: null,
      dateMesuresPhysiques: null,
      exposeCMR: false,
    });
  });

  it("ne retire l'unité créée que vide, sans justification, sous son nom et sa description d'origine", async () => {
    const { tx, appels } = faussetx();
    await retirerPourActivites(tx, { duerpId: "d1", activites: [ACTIVITE] });
    const unites = appels.find((a) => a.modele === "uniteTravail" && a.op === "deleteMany")!;
    expect(unites.arg.where).toEqual({
      duerpId: "d1",
      OR: [{ activiteId: ACTIVITE.id, nom: "Laboratoire de découpe", description: "d" }],
      aucunRisqueJustif: null,
      risques: { none: {} },
    });
  });

  it("une activité sans unité dédiée ne retire aucune unité", async () => {
    const { tx, appels } = faussetx();
    await retirerPourActivites(tx, { duerpId: "d1", activites: [SANS_DEDIEE] });
    expect(appels.some((a) => a.modele === "uniteTravail")).toBe(false);
  });

  it("aucune activité : aucune requête", async () => {
    const { tx, appels } = faussetx();
    expect(await retirerPourActivites(tx, { duerpId: "d1", activites: [] })).toBe(false);
    expect(appels).toEqual([]);
  });
});

describe("synchroniserAjouts", () => {
  const db = (tx: unknown) => ({ $transaction: async (f: (t: unknown) => unknown) => f(tx) }) as never;

  it("un « oui » qui ajoute remet « Unités » et « Risques » à valider, pas « Votre activité »", async () => {
    const { tx, appels } = faussetx();
    await synchroniserAjouts(db(tx), { ...P, exercee: true });
    const maj = appels.find((a) => a.modele === "duerp" && a.op === "update")!;
    expect(maj.arg.data).toEqual({ etapesValidees: { activite: "2026-11-11T00:00:00.000Z" } });
  });

  it("rien n'a bougé : les validations restent", async () => {
    h.dejaLa = 2;
    const { tx, appels } = faussetx({ risqueDans: "u-rayon" });
    await synchroniserAjouts(db(tx), { ...P, exercee: true });
    expect(appels.some((a) => a.modele === "duerp")).toBe(false);
  });

  it("« non » et silence retirent, sans rien créer", async () => {
    for (const exercee of [false, null]) {
      const { tx, appels } = faussetx();
      await synchroniserAjouts(db(tx), { ...P, exercee });
      expect(appels.filter((a) => a.op === "deleteMany")).toHaveLength(2);
      expect(creations(appels)).toEqual([]);
    }
  });

  it("un doublon sur un index d'origine n'est pas une erreur ; une autre erreur remonte", async () => {
    const p2002 = (target: unknown) =>
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x", meta: { target } });
    const echoue = (e: unknown) => ({ $transaction: async () => { throw e; } }) as never;
    await expect(
      synchroniserAjouts(echoue(p2002(["duerpId", "activiteId"])), { ...P, exercee: true }),
    ).resolves.toBeUndefined();
    await expect(synchroniserAjouts(echoue(p2002(["siret"])), { ...P, exercee: true })).rejects.toThrow("dup");
    await expect(synchroniserAjouts(echoue(new Error("panne")), { ...P, exercee: true })).rejects.toThrow("panne");
  });

  it("estDoublonDOrigine reconnaît les deux index, par champs ou par nom", () => {
    const e = (target: unknown) =>
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x", meta: { target } });
    expect(estDoublonDOrigine(e(["uniteId", "activiteId", "libelle"]))).toBe(true);
    expect(estDoublonDOrigine(e("UniteTravail_duerpId_activiteId_key"))).toBe(true);
    expect(estDoublonDOrigine(e(undefined))).toBe(false);
  });
});

describe("questionsTransversesDe", () => {
  it("résout les questions connues, ignore les autres", () => {
    const qs = questionsTransversesDe(ACTIVITE);
    expect(qs.map((q) => q.id)).toEqual(["q-biologique"]);
    expect(qs[0].question).toMatch(/denrées crues/);
  });
});
