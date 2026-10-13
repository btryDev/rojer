import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Corriger un permis de feu (audit du 2026-10-12, constat 4) — même règle que
 * le plan de prévention (`verrou-contenu.ts`).
 */
type Ligne = Record<string, unknown>;
const correspond = (l: Ligne, w: Ligne) =>
  Object.entries(w).every(([k, v]) => l[k] === v);

const { db } = vi.hoisted(() => ({
  db: {
    permis: [] as Ligne[],
    signatures: [] as Ligne[],
    jetons: [] as Ligne[],
    prestataires: [] as Ligne[],
    journal: [] as string[],
  },
}));

vi.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
    $queryRaw: async (q: TemplateStringsArray, ...v: unknown[]) => {
      db.journal.push(`verrou ${q.join("?")} ${v.join(",")}`);
      return [];
    },
    permisFeu: {
      create: vi.fn(async ({ data }: { data: Ligne }) => {
        db.permis.push(data);
        return data;
      }),
      findUnique: vi.fn(async ({ where }: { where: Ligne }) => db.permis.find((p) => correspond(p, where)) ?? null),
      // Même convention que le prestataire ci-dessous : la portée par le compte
      // (`etablissement: { entreprise: { userId } }`) est celle du compte du
      // test ; le cloisonnement est éprouvé par `perimetre.test.ts`.
      findFirst: vi.fn(async ({ where }: { where: Ligne }) => {
        const reste = { ...where };
        delete reste.etablissement;
        return db.permis.find((p) => correspond(p, reste)) ?? null;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
        const t = db.permis.filter((x) => correspond(x, where));
        t.forEach((p) => Object.assign(p, data));
        return { count: t.length };
      }),
    },
    signature: {
      count: vi.fn(async ({ where }: { where: Ligne }) => {
        db.journal.push("compte des signatures");
        return db.signatures.filter((s) => correspond(s, where)).length;
      }),
    },
    prestataire: {
      // La portée par le compte (`etablissement: { entreprise: { userId } }`)
      // est celle du compte connecté du test : seul l'établissement compte ici.
      findFirst: vi.fn(async ({ where }: { where: Ligne }) => {
        const sansPortee = { ...where };
        delete sansPortee.etablissement;
        return db.prestataires.find((x) => correspond(x, sansPortee)) ?? null;
      }),
    },
    accessToken: {
      updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
        const t = db.jetons.filter((x) => correspond(x, where));
        t.forEach((j) => Object.assign(j, data));
        return { count: t.length };
      }),
    },
  };
  return { prisma: client };
});
// L'empreinte : tout le permis sauf la zone, hors empreinte (`hash-objet.ts`).
vi.mock("@/lib/signatures/hash-objet", () => ({
  calculerHashObjet: vi.fn(async (_t: string, id: string) => {
    const p = db.permis.find((x) => x.id === id);
    if (!p) return { ok: false, raison: "objet_introuvable" };
    const couvert = { ...p };
    delete couvert.batimentId;
    return { ok: true, hash: JSON.stringify(couvert), nomDocument: null };
  }),
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
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("./queries", () => ({ nextNumeroPermisFeu: vi.fn(async () => 2) }));

import { creerPermisFeu, modifierPermisFeu } from "./actions";
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
  db.jetons = [];
  db.prestataires = [
    { id: "presta-a-moi", etablissementId: "etab-a-moi" },
    { id: "presta-voisin", etablissementId: "etab-voisin" },
  ];
  db.journal = [];
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

describe("les liens de signature en vol (relecture indépendante du 2026-10-12)", () => {
  const jeton = (): Ligne => ({
    id: "atk-1",
    etablissementId: "etab-a-moi",
    objetType: "permis_feu",
    objetId: "pf-1",
    utiliseLe: null,
    revoqueLe: null,
    revoqueMotif: null,
  });

  it("un contenu changé révoque le lien envoyé", async () => {
    db.permis.push(permisEnBase());
    db.jetons.push(jeton());

    expect((await modifier(saisie())).status).toBe("success");

    expect(db.jetons[0].revoqueMotif).toBe(
      "le permis de feu a été modifié depuis l'envoi de ce lien",
    );
  });

  it("un enregistrement qui ne change pas l'empreinte ne révoque rien", async () => {
    db.permis.push(permisEnBase());
    await modifier(saisie());
    db.jetons.push(jeton());

    await modifier(saisie());

    expect(db.jetons[0].revoqueLe).toBeNull();
  });

  it("le verrou de la ligne est pris AVANT de compter les signatures", async () => {
    db.permis.push(permisEnBase());

    await modifier(saisie());

    expect(db.journal.slice(0, 2)).toEqual([
      'verrou SELECT 1 FROM "PermisFeu" WHERE "id" = ? FOR UPDATE pf-1',
      "compte des signatures",
    ]);
  });
});

describe("le prestataire de l'annuaire est celui de l'établissement (relecture indépendante du 2026-10-12)", () => {
  const REFUS = {
    status: "error",
    message: "Prestataire introuvable",
    fieldErrors: { prestataireId: ["Prestataire introuvable dans votre annuaire"] },
  };

  it("à la création, la fiche d'un autre client est refusée et rien ne s'écrit", async () => {
    const r = await creerPermisFeu("etab-a-moi", { status: "idle" }, saisie({ prestataireId: "presta-voisin" }));

    expect(r).toEqual(REFUS);
    expect(db.permis).toHaveLength(0);
  });

  it("à la modification, de même", async () => {
    db.permis.push(permisEnBase());

    const r = await modifier(saisie({ prestataireId: "presta-voisin" }));

    expect(r).toEqual(REFUS);
    expect(db.permis[0].prestataireId).toBeUndefined();
  });

  it("la fiche de son propre annuaire se rattache", async () => {
    db.permis.push(permisEnBase());

    expect((await modifier(saisie({ prestataireId: "presta-a-moi" }))).status).toBe("success");
    expect(db.permis[0].prestataireId).toBe("presta-a-moi");
  });
});
