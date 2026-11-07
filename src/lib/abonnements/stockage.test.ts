import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ etatStripe: vi.fn(), put: vi.fn(async () => {}) }));
vi.mock("@/lib/stripe/config", () => ({ etatStripe: h.etatStripe }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ put: h.put }) }));
vi.mock("@/lib/suppression/fichiers", async (original) => ({
  ...(await original<typeof import("@/lib/suppression/fichiers")>()),
  libererFichiers: vi.fn(async () => {}),
}));

import type { Db } from "@/lib/auth/compte";
import { clesDeFichiers, deposerFichier, octetsUtilises, abandonnerFichiers } from "./stockage";

const GO = 1e9;

/**
 * Le client borné, réduit : des fichiers référencés (une colonne obligatoire
 * comprise, sans filtre « non nul »), la somme en SQL, l'abonnement, la
 * transaction et le verrou.
 */
function faux(utilises: number, formule = "rojer_essentiel_mensuel") {
  const lignes = (l: Record<string, string | null>[]) => ({ findMany: vi.fn(async () => l) });
  const db = {
    etablissement: lignes([{ photoCle: "photo" }]),
    rapportVerification: lignes([{ fichierCle: "rapport" }, { fichierCle: null }]),
    action: lignes([]),
    prestataire: lignes([{ attestationUrssafCle: "urssaf", assuranceRcProCle: null, kbisCle: "photo" }]),
    piecePrestataire: lignes([{ fichierCle: "piece" }]),
    analyseLegionelle: lignes([]),
    pieceEtatPermanent: lignes([]), // ADR-056, report main → cc du 2026-11-06
    abonnement: { findUnique: vi.fn(async () => ({ formule, statut: "active", debutPayantLe: new Date("2026-01-01"), essaiUtiliseLe: null })) },
    $queryRaw: vi.fn(async (q: TemplateStringsArray) => (q.join("?").includes("SUM") ? [{ total: BigInt(utilises) }] : [])),
    fichierStocke: { upsert: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
  };
  return db;
}

function lancer(oui = true) {
  vi.stubEnv("ABONNEMENT_EXIGE", oui ? "oui" : "non");
  h.etatStripe.mockReturnValue({ active: true, mode: "test" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("le plafond de stockage (ADR-053 § 14)", () => {
  it("les fichiers encore référencés, une fois chacun, sans filtre sur une colonne obligatoire", async () => {
    const db = faux(0);
    expect((await clesDeFichiers(db as never)).sort()).toEqual(["photo", "piece", "rapport", "urssaf"]);
    for (const m of [db.piecePrestataire, db.etablissement]) expect(JSON.stringify(m.findMany.mock.calls[0])).not.toContain("not");
  });

  it("la somme en SQL, en entier long (au-delà de 2 Go), réservations récentes comprises", async () => {
    const db = faux(5 * GO);
    expect(await octetsUtilises(db as never, "c1")).toBe(5 * GO);
    const [sql, ...valeurs] = db.$queryRaw.mock.calls.at(-1)! as [TemplateStringsArray, ...unknown[]];
    expect(sql.join("?")).toMatch(/SUM\("octets"\), 0\)::bigint[\s\S]*"compteId" = \?::uuid AND \("cle" = ANY\(\?::text\[\]\) OR "deposeLe" > \?\)/);
    expect(valeurs[0]).toBe("c1");
  });

  it("au-delà du plafond : refusé sous le verrou, rien n'est réservé ni déposé", async () => {
    lancer();
    const db = faux(2 * GO - 10);
    expect(await deposerFichier(db as unknown as Db, "c1", "neuf", Buffer.alloc(11), "application/pdf")).toBe(
      "Votre formule Essentiel couvre 2 Go de stockage : passez à Pro depuis la page Abonnement de votre compte.",
    );
    expect(db.$queryRaw.mock.calls.some(([q]) => (q as TemplateStringsArray).join("?").includes("FOR NO KEY UPDATE"))).toBe(true);
    expect(db.fichierStocke.upsert).not.toHaveBeenCalled();
    expect(h.put).not.toHaveBeenCalled();
  });

  it("sous le plafond : la taille réservée AVANT le dépôt ; un dépôt qui échoue rend sa réservation", async () => {
    lancer();
    const db = faux(10);
    expect(await deposerFichier(db as unknown as Db, "c1", "neuf", Buffer.alloc(11), "application/pdf")).toBeNull();
    expect(db.fichierStocke.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cle: "neuf" }, create: { cle: "neuf", compteId: "c1", octets: 11 } }),
    );
    expect(db.fichierStocke.upsert.mock.invocationCallOrder[0]).toBeLessThan(h.put.mock.invocationCallOrder[0]);
    h.put.mockRejectedValueOnce(new Error("stockage indisponible"));
    await expect(deposerFichier(db as unknown as Db, "c1", "autre", Buffer.alloc(11), "application/pdf")).rejects.toThrow("stockage indisponible");
    expect(db.fichierStocke.deleteMany).toHaveBeenCalledWith({ where: { cle: { in: ["autre"] } } });
  });

  it("avant le lancement : ni verrou ni refus ; le dépôt, puis la taille", async () => {
    lancer(false);
    const db = faux(100 * GO);
    expect(await deposerFichier(db as unknown as Db, "c1", "neuf", Buffer.alloc(11), "application/pdf")).toBeNull();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(h.put.mock.invocationCallOrder[0]).toBeLessThan(db.fichierStocke.upsert.mock.invocationCallOrder[0]);
  });
});

describe("abandonnerFichiers", () => {
  it("un fichier abandonné rend sa réservation ; aucune clé, aucun appel ; une erreur ne remonte pas", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    await abandonnerFichiers({ fichierStocke: { deleteMany } } as unknown as Db, ["a", null, "b", ""], "test");
    expect(deleteMany).toHaveBeenCalledWith({ where: { cle: { in: ["a", "b"] } } });
    await abandonnerFichiers({ fichierStocke: { deleteMany } } as unknown as Db, [null], "test");
    expect(deleteMany).toHaveBeenCalledTimes(1);
    await expect(abandonnerFichiers({} as unknown as Db, ["a"], "test")).resolves.toBeUndefined();
  });
});
