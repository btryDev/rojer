import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Corriger un permis de feu (audit du 2026-10-12, constat 4) — même règle que
 * le plan de prévention (`verrou-contenu.ts`).
 */
type Ligne = Record<string, unknown>;
const correspond = (l: Ligne, w: Ligne) =>
  Object.entries(w).every(([k, v]) => l[k] === v);

const { db } = vi.hoisted(() => ({
  db: { permis: [] as Ligne[], signatures: [] as Ligne[] },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    permisFeu: {
      findUnique: vi.fn(async ({ where }: { where: Ligne }) => db.permis.find((p) => correspond(p, where)) ?? null),
      updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
        const t = db.permis.filter((x) => correspond(x, where));
        t.forEach((p) => Object.assign(p, data));
        return { count: t.length };
      }),
    },
    signature: {
      count: vi.fn(async ({ where }: { where: Ligne }) => db.signatures.filter((s) => correspond(s, where)).length),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async (e: string) => {
    if (e !== "etab-a-moi") throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/batiments/queries", () => ({
  resoudreBatimentOptionnel: vi.fn(async (_e: string, id?: string) => ({ ok: true, id: id ?? null })),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));

import { modifierPermisFeu } from "./actions";
import { MESURES_PERMIS_FEU, MESURES_RETIREES } from "./referentiel";
import { NATURES_TRAVAUX } from "./schema";

const RETIREE = MESURES_RETIREES[0].id;
const COURANTE = MESURES_PERMIS_FEU[0].id;

function permisEnBase(extra: Ligne = {}): Ligne {
  return {
    id: "pf-1",
    etablissementId: "etab-a-moi",
    numero: 1,
    statut: "attente_signatures",
    lieu: "Cuisine",
    batimentId: null,
    mesuresValidees: [RETIREE],
    ...extra,
  };
}

function saisie(champs: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    prestataireId: "",
    prestataireRaison: "Soudure Dupont",
    prestataireContact: "Marc Dupont",
    prestataireEmail: "marc@soudure.fr",
    donneurOrdreNom: "Jeanne Gérante",
    donneurOrdreFonction: "",
    dateDebut: "2026-10-20T08:00",
    dateFin: "2026-10-20T12:00",
    lieu: "Local technique",
    batimentId: "",
    naturesTravaux: NATURES_TRAVAUX[0],
    descriptionTravaux: "Soudure de deux raccords sur la tuyauterie",
    mesuresValidees: COURANTE,
    mesuresNotes: "",
    dureeSurveillanceMinutes: "120",
    ...champs,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

const modifier = (fd: FormData) => modifierPermisFeu("pf-1", { status: "idle" }, fd);

beforeEach(() => {
  db.permis = [];
  db.signatures = [];
});

describe("un permis non signé se corrige", () => {
  it("la correction s'écrit, et les mesures d'une liste antérieure ne se perdent pas", async () => {
    db.permis.push(permisEnBase());

    const r = await modifier(saisie());

    expect(r.status).toBe("success");
    expect(db.permis[0].lieu).toBe("Local technique");
    expect(db.permis[0].mesuresValidees).toEqual([COURANTE, RETIREE]);
  });

  it("la saisie invalide est refusée comme à la création", async () => {
    db.permis.push(permisEnBase());

    const r = await modifier(saisie({ dateFin: "2026-10-20T07:00" }));

    expect(r.status).toBe("error");
    expect(db.permis[0].lieu).toBe("Cuisine");
  });

  it("un permis terminé ne se modifie plus", async () => {
    db.permis.push(permisEnBase({ statut: "termine" }));

    expect((await modifier(saisie())).status).toBe("error");
    expect(db.permis[0].lieu).toBe("Cuisine");
  });
});

describe("un permis signé : ce que l'empreinte couvre ne se réécrit pas", () => {
  beforeEach(() => {
    db.permis.push(permisEnBase());
    db.signatures.push({ objetType: "permis_feu", objetId: "pf-1", etablissementId: "etab-a-moi" });
  });

  it("une saisie qui porte un champ couvert est refusée, avec la phrase de l'écran", async () => {
    const r = await modifier(saisie());

    expect(r).toEqual({
      status: "error",
      message:
        "Ce permis porte déjà une signature. Son contenu ne se modifie plus : le changer rendrait la signature invalide. Seule la zone reste modifiable.",
    });
    expect(db.permis[0].lieu).toBe("Cuisine");
  });

  it("la zone, hors de l'empreinte, se modifie encore", async () => {
    const fd = new FormData();
    fd.set("batimentId", "zone-2");

    expect((await modifier(fd)).status).toBe("success");
    expect(db.permis[0].batimentId).toBe("zone-2");
    expect(db.permis[0].lieu).toBe("Cuisine");
  });
});
