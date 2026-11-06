import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({
  etatStripe: vi.fn(),
  put: vi.fn(async () => {}),
  compte: null as null | { compte: { compteId: string }; db: unknown },
}));
vi.mock("@/lib/stripe/config", () => ({ etatStripe: h.etatStripe }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ put: h.put }) }));
vi.mock("@/lib/auth/compte", () => ({
  requireCompte: async () => h.compte,
  getOptionalCompte: async () => h.compte,
}));

import { clesDeFichiers, deposerFichier, octetsUtilises } from "./stockage";

const GO = 1e9;

/** Le client borné, réduit : des fichiers référencés, leurs tailles connues, l'abonnement. */
function faux(tailles: Record<string, number>, formule = "rojer_essentiel_mensuel") {
  const vide = { findMany: vi.fn(async () => []) };
  const db = {
    abonnement: { findUnique: vi.fn(async () => ({ formule, statut: "active", debutPayantLe: new Date("2026-01-01"), essaiUtiliseLe: null })) },
    etablissement: { findMany: vi.fn(async () => [{ photoCle: "photo" }]) },
    rapportVerification: { findMany: vi.fn(async () => [{ fichierCle: "rapport" }, { fichierCle: null }]) },
    action: vide,
    prestataire: { findMany: vi.fn(async () => [{ attestationUrssafCle: "urssaf", assuranceRcProCle: null, kbisCle: "photo" }]) },
    piecePrestataire: vide,
    registreAccessibilite: vide,
    analyseLegionelle: vide,
    fichierStocke: {
      aggregate: vi.fn(async ({ where }: { where: { cle: { in: string[] } } }) => ({
        _sum: { octets: where.cle.in.reduce((t, c) => t + (tailles[c] ?? 0), 0) },
      })),
      upsert: vi.fn(async () => ({})),
    },
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
  it("compte les fichiers encore référencés, une fois chacun ; un fichier retiré ne compte plus", async () => {
    const db = faux({ photo: 10, rapport: 20, urssaf: 5, retire: 1_000 });
    expect((await clesDeFichiers(db as never)).sort()).toEqual(["photo", "rapport", "urssaf"]);
    expect(await octetsUtilises(db as never)).toBe(35);
  });

  it("au-delà du plafond : refusé, rien n'est déposé ni enregistré", async () => {
    lancer();
    const db = faux({ photo: 2 * GO - 10 });
    h.compte = { compte: { compteId: "c1" }, db };
    expect(await deposerFichier("neuf", Buffer.alloc(11), "application/pdf")).toBe(
      "Votre formule Essentiel couvre 2 Go de stockage : passez à Pro depuis la page Abonnement de votre compte.",
    );
    expect(h.put).not.toHaveBeenCalled();
    expect(db.fichierStocke.upsert).not.toHaveBeenCalled();
  });

  it("sous le plafond : déposé, puis la taille enregistrée au compte", async () => {
    lancer();
    const db = faux({ photo: 10 });
    h.compte = { compte: { compteId: "c1" }, db };
    expect(await deposerFichier("neuf", Buffer.alloc(11), "application/pdf")).toBeNull();
    expect(h.put).toHaveBeenCalledWith("neuf", expect.any(Buffer), "application/pdf");
    expect(db.fichierStocke.upsert).toHaveBeenCalledWith({
      where: { cle: "neuf" },
      create: { cle: "neuf", compteId: "c1", octets: 11 },
      update: { octets: 11 },
    });
  });

  it("avant le lancement : aucun refus ; la taille s'enregistre si la session se lit, le dépôt passe sinon", async () => {
    lancer(false);
    const db = faux({ photo: 100 * GO });
    h.compte = { compte: { compteId: "c1" }, db };
    expect(await deposerFichier("neuf", Buffer.alloc(11), "application/pdf")).toBeNull();
    expect(db.fichierStocke.upsert).toHaveBeenCalled();
    h.compte = null;
    expect(await deposerFichier("autre", Buffer.alloc(11), "application/pdf")).toBeNull();
    expect(h.put).toHaveBeenCalledTimes(2);
  });
});

describe("les fichiers comptés : toutes les clés de fichier du schéma", () => {
  it("chaque champ `…Cle` d'un modèle du compte est compté (une colonne de fichier neuve ne s'oublie pas)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { CHAMPS_FICHIERS } = await import("./stockage");
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const duSchema: Record<string, string[]> = {};
    for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
      const champs = [...m[2].matchAll(/^\s+(\w*Cle)\s+String/gm)].map((c) => c[1]);
      if (champs.length) duSchema[m[1].charAt(0).toLowerCase() + m[1].slice(1)] = champs;
    }
    // `LimiteDebit.cle` n'est pas un fichier ; ce n'est pas un champ `…Cle`.
    expect(duSchema).toEqual(Object.fromEntries(Object.entries(CHAMPS_FICHIERS).map(([k, v]) => [k, [...v]])));
  });
});
