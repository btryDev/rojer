// Répondre à une question transverse (ADR-038) ou à un fait d'activité
// (ADR-041) — base simulée.
//
// Prouvé ici : chaque réponse laisse le risque, la colonne du DUERP et le fait
// de l'établissement dans l'état que `transverses/etat.ts` relira comme cette
// réponse-là ; rien n'est écrit hors d'une transaction ; un risque travaillé
// n'est retiré que depuis le DUERP. Non prouvé : l'atomicité réelle dans
// PostgreSQL — le simulateur reproduit la fusion clé à clé et l'annulation,
// il ne les démontre pas (même réserve que `activites/actions.test.ts`).

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReponsesFaitsActivite } from "@/lib/etablissements/faits-activite";
import { repondreAuxQuestionsTransverses } from "./etat";

type RisqueSimule = {
  id: string;
  uniteId: string;
  referentielId: string;
  cotationSaisie: boolean;
  actions: number;
};

const h = vi.hoisted(() => {
  const faitsVides = () => ({
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
  });
  const db = {
    risques: [] as RisqueSimule[],
    unites: [] as { id: string; duerpId: string; estTransverse: boolean }[],
    colonne: null as unknown,
    faits: faitsVides() as Record<string, boolean | null>,
    aUnDuerp: true,
    lignesTouchees: 1,
    horsTransaction: 0,
    regenerations: 0,
    risquesCMR: 0,
  };
  let n = 0;
  const tx = {
    etablissement: {
      update: async ({ data }: { data: Record<string, boolean | null> }) => {
        Object.assign(db.faits, data);
      },
    },
    duerp: {
      findUnique: async () => (db.aUnDuerp ? { id: "d1" } : null),
    },
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
      }) => {
        const r = db.risques.find(
          (x) =>
            x.uniteId === where.uniteId_referentielId.uniteId &&
            x.referentielId === where.uniteId_referentielId.referentielId,
        );
        return r ? { id: r.id, cotationSaisie: r.cotationSaisie, _count: { actions: r.actions, interventions: 0 } } : null;
      },
      // `createMany` + `skipDuplicates` : un doublon est ignoré, comme
      // ON CONFLICT DO NOTHING.
      createMany: async ({
        data,
        skipDuplicates,
      }: {
        data: { uniteId: string; referentielId: string }[];
        skipDuplicates?: boolean;
      }) => {
        for (const d of data) {
          const deja = db.risques.some(
            (r) => r.uniteId === d.uniteId && r.referentielId === d.referentielId,
          );
          if (deja && !skipDuplicates) throw new Error("P2002");
          if (!deja) {
            db.risques.push({ id: `r${++n}`, uniteId: d.uniteId, referentielId: d.referentielId, cotationSaisie: false, actions: 0 });
          }
        }
        return { count: data.length };
      },
      delete: async ({ where }: { where: { id: string } }) => {
        db.risques = db.risques.filter((r) => r.id !== where.id);
      },
      count: async () => db.risquesCMR,
    },
    $executeRaw: async (requete: { strings: readonly string[]; values: unknown[] }) => {
      if (db.lignesTouchees === 0) return 0;
      const base =
        db.colonne && typeof db.colonne === "object" && !Array.isArray(db.colonne)
          ? (db.colonne as Record<string, unknown>)
          : {};
      if (requete.strings.join("").includes('"reponsesTransverses" - ')) {
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
    // le corps lève.
    $transaction: async (f: (t: typeof tx) => Promise<unknown>) => {
      const photo = JSON.stringify({ r: db.risques, u: db.unites, c: db.colonne, f: db.faits });
      try {
        return await f(tx);
      } catch (e) {
        const p = JSON.parse(photo);
        db.risques = p.r;
        db.unites = p.u;
        db.colonne = p.c;
        db.faits = p.f;
        throw e;
      }
    },
    // Tout chemin d'écriture hors transaction est une faute.
    etablissement: { update: () => db.horsTransaction++ },
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
    faitsVides,
    prisma,
    requireDuerp: vi.fn(async () => ({ duerp: { id: "d1", etablissementId: "e1" } })),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({ requireDuerp: h.requireDuerp }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: async () => {
    h.db.regenerations++;
    return true;
  },
  MESSAGE_REGEN_ECHEC: "",
}));

const { repondreQuestionTransverse } = await import("./actions");
const { ecrireFaitActivite } = await import("@/lib/etablissements/faits-activite-ecriture");

const DUERP = "d1";
const SANS_FAIT = "q-routier";
const AVEC_FAIT = "q-conduite-engins";

/** La réponse que l'écran du DUERP relira, à partir de l'état simulé. */
function relue(questionId: string) {
  const actifs = h.db.risques.map((r) => r.referentielId);
  return repondreAuxQuestionsTransverses(
    actifs,
    h.db.colonne,
    h.db.faits as ReponsesFaitsActivite,
  ).find((x) => x.question.id === questionId)!.reponse;
}
const risqueDe = (ref: string) => h.db.risques.find((r) => r.referentielId === ref);

beforeEach(() => {
  h.db.risques = [];
  h.db.unites = [];
  h.db.colonne = null;
  h.db.faits = h.faitsVides();
  h.db.aUnDuerp = true;
  h.db.lignesTouchees = 1;
  h.db.horsTransaction = 0;
  h.db.regenerations = 0;
  h.db.risquesCMR = 0;
});

describe("question sans fait d'activité (ADR-038)", () => {
  it("relit chaque réponse comme celle qui a été donnée, dans les deux sens", async () => {
    expect(relue(SANS_FAIT)).toBe("sans_reponse");
    await repondreQuestionTransverse(DUERP, SANS_FAIT, true);
    expect(relue(SANS_FAIT)).toBe("oui");
    await repondreQuestionTransverse(DUERP, SANS_FAIT, false);
    expect(relue(SANS_FAIT)).toBe("non");
    expect(h.db.risques).toHaveLength(0);
    await repondreQuestionTransverse(DUERP, SANS_FAIT, true);
    expect(h.db.colonne).toEqual({});
    await repondreQuestionTransverse(DUERP, SANS_FAIT, null);
    expect(relue(SANS_FAIT)).toBe("sans_reponse");
    expect(h.db.horsTransaction).toBe(0);
    // Aucune obligation ne dépend de ces questions : le calendrier ne bouge pas.
    expect(h.db.regenerations).toBe(0);
  });

  it("ne crée pas un second risque sur un « oui » répété", async () => {
    await repondreQuestionTransverse(DUERP, SANS_FAIT, true);
    await repondreQuestionTransverse(DUERP, SANS_FAIT, true);
    expect(h.db.risques).toHaveLength(1);
  });

  it("refuse une question inconnue avant toute écriture", async () => {
    await expect(repondreQuestionTransverse(DUERP, "q-inventee", true)).rejects.toThrow(/inconnue/);
    expect(h.db.unites).toHaveLength(0);
  });

  it("lève si le DUERP a disparu, sans rien laisser derrière", async () => {
    await repondreQuestionTransverse(DUERP, SANS_FAIT, true);
    h.db.lignesTouchees = 0;
    await expect(repondreQuestionTransverse(DUERP, SANS_FAIT, false)).rejects.toThrow(/introuvable/);
    expect(relue(SANS_FAIT)).toBe("oui");
  });
});

describe("question qui pose un fait d'activité (ADR-041)", () => {
  it("écrit le fait sur l'établissement, pose le risque, et régénère le calendrier", async () => {
    await repondreQuestionTransverse(DUERP, AVEC_FAIT, true);
    expect(h.db.faits.conduiteEngins).toBe(true);
    expect(risqueDe("trv-conduite-engins")).toBeDefined();
    expect(relue(AVEC_FAIT)).toBe("oui");
    expect(h.db.regenerations).toBe(1);
    // La colonne du DUERP n'est ni écrite ni lue pour cette question.
    expect(h.db.colonne).toBeNull();
    expect(h.db.horsTransaction).toBe(0);
  });

  it("un « Non » donné DANS le DUERP retire même un risque travaillé (après confirmation)", async () => {
    await repondreQuestionTransverse(DUERP, AVEC_FAIT, true);
    Object.assign(risqueDe("trv-conduite-engins")!, { cotationSaisie: true, actions: 2 });
    await repondreQuestionTransverse(DUERP, AVEC_FAIT, false);
    expect(h.db.faits.conduiteEngins).toBe(false);
    expect(risqueDe("trv-conduite-engins")).toBeUndefined();
    expect(relue(AVEC_FAIT)).toBe("non");
  });
});

describe("ecrireFaitActivite depuis Équipe ou la fiche (`si_vierge`)", () => {
  it("garde un risque travaillé et le dit ; retire un risque vierge", async () => {
    await ecrireFaitActivite("e1", "conduiteEngins", true, "si_vierge");
    Object.assign(risqueDe("trv-conduite-engins")!, { cotationSaisie: true });
    const r1 = await ecrireFaitActivite("e1", "conduiteEngins", false, "si_vierge");
    expect(r1.conserve).toBe(true);
    expect(risqueDe("trv-conduite-engins")).toBeDefined();
    // La réponse, elle, est acquise : c'est le fait qui fait foi.
    expect(relue(AVEC_FAIT)).toBe("non");

    await ecrireFaitActivite("e1", "operationsElectriques", true, "si_vierge");
    const r2 = await ecrireFaitActivite("e1", "operationsElectriques", false, "si_vierge");
    expect(r2.conserve).toBe(false);
    expect(risqueDe("trv-operations-electriques")).toBeUndefined();
  });

  it("sans DUERP, n'écrit que le fait", async () => {
    h.db.aUnDuerp = false;
    await ecrireFaitActivite("e1", "manutentionManuelle", true, "si_vierge");
    expect(h.db.faits.manutentionManuelle).toBe(true);
    expect(h.db.risques).toHaveLength(0);
    expect(h.db.unites).toHaveLength(0);
  });

  it("un « non » au CMR alors qu'un risque du DUERP est coché CMR : enregistré, et signalé", async () => {
    h.db.risquesCMR = 1;
    const r = await ecrireFaitActivite("e1", "expositionCMR", false, "si_vierge");
    expect(h.db.faits.expositionCMR).toBe(false);
    expect(r.conserve).toBe(true);
    h.db.risquesCMR = 0;
    expect((await ecrireFaitActivite("e1", "expositionCMR", false, "si_vierge")).conserve).toBe(false);
  });

  it("un fait sans question transverse (CMR) ne touche aucun risque", async () => {
    await ecrireFaitActivite("e1", "expositionCMR", true, "si_vierge");
    expect(h.db.faits.expositionCMR).toBe(true);
    expect(h.db.risques).toHaveLength(0);
  });
});
