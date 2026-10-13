import { beforeEach, describe, expect, it, vi } from "vitest";
import { helpersDAppartenance } from "./tenancy-sonde";

/**
 * Les helpers de `scope.ts` bornent au propriétaire — tous, et pas seulement
 * ceux qu'un test nomme.
 *
 * ## Pourquoi ce fichier
 *
 * Vérification ASVS 5.0.0 du 2026-10-13 (V8.4.1), mutation R1 : le prédicat
 * `entreprise: { userId: user.id }` retiré de `requireEtablissement` ET
 * d'`assertEtablissementOwnership` — les deux helpers par lesquels passent
 * presque toutes les pages et actions. Les tests de `src/lib/auth` sont restés
 * verts : `scope.test.ts` ne couvre que `requireUnite`, `requireRisque`,
 * `requireAction` et `requireVerification`. Seuls deux fichiers éloignés
 * tombaient, par accident.
 *
 * ## Comment
 *
 * La liste des helpers n'est pas écrite ici : elle se relève dans `scope.ts`
 * (`helpersDAppartenance`, même relevé que les balayages de portée). Un helper
 * ajouté demain est éprouvé sans qu'on y pense.
 *
 * Prisma est remplacé par un faux qui ÉVALUE le `where` contre une base d'une
 * seule ligne appartenant au compte A, ligne dont toute relation remonte à A.
 * Un `where` qui ne porte pas `userId` ramène la ligne quel que soit le
 * demandeur — c'est exactement ce que ferait PostgreSQL. L'assertion porte
 * donc sur ce que le helper REND au compte B, pas sur la forme de sa requête.
 */

const PROPRIETAIRE = "user-a";
const AUTRE = "user-b";

const h = vi.hoisted(() => {
  type Where = Record<string, unknown>;
  const etat = { proprietaire: "user-a", appels: [] as { modele: string; where: Where }[] };

  /**
   * Une ligne dont chaque champ est son propre identifiant, `userId` vaut le
   * propriétaire, et toute relation est une ligne de même nature : quelle que
   * soit la profondeur de la chaîne (`risque → unite → duerp → établissement →
   * entreprise`), elle remonte au propriétaire.
   */
  function ligne(id: string): Record<string, unknown> {
    return new Proxy(
      {},
      {
        get(_, cle) {
          if (cle === "then") return undefined; // pas une promesse
          if (cle === "id") return id;
          if (cle === "userId") return etat.proprietaire;
          if (typeof cle === "string" && cle.endsWith("Id")) return `${cle}-1`;
          return ligne(`${String(cle)}-1`);
        },
      },
    );
  }

  /** Évalue un `where` : égalité sur les scalaires, descente sur les relations. */
  function correspond(l: Record<string, unknown>, where: Where): boolean {
    for (const [cle, attendu] of Object.entries(where)) {
      if (attendu !== null && typeof attendu === "object") {
        if (!correspond(l[cle] as Record<string, unknown>, attendu as Where)) return false;
      } else if (cle !== "id" && l[cle] !== attendu) {
        // `id` : la ligne existe pour tout identifiant demandé.
        return false;
      }
    }
    return true;
  }

  const prisma = new Proxy(
    {},
    {
      get(_, modele: string) {
        const lire = async (args: { where?: Where } = {}) => {
          const where = args.where ?? {};
          etat.appels.push({ modele, where });
          const id = typeof where.id === "string" ? where.id : "x";
          const l = ligne(id);
          return correspond(l, where) ? l : null;
        };
        return { findFirst: lire, findUnique: lire };
      },
    },
  );

  return { etat, prisma, requireUser: vi.fn(), cookies: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("./require-user", () => ({
  requireUser: h.requireUser,
  getOptionalUser: h.requireUser,
}));
vi.mock("next/headers", () => ({ cookies: h.cookies }));

import * as scope from "./scope";

function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

const HELPERS = helpersDAppartenance();

function helperNomme(nom: string): (id: string) => Promise<unknown> {
  return (scope as unknown as Record<string, (id: string) => Promise<unknown>>)[nom];
}

beforeEach(() => {
  h.etat.appels.length = 0;
  h.etat.proprietaire = PROPRIETAIRE;
  h.cookies.mockResolvedValue({ get: () => undefined });
});

describe("les helpers d'appartenance de scope.ts", () => {
  it("sont relevés, et ce sont bien des fonctions exportées", () => {
    // Borne basse : un relevé cassé rendrait la suite vide et verte.
    expect(HELPERS.length).toBeGreaterThanOrEqual(9);
    expect(HELPERS).toContain("requireEtablissement");
    expect(HELPERS).toContain("assertEtablissementOwnership");
    for (const nom of HELPERS) {
      expect(typeof (scope as Record<string, unknown>)[nom], nom).toBe("function");
    }
  });

  it.each(HELPERS)("%s rend la ligne à son propriétaire", async (nom) => {
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    const helper = helperNomme(nom);
    await expect(helper("cible-1")).resolves.toBeTruthy();
  });

  it.each(HELPERS)("%s répond notFound à un autre compte", async (nom) => {
    h.requireUser.mockResolvedValue({ id: AUTRE });
    const helper = helperNomme(nom);
    await expect(helper("cible-1")).rejects.toSatisfy(estNotFound);
  });

  it.each(HELPERS)("%s pose l'identifiant ET le propriétaire dans le même where", async (nom) => {
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    const helper = helperNomme(nom);
    await helper("cible-1");
    expect(h.etat.appels.length, "une lecture et une seule").toBe(1);
    const where = JSON.stringify(h.etat.appels[0].where);
    expect(where).toContain('"id":"cible-1"');
    expect(where).toContain(`"userId":"${PROPRIETAIRE}"`);
  });
});

describe("getOptionalUserEtablissement (cookie d'établissement actif, ADR-028)", () => {
  it("ne suit pas un cookie qui désigne l'établissement d'un autre compte", async () => {
    // Le cookie est une entrée utilisateur : revalidé par le même prédicat.
    h.requireUser.mockResolvedValue({ id: AUTRE });
    h.cookies.mockResolvedValue({ get: () => ({ value: "etab-du-compte-a" }) });
    await expect(scope.getOptionalUserEtablissement()).resolves.toBeNull();
  });

  it("sert l'établissement du cookie à son propriétaire", async () => {
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    h.cookies.mockResolvedValue({ get: () => ({ value: "etab-du-compte-a" }) });
    const r = await scope.getOptionalUserEtablissement();
    expect(r?.id).toBe("etab-du-compte-a");
  });
});
