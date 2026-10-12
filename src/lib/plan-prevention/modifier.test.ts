import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Corriger un plan de prévention (audit du 2026-10-12, constat 1).
 *
 * Le faux client applique l'égalité sur `where` : une écriture non bornée à
 * l'établissement toucherait le plan du voisin, comme en base.
 */
type Ligne = Record<string, unknown>;
const correspond = (l: Ligne, w: Ligne) =>
  Object.entries(w).every(([k, v]) => l[k] === v);

const { db } = vi.hoisted(() => ({
  db: { plans: [] as Ligne[], signatures: [] as Ligne[] },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    planPrevention: {
      findUnique: vi.fn(async ({ where }: { where: Ligne }) => db.plans.find((p) => correspond(p, where)) ?? null),
      update: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
        const p = db.plans.find((x) => correspond(x, where));
        if (!p) throw new Error("P2025");
        for (const [k, v] of Object.entries(data)) {
          // Relations remplacées en bloc : `{ deleteMany: {}, create: [...] }`.
          p[k] = v && typeof v === "object" && "create" in (v as Ligne) ? (v as Ligne).create : v;
        }
        return p;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
        const t = db.plans.filter((x) => correspond(x, where));
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
  resoudreBatimentOptionnel: vi.fn(async (_e: string, id?: string) =>
    id === "zone-inconnue" ? { ok: false } : { ok: true, id: id ?? null },
  ),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));

import { modifierPlanPrevention } from "./actions";

function planEnBase(extra: Ligne = {}): Ligne {
  return {
    id: "pp-1",
    etablissementId: "etab-a-moi",
    numero: 1,
    statut: "attente_signatures",
    entrepriseExterieureRaison: "Toitures Martin",
    inspectionDate: null,
    batimentId: null,
    lignes: [{ risque: "Chute de hauteur" }],
    ...extra,
  };
}

function saisie(champs: Record<string, string> = {}): FormData {
  const fd = new FormData();
  // Le formulaire poste chaque champ, vide compris : un champ facultatif
  // laissé blanc arrive en chaîne vide, jamais absent.
  const base: Record<string, string> = {
    prestataireId: "",
    entrepriseExterieureSiret: "",
    euChefFonction: "",
    dureeHeuresEstimee: "",
    batimentId: "",
    inspectionParticipants: "",
    "lignes[0].mesureEntrepriseExterieure": "",
    adaptationMateriels: "",
    instructionsTravailleurs: "",
    organisationSecours: "",
    participationCroisee: "",
    entrepriseExterieureRaison: "Toitures Martin",
    efChefNom: "Paul Martin",
    efChefEmail: "paul@toitures.fr",
    efEffectifIntervenant: "2",
    euChefNom: "Jeanne Gérante",
    dateDebut: "2026-10-20T08:00",
    dateFin: "2026-10-22T18:00",
    lieux: "Toiture",
    naturesTravaux: "Réfection de l'étanchéité de la toiture terrasse",
    inspectionDate: "2026-10-10",
    "lignes[0].risque": "Chute de hauteur",
    "lignes[0].mesureEntrepriseUtilisatrice": "Accès balisé",
    ...champs,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

const modifier = (fd: FormData, planId = "pp-1") =>
  modifierPlanPrevention(planId, { status: "idle" }, fd);

beforeEach(() => {
  db.plans = [];
  db.signatures = [];
});

describe("un plan non signé se corrige, avec les validations de la création", () => {
  it("le plan créé sans inspection commune l'enregistre après coup", async () => {
    db.plans.push(planEnBase());

    const r = await modifier(saisie());

    expect(r).toEqual({ status: "success", planId: "pp-1", numero: 1 });
    expect(db.plans[0].inspectionDate).toBeInstanceOf(Date);
    expect((db.plans[0].lignes as Ligne[])[0].mesureEntrepriseUtilisatrice).toBe("Accès balisé");
  });

  it("la saisie invalide est refusée comme à la création", async () => {
    db.plans.push(planEnBase());

    const r = await modifier(saisie({ dateFin: "2026-10-19T08:00" }));

    expect(r.status).toBe("error");
    expect((r as { fieldErrors?: Record<string, string[]> }).fieldErrors?.dateFin).toBeDefined();
    expect(db.plans[0].inspectionDate).toBeNull();
  });

  it("un plan clos ne se modifie plus", async () => {
    db.plans.push(planEnBase({ statut: "clos" }));

    const r = await modifier(saisie());

    expect(r).toEqual({ status: "error", message: "Ce plan est clos ou annulé : il ne se modifie plus." });
    expect(db.plans[0].inspectionDate).toBeNull();
  });

  it("traversée : le plan d'un autre client ne se modifie pas", async () => {
    db.plans.push(planEnBase({ id: "pp-voisin", etablissementId: "etab-voisin" }));

    await expect(modifier(saisie(), "pp-voisin")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(db.plans[0].inspectionDate).toBeNull();
  });
});

describe("un plan signé : ce que l'empreinte couvre ne se réécrit pas", () => {
  it("une saisie qui porte un champ couvert est refusée, avec la phrase de l'écran", async () => {
    db.plans.push(planEnBase());
    db.signatures.push({ objetType: "plan_prevention", objetId: "pp-1", etablissementId: "etab-a-moi" });

    const r = await modifier(saisie());

    expect(r).toEqual({
      status: "error",
      message:
        "Ce plan porte déjà une signature. Son contenu ne se modifie plus : le changer rendrait la signature invalide. Seule la zone reste modifiable.",
    });
    expect(db.plans[0].inspectionDate).toBeNull();
  });

  it("la zone, hors de l'empreinte, se modifie encore", async () => {
    db.plans.push(planEnBase());
    db.signatures.push({ objetType: "plan_prevention", objetId: "pp-1", etablissementId: "etab-a-moi" });
    const fd = new FormData();
    fd.set("batimentId", "zone-2");

    const r = await modifier(fd);

    expect(r.status).toBe("success");
    expect(db.plans[0].batimentId).toBe("zone-2");
    expect(db.plans[0].entrepriseExterieureRaison).toBe("Toitures Martin");
  });

  it("une signature d'un homonyme chez un voisin ne scelle pas ce plan", async () => {
    db.plans.push(planEnBase());
    db.signatures.push({ objetType: "plan_prevention", objetId: "pp-1", etablissementId: "etab-voisin" });

    expect((await modifier(saisie())).status).toBe("success");
  });
});
