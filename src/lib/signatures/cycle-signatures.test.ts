import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le cycle de vie d'un objet signable face à ses signatures.
 *
 * Les modèles Prisma sont des tables en mémoire qui APPLIQUENT la clause
 * reçue (égalité, `null`, `gte`) : une requête non bornée à l'établissement
 * voit la ligne du voisin, comme en base. C'est ce qui permet de tenter la
 * traversée plutôt que de relire la forme d'un `where`.
 */

type Ligne = Record<string, unknown>;

function correspond(ligne: Ligne | undefined, where: Ligne): boolean {
  if (!ligne) return false;
  return Object.entries(where).every(([clef, attendu]) => {
    const valeur = ligne[clef];
    if (attendu === null) return valeur === null || valeur === undefined;
    if (attendu instanceof Date) return valeur instanceof Date && valeur.getTime() === attendu.getTime();
    if (typeof attendu === "object") {
      const a = attendu as Ligne;
      if ("gte" in a) return valeur instanceof Date && valeur >= (a.gte as Date);
      return correspond(valeur as Ligne, a);
    }
    return valeur === attendu;
  });
}

function table(lignes: Ligne[]) {
  const trouver = async ({ where }: { where: Ligne }) =>
    lignes.find((l) => correspond(l, where)) ?? null;
  return {
    lignes,
    findUnique: vi.fn(trouver),
    findFirst: vi.fn(trouver),
    count: vi.fn(async ({ where }: { where: Ligne }) =>
      lignes.filter((l) => correspond(l, where)).length,
    ),
    create: vi.fn(async ({ data }: { data: Ligne }) => {
      lignes.push(data);
      return data;
    }),
    update: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const l = lignes.find((x) => correspond(x, where));
      if (!l) throw new Error("P2025");
      Object.assign(l, data);
      return l;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const touchees = lignes.filter((x) => correspond(x, where));
      for (const l of touchees) Object.assign(l, data);
      return { count: touchees.length };
    }),
    delete: vi.fn(async ({ where }: { where: Ligne }) => {
      const i = lignes.findIndex((x) => correspond(x, where));
      if (i === -1) throw new Error("P2025");
      return lignes.splice(i, 1)[0];
    }),
  };
}

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {} as Record<string, ReturnType<typeof table>>,
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    const e = new Error("NEXT_REDIRECT");
    (e as { digest?: string }).digest = "NEXT_REDIRECT";
    throw e;
  },
  notFound: () => {
    const e = new Error("NEXT_NOT_FOUND");
    (e as { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
    throw e;
  },
}));
// Le propriétaire connecté tient `etab-a-moi`, et lui seul.
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async (etablissementId: string) => {
    if (etablissementId !== "etab-a-moi") {
      const e = new Error("NEXT_NOT_FOUND");
      (e as { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
      throw e;
    }
    return { id: "user-1" };
  }),
}));
vi.mock("@/lib/batiments/queries", () => ({ resoudreBatimentOptionnel: vi.fn() }));

import { supprimerPlan } from "@/lib/plan-prevention/actions";
import { supprimerPermisFeu } from "@/lib/permis-feu/actions";

async function sansRedirection(p: Promise<unknown>): Promise<void> {
  await p.catch((e: { digest?: string }) => {
    if (e?.digest !== "NEXT_REDIRECT") throw e;
  });
}

function plan(id: string, etablissementId: string, statut: string): Ligne {
  return { id, etablissementId, statut, numero: 1 };
}

function signature(objetType: string, objetId: string, etablissementId: string): Ligne {
  return { id: `sig_${objetId}_${etablissementId}`, objetType, objetId, etablissementId };
}

function jeton(
  objetType: string,
  objetId: string,
  etablissementId: string,
  extra: Ligne = {},
): Ligne {
  return {
    id: `atk_${objetId}_${Math.random()}`,
    objetType,
    objetId,
    etablissementId,
    scope: "signature",
    utiliseLe: null,
    revoqueLe: null,
    revoqueMotif: null,
    createdAt: new Date(),
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.planPrevention = table([]);
  prismaMock.permisFeu = table([]);
  prismaMock.signature = table([]);
  prismaMock.accessToken = table([]);
});

// ─────────────────────────────────────────────────────────────────────────
// Défaut 1 — un objet signé ou dont un lien est parti ne s'efface plus.
// ─────────────────────────────────────────────────────────────────────────

describe("garantie 1 — un plan qui porte une signature ne s'efface jamais", () => {
  it("un plan en attente_signatures déjà signé passe « annulé », rien n'est effacé", async () => {
    prismaMock.planPrevention.lignes.push(plan("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.signature.lignes.push(signature("plan_prevention", "pp-1", "etab-a-moi"));

    await sansRedirection(supprimerPlan("pp-1"));

    expect(prismaMock.planPrevention.delete).not.toHaveBeenCalled();
    expect(prismaMock.planPrevention.lignes).toHaveLength(1);
    expect(prismaMock.planPrevention.lignes[0].statut).toBe("annule");
    expect(prismaMock.signature.lignes).toHaveLength(1);
  });

  it("un plan pour lequel un lien de signature a été émis, sans signature encore, passe « annulé »", async () => {
    prismaMock.planPrevention.lignes.push(plan("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.accessToken.lignes.push(jeton("plan_prevention", "pp-1", "etab-a-moi"));

    await sansRedirection(supprimerPlan("pp-1"));

    expect(prismaMock.planPrevention.delete).not.toHaveBeenCalled();
    expect(prismaMock.planPrevention.lignes[0].statut).toBe("annule");
  });

  it("un plan vierge (ni signature, ni lien) s'efface encore", async () => {
    // Contrôle positif : sans lui, les deux tests précédents passeraient
    // aussi sur un code qui n'efface plus jamais rien.
    prismaMock.planPrevention.lignes.push(plan("pp-1", "etab-a-moi", "attente_signatures"));

    await sansRedirection(supprimerPlan("pp-1"));

    expect(prismaMock.planPrevention.lignes).toHaveLength(0);
  });

  it("traversée : la signature d'un homonyme chez un autre client ne compte pas", async () => {
    // Même `objetId`, autre établissement. Le compte doit être borné au
    // plan de CET établissement.
    prismaMock.planPrevention.lignes.push(plan("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.signature.lignes.push(signature("plan_prevention", "pp-1", "etab-voisin"));
    prismaMock.accessToken.lignes.push(jeton("plan_prevention", "pp-1", "etab-voisin"));

    await sansRedirection(supprimerPlan("pp-1"));

    expect(prismaMock.planPrevention.lignes).toHaveLength(0);
  });

  it("traversée : le plan d'un autre client ne s'efface ni ne s'annule", async () => {
    prismaMock.planPrevention.lignes.push(plan("pp-voisin", "etab-voisin", "attente_signatures"));

    await expect(supprimerPlan("pp-voisin")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(prismaMock.planPrevention.lignes).toEqual([
      plan("pp-voisin", "etab-voisin", "attente_signatures"),
    ]);
  });
});

describe("garantie 1 — un permis de feu qui porte une signature ne s'efface jamais", () => {
  it("un permis en attente_signatures déjà signé passe « annulé », rien n'est effacé", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "attente_signatures"));
    prismaMock.signature.lignes.push(signature("permis_feu", "pf-1", "etab-a-moi"));

    await sansRedirection(supprimerPermisFeu("pf-1"));

    expect(prismaMock.permisFeu.delete).not.toHaveBeenCalled();
    expect(prismaMock.permisFeu.lignes[0].statut).toBe("annule");
  });

  it("un permis pour lequel un lien a été émis passe « annulé »", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "brouillon"));
    prismaMock.accessToken.lignes.push(jeton("permis_feu", "pf-1", "etab-a-moi"));

    await sansRedirection(supprimerPermisFeu("pf-1"));

    expect(prismaMock.permisFeu.lignes[0].statut).toBe("annule");
  });

  it("un permis vierge s'efface encore", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "attente_signatures"));

    await sansRedirection(supprimerPermisFeu("pf-1"));

    expect(prismaMock.permisFeu.lignes).toHaveLength(0);
  });
});
