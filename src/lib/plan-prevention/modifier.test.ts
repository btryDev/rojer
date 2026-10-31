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
/** `etablissement: { entreprise: { userId } }` : seul « etab-a-moi » est à « u1 ». */
const auCompte = (l: Ligne, portee: unknown) => {
  const userId = (portee as { entreprise?: { userId?: string } } | undefined)?.entreprise?.userId;
  return userId === undefined || (l.etablissementId === "etab-a-moi" ? "u1" : "u-voisin") === userId;
};

const { db } = vi.hoisted(() => ({
  db: {
    plans: [] as Ligne[],
    signatures: [] as Ligne[],
    jetons: [] as Ligne[],
    prestataires: [] as Ligne[],
    /** Le journal, dans l'ordre : verrous pris et comptes de signatures. */
    journal: [] as string[],
  },
}));

// Le faux client se passe lui-même à la transaction ; le verrou est journalisé.
vi.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      db.journal.push("transaction ouverte");
      try {
        return await fn(client);
      } finally {
        db.journal.push("transaction fermée");
      }
    },
    $queryRaw: async (q: TemplateStringsArray, ...v: unknown[]) => {
      db.journal.push(`verrou ${q.join("?")} ${v.join(",")}`);
      return [];
    },
    planPrevention: {
      create: vi.fn(async ({ data }: { data: Ligne }) => {
        db.plans.push(data);
        return data;
      }),
      findUnique: vi.fn(async ({ where }: { where: Ligne }) => db.plans.find((p) => correspond(p, where)) ?? null),
      // La lecture d'entrée porte le compte (`planDuCompte`) : le faux
      // l'applique — seul « etab-a-moi » est au compte « u1 » du test —, pour
      // que la traversée ci-dessous éprouve la lecture bornée, pas un repli.
      findFirst: vi.fn(async ({ where: { etablissement, ...where } }: { where: Ligne }) =>
        db.plans.find((p) => correspond(p, where) && auCompte(p, etablissement)) ?? null),
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
// L'empreinte : tout le plan sauf la zone, hors empreinte, et sans les
// identifiants des lignes, recréés à chaque enregistrement — la règle de
// `hash-objet.ts`, que ses propres tests éprouvent.
vi.mock("@/lib/signatures/hash-objet", () => ({
  calculerHashObjet: vi.fn(async (_db: unknown, _t: string, id: string) => {
    const p = db.plans.find((x) => x.id === id);
    if (!p) return { ok: false, raison: "objet_introuvable" };
    const couvert = { ...p };
    delete couvert.batimentId;
    const hash = JSON.stringify(couvert, (k, v) => (k === "id" ? undefined : v));
    return { ok: true, hash, nomDocument: null };
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (u: string) => {
    throw new Error(`NEXT_REDIRECT ${u}`);
  },
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async (e: string) => {
    if (e !== "etab-a-moi") throw new Error("NEXT_NOT_FOUND");
  }),
  // La même garde, qui rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: vi.fn(async (e: string) => {
    if (e !== "etab-a-moi") throw new Error("NEXT_NOT_FOUND");
    return { user: { id: "u1" }, db: await (await import("@/test/garde-simulee")).clientDuCompteSimule() };
  }),
}));
vi.mock("@/lib/batiments/queries", () => ({
  resoudreBatimentOptionnel: vi.fn(async (_e: string, id?: string) => {
    db.journal.push("lecture zone");
    return id === "zone-inconnue" ? { ok: false } : { ok: true, id: id ?? null };
  }),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));
vi.mock("./queries", () => ({ nextNumeroPlan: vi.fn(async () => 2) }));

import { creerPlanPrevention, modifierPlanPrevention } from "./actions";

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
  db.jetons = [];
  db.prestataires = [
    { id: "presta-a-moi", etablissementId: "etab-a-moi" },
    { id: "presta-voisin", etablissementId: "etab-voisin" },
  ];
  db.journal = [];
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
    // Inspection datée : la phrase de B5 ne s'ajoute pas (voir plus bas).
    db.plans.push(planEnBase({ inspectionDate: new Date("2026-10-01") }));
    db.signatures.push({ objetType: "plan_prevention", objetId: "pp-1", etablissementId: "etab-a-moi" });

    const r = await modifier(saisie());

    expect(r).toEqual({
      status: "error",
      message:
        "Ce plan porte déjà une signature. Son contenu ne se modifie plus : le changer rendrait la signature invalide. Seule la zone reste modifiable.",
    });
    expect(db.plans[0].inspectionDate).toEqual(new Date("2026-10-01"));
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

describe("les liens de signature en vol (relecture indépendante du 2026-10-12)", () => {
  const jeton = (extra: Ligne = {}): Ligne => ({
    id: "atk-1",
    etablissementId: "etab-a-moi",
    objetType: "plan_prevention",
    objetId: "pp-1",
    utiliseLe: null,
    revoqueLe: null,
    revoqueMotif: null,
    ...extra,
  });

  it("un contenu changé révoque le lien envoyé : on ne signe pas une version qu'on n'a pas vue", async () => {
    db.plans.push(planEnBase());
    db.jetons.push(jeton());

    expect((await modifier(saisie())).status).toBe("success");

    expect(db.jetons[0].revoqueLe).toBeInstanceOf(Date);
    expect(db.jetons[0].revoqueMotif).toBe(
      "le plan de prévention a été modifié depuis l'envoi de ce lien",
    );
  });

  it("un enregistrement qui ne change pas l'empreinte ne révoque rien", async () => {
    db.plans.push(planEnBase());
    await modifier(saisie());
    db.jetons.push(jeton());

    expect((await modifier(saisie())).status).toBe("success");

    expect(db.jetons[0].revoqueLe).toBeNull();
  });

  // La zone est hors de l'empreinte (`hash-objet.ts`, que le faux ci-dessus
  // reproduit) : la changer seule ne révoque pas le lien envoyé.
  it("changer la zone seule ne révoque rien : elle est hors de l'empreinte", async () => {
    db.plans.push(planEnBase());
    await modifier(saisie());
    db.jetons.push(jeton());

    expect((await modifier(saisie({ batimentId: "zone-2" }))).status).toBe("success");

    expect(db.plans[0].batimentId).toBe("zone-2");
    expect(db.jetons[0].revoqueLe).toBeNull();
  });

  it("le lien d'un autre plan n'est pas touché", async () => {
    db.plans.push(planEnBase());
    db.jetons.push(jeton({ objetId: "pp-2" }));

    await modifier(saisie());

    expect(db.jetons[0].revoqueLe).toBeNull();
  });

  it("le verrou de la ligne est pris AVANT de compter les signatures", async () => {
    db.plans.push(planEnBase());

    await modifier(saisie());

    // Le journal porte aussi l'ouverture de la transaction et la lecture de
    // zone (B1, plus haut) : l'ordre éprouvé ici est verrou → compte.
    const ordre = db.journal.filter((e) => e.startsWith("verrou") || e === "compte des signatures");
    expect(ordre[0]).toMatch(/^verrou SELECT 1 FROM "PlanPrevention" WHERE "id" = \? FOR UPDATE pp-1$/);
    expect(ordre[1]).toBe("compte des signatures");
  });
});

describe("le prestataire de l'annuaire est celui de l'établissement (relecture indépendante du 2026-10-12)", () => {
  const REFUS = {
    status: "error",
    message: "Prestataire introuvable",
    fieldErrors: { prestataireId: ["Prestataire introuvable dans votre annuaire"] },
  };

  it("à la création, la fiche d'un autre client est refusée et rien ne s'écrit", async () => {
    const r = await creerPlanPrevention("etab-a-moi", { status: "idle" }, saisie({ prestataireId: "presta-voisin" }));

    expect(r).toEqual(REFUS);
    expect(db.plans).toHaveLength(0);
  });

  it("à la modification, de même", async () => {
    db.plans.push(planEnBase());

    const r = await modifier(saisie({ prestataireId: "presta-voisin" }));

    expect(r).toEqual(REFUS);
    expect(db.plans[0].prestataireId).toBeUndefined();
  });

  it("la fiche de son propre annuaire se rattache", async () => {
    db.plans.push(planEnBase());

    expect((await modifier(saisie({ prestataireId: "presta-a-moi" }))).status).toBe("success");
    expect(db.plans[0].prestataireId).toBe("presta-a-moi");
  });
});

describe("les lectures de propriété se font hors transaction (relecture finale du 2026-10-12, B1)", () => {
  // En prod, `connection_limit=1` : une lecture par le client global DANS la
  // transaction attend la connexion que la transaction tient, et l'action
  // échoue au délai. Le faux client ne bloque pas ; l'ordre journalisé, si.
  it("la zone est résolue avant l'ouverture de la transaction", async () => {
    db.plans.push(planEnBase());
    await modifierPlanPrevention("pp-1", { status: "idle" }, saisie({ batimentId: "zone-2" }));
    const zone = db.journal.indexOf("lecture zone");
    const ouverture = db.journal.indexOf("transaction ouverte");
    expect(zone).toBeGreaterThanOrEqual(0);
    expect(zone).toBeLessThan(ouverture);
    expect(db.journal.slice(ouverture)).not.toContain("lecture zone");
  });
});

describe("un plan signé sans date d'inspection commune (B5)", () => {
  it("l'écran et le serveur disent l'issue réelle, pas seulement « la zone »", async () => {
    db.plans.push(planEnBase());
    db.signatures.push({ objetType: "plan_prevention", objetId: "pp-1", etablissementId: "etab-a-moi" });

    const r = await modifier(saisie());

    expect(r).toEqual({
      status: "error",
      message:
        "Ce plan porte déjà une signature. Son contenu ne se modifie plus : le changer rendrait la signature invalide. Seule la zone reste modifiable. Signé, ce plan ne peut plus recevoir la date de l'inspection commune : pour l'enregistrer, supprimez-le — il passe alors « annulé » et reste au dossier — puis établissez-en un nouveau, à faire signer.",
    });
  });

  it("une inspection déjà datée ne fait pas ajouter la phrase", async () => {
    db.plans.push(planEnBase({ inspectionDate: new Date("2026-10-01") }));
    db.signatures.push({ objetType: "plan_prevention", objetId: "pp-1", etablissementId: "etab-a-moi" });

    const r = await modifier(saisie());

    expect(r.status === "error" && r.message).not.toContain("inspection commune");
  });
});
