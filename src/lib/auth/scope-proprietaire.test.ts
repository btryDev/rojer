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
 * Prisma est remplacé par un faux qui ÉVALUE le `where` contre une base dont
 * toute ligne appartient au compte A, relations comprises. Un `where` qui ne
 * porte pas `userId` ramène la ligne quel que soit le demandeur — c'est
 * exactement ce que ferait PostgreSQL. L'assertion porte
 * donc sur ce que le helper REND au compte B, pas sur la forme de sa requête.
 */

const PROPRIETAIRE = "user-a";
const AUTRE = "user-b";

const h = vi.hoisted(() => {
  type Where = Record<string, unknown>;
  const etat = {
    requetesSql: [] as { sql: string; values: unknown[] }[],
    proprietaire: "user-a",
    appels: [] as { modele: string; where: Where }[],
  };

  /**
   * Toute ligne de la base appartient au propriétaire : chaque relation, à
   * quelque profondeur qu'elle soit (`risque → unite → duerp → établissement →
   * entreprise`), remonte à lui. Évaluer un `where` revient donc à vérifier
   * que chaque `userId` qu'il pose est celui du propriétaire ; les autres
   * scalaires (identifiants, clés de jointure) sont satisfaits par la ligne
   * demandée.
   */
  function correspond(where: Where): boolean {
    return Object.entries(where).every(([cle, attendu]) =>
      attendu !== null && typeof attendu === "object"
        ? correspond(attendu as Where)
        : cle !== "userId" || attendu === etat.proprietaire,
    );
  }

  /** Une ligne FINIE (un objet récursif ferait boucler l'affichage d'un échec). */
  function ligne(id: string): Record<string, unknown> {
    return {
      id,
      userId: etat.proprietaire,
      raisonDisplay: "Établissement",
      entrepriseId: "entreprise-1",
      etablissementId: "etab-1",
      duerpId: "duerp-1",
      uniteId: "unite-1",
      duerp: { id: "duerp-1", etablissementId: "etab-1" },
      unite: { id: "unite-1", duerpId: "duerp-1", duerp: { etablissementId: "etab-1" } },
    };
  }

  const prisma = new Proxy(
    {},
    {
      get(_, modele: string) {
        if (modele === "$queryRaw") {
          return async (requete: { sql: string; values: unknown[] }) => {
            etat.requetesSql.push(requete);
            return [];
          };
        }
        const lire = async (args: { where?: Where } = {}) => {
          const where = args.where ?? {};
          etat.appels.push({ modele, where });
          const id = typeof where.id === "string" ? where.id : "x";
          return correspond(where) ? ligne(id) : null;
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
import { Prisma } from "@prisma/client";

function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

const HELPERS = helpersDAppartenance();
/**
 * Les helpers qui chargent UNE LIGNE par son identifiant — tous, sauf
 * `requireLectureSqlProprietaire`, qui ne charge pas une ligne : il exécute
 * une lecture SQL brute sous le prédicat propriétaire, et s'éprouve plus bas
 * sur la requête qu'il envoie. Le retirer d'ici par son nom, et lui seul, garde le relevé
 * automatique pour tout helper ajouté demain.
 */
const HELPERS_DE_LIGNE = HELPERS.filter((nom) => nom !== "requireLectureSqlProprietaire");

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

  it.each(HELPERS_DE_LIGNE)("%s rend la ligne à son propriétaire", async (nom) => {
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    const helper = helperNomme(nom);
    await expect(helper("cible-1")).resolves.toBeTruthy();
  });

  it.each(HELPERS_DE_LIGNE)("%s répond notFound à un autre compte", async (nom) => {
    h.requireUser.mockResolvedValue({ id: AUTRE });
    const helper = helperNomme(nom);
    await expect(helper("cible-1")).rejects.toSatisfy(estNotFound);
  });

  it.each(HELPERS_DE_LIGNE)("%s pose l'identifiant ET le propriétaire dans le même where", async (nom) => {
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    const helper = helperNomme(nom);
    await helper("cible-1");
    expect(h.etat.appels.length, "une lecture et une seule").toBe(1);
    const where = JSON.stringify(h.etat.appels[0].where);
    expect(where).toContain('"id":"cible-1"');
    expect(where).toContain(`"userId":"${PROPRIETAIRE}"`);
  });
});

describe("requireLectureSqlProprietaire (lecture SQL brute bornée au propriétaire)", () => {
  it("pose le prédicat de l'utilisateur de la session, typé uuid, et exécute", async () => {
    h.etat.requetesSql.length = 0;
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    await scope.requireLectureSqlProprietaire('r."etablissementId"', (p) => Prisma.sql`SELECT 1 FROM "RapportVerification" r WHERE ${p}`);
    const [requete] = h.etat.requetesSql;
    const sql = requete.sql.replace(/\s+/g, " ");
    expect(sql).toContain('e_p."id" = r."etablissementId"');
    expect(sql).toContain('en_p."userId" = ?::uuid');
    expect(requete.values).toEqual([PROPRIETAIRE]);
    // Un autre compte : son identifiant, jamais celui du propriétaire.
    h.requireUser.mockResolvedValue({ id: AUTRE });
    await scope.requireLectureSqlProprietaire('r."etablissementId"', (p) => Prisma.sql`SELECT 1 WHERE ${p}`);
    expect(h.etat.requetesSql[1].values).toEqual([AUTRE]);
  });

  it("refuse, sans rien exécuter, un gabarit qui n'interpole pas le prédicat", async () => {
    h.etat.requetesSql.length = 0;
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    await expect(
      scope.requireLectureSqlProprietaire('r."etablissementId"', () => Prisma.sql`SELECT 1 FROM "RapportVerification" r WHERE r."id" = ${"x"}`),
    ).rejects.toThrow(/sans le prédicat propriétaire/);
    expect(h.etat.requetesSql).toEqual([]);
  });

  it("refuse le texte du prédicat sans sa valeur (prédicat recopié en dur)", async () => {
    h.etat.requetesSql.length = 0;
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    await expect(
      scope.requireLectureSqlProprietaire('r."etablissementId"', (p) => Prisma.sql`SELECT 1 WHERE ${Prisma.raw(p.sql)}`),
    ).rejects.toThrow(/sans le prédicat propriétaire/);
    expect(h.etat.requetesSql).toEqual([]);
  });

  it("refuse la valeur sans le texte du prédicat (identifiant du compte ailleurs)", async () => {
    h.etat.requetesSql.length = 0;
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    await expect(
      scope.requireLectureSqlProprietaire('r."etablissementId"', () => Prisma.sql`SELECT 1 FROM "RapportVerification" r WHERE r."x" = ${PROPRIETAIRE}`),
    ).rejects.toThrow(/sans le prédicat propriétaire/);
    expect(h.etat.requetesSql).toEqual([]);
  });

  it("refuse ce qui ne serait pas une colonne SQL", async () => {
    h.requireUser.mockResolvedValue({ id: PROPRIETAIRE });
    await expect(
      scope.requireLectureSqlProprietaire('r."id" OR 1=1 --', (p) => Prisma.sql`SELECT 1 WHERE ${p}`),
    ).rejects.toThrow(/Colonne SQL invalide/);
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
