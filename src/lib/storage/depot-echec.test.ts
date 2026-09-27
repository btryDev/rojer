// Stockage configuré, mais l'écriture échoue (en production, le 2026-09-27 :
// « Invalid Compact JWS ») : les trois dépôts rendent un message métier, pas
// l'erreur générique de Next, et rien n'est écrit en base.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const ecritures: string[] = [];
  const table = (nom: string) =>
    new Proxy(
      {},
      {
        get: (_t, op: string) => async () => {
          if (/create|update|upsert|delete/.test(op)) ecritures.push(`${nom}.${op}`);
          if (nom === "verification" && op === "findUnique")
            return { id: "v1", etablissementId: "e1", salarieId: null, archiveLe: null };
          if (nom === "carnetSanitaire") return { id: "c1", etablissementId: "e1" };
          return null;
        },
      },
    );
  const prisma = new Proxy({}, { get: (_t, nom: string) => table(nom) });
  const put = vi.fn(async () => {
    throw new Error("Stockage Supabase : échec de l'écriture (Invalid Compact JWS)");
  });
  return { prisma, ecritures, put };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "u1" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: vi.fn() }));
vi.mock("@/lib/storage", async (original) => ({
  ...(await original<typeof import("@/lib/storage")>()),
  stockageEnService: () => true,
  getStorage: () => ({ put: h.put, delete: vi.fn(async () => {}) }),
}));

import { MESSAGE_ECHEC_ENREGISTREMENT } from "./erreurs";

const pdf = () => new File([new Uint8Array([37, 80, 68, 70])], "piece.pdf", { type: "application/pdf" });

beforeEach(() => {
  h.ecritures.length = 0;
  h.put.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("écriture du fichier en échec : message métier, rien en base", () => {
  it("rapport de vérification", async () => {
    const { uploadRapport } = await import("@/lib/rapports/actions");
    const fd = new FormData();
    fd.set("dateRapport", "2026-09-01");
    fd.set("organismeVerif", "Bureau X");
    fd.set("resultat", "conforme");
    fd.set("commentaires", "");
    fd.set("fichier", pdf());
    const r = await uploadRapport("v1", { status: "idle" } as never, fd);
    expect(h.put).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT });
    expect(h.ecritures).toEqual([]);
  });

  it("pièce de prestataire", async () => {
    const { creerPrestataire } = await import("@/lib/prestataires/actions");
    const fd = new FormData();
    for (const c of [
      "siret", "contactTelephone", "attestationUrssafValableJusquA",
      "attestationUrssafRemiseLe", "attestationUrssafEmiseLe",
      "assuranceRcProValableJusquA", "kbisDateEmission", "notesInternes",
    ])
      fd.set(c, "");
    fd.set("raisonSociale", "Entreprise X");
    fd.set("contactNom", "Jean Martin");
    fd.set("contactEmail", "jean@exemple.fr");
    fd.set("attestationUrssaf", pdf());
    const r = await creerPrestataire("e1", { status: "idle" } as never, fd);
    expect(r).toMatchObject({
      status: "error",
      message: MESSAGE_ECHEC_ENREGISTREMENT,
      fieldErrors: { attestationUrssaf: [MESSAGE_ECHEC_ENREGISTREMENT] },
    });
    expect(h.ecritures).toEqual([]);
  });

  it("rapport de laboratoire du carnet sanitaire", async () => {
    const { ajouterAnalyseLegionelle } = await import("@/lib/carnet-sanitaire/actions");
    const fd = new FormData();
    fd.set("dateAnalyse", "2026-09-01");
    for (const c of ["laboratoire", "valeurUfcParL", "commentaire"]) fd.set(c, "");
    fd.set("rapport", pdf());
    const r = await ajouterAnalyseLegionelle("e1", { status: "idle" } as never, fd);
    expect(r).toEqual({ status: "error", message: MESSAGE_ECHEC_ENREGISTREMENT });
    expect(h.ecritures.filter((e) => e.startsWith("analyseLegionelle"))).toEqual([]);
  });
});
