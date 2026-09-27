// En production sans stockage configuré, un DÉPÔT est refusé avec le motif
// exact — « Le dépôt de fichiers n'est pas encore configuré sur ce serveur » —
// et AVANT toute écriture ; une LECTURE rend un statut qui le dit ; une
// SUPPRESSION déjà commitée ne lève pas (2026-09-27, `lot/stockage-supabase`).
//
// Les trois appelants de `put` sont exercés : rapports, prestataires, carnet
// sanitaire. Le stockage réel n'est jamais touché : `getStorage()` lève ici,
// c'est précisément la configuration visée.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const ecritures: string[] = [];
  // Toute écriture en base est relevée : aucune ne doit avoir lieu.
  const table = (nom: string) =>
    new Proxy(
      {},
      {
        get: (_t, op: string) => async () => {
          if (/create|update|upsert|delete/.test(op)) ecritures.push(`${nom}.${op}`);
          if (nom === "rapportVerification" && op === "findUnique")
            return { id: "r1", etablissementId: "e1", fichierCle: "rapports/e1/r1.pdf", fichierMime: "application/pdf", fichierNomOriginal: "r.pdf", verificationId: "v1" };
          if (nom === "rapportVerification" && op === "findFirst")
            return { id: "r1", fichierCle: "rapports/e1/r1.pdf", fichierMime: "application/pdf", fichierNomOriginal: "r.pdf" };
          if (nom === "carnetSanitaire") return { id: "c1", etablissementId: "e1" };
          return null;
        },
      },
    );
  const prisma = new Proxy({}, { get: (_t, nom: string) => table(nom) });
  return { prisma, ecritures };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "u1" })),
  requireEtablissement: vi.fn(async () => ({ etablissement: { id: "e1" } })),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: vi.fn() }));

import { __oublierPiloteStockage, MESSAGE_DEPOT_NON_CONFIGURE } from "./index";

const pdf = () => new File([new Uint8Array([37, 80, 68, 70])], "piece.pdf", { type: "application/pdf" });

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("STORAGE_DRIVER", "");
  delete process.env.STORAGE_DRIVER;
  __oublierPiloteStockage();
  h.ecritures.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
  __oublierPiloteStockage();
});

describe("dépôt refusé en production sans stockage : le motif exact, rien d'écrit", () => {
  it("rapport de vérification", async () => {
    const { uploadRapport } = await import("@/lib/rapports/actions");
    const fd = new FormData();
    fd.set("dateRapport", "2026-09-01");
    fd.set("organismeVerif", "Bureau X");
    fd.set("resultat", "conforme");
    fd.set("commentaires", "");
    fd.set("fichier", pdf());
    const r = await uploadRapport("v1", { status: "idle" } as never, fd);
    expect(r).toMatchObject({ status: "error", message: MESSAGE_DEPOT_NON_CONFIGURE });
    expect(h.ecritures).toEqual([]);
  });

  it("pièce de prestataire : refusée sur son champ ; sans pièce, pas de refus de stockage", async () => {
    const { creerPrestataire } = await import("@/lib/prestataires/actions");
    const fd = new FormData();
    for (const champ of [
      "siret", "contactNom", "contactEmail", "contactTelephone",
      "attestationUrssafValableJusquA", "attestationUrssafRemiseLe",
      "attestationUrssafEmiseLe", "assuranceRcProValableJusquA",
      "kbisDateEmission", "notesInternes",
    ])
      fd.set(champ, "");
    fd.set("raisonSociale", "Entreprise X");
    fd.set("contactNom", "Jean Martin");
    fd.set("contactEmail", "jean@exemple.fr");
    fd.set("attestationUrssaf", pdf());
    const r = await creerPrestataire("e1", { status: "idle" } as never, fd);
    expect(r).toMatchObject({
      status: "error",
      message: MESSAGE_DEPOT_NON_CONFIGURE,
      fieldErrors: { attestationUrssaf: [MESSAGE_DEPOT_NON_CONFIGURE] },
    });
    expect(h.ecritures).toEqual([]);

    // Sans pièce jointe, le stockage n'est pas demandé : le prestataire se crée.
    fd.delete("attestationUrssaf");
    await creerPrestataire("e1", { status: "idle" } as never, fd).catch(() => {});
    expect(h.ecritures).toContain("prestataire.create");
  });

  it("rapport de laboratoire du carnet sanitaire", async () => {
    const { ajouterAnalyseLegionelle } = await import("@/lib/carnet-sanitaire/actions");
    const fd = new FormData();
    fd.set("dateAnalyse", "2026-09-01");
    for (const champ of ["laboratoire", "valeurUfcParL", "commentaire"]) fd.set(champ, "");
    fd.set("rapport", pdf());
    const r = await ajouterAnalyseLegionelle("e1", { status: "idle" } as never, fd);
    expect(r).toMatchObject({ status: "error", message: MESSAGE_DEPOT_NON_CONFIGURE });
    expect(h.ecritures.filter((e) => e.startsWith("analyseLegionelle"))).toEqual([]);
  });
});

describe("lecture et suppression sans stockage", () => {
  it("la route du fichier rend 503 et le motif, pas une erreur 500", async () => {
    const { GET } = await import("@/app/api/rapports/[id]/fichier/route");
    const res = await GET(new Request("http://x/api/rapports/r1/fichier") as never, {
      params: Promise.resolve({ id: "r1" }),
    });
    expect(res.status).toBe(503);
    expect(await res.text()).toBe(MESSAGE_DEPOT_NON_CONFIGURE);
  });

  it("libererFichiers ne lève pas : la suppression en base est déjà faite", async () => {
    const { libererFichiers } = await import("@/lib/suppression/fichiers");
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(libererFichiers(["a/b.pdf", "c/d.pdf"], "test")).resolves.toEqual({
      liberes: 0,
      echecs: 2,
    });
    // Aucune clé : aucun appel au stockage, aucun journal.
    erreur.mockClear();
    await expect(libererFichiers([], "test")).resolves.toEqual({ liberes: 0, echecs: 0 });
    expect(erreur).not.toHaveBeenCalled();
    erreur.mockRestore();
  });
});
