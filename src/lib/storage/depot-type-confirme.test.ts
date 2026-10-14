// ASVS 5.0.0 V5.2.2 (audit du 2026-10-13), rejoué sur les TROIS dépôts qui
// passent par `validerFichier` : rapport de vérification, pièce de
// prestataire, rapport de laboratoire. Le type déclaré par le navigateur ne
// suffit plus — un HTML déclaré PDF, un exécutable déclaré PNG ne touchent pas
// le stockage ; un vrai PDF, si.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const ecritures: string[] = [];
  const table = (nom: string) =>
    new Proxy(
      {},
      {
        get: (_t, op: string) => async () => {
          if (/create|update|upsert|delete/.test(op)) ecritures.push(`${nom}.${op}`);
          if (nom === "verification" && (op === "findUnique" || op === "findFirst"))
            return { id: "v1", etablissementId: "e1", salarieId: null, archiveLe: null };
          if (nom === "carnetSanitaire") return { id: "c1", etablissementId: "e1" };
          return null;
        },
      },
    );
  const prisma = new Proxy({}, { get: (_t, nom: string) => table(nom) });
  // L'écriture « échoue » : le dépôt s'arrête là, et un appel à `put` prouve
  // que le fichier a passé la validation.
  const put = vi.fn(async () => {
    throw new Error("arrêt du test après le stockage");
  });
  return { prisma, ecritures, put };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "u1" })),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: vi.fn() }));
vi.mock("@/lib/storage", async (original) => ({
  ...(await original<typeof import("@/lib/storage")>()),
  stockageEnService: () => true,
  getStorage: () => ({ put: h.put, delete: vi.fn(async () => {}) }),
}));

const HTML = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
const MZ = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");

const ATTAQUES: Array<[string, File]> = [
  ["HTML nommé .html, déclaré PDF", new File([HTML], "facture.html", { type: "application/pdf" })],
  ["HTML nommé .pdf, déclaré PDF", new File([HTML], "facture.pdf", { type: "application/pdf" })],
  ["exécutable nommé .exe, déclaré PNG", new File([MZ], "rapport.exe", { type: "image/png" })],
  ["exécutable nommé .png, déclaré PNG", new File([MZ], "rapport.png", { type: "image/png" })],
];
const LEGITIME = () => new File([PDF], "rapport.pdf", { type: "application/pdf" });

async function deposerRapport(f: File) {
  const { uploadRapport } = await import("@/lib/rapports/actions");
  const fd = new FormData();
  fd.set("dateRapport", "2026-09-01");
  fd.set("organismeVerif", "Bureau X");
  fd.set("resultat", "conforme");
  fd.set("commentaires", "");
  fd.set("fichier", f);
  return uploadRapport("v1", { status: "idle" } as never, fd);
}

async function deposerPiece(f: File) {
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
  fd.set("attestationUrssaf", f);
  return creerPrestataire("e1", { status: "idle" } as never, fd);
}

async function deposerAnalyse(f: File) {
  const { ajouterAnalyseLegionelle } = await import("@/lib/carnet-sanitaire/actions");
  const fd = new FormData();
  fd.set("dateAnalyse", "2026-09-01");
  for (const c of ["laboratoire", "valeurUfcParL", "commentaire"]) fd.set(c, "");
  fd.set("rapport", f);
  return ajouterAnalyseLegionelle("e1", { status: "idle" } as never, fd);
}

const DEPOTS: Array<[string, (f: File) => Promise<unknown>]> = [
  ["rapport de vérification", deposerRapport],
  ["pièce de prestataire", deposerPiece],
  ["rapport de laboratoire du carnet sanitaire", deposerAnalyse],
];

beforeEach(() => {
  h.ecritures.length = 0;
  h.put.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("dépôt : le type déclaré doit être confirmé par le nom et le contenu", () => {
  for (const [depot, deposer] of DEPOTS) {
    for (const [attaque, f] of ATTAQUES) {
      it(`${depot} — ${attaque} : refusé, rien au stockage ni en base`, async () => {
        const r = await deposer(f);
        expect(r).toMatchObject({ status: "error" });
        expect(h.put).not.toHaveBeenCalled();
        expect(h.ecritures).toEqual([]);
      });
    }
    it(`${depot} — un vrai PDF passe la validation et atteint le stockage`, async () => {
      await deposer(LEGITIME());
      expect(h.put).toHaveBeenCalledTimes(1);
    });
  }
});
