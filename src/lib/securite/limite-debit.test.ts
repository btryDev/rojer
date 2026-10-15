import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La composition du verdict, sans base (le SQL est éprouvé contre PostgreSQL
 * par `limite-debit.integration.test.ts`). Le faux client rend, pour chaque
 * clé, le compte que la base aurait rendu.
 */

const h = vi.hoisted(() => ({
  comptes: new Map<string, number>(),
  appels: [] as string[],
  menage: 0,
  panne: false,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: async (_sql: TemplateStringsArray, cle: string) => {
      if (h.panne) throw new Error("connexion refusée");
      h.appels.push(cle);
      const compte = (h.comptes.get(cle) ?? 0) + 1;
      h.comptes.set(cle, compte);
      return [{ compte, reste: 125 }];
    },
    $executeRaw: async () => {
      h.menage += 1;
      return 0;
    },
  },
}));

const { cleLimite, consommer, delaiLisible, messageTropDeTentatives } = await import(
  "./limite-debit"
);

const L = { max: 2, fenetreSecondes: 60 };
const sansMenage = { tirage: () => 0.5 };

beforeEach(() => {
  h.comptes.clear();
  h.appels = [];
  h.menage = 0;
  h.panne = false;
});

describe("consommer", () => {
  it("admet jusqu'à la limite, refuse au-delà avec le délai restant", async () => {
    const d = [{ cle: "a", limite: L }];
    expect(await consommer(d, sansMenage)).toEqual({ ok: true });
    expect(await consommer(d, sansMenage)).toEqual({ ok: true });
    expect(await consommer(d, sansMenage)).toEqual({ ok: false, reessayerDansSecondes: 125 });
  });

  it("consomme TOUTES les clés, même quand la première refuse", async () => {
    h.comptes.set("ip", 99);
    const v = await consommer(
      [
        { cle: "ip", limite: L },
        { cle: "compte", limite: L },
      ],
      sansMenage,
    );
    expect(v.ok).toBe(false);
    expect(h.appels).toEqual(["ip", "compte"]);
  });

  it("laisse passer si la base ne répond pas : une panne de PostgreSQL n'est pas une panne de connexion", async () => {
    h.panne = true;
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await consommer([{ cle: "a", limite: L }], sansMenage)).toEqual({ ok: true });
    expect(erreur).toHaveBeenCalled();
    erreur.mockRestore();
  });

  it("fait le ménage des fenêtres closes, une fois sur cent", async () => {
    await consommer([{ cle: "a", limite: L }], { tirage: () => 0.005 });
    expect(h.menage).toBe(1);
    await consommer([{ cle: "a", limite: L }], { tirage: () => 0.02 });
    expect(h.menage).toBe(1);
  });
});

describe("clés et messages", () => {
  it("ne garde ni l'IP ni l'adresse en clair", () => {
    const cle = cleLimite("connexion", "compte", "dirigeant@exemple.fr");
    expect(cle).toMatch(/^connexion:compte:[0-9a-f]{32}$/);
    expect(cle).not.toContain("exemple");
    expect(cleLimite("connexion", "ip", "203.0.113.7")).not.toContain("203.0");
  });

  it("dit le délai en mots", () => {
    expect(delaiLisible(1)).toBe("1 seconde");
    expect(delaiLisible(40)).toBe("40 secondes");
    expect(delaiLisible(61)).toBe("2 minutes");
    expect(delaiLisible(60)).toBe("1 minute");
    expect(messageTropDeTentatives(600)).toMatch(/réessayez dans 10 minutes/);
  });
});
