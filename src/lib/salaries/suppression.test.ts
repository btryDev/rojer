// « Supprimer ce salarié » (décision de la propriétaire, 2026-09-27).
//
// COMMENT. Aucune base réelle ne tourne en test dans ce dépôt. Une base en
// mémoire tient donc les SIX tables touchées, avec les règles que le schéma
// pose et que l'effacement doit respecter — et c'est ce qui fait de ce test
// autre chose qu'un relevé d'appels :
//   - `Verification.salarieId` → `Salarie` est `Restrict` : supprimer une
//     fiche encore visée par une ligne LÈVE (P2003), comme PostgreSQL ;
//   - `TitreSalarie` cascade depuis `Salarie`, `RapportVerification` et
//     `Action` depuis `Verification` ;
//   - `Signature.objetId` n'a PAS de clé étrangère : rien ne l'emporte ;
//   - `$transaction` restaure l'état si le corps lève.
// `regles-du-schema` (en bas) relit `schema.prisma` et fait échouer ce
// fichier si l'une de ces règles y change.
//
// L'appartenance passe par le VRAI `assertEtablissementOwnership`, nourri par
// la même base : un établissement d'un autre utilisateur y est introuvable.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

type L = Record<string, unknown>;

const h = vi.hoisted(() => {
  const db = {
    etablissements: [] as L[],
    salaries: [] as L[],
    titres: [] as L[],
    verifications: [] as L[],
    rapports: [] as L[],
    actions: [] as L[],
    signatures: [] as L[],
  };
  // Comme Prisma : une clé `undefined` dans un `where` ne filtre pas.
  const eq = (attendu: unknown, valeur: unknown) =>
    attendu === undefined || attendu === valeur;
  const deVerif = (id: unknown) => db.verifications.find((v) => v.id === id);
  const surLigne = (w: { verification?: L }) => (l: L) => {
    const v = deVerif(l.verificationId);
    return (
      !!v &&
      eq(w.verification?.salarieId, v.salarieId) &&
      eq(w.verification?.etablissementId, v.etablissementId)
    );
  };
  const signatureVisee = (w: {
    etablissementId: unknown;
    objetType: unknown;
    objetId: { in: unknown[] };
  }) => (s: L) =>
    eq(w.etablissementId, s.etablissementId) &&
    s.objetType === w.objetType &&
    w.objetId.in.includes(s.objetId);

  const client = {
    etablissement: {
      findFirst: async ({ where }: { where: { id: string; entreprise: { userId: string } } }) =>
        db.etablissements.find(
          (e) => e.id === where.id && e.userId === where.entreprise.userId,
        ) ?? null,
    },
    salarie: {
      findFirst: async ({ where }: { where: L }) => {
        const s = db.salaries.find(
          (x) => eq(where.id, x.id) && eq(where.etablissementId, x.etablissementId),
        );
        if (!s) return null;
        return {
          ...s,
          _count: { titres: db.titres.filter((t) => t.salarieId === s.id).length },
        };
      },
      updateMany: async ({ where, data }: { where: L; data: L }) => {
        for (const s of db.salaries)
          if (eq(where.id, s.id) && eq(where.etablissementId, s.etablissementId))
            Object.assign(s, data);
      },
      deleteMany: async ({ where }: { where: L }) => {
        const vises = db.salaries.filter(
          (s) => eq(where.id, s.id) && eq(where.etablissementId, s.etablissementId),
        );
        for (const s of vises)
          if (db.verifications.some((v) => v.salarieId === s.id))
            throw Object.assign(new Error("P2003 Verification_salarieId_fkey"), {
              code: "P2003",
            });
        const ids = new Set(vises.map((s) => s.id));
        db.salaries = db.salaries.filter((s) => !ids.has(s.id));
        db.titres = db.titres.filter((t) => !ids.has(t.salarieId));
        return { count: ids.size };
      },
    },
    rapportVerification: {
      findMany: async ({ where }: { where: { verification: L } }) =>
        db.rapports.filter(surLigne(where)),
    },
    action: {
      count: async ({ where }: { where: { verification: L } }) =>
        db.actions.filter(surLigne(where)).length,
    },
    signature: {
      count: async ({ where }: { where: Parameters<typeof signatureVisee>[0] }) =>
        db.signatures.filter(signatureVisee(where)).length,
      deleteMany: async ({ where }: { where: Parameters<typeof signatureVisee>[0] }) => {
        db.signatures = db.signatures.filter((s) => !signatureVisee(where)(s));
      },
    },
    verification: {
      count: async ({ where }: { where: L }) =>
        db.verifications.filter(
          (v) =>
            eq(where.salarieId, v.salarieId) &&
            eq(where.etablissementId, v.etablissementId),
        ).length,
      deleteMany: async ({ where }: { where: L }) => {
        const ids = new Set(
          db.verifications
            .filter(
              (v) =>
                eq(where.salarieId, v.salarieId) &&
                eq(where.etablissementId, v.etablissementId),
            )
            .map((v) => v.id),
        );
        db.verifications = db.verifications.filter((v) => !ids.has(v.id));
        db.rapports = db.rapports.filter((r) => !ids.has(r.verificationId));
        db.actions = db.actions.filter((a) => !ids.has(a.verificationId));
      },
    },
  };
  const prisma = {
    ...client,
    $transaction: async <T,>(fn: (tx: typeof client) => Promise<T>) => {
      const avant = structuredClone(db);
      try {
        return await fn(client);
      } catch (e) {
        Object.assign(db, avant);
        throw e;
      }
    },
  };
  const stockage = { delete: vi.fn<(cle: string) => Promise<void>>(async () => {}) };
  return { db, prisma, stockage, requireUser: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: h.requireUser,
  getOptionalUser: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({ getStorage: () => h.stockage }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({
  regenererApresMutation: vi.fn(async () => {}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { supprimerSalarie, basculerActif } = await import("./actions");
const { perimetreSuppressionSalarie } = await import("./suppression");
const { detailSuppressionSalarie } = await import("./phrases-suppression");

const USER_A = "user-a";
const USER_B = "user-b";

function semer() {
  Object.assign(h.db, {
    etablissements: [
      { id: "etab-a", userId: USER_A },
      { id: "etab-a2", userId: USER_A },
      { id: "etab-b", userId: USER_B },
    ],
    salaries: [
      { id: "sal-1", etablissementId: "etab-a", nom: "Martin", prenom: "Léa", actif: true },
      { id: "sal-2", etablissementId: "etab-a", nom: "Durand", prenom: "Paul", actif: true },
    ],
    titres: [
      { id: "t-1a", salarieId: "sal-1" },
      { id: "t-1b", salarieId: "sal-1" },
      { id: "t-2a", salarieId: "sal-2" },
    ],
    verifications: [
      // Ligne de sal-1 qui PORTE une preuve (rapport, action, signature).
      { id: "v-1a", etablissementId: "etab-a", salarieId: "sal-1" },
      // Ligne de sal-1 sans trace.
      { id: "v-1b", etablissementId: "etab-a", salarieId: "sal-1" },
      // Ligne du voisin : elle ne doit pas bouger.
      { id: "v-2a", etablissementId: "etab-a", salarieId: "sal-2" },
      // Ligne d'établissement (porteur nul) : idem.
      { id: "v-etab", etablissementId: "etab-a", salarieId: null },
    ],
    rapports: [
      { id: "r-1a", verificationId: "v-1a", fichierCle: "cle/r-1a.pdf" },
      { id: "r-2a", verificationId: "v-2a", fichierCle: "cle/r-2a.pdf" },
      { id: "r-etab", verificationId: "v-etab", fichierCle: "cle/r-etab.pdf" },
    ],
    actions: [
      { id: "a-1a", verificationId: "v-1a" },
      { id: "a-2a", verificationId: "v-2a" },
    ],
    signatures: [
      { id: "s-1a", etablissementId: "etab-a", objetType: "rapport_verification", objetId: "r-1a" },
      { id: "s-2a", etablissementId: "etab-a", objetType: "rapport_verification", objetId: "r-2a" },
      // Même identifiant d'objet, autre type : elle ne vise pas le rapport.
      { id: "s-autre", etablissementId: "etab-a", objetType: "permis_feu", objetId: "r-1a" },
    ],
  });
}

const ids = (l: L[]) => l.map((x) => x.id).sort();

beforeEach(() => {
  semer();
  h.stockage.delete.mockReset();
  h.stockage.delete.mockImplementation(async () => {});
  h.requireUser.mockResolvedValue({ id: USER_A, email: "a@exemple.fr" });
});

describe("« Supprimer ce salarié » efface tout ce qui le vise, et rien d'autre", () => {
  it("fiche, titres, lignes, rapports, actions, signatures — et le fichier du rapport", async () => {
    await supprimerSalarie("etab-a", "sal-1");

    expect(ids(h.db.salaries)).toEqual(["sal-2"]);
    expect(ids(h.db.titres)).toEqual(["t-2a"]);
    expect(ids(h.db.verifications)).toEqual(["v-2a", "v-etab"]);
    expect(ids(h.db.rapports)).toEqual(["r-2a", "r-etab"]);
    expect(ids(h.db.actions)).toEqual(["a-2a"]);
    expect(ids(h.db.signatures)).toEqual(["s-2a", "s-autre"]);
    expect(h.stockage.delete.mock.calls.map((c) => c[0])).toEqual(["cle/r-1a.pdf"]);
  });

  it("sans effacer les lignes d'abord, la base refuse — la garde Restrict est vivante", async () => {
    // Le chemin court qu'un appelant pressé écrirait : il doit échouer.
    await expect(
      h.prisma.salarie.deleteMany({ where: { id: "sal-1", etablissementId: "etab-a" } }),
    ).rejects.toThrow(/P2003/);
    expect(ids(h.db.salaries)).toEqual(["sal-1", "sal-2"]);
  });
});

describe("isolation", () => {
  it("le salarié d'un autre établissement du même utilisateur : rien ne bouge", async () => {
    const avant = structuredClone(h.db);
    await supprimerSalarie("etab-a2", "sal-1");
    expect(h.db).toEqual(avant);
    expect(h.stockage.delete).not.toHaveBeenCalled();
  });

  it("l'établissement d'un autre utilisateur : refusé, rien ne bouge", async () => {
    h.requireUser.mockResolvedValue({ id: USER_B, email: "b@exemple.fr" });
    const avant = structuredClone(h.db);
    await expect(supprimerSalarie("etab-a", "sal-1")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.db).toEqual(avant);
    expect(h.stockage.delete).not.toHaveBeenCalled();
  });
});

describe("l'effacement des lignes est borné à l'établissement (F6)", () => {
  it("une ligne d'un autre établissement qui vise la même fiche n'est jamais effacée", async () => {
    // Donnée incohérente — une ligne d'etab-b qui vise sal-1 —, que la base
    // n'interdit pas. L'effacement ne doit pas la toucher : il échoue (la
    // garde Restrict mord sur la fiche) et la transaction restaure tout.
    h.db.verifications.push({ id: "v-b", etablissementId: "etab-b", salarieId: "sal-1" });
    const avant = structuredClone(h.db);
    await expect(supprimerSalarie("etab-a", "sal-1")).rejects.toThrow(/P2003/);
    expect(h.db).toEqual(avant);
    expect(h.stockage.delete).not.toHaveBeenCalled();
  });
});

describe("le stockage qui échoue n'annule pas l'effacement", () => {
  it("la base reste effacée, l'échec est journalisé, rien ne lève", async () => {
    h.stockage.delete.mockRejectedValue(new Error("stockage indisponible"));
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(supprimerSalarie("etab-a", "sal-1")).resolves.toBeUndefined();
    expect(ids(h.db.salaries)).toEqual(["sal-2"]);
    expect(ids(h.db.rapports)).toEqual(["r-2a", "r-etab"]);
    expect(erreur.mock.calls.some((c) => String(c[0]).includes("cle/r-1a.pdf"))).toBe(true);
    erreur.mockRestore();
  });
});

describe("la confirmation compte juste", () => {
  it("compte ce que l'effacement emporte — le même périmètre", async () => {
    const p = await perimetreSuppressionSalarie("etab-a", "sal-1");
    expect(p).toEqual({ titres: 2, echeances: 2, rapports: 1, actions: 1, signatures: 1 });
    // Et c'est bien ce qui part.
    const avant = {
      echeances: h.db.verifications.length,
      rapports: h.db.rapports.length,
      actions: h.db.actions.length,
      signatures: h.db.signatures.length,
      titres: h.db.titres.length,
    };
    await supprimerSalarie("etab-a", "sal-1");
    expect({
      titres: avant.titres - h.db.titres.length,
      echeances: avant.echeances - h.db.verifications.length,
      rapports: avant.rapports - h.db.rapports.length,
      actions: avant.actions - h.db.actions.length,
      signatures: avant.signatures - h.db.signatures.length,
    }).toEqual(p);
  });

  it("hors de l'établissement : rien à compter", async () => {
    expect(await perimetreSuppressionSalarie("etab-a2", "sal-1")).toBeNull();
  });

  it("dit ce qui part, que c'est définitif, et ce que l'export garde (M1, M2, F4)", () => {
    const t = detailSuppressionSalarie("Léa Martin", {
      titres: 2,
      echeances: 3,
      rapports: 0,
      actions: 1,
      signatures: 0,
    });
    expect(t).toContain(
      "La fiche de Léa Martin, ses 2 titres et ses 3 échéances au calendrier sont supprimés définitivement.",
    );
    expect(t).toContain(
      "Sont aussi supprimés définitivement, parce que liés à ses échéances : 1 action.",
    );
    // Aucun dépôt n'est possible sur une ligne de salarié : à zéro, ni
    // rapport ni signature ne sont nommés.
    expect(t).not.toMatch(/rapport|signature/);
    expect(t).toContain("Rien ne se récupère ensuite.");
    // L'export : ce qu'il contient, sans laisser croire qu'il garde une pièce.
    expect(t).toContain(
      "« Éditer ses données », sur cette fiche, exporte d'abord son identité et ses titres avec leurs dates",
    );
    expect(t).not.toMatch(/pièce|document|fichier/);
    // Aucune qualification juridique, aucun conseil.
    expect(t).not.toMatch(/obligation|légal|RGPD|conseill|devriez|recommand/i);
  });

  it("des rapports antérieurs à la garde du 2026-08-27 : nommés, puisqu'ils partent", () => {
    const t = detailSuppressionSalarie("P", {
      titres: 1,
      echeances: 1,
      rapports: 2,
      actions: 0,
      signatures: 1,
    });
    expect(t).toContain(
      "La fiche de P, son titre et son échéance au calendrier sont supprimés définitivement.",
    );
    expect(t).toContain(": 2 rapports déposés et 1 signature.");
  });

  it("sans titre ni échéance : la fiche seule ; avec un seul : sans virgule orpheline", () => {
    const vide = detailSuppressionSalarie("Paul Durand", {
      titres: 0,
      echeances: 0,
      rapports: 0,
      actions: 0,
      signatures: 0,
    });
    expect(vide).toContain("La fiche de Paul Durand est supprimée définitivement.");
    expect(vide).not.toContain("Sont aussi");
    const un = detailSuppressionSalarie("P", {
      titres: 1,
      echeances: 0,
      rapports: 0,
      actions: 0,
      signatures: 0,
    });
    expect(un).toContain("La fiche de P et son titre sont supprimés définitivement.");
  });
});

describe("« Sortie de l'effectif » est inchangée", () => {
  it("marque la fiche, ne supprime rien, ne touche pas au stockage", async () => {
    const avant = structuredClone(h.db);
    await basculerActif("etab-a", "sal-1", false);
    expect(h.db.salaries.find((s) => s.id === "sal-1")?.actif).toBe(false);
    for (const t of ["titres", "verifications", "rapports", "actions", "signatures"] as const)
      expect(h.db[t]).toEqual(avant[t]);
    expect(h.stockage.delete).not.toHaveBeenCalled();
  });
});

describe("regles-du-schema : ce que la base en mémoire suppose", () => {
  const schema = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "prisma", "schema.prisma"),
    "utf8",
  );
  const relation = (modele: string, champ: string) => {
    const bloc = schema.slice(schema.indexOf(`model ${modele} {`));
    const ligne = bloc
      .slice(0, bloc.indexOf("\n}"))
      .split("\n")
      .find((l) => new RegExp(`^\\s*${champ}\\s`).test(l) && l.includes("@relation"));
    return /onDelete: (\w+)/.exec(ligne ?? "")?.[1];
  };

  it("les actions de suppression sont celles que la base en mémoire applique", () => {
    expect(relation("Verification", "salarie")).toBe("Restrict");
    expect(relation("TitreSalarie", "salarie")).toBe("Cascade");
    expect(relation("RapportVerification", "verification")).toBe("Cascade");
    expect(relation("Action", "verification")).toBe("Cascade");
  });

  it("Signature.objetId n'a pas de clé étrangère — d'où leur effacement explicite", () => {
    const bloc = schema.slice(schema.indexOf("model Signature {"));
    const corps = bloc.slice(0, bloc.indexOf("\n}"));
    expect(corps).toMatch(/objetId\s+String/);
    expect(corps).not.toMatch(/objetId[^\n]*@relation/);
  });
});
