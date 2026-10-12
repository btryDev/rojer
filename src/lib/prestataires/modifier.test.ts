// « Modifier » une fiche prestataire et le SIRET en double (2026-10-12, audit
// des modules, B4 et « SIRET en double »). Base et stockage simulés : on
// relève ce que l'action écrit, et ce qu'elle libère.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const appels: { op: string; args: unknown }[] = [];
  const reponses: Record<string, (args: unknown) => unknown> = {};
  const prisma = new Proxy(
    {},
    {
      get: (_t, nom: string) =>
        new Proxy(
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
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/storage", async (original) => ({
  ...(await original<typeof import("@/lib/storage")>()),
  stockageEnService: () => true,
  getStorage: () => h.stockage,
}));

import { creerPrestataire, modifierPrestataire } from "./actions";
import { MESSAGE_SIRET_EN_DOUBLE } from "./siret-en-double";

const pdf = () =>
  new File([new Uint8Array([37, 80, 68, 70])], "nouvelle.pdf", { type: "application/pdf" });

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
const FICHE = {
  id: "pre_1",
  attestationUrssafCle: "prestataires/e1/pre_1/urssaf-ancienne.pdf",
  assuranceRcProCle: "prestataires/e1/pre_1/rcpro.pdf",
  kbisCle: null,
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
    // Aucune pièce jointe : les pièces en place ne sont pas touchées.
    expect("attestationUrssafCle" in data).toBe(false);
    expect(h.stockage.liberes).toEqual([]);
  });

  it("une pièce jointe remplace la précédente, qui est libérée après l'écriture ; les autres restent", async () => {
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
    expect(h.stockage.liberes).toEqual([FICHE.attestationUrssafCle]);
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
