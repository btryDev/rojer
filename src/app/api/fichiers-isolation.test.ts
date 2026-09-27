// Les trois routes qui servent un fichier déposé — rapport de vérification,
// rapport d'analyse de légionelles, pièce de prestataire — ne servent jamais
// celui d'un autre utilisateur (2026-09-27, `lot/relire-fichiers-deposes`).
//
// La base en mémoire applique le `where` que la route écrit, comme Prisma :
// une condition absente ne filtre pas. Une route qui oublierait le prédicat
// d'appartenance servirait donc le fichier de l'autre compte, et ce test
// tomberait.

import { beforeEach, describe, expect, it, vi } from "vitest";

type Etab = { id: string; userId: string };
const h = vi.hoisted(() => {
  const etabs: Etab[] = [
    { id: "etab-a", userId: "user-a" },
    { id: "etab-b", userId: "user-b" },
  ];
  const userDe = (etabId: string) => etabs.find((e) => e.id === etabId)?.userId;
  // `undefined` dans un where ne filtre pas — sémantique Prisma.
  const ok = (attendu: unknown, valeur: unknown) => attendu === undefined || attendu === valeur;
  type W = { id?: string; etablissement?: { entreprise?: { userId?: string } }; carnet?: { etablissement?: { entreprise?: { userId?: string } } } };

  const rapports = [
    { id: "rap-a", etablissementId: "etab-a", fichierCle: "rapports/etab-a/a.pdf", fichierMime: "application/pdf", fichierNomOriginal: "a.pdf" },
    { id: "rap-b", etablissementId: "etab-b", fichierCle: "rapports/etab-b/b.pdf", fichierMime: "application/pdf", fichierNomOriginal: "b.pdf" },
  ];
  const analyses = [
    { id: "ana-a", etablissementId: "etab-a", rapportCle: "legio/etab-a/a.pdf", rapportNom: "labo-a.pdf" },
    { id: "ana-b", etablissementId: "etab-b", rapportCle: "legio/etab-b/b.pdf", rapportNom: "labo-b.pdf" },
    { id: "ana-a-vide", etablissementId: "etab-a", rapportCle: null, rapportNom: null },
  ];
  const prestataires = [
    { id: "pre-a", etablissementId: "etab-a", attestationUrssafCle: "presta/etab-a/u.pdf", attestationUrssafNom: "urssaf-a.pdf", assuranceRcProCle: null, assuranceRcProNom: null, kbisCle: "presta/etab-a/k.png", kbisNom: "kbis-a.png" },
    { id: "pre-b", etablissementId: "etab-b", attestationUrssafCle: "presta/etab-b/u.pdf", attestationUrssafNom: "urssaf-b.pdf", assuranceRcProCle: null, assuranceRcProNom: null, kbisCle: null, kbisNom: null },
  ];
  const trouver = <T extends { id: string; etablissementId: string }>(l: T[], userOf: (w: W) => string | undefined) =>
    async ({ where }: { where: W }) =>
      l.find((x) => ok(where.id, x.id) && ok(userOf(where), userDe(x.etablissementId))) ?? null;

  const prisma = {
    rapportVerification: { findFirst: trouver(rapports, (w) => w.etablissement?.entreprise?.userId) },
    prestataire: { findFirst: vi.fn(trouver(prestataires, (w) => w.etablissement?.entreprise?.userId)) },
    analyseLegionelle: { findFirst: trouver(analyses, (w) => w.carnet?.etablissement?.entreprise?.userId) },
  };
  const get = vi.fn(async (cle: string) => Buffer.from(`contenu:${cle}`));
  return { prisma, get, requireUser: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: h.requireUser }));
vi.mock("@/lib/storage", async (original) => ({
  ...(await original<typeof import("@/lib/storage")>()),
  getStorage: () => ({ get: h.get }),
}));

const rapport = await import("./rapports/[id]/fichier/route");
const analyse = await import("./analyses-legionelles/[id]/rapport/route");
const piece = await import("./prestataires/[id]/pieces/[piece]/route");
const { FichierIntrouvable, StockageNonConfigure } = await import("@/lib/storage");

const req = {} as never;
const appel = {
  rapport: (id: string) => rapport.GET(req, { params: Promise.resolve({ id }) }),
  analyse: (id: string) => analyse.GET(req, { params: Promise.resolve({ id }) }),
  piece: (id: string, p: string) => piece.GET(req, { params: Promise.resolve({ id, piece: p }) }),
};

beforeEach(() => {
  h.requireUser.mockResolvedValue({ id: "user-a" });
  h.get.mockReset();
  h.get.mockImplementation(async (cle: string) => Buffer.from(`contenu:${cle}`));
});

describe("chaque route sert le fichier de son propriétaire, et seulement lui", () => {
  it.each([
    ["rapport", () => appel.rapport("rap-a"), "rapports/etab-a/a.pdf", "application/pdf"],
    ["analyse", () => appel.analyse("ana-a"), "legio/etab-a/a.pdf", "application/pdf"],
    ["pièce URSSAF", () => appel.piece("pre-a", "urssaf"), "presta/etab-a/u.pdf", "application/pdf"],
    ["pièce Kbis", () => appel.piece("pre-a", "kbis"), "presta/etab-a/k.png", "image/png"],
  ])("%s à soi : 200, le contenu, le bon type", async (_n, f, cle, mime) => {
    const r = await f();
    expect(r.status).toBe(200);
    expect(await r.text()).toBe(`contenu:${cle}`);
    expect(r.headers.get("Content-Type")).toBe(mime);
  });

  it.each([
    ["rapport", () => appel.rapport("rap-b")],
    ["analyse", () => appel.analyse("ana-b")],
    ["pièce", () => appel.piece("pre-b", "urssaf")],
  ])("%s d'un autre utilisateur : 403, et le stockage n'est pas lu", async (_n, f) => {
    const r = await f();
    expect(r.status).toBe(403);
    expect(h.get).not.toHaveBeenCalled();
  });

  it("introuvable et hors périmètre répondent pareil : pas d'oracle d'existence", async () => {
    expect((await appel.analyse("inexistante")).status).toBe(403);
    expect((await appel.piece("inexistant", "urssaf")).status).toBe(403);
  });

  it("à soi mais sans fichier : 404 ; type de pièce inconnu : 404", async () => {
    expect((await appel.analyse("ana-a-vide")).status).toBe(404);
    expect((await appel.piece("pre-a", "rcpro")).status).toBe(404);
    expect((await appel.piece("pre-a", "../../etc")).status).toBe(404);
    // Un type inconnu ne va pas jusqu'à la base — « toString » compris, que
    // `in` aurait trouvé sur le prototype.
    const lectures = vi.mocked(h.prisma.prestataire.findFirst).mock.calls.length;
    expect((await appel.piece("pre-a", "toString")).status).toBe(404);
    expect((await appel.piece("pre-a", "inconnu")).status).toBe(404);
    expect(vi.mocked(h.prisma.prestataire.findFirst).mock.calls.length).toBe(lectures);
    expect(h.get).not.toHaveBeenCalled();
  });
});

describe("les échecs du stockage, communs aux trois routes", () => {
  it.each([
    [new StockageNonConfigure("x"), 503],
    [new FichierIntrouvable("k"), 410],
    [new Error("panne"), 502],
  ])("%s → %i", async (erreur, statut) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.get.mockRejectedValue(erreur);
    for (const f of [() => appel.rapport("rap-a"), () => appel.analyse("ana-a"), () => appel.piece("pre-a", "urssaf")])
      expect((await f()).status).toBe(statut);
  });
});
