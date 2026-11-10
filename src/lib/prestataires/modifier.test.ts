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
  return { prisma, appels, reponses, stockage, prestataireGele: null as string | null };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "u1" })),
  // La garde rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: async (...a: unknown[]) => ({
    user: (await (vi.fn(async () => ({ id: "u1" })) as (...x: unknown[]) => unknown)(...a)) ?? { id: "u1" },
    compte: { compteId: "c1", role: "owner" },
    db: await (await import("@/test/garde-simulee")).clientDuCompteSimule(),
  }),
}));
vi.mock("@/lib/abonnements/quotas", async (original) => ({
  ...(await original<typeof import("@/lib/abonnements/quotas")>()),
  motifDuGel: async (_db: unknown, _c: string, cible: { prestataireId?: string }) =>
    cible.prestataireId === h.prestataireGele ? "Ce prestataire dépasse votre formule." : null,
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
  h.prestataireGele = null;
  h.appels.length = 0;
  h.stockage.ecrits.length = 0;
  h.stockage.liberes.length = 0;
  for (const k of Object.keys(h.reponses)) delete h.reponses[k];
  // La fiche n'existe que dans l'établissement e1.
  h.reponses["prestataire.findFirst"] = (args) =>
    (args as { where: { etablissementId: string } }).where.etablissementId === "e1"
      ? FICHE
      : null;
  h.reponses["prestataire.updateMany"] = () => ({ count: 1 });
  h.reponses["prestataire.deleteMany"] = () => ({ count: 1 });
});

describe("modifierPrestataire", () => {
  it("une fiche d'un autre établissement est introuvable, et rien n'est écrit", async () => {
    const r = await modifierPrestataire("e2", "pre_1", { status: "idle" }, saisie());
    expect(r).toEqual({ status: "error", message: "Prestataire introuvable" });
    expect(ecritures("prestataire.updateMany")).toEqual([]);
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
    const [maj] = ecritures("prestataire.updateMany");
    const data = (maj.args as { data: Record<string, unknown> }).data;
    expect(data.contactTelephone).toBeNull();
    expect(data.notesInternes).toBeNull();
    expect(data.kbisDateEmission).toBeNull();
    expect(data.attestationUrssafValableJusquA).toBeInstanceOf(Date);
    // Aucune pièce jointe : les pièces en place ne sont pas touchées, et la
    // modification est une seule écriture, sans transaction.
    expect("attestationUrssafCle" in data).toBe(false);
    expect(h.appels.map((a) => a.op).filter((op) => op !== "prestataire.findFirst")).toEqual(["prestataire.updateMany"]);
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
    const data = (ecritures("prestataire.updateMany")[0].args as { data: Record<string, unknown> }).data;
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

  it("un prestataire gelé (ADR-053 § 14) : la pièce est refusée avant tout téléversement", async () => {
    h.prestataireGele = "pre_1";
    const r = await modifierPrestataire("e1", "pre_1", { status: "idle" }, saisie({ kbis: pdf() }));
    expect(r.status).toBe("error");
    expect(h.stockage.ecrits).toEqual([]);
    expect(ecritures("prestataire.updateMany")).toEqual([]);
  });

  it("la pièce remplacée est celle qu'on a lue : l'écriture est bornée à sa clé (audit du 2026-11-10)", async () => {
    await modifierPrestataire("e1", "pre_1", { status: "idle" }, saisie({ attestationUrssaf: pdf() }));
    // Clé, nom et validité de la pièce remplacée : ce qui s'archive.
    expect((ecritures("prestataire.updateMany")[0].args as { where: unknown }).where).toEqual({
      id: "pre_1",
      attestationUrssafCle: FICHE.attestationUrssafCle,
      attestationUrssafNom: FICHE.attestationUrssafNom,
      attestationUrssafValableJusquA: FICHE.attestationUrssafValableJusquA,
    });
  });

  it("une autre modification a remplacé la pièce entre-temps : refus, rien d'inscrit, la pièce déposée est libérée", async () => {
    h.reponses["prestataire.updateMany"] = () => ({ count: 0 });
    const r = await modifierPrestataire("e1", "pre_1", { status: "idle" }, saisie({ attestationUrssaf: pdf() }));
    expect(r).toMatchObject({ status: "error", message: expect.stringMatching(/modifiée entre-temps/) });
    expect(ecritures("piecePrestataire.createMany")).toEqual([]);
    expect(h.stockage.liberes).toEqual(h.stockage.ecrits);
  });

  it("la fiche a été supprimée entre-temps : « introuvable »", async () => {
    let lectures = 0;
    h.reponses["prestataire.findFirst"] = () => (lectures++ === 0 ? FICHE : null);
    h.reponses["prestataire.updateMany"] = () => ({ count: 0 });
    const r = await modifierPrestataire("e1", "pre_1", { status: "idle" }, saisie());
    expect(r).toEqual({ status: "error", message: "Prestataire introuvable" });
  });

  it("idem sans pièce remplacée (première pièce d'un type) : refus, et la pièce déposée est libérée", async () => {
    h.reponses["prestataire.updateMany"] = () => ({ count: 0 });
    const r = await modifierPrestataire("e1", "pre_1", { status: "idle" }, saisie({ kbis: pdf() }));
    expect(r).toMatchObject({ status: "error", message: expect.stringMatching(/modifiée entre-temps/) });
    expect(h.stockage.liberes).toEqual(h.stockage.ecrits);
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
    expect(ecritures("prestataire.updateMany")).toEqual([]);
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
    h.reponses["prestataire.updateMany"] = doublon;
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
    expect(ecritures("prestataire.deleteMany")).toHaveLength(1);
    expect([...h.stockage.liberes].sort()).toEqual(
      [
        FICHE.attestationUrssafCle,
        FICHE.assuranceRcProCle,
        "prestataires/e1/pre_1/urssaf-1-2025.pdf",
      ].sort(),
    );
  });
});

describe("supprimerPrestataire pendant une modification (audit du 2026-11-10)", () => {
  it("bornée aux pièces lues : relit quand une pièce a changé, et libère la pièce en place", async () => {
    const fiches = [FICHE, { ...FICHE, kbisCle: "prestataires/e1/pre_1/kbis-nouveau.pdf" }];
    h.reponses["prestataire.findFirst"] = () => ({ ...(fiches.shift() ?? FICHE), piecesPrecedentes: [] });
    let premiere = true;
    h.reponses["prestataire.deleteMany"] = () => {
      const count = premiere ? 0 : 1;
      premiere = false;
      return { count };
    };
    await supprimerPrestataire("e1", "pre_1");
    expect(ecritures("prestataire.deleteMany")).toHaveLength(2);
    expect((ecritures("prestataire.deleteMany")[0].args as { where: unknown }).where).toEqual({
      id: "pre_1",
      attestationUrssafCle: FICHE.attestationUrssafCle,
      assuranceRcProCle: FICHE.assuranceRcProCle,
      kbisCle: null,
    });
    expect(h.stockage.liberes).toContain("prestataires/e1/pre_1/kbis-nouveau.pdf");
  });
});

describe("supprimerPrestataire : chaque essai perd la course", () => {
  it("rien n'est supprimé, et on le dit", async () => {
    let n = 0;
    h.reponses["prestataire.findFirst"] = () => ({ ...FICHE, kbisCle: `k${n++}.pdf`, piecesPrecedentes: [] });
    h.reponses["prestataire.deleteMany"] = () => ({ count: 0 });
    await expect(supprimerPrestataire("e1", "pre_1")).rejects.toThrow(/abandonnée/);
    expect(h.stockage.liberes).toEqual([]);
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
