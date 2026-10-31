// « Modifier » une fiche prestataire et le SIRET en double (2026-10-12, audit
// des modules, B4 et « SIRET en double »). Base et stockage simulés : on
// relève ce que l'action écrit, et ce qu'elle libère.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const appels: { op: string; args: unknown }[] = [];
  const reponses: Record<string, (args: unknown) => unknown> = {};
  const prisma: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_t, nom: string) =>
        // La forme tableau de `$transaction` : les écritures sont déjà
        // relevées à leur création, on rend leurs résultats. La forme
        // interactive reçoit le même client simulé (depuis le 2026-10-30 : la
        // modification passe par `creerEnLotVerifie`, qui lit avant d'écrire).
        nom === "$transaction"
          ? async (ops: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>)) => {
              appels.push({ op: "$transaction", args: null });
              return typeof ops === "function" ? ops(prisma) : Promise.all(ops);
            }
          : new Proxy(
          {},
          {
            get: (_u, op: string) => async (args: unknown) => {
              appels.push({ op: `${nom}.${op}`, args });
              const r = reponses[`${nom}.${op}`];
              return r ? r(args) : null;
            },
          },
        ),
    },
  );
  const stockage = {
    ecrits: [] as string[],
    liberes: [] as string[],
    put: async (cle: string) => void stockage.ecrits.push(cle),
    delete: async (cle: string) => void stockage.liberes.push(cle),
  };
  return { prisma, appels, reponses, stockage };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "u1" })),
  // La garde rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: async (...a: unknown[]) => ({
    user: (await (vi.fn(async () => ({ id: "u1" })) as (...x: unknown[]) => unknown)(...a)) ?? { id: "u1" },
    db: (await import("@/lib/prisma")).prisma,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/storage", async (original) => ({
  ...(await original<typeof import("@/lib/storage")>()),
  stockageEnService: () => true,
  getStorage: () => h.stockage,
}));

import { creerPrestataire, modifierPrestataire, supprimerPrestataire } from "./actions";
import { dateDeDepotDeLaCle } from "./pieces";
import { clePiecePrestataire } from "./storage";
import { MESSAGE_SIRET_EN_DOUBLE } from "./siret-en-double";

const pdf = () =>
  new File([new TextEncoder().encode("%PDF-1.7\n")], "nouvelle.pdf", { type: "application/pdf" });

function saisie(champs: Record<string, string | File> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    raisonSociale: "Électricité Dupond",
    siret: "12345678900012",
    contactNom: "Jean Dupond",
    contactEmail: "jean@dupond.fr",
    contactTelephone: "",
    attestationUrssafValableJusquA: "",
    attestationUrssafRemiseLe: "",
    attestationUrssafEmiseLe: "",
    assuranceRcProValableJusquA: "",
    kbisDateEmission: "",
    notesInternes: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...champs })) fd.set(k, v);
  return fd;
}

const ecritures = (op: string) => h.appels.filter((a) => a.op === op);
const DEPOT_ANCIENNE = Date.UTC(2026, 3, 2, 9, 30);
const FICHE = {
  id: "pre_1",
  attestationUrssafCle: `prestataires/e1/pre_1/urssaf-${DEPOT_ANCIENNE}-ancienne.pdf`,
  attestationUrssafNom: "ancienne.pdf",
  attestationUrssafValableJusquA: new Date("2026-09-30T00:00:00Z"),
  assuranceRcProCle: "prestataires/e1/pre_1/rcpro.pdf",
  assuranceRcProNom: "rcpro.pdf",
  assuranceRcProValableJusquA: null,
  kbisCle: null,
  kbisNom: null,
};

beforeEach(() => {
  h.appels.length = 0;
  h.stockage.ecrits.length = 0;
  h.stockage.liberes.length = 0;
  for (const k of Object.keys(h.reponses)) delete h.reponses[k];
  // La fiche n'existe que dans l'établissement e1.
  h.reponses["prestataire.findFirst"] = (args) =>
    (args as { where: { etablissementId: string } }).where.etablissementId === "e1"
      ? FICHE
      : null;
});

describe("modifierPrestataire", () => {
  it("une fiche d'un autre établissement est introuvable, et rien n'est écrit", async () => {
    const r = await modifierPrestataire("e2", "pre_1", { status: "idle" }, saisie());
    expect(r).toEqual({ status: "error", message: "Prestataire introuvable" });
    expect(ecritures("prestataire.update")).toEqual([]);
  });

  it("un champ vidé efface la valeur, et la nouvelle remise s'écrit avec sa validité", async () => {
    const r = await modifierPrestataire(
      "e1",
      "pre_1",
      { status: "idle" },
      saisie({
        attestationUrssafRemiseLe: "2026-10-01",
        attestationUrssafEmiseLe: "2026-09-28",
        attestationUrssafValableJusquA: "2027-03-31",
      }),
    );
    expect(r).toEqual({ status: "success", prestataireId: "pre_1" });
    const [maj] = ecritures("prestataire.update");
    const data = (maj.args as { data: Record<string, unknown> }).data;
    expect(data.contactTelephone).toBeNull();
    expect(data.notesInternes).toBeNull();
    expect(data.kbisDateEmission).toBeNull();
    expect(data.attestationUrssafValableJusquA).toBeInstanceOf(Date);
    // Aucune pièce jointe : les pièces en place ne sont pas touchées, et la
    // modification est une seule écriture, sans transaction.
    expect("attestationUrssafCle" in data).toBe(false);
    expect(h.appels.map((a) => a.op).filter((op) => op !== "prestataire.findFirst")).toEqual(["prestataire.update"]);
    expect(h.stockage.liberes).toEqual([]);
  });

  // ~~« … qui est libérée après l'écriture »~~ — 2026-10-12, relecture
  // indépendante : l'attestation d'un semestre passé prouve la vigilance
  // (L. 8222-2) ; elle n'est plus effacée.
  it("une pièce jointe remplace la précédente à la fiche, et la précédente n'est pas effacée", async () => {
    const r = await modifierPrestataire(
      "e1",
      "pre_1",
      { status: "idle" },
      saisie({ attestationUrssaf: pdf() }),
    );
    expect(r.status).toBe("success");
    const data = (ecritures("prestataire.update")[0].args as { data: Record<string, unknown> }).data;
    expect(data.attestationUrssafCle).toBe(h.stockage.ecrits[0]);
    expect(data.attestationUrssafNom).toBe("nouvelle.pdf");
    expect("assuranceRcProCle" in data).toBe(false);
    expect(h.stockage.liberes).toEqual([]);
    // 2026-10-12 : l'ancienne s'inscrit en `PiecePrestataire`, avec ce que la
    // fiche disait d'elle AVANT l'écriture.
    const [inscription] = ecritures("piecePrestataire.createMany");
    expect((inscription.args as { data: unknown[] }).data).toEqual([
      {
        prestataireId: "pre_1",
        type: "urssaf",
        fichierCle: FICHE.attestationUrssafCle,
        fichierNom: "ancienne.pdf",
        deposeeLe: new Date(DEPOT_ANCIENNE),
        valableJusquA: FICHE.attestationUrssafValableJusquA,
      },
    ]);
  });

  it("une pièce jointe là où il n'y en avait pas n'inscrit rien", async () => {
    await modifierPrestataire("e1", "pre_1", { status: "idle" }, saisie({ kbis: pdf() }));
    expect(ecritures("piecePrestataire.createMany")).toEqual([]);
  });

  it("reprend les validations de la création : une remise future est refusée sur son champ", async () => {
    const r = await modifierPrestataire(
      "e1",
      "pre_1",
      { status: "idle" },
      saisie({ attestationUrssafRemiseLe: "2999-01-01" }),
    );
    expect(r.status).toBe("error");
    if (r.status === "error") {
      expect(r.fieldErrors?.attestationUrssafRemiseLe).toBeDefined();
    }
    expect(ecritures("prestataire.update")).toEqual([]);
  });
});

describe("SIRET déjà présent dans l'annuaire", () => {
  const doublon = () => {
    throw Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["etablissementId", "siret"] },
    });
  };

  it("à la création : un message sur le champ, pas une page d'erreur", async () => {
    h.reponses["prestataire.create"] = doublon;
    const r = await creerPrestataire("e1", { status: "idle" }, saisie());
    expect(r).toEqual({
      status: "error",
      message: MESSAGE_SIRET_EN_DOUBLE,
      fieldErrors: { siret: [MESSAGE_SIRET_EN_DOUBLE] },
    });
  });

  it("à la modification : même message, et la pièce déjà écrite est reprise", async () => {
    h.reponses["prestataire.update"] = doublon;
    const r = await modifierPrestataire(
      "e1",
      "pre_1",
      { status: "idle" },
      saisie({ kbis: pdf() }),
    );
    expect(r).toMatchObject({ fieldErrors: { siret: [MESSAGE_SIRET_EN_DOUBLE] } });
    expect(h.stockage.liberes).toEqual(h.stockage.ecrits);
  });

  it("toute autre erreur de base remonte telle quelle", async () => {
    h.reponses["prestataire.create"] = () => {
      throw new Error("connexion perdue");
    };
    await expect(creerPrestataire("e1", { status: "idle" }, saisie())).rejects.toThrow(
      "connexion perdue",
    );
  });
});

describe("supprimerPrestataire — les pièces précédentes partent avec (2026-10-12)", () => {
  it("libère les pièces en cours ET les pièces remplacées, après la suppression en base", async () => {
    h.reponses["prestataire.findFirst"] = () => ({
      ...FICHE,
      piecesPrecedentes: [{ fichierCle: "prestataires/e1/pre_1/urssaf-1-2025.pdf" }],
    });
    await supprimerPrestataire("e1", "pre_1");
    expect(ecritures("prestataire.delete")).toHaveLength(1);
    expect([...h.stockage.liberes].sort()).toEqual(
      [
        FICHE.attestationUrssafCle,
        FICHE.assuranceRcProCle,
        "prestataires/e1/pre_1/urssaf-1-2025.pdf",
      ].sort(),
    );
  });
});

describe("dateDeDepotDeLaCle", () => {
  it("lit les millisecondes que `clePiecePrestataire` écrit", () => {
    const cle = clePiecePrestataire("e1", "pre_1", "rcpro", "a b.pdf");
    const d = dateDeDepotDeLaCle(cle);
    expect(d).toBeInstanceOf(Date);
    expect(Math.abs(d!.getTime() - Date.now())).toBeLessThan(5_000);
  });
  it("rend null plutôt que deviner sur une clé d'une autre forme", () => {
    expect(dateDeDepotDeLaCle("prestataires/e1/pre_1/rcpro.pdf")).toBeNull();
  });
});
