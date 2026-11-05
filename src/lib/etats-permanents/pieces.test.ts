// Le dépôt du fichier d'un écrit annexé au registre (ADR-056), éprouvé par
// l'action elle-même, comme le ferait une requête : la garde (quelles lignes
// reçoivent un fichier), la règle des deux versions, et l'ordre base puis
// stockage.
//
// Ce que ces tests ne prouvent pas : que PostgreSQL applique la transaction
// atomiquement, ni l'index unique partiel — ils vivent dans la migration.

import { beforeEach, describe, expect, it, vi } from "vitest";

type Piece = {
  id: string;
  etablissementId: string;
  obligationId: string;
  fichierCle: string;
  enCours: true | null;
  remplaceeLe: Date | null;
};

const SCHEMA = "incendie-erp-schema-organisation-securite";

const h = vi.hoisted(() => {
  const etat = {
    pieces: [] as Piece[],
    declarations: [] as { obligationId: string; declareLe: Date }[],
    echecTransaction: false,
    etablissement: {} as Record<string, unknown>,
    stockage: { ecrits: [] as string[], effaces: [] as string[] },
  };
  const correspond = (p: Piece, w: Record<string, unknown>) =>
    (w.id === undefined ||
      (typeof w.id === "object" && w.id !== null
        ? ((w.id as { in: string[] }).in ?? []).includes(p.id)
        : p.id === w.id)) &&
    (w.etablissementId === undefined || p.etablissementId === w.etablissementId) &&
    (w.obligationId === undefined || p.obligationId === w.obligationId) &&
    (w.enCours === undefined || p.enCours === w.enCours);
  // La CHECK `PieceEtatPermanent_bornes`, et l'unicité de `enCours` (seconde
  // relecture du 2026-11-05 : le faux ne les modélisait pas, un archivage
  // qui oublierait `enCours` serait passé).
  const verifier = () => {
    for (const p of etat.pieces) {
      const coherent =
        (p.enCours === true && p.remplaceeLe === null) ||
        (p.enCours === null && p.remplaceeLe !== null);
      if (!coherent) throw new Error(`CHECK simulée : ${p.id} incohérent`);
    }
    const enCours = etat.pieces.filter((p) => p.enCours === true);
    const cles = new Set(enCours.map((p) => `${p.etablissementId}|${p.obligationId}`));
    if (cles.size !== enCours.length) throw new Error("P2002 simulé : un second fichier en cours");
  };
  let suivant = 0;
  const pieceEtatPermanent = {
    findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      etat.pieces.find((p) => correspond(p, where)) ?? null,
    ),
    findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      etat.pieces.filter((p) => correspond(p, where)),
    ),
    deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const avant = etat.pieces.length;
      etat.pieces = etat.pieces.filter((p) => !correspond(p, where));
      return { count: avant - etat.pieces.length };
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Piece> }) => {
      const p = etat.pieces.find((x) => x.id === where.id)!;
      Object.assign(p, data);
      verifier();
      return p;
    }),
    create: vi.fn(async ({ data }: { data: Omit<Piece, "id" | "remplaceeLe" | "enCours"> }) => {
      const p: Piece = { id: `p${++suivant}`, enCours: true, remplaceeLe: null, ...data };
      etat.pieces.push(p);
      verifier();
      return p;
    }),
  };
  const declarationEtatPermanent = {
    upsert: vi.fn(async ({ create }: { create: { obligationId: string; declareLe: Date } }) => {
      etat.declarations = etat.declarations.filter((d) => d.obligationId !== create.obligationId);
      etat.declarations.push({ obligationId: create.obligationId, declareLe: create.declareLe });
      return {};
    }),
    deleteMany: vi.fn(async ({ where }: { where: { obligationId: string } }) => {
      etat.declarations = etat.declarations.filter((d) => d.obligationId !== where.obligationId);
      return { count: 1 };
    }),
  };
  const prisma = {
    // Une transaction simulée : sur échec, l'état est rendu tel qu'avant.
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const sauvegarde = structuredClone({ p: etat.pieces, d: etat.declarations });
      try {
        const r = await fn(prisma);
        if (etat.echecTransaction) throw new Error("refus simulé de la base");
        return r;
      } catch (e) {
        etat.pieces = sauvegarde.p;
        etat.declarations = sauvegarde.d;
        throw e;
      }
    },
    pieceEtatPermanent,
    declarationEtatPermanent,
    etablissement: { findUnique: vi.fn(async () => etat.etablissement) },
    equipement: { findMany: vi.fn(async () => []) },
  };
  return { etat, prisma, revalidatePath: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementDuCompte: vi.fn(async () => ({
    user: { id: "user-1" },
    db: await (await import("@/test/garde-simulee")).clientDuCompteSimule(),
  })),
}));
vi.mock("@/lib/storage", () => ({
  stockageEnService: () => true,
  clePieceEtatPermanent: (e: string, o: string, n: string) => `etats-permanents/${e}/${o}-${h.etat.stockage.ecrits.length}-${n}`,
  getStorage: () => ({
    put: async (cle: string) => {
      h.etat.stockage.ecrits.push(cle);
    },
    delete: async (cle: string) => {
      h.etat.stockage.effaces.push(cle);
    },
  }),
}));

const { deposerFichierEnPlace, retirerDeclaration } = await import("./actions");

const MAGASIN_N4 = {
  id: "etab-1",
  effectifSurSite: 8,
  entreprise: { effectif: 8 },
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "M",
  typesErpAutres: [],
  categorieErp: "N4",
  classeIgh: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
};

function unPdf(nom = "schema.pdf"): FormData {
  const f = new FormData();
  f.set("fichier", new File([new TextEncoder().encode("%PDF-1.4\n%%EOF\n")], nom, { type: "application/pdf" }));
  return f;
}

beforeEach(() => {
  h.etat.pieces = [];
  h.etat.declarations = [];
  h.etat.echecTransaction = false;
  h.etat.etablissement = { ...MAGASIN_N4 };
  h.etat.stockage = { ecrits: [], effaces: [] };
});

describe("deposerFichierEnPlace — quelles lignes reçoivent un fichier", () => {
  it("accepte le schéma d'organisation d'un magasin de 4ᵉ catégorie, et le dépôt déclare la ligne", async () => {
    // Contre-épreuve en premier : une garde qui refuserait tout passerait les
    // tests de refus.
    const r = await deposerFichierEnPlace("etab-1", SCHEMA, unPdf());
    expect(r).toEqual({ status: "success" });
    expect(h.etat.pieces).toHaveLength(1);
    expect(h.etat.pieces[0].remplaceeLe).toBeNull();
    expect(h.etat.declarations.map((d) => d.obligationId)).toEqual([SCHEMA]);
    expect(h.etat.stockage.ecrits).toHaveLength(1);
  });

  it("refuse une ligne qui n'est pas un écrit annexé au registre (ADR-027 § 3)", async () => {
    const r = await deposerFichierEnPlace(
      "etab-1",
      "information-etablissement-affichages-obligatoires",
      unPdf(),
    );
    expect(r.status).toBe("error");
    expect(h.etat.stockage.ecrits).toEqual([]);
    expect(h.etat.pieces).toEqual([]);
  });

  it("refuse le schéma d'un magasin de 5ᵉ catégorie, où la ligne ne s'applique pas", async () => {
    h.etat.etablissement = { ...MAGASIN_N4, categorieErp: "N5" };
    const r = await deposerFichierEnPlace("etab-1", SCHEMA, unPdf());
    expect(r.status).toBe("error");
    expect(h.etat.stockage.ecrits).toEqual([]);
  });

  it("refuse un fichier dont le contenu n'est pas celui de son type, sans rien écrire", async () => {
    const f = new FormData();
    f.set("fichier", new File(["pas un pdf"], "schema.pdf", { type: "application/pdf" }));
    const r = await deposerFichierEnPlace("etab-1", SCHEMA, f);
    expect(r.status).toBe("error");
    expect(h.etat.stockage.ecrits).toEqual([]);
  });
});

describe("deux fichiers au plus par ligne (ADR-056 § 4)", () => {
  it("un nouveau dépôt fait du fichier en cours le précédent, et efface l'ancien précédent après la base", async () => {
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v1.pdf"));
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v2.pdf"));
    expect(h.etat.pieces).toHaveLength(2);
    expect(h.etat.stockage.effaces).toEqual([]);

    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v3.pdf"));
    expect(h.etat.pieces).toHaveLength(2);
    const [premier] = h.etat.stockage.ecrits;
    expect(h.etat.stockage.effaces).toEqual([premier]);
    expect(h.etat.pieces.filter((p) => p.remplaceeLe === null)).toHaveLength(1);
    expect(h.etat.pieces.find((p) => p.remplaceeLe === null)!.fichierCle).toMatch(/v3\.pdf$/);
  });

  it("« Pas encore » retire la déclaration et fait du fichier en cours le précédent", async () => {
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v1.pdf"));
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v2.pdf"));
    await retirerDeclaration("etab-1", SCHEMA);
    expect(h.etat.declarations).toEqual([]);
    // v1 part, v2 devient le précédent ; plus aucun fichier en cours.
    expect(h.etat.pieces).toHaveLength(1);
    expect(h.etat.pieces[0].remplaceeLe).not.toBeNull();
    expect(h.etat.pieces[0].fichierCle).toMatch(/v2\.pdf$/);
    expect(h.etat.stockage.effaces).toHaveLength(1);
    expect(h.etat.stockage.effaces[0]).toMatch(/v1\.pdf$/);
  });

  it("après un « Pas encore », le dépôt suivant efface bien le précédent, comme l'écran le promet", async () => {
    // Le défaut relevé à la relecture du 2026-11-05 : sans fichier en cours,
    // le dépôt gardait le précédent, et la ligne portait C1 et C2.
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v1.pdf"));
    await retirerDeclaration("etab-1", SCHEMA);
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v2.pdf"));
    expect(h.etat.pieces).toHaveLength(1);
    expect(h.etat.pieces[0].fichierCle).toMatch(/v2\.pdf$/);
    expect(h.etat.stockage.effaces).toHaveLength(1);
    expect(h.etat.stockage.effaces[0]).toMatch(/v1\.pdf$/);
  });

  it("« Pas encore » sur une ligne sans fichier en cours n'efface pas la seule version gardée", async () => {
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v1.pdf"));
    await retirerDeclaration("etab-1", SCHEMA);
    await retirerDeclaration("etab-1", SCHEMA);
    expect(h.etat.pieces).toHaveLength(1);
    expect(h.etat.stockage.effaces).toEqual([]);
  });

  it("si la base refuse, le fichier neuf est libéré et rien d'autre ne bouge", async () => {
    await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v1.pdf"));
    h.etat.echecTransaction = true;
    const r = await deposerFichierEnPlace("etab-1", SCHEMA, unPdf("v2.pdf"));
    expect(r.status).toBe("error");
    expect(h.etat.pieces).toHaveLength(1);
    expect(h.etat.pieces[0].remplaceeLe).toBeNull();
    expect(h.etat.stockage.effaces).toHaveLength(1);
    expect(h.etat.stockage.effaces[0]).toMatch(/v2\.pdf$/);
  });
});
