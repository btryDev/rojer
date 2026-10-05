// Répondre à une question transverse (ADR-038) — base simulée.
//
// Prouvé ici : chaque réponse laisse le risque ET la colonne dans l'état que
// `transverses/etat.ts` relira comme cette réponse-là, et rien n'est écrit
// hors de la transaction. Non prouvé : l'atomicité de la transaction et du
// `jsonb_set` dans PostgreSQL — c'est le fait du moteur ; le simulateur
// reproduit la fusion clé à clé de `ecrireReponseFermee`, il ne la démontre
// pas (même réserve que `activites/actions.test.ts`).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { repondreAuxQuestionsTransverses } from "./etat";

const h = vi.hoisted(() => {
  const db = {
    risques: [] as { id: string; uniteId: string; referentielId: string }[],
    unites: [] as { id: string; duerpId: string; estTransverse: boolean }[],
    colonne: null as unknown,
    lignesTouchees: 1,
    horsTransaction: 0,
  };
  let n = 0;
  const tx = {
    uniteTravail: {
      findFirst: async ({ where }: { where: { duerpId: string } }) =>
        db.unites.find((u) => u.duerpId === where.duerpId && u.estTransverse) ?? null,
      create: async ({ data }: { data: { duerpId: string } }) => {
        const u = { id: `u${++n}`, duerpId: data.duerpId, estTransverse: true };
        db.unites.push(u);
        return u;
      },
    },
    risque: {
      findUnique: async ({
        where,
      }: {
        where: { uniteId_referentielId: { uniteId: string; referentielId: string } };
      }) =>
        db.risques.find(
          (r) =>
            r.uniteId === where.uniteId_referentielId.uniteId &&
            r.referentielId === where.uniteId_referentielId.referentielId,
        ) ?? null,
      // `createMany` + `skipDuplicates` : un doublon sur
      // (uniteId, referentielId) est ignoré, comme ON CONFLICT DO NOTHING.
      createMany: async ({
        data,
        skipDuplicates,
      }: {
        data: { uniteId: string; referentielId: string }[];
        skipDuplicates?: boolean;
      }) => {
        let count = 0;
        for (const d of data) {
          const deja = db.risques.some(
            (r) => r.uniteId === d.uniteId && r.referentielId === d.referentielId,
          );
          if (deja && !skipDuplicates) throw new Error("P2002");
          if (deja) continue;
          db.risques.push({ id: `r${++n}`, uniteId: d.uniteId, referentielId: d.referentielId });
          count++;
        }
        return { count };
      },
      delete: async ({ where }: { where: { id: string } }) => {
        db.risques = db.risques.filter((r) => r.id !== where.id);
      },
    },
    $executeRaw: async (requete: { strings: readonly string[]; values: unknown[] }) => {
      if (db.lignesTouchees === 0) return 0;
      const base =
        db.colonne && typeof db.colonne === "object" && !Array.isArray(db.colonne)
          ? (db.colonne as Record<string, unknown>)
          : {};
      const retrait = requete.strings.join("").includes('"reponsesTransverses" - ');
      if (retrait) {
        const [cle] = requete.values as [string];
        const suite = { ...base };
        delete suite[cle];
        db.colonne = suite;
      } else {
        const [cle, valeur] = requete.values as [string, boolean];
        db.colonne = { ...base, [cle]: valeur };
      }
      return 1;
    },
  };
  const prisma = {
    // Une transaction qui ANNULE : l'état est photographié avant et rétabli si
    // le corps lève. Sans cela, « lève si le DUERP a disparu » prouvait la
    // levée sans prouver que le risque supprimé juste avant revenait.
    $transaction: async (f: (t: typeof tx) => Promise<unknown>) => {
      const photo = {
        risques: [...db.risques],
        unites: [...db.unites],
        colonne: db.colonne,
      };
      try {
        return await f(tx);
      } catch (e) {
        db.risques = photo.risques;
        db.unites = photo.unites;
        db.colonne = photo.colonne;
        throw e;
      }
    },
    // Tout chemin d'écriture hors transaction est une faute : ces modèles-ci
    // ne servent qu'à le détecter.
    risque: {
      create: () => db.horsTransaction++,
      createMany: () => db.horsTransaction++,
      delete: () => db.horsTransaction++,
    },
    uniteTravail: { create: () => db.horsTransaction++ },
    $executeRaw: () => db.horsTransaction++,
  };
  return {
    db,
    prisma,
    requireDuerp: vi.fn(async () => ({ duerp: { id: "d1", etablissementId: "e1" } })),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({ requireDuerp: h.requireDuerp }));

const { repondreQuestionTransverse } = await import("./actions");

const DUERP = "d1";
const Q = "q-conduite-engins";

/** La réponse que l'écran relira, à partir de l'état simulé. */
function relue(questionId = Q) {
  const actifs = h.db.risques.map((r) => r.referentielId);
  return repondreAuxQuestionsTransverses(actifs, h.db.colonne).find(
    (x) => x.question.id === questionId,
  )!.reponse;
}

beforeEach(() => {
  h.db.risques = [];
  h.db.unites = [];
  h.db.colonne = null;
  h.db.lignesTouchees = 1;
  h.db.horsTransaction = 0;
});

describe("repondreQuestionTransverse", () => {
  it("relit chaque réponse comme celle qui a été donnée, dans les deux sens", async () => {
    expect(relue()).toBe("sans_reponse");
    await repondreQuestionTransverse(DUERP, Q, true);
    expect(relue()).toBe("oui");
    await repondreQuestionTransverse(DUERP, Q, false);
    expect(relue()).toBe("non");
    expect(h.db.risques).toHaveLength(0);
    await repondreQuestionTransverse(DUERP, Q, true);
    expect(relue()).toBe("oui");
    // Le « oui » efface le « non » : il n'en reste rien dans la colonne.
    expect(h.db.colonne).toEqual({});
    await repondreQuestionTransverse(DUERP, Q, null);
    expect(relue()).toBe("sans_reponse");
    expect(h.db.risques).toHaveLength(0);
    expect(h.db.horsTransaction).toBe(0);
  });

  it("ne crée pas un second risque sur un « oui » répété", async () => {
    await repondreQuestionTransverse(DUERP, Q, true);
    await repondreQuestionTransverse(DUERP, Q, true);
    expect(h.db.risques).toHaveLength(1);
    expect(h.db.unites).toHaveLength(1);
  });

  it("ne touche pas la réponse d'une autre question", async () => {
    await repondreQuestionTransverse(DUERP, "q-operations-electriques", false);
    await repondreQuestionTransverse(DUERP, Q, true);
    expect(relue("q-operations-electriques")).toBe("non");
  });

  it("refuse une question inconnue avant toute écriture", async () => {
    await expect(repondreQuestionTransverse(DUERP, "q-inventee", true)).rejects.toThrow(
      /inconnue/,
    );
    expect(h.db.unites).toHaveLength(0);
    expect(h.db.colonne).toBeNull();
  });

  it("lève si le DUERP a disparu entre la garde et l'écriture, sans rien laisser derrière", async () => {
    await repondreQuestionTransverse(DUERP, Q, true);
    h.db.lignesTouchees = 0;
    await expect(repondreQuestionTransverse(DUERP, Q, false)).rejects.toThrow(/introuvable/);
    // Le « non » a supprimé le risque avant d'échouer sur la colonne : la
    // transaction doit le rendre. Sans annulation, la question deviendrait
    // « sans réponse » sur une écriture que l'écran a déclarée en échec.
    expect(relue()).toBe("oui");
  });
});
