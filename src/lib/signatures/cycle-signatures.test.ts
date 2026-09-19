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
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: "moi@exemple.fr" })),
  getOptionalUser: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
const { mailsEnvoyes } = vi.hoisted(() => ({
  mailsEnvoyes: [] as { to: string; subject: string; text: string }[],
}));
vi.mock("@/lib/email", () => ({
  sendMail: vi.fn(async (p: { to: string; subject: string; text: string }) => {
    mailsEnvoyes.push(p);
  }),
  mailFrom: () => "no-reply@test.local",
  publicAppUrl: () => "http://localhost:3000",
}));

import { cloturerPlan, supprimerPlan } from "@/lib/plan-prevention/actions";
import { marquerTermine, supprimerPermisFeu } from "@/lib/permis-feu/actions";
import {
  demanderSignature,
  poserSignatureAvecToken,
  signerEnCompteConnecte,
} from "./actions";
import { hashToken } from "@/lib/access-tokens/token";
import { hashOtp } from "./otp";

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
  mailsEnvoyes.length = 0;
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

// ─────────────────────────────────────────────────────────────────────────
// Défaut 2 — clore ou annuler révoque les liens en vol ; un objet clos ou
// annulé ne se signe plus, même avec un lien resté valide.
// ─────────────────────────────────────────────────────────────────────────

function liensOuverts(objetId: string, etablissementId = "etab-a-moi"): Ligne[] {
  return prismaMock.accessToken.lignes.filter(
    (t) =>
      t.objetId === objetId &&
      t.etablissementId === etablissementId &&
      t.revoqueLe === null &&
      t.utiliseLe === null,
  );
}

describe("garantie 2a — clore, annuler ou supprimer révoque les liens de signature en vol", () => {
  it("clôturer un plan révoque ses liens non consommés, et eux seuls", async () => {
    prismaMock.planPrevention.lignes.push(plan("pp-1", "etab-a-moi", "attente_signatures"));
    const consomme = new Date("2026-09-01T10:00:00Z");
    prismaMock.accessToken.lignes.push(
      jeton("plan_prevention", "pp-1", "etab-a-moi"),
      jeton("plan_prevention", "pp-1", "etab-a-moi", { utiliseLe: consomme }),
      // Traversée : le lien d'un homonyme chez un voisin ne se révoque pas.
      jeton("plan_prevention", "pp-1", "etab-voisin"),
    );

    await cloturerPlan("pp-1");

    expect(liensOuverts("pp-1")).toHaveLength(0);
    const [ouvert, dejaUtilise, voisin] = prismaMock.accessToken.lignes;
    expect(ouvert.revoqueLe).toBeInstanceOf(Date);
    // Un lien qui a servi garde sa trace « utilisé », pas une révocation.
    expect(dejaUtilise.revoqueLe).toBeNull();
    expect(voisin.revoqueLe).toBeNull();
  });

  it("annuler un plan signé révoque ses liens en vol", async () => {
    prismaMock.planPrevention.lignes.push(plan("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.signature.lignes.push(signature("plan_prevention", "pp-1", "etab-a-moi"));
    prismaMock.accessToken.lignes.push(jeton("plan_prevention", "pp-1", "etab-a-moi"));

    await sansRedirection(supprimerPlan("pp-1"));

    expect(prismaMock.planPrevention.lignes[0].statut).toBe("annule");
    expect(liensOuverts("pp-1")).toHaveLength(0);
  });

  it("terminer un permis de feu révoque ses liens en vol", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "en_cours"));
    prismaMock.accessToken.lignes.push(
      jeton("permis_feu", "pf-1", "etab-a-moi"),
      jeton("permis_feu", "pf-1", "etab-voisin"),
    );

    await marquerTermine("pf-1");

    expect(liensOuverts("pf-1")).toHaveLength(0);
    expect(liensOuverts("pf-1", "etab-voisin")).toHaveLength(1);
  });

  it("annuler un permis de feu révoque ses liens en vol", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "valide"));
    prismaMock.accessToken.lignes.push(jeton("permis_feu", "pf-1", "etab-a-moi"));

    await sansRedirection(supprimerPermisFeu("pf-1"));

    expect(prismaMock.permisFeu.lignes[0].statut).toBe("annule");
    expect(liensOuverts("pf-1")).toHaveLength(0);
  });
});

const JETON_CLAIR = "jeton-clair-de-test-assez-long-pour-passer-0001";
const CODE = "123456";

/** Un lien de signature VALIDE — non révoqué, non expiré, code frais — :
 *  c'est le cas qu'une révocation manquée ou un autre chemin d'émission
 *  laisserait en vie. */
function lienValide(objetType: string, objetId: string): Ligne {
  return jeton(objetType, objetId, "etab-a-moi", {
    tokenHash: hashToken(JETON_CLAIR),
    otpHash: hashOtp(CODE),
    otpExpireLe: new Date(Date.now() + 5 * 60_000),
    otpEssaisRestants: 3,
    expireLe: new Date(Date.now() + 24 * 3_600_000),
    emailDestinataire: "signataire@exemple-externe.fr",
    nomDestinataire: "Jean Dupond",
  });
}

function planComplet(id: string, etablissementId: string, statut: string): Ligne {
  return {
    ...plan(id, etablissementId, statut),
    entrepriseExterieureRaison: "EF",
    lignes: [],
    phasesDangereuses: [],
  };
}

async function signer() {
  const fd = new FormData();
  fd.set("otp", CODE);
  return poserSignatureAvecToken(JETON_CLAIR, { status: "idle" }, fd);
}

describe("garantie 2b — un objet clos ou annulé ne se signe plus, même avec un lien valide", () => {
  it("refuse de signer un plan clos avec un lien resté ouvert", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "clos"));
    prismaMock.accessToken.lignes.push(lienValide("plan_prevention", "pp-1"));

    const r = await signer();

    expect(r.status).toBe("error");
    expect(prismaMock.signature.create).not.toHaveBeenCalled();
    // Le refus ne consomme pas d'essai de code.
    expect(prismaMock.accessToken.lignes[0].otpEssaisRestants).toBe(3);
  });

  it("refuse de signer un plan annulé", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "annule"));
    prismaMock.accessToken.lignes.push(lienValide("plan_prevention", "pp-1"));

    expect((await signer()).status).toBe("error");
    expect(prismaMock.signature.create).not.toHaveBeenCalled();
  });

  it("refuse de signer un permis terminé ou annulé", async () => {
    for (const statut of ["termine", "annule"]) {
      prismaMock.permisFeu = table([plan("pf-1", "etab-a-moi", statut)]);
      prismaMock.accessToken = table([lienValide("permis_feu", "pf-1")]);

      expect((await signer()).status, statut).toBe("error");
      expect(prismaMock.signature.create).not.toHaveBeenCalled();
    }
  });

  it("signe un plan en attente de signatures (contrôle positif)", async () => {
    prismaMock.planPrevention.lignes.push(
      planComplet("pp-1", "etab-a-moi", "attente_signatures"),
    );
    prismaMock.accessToken.lignes.push(lienValide("plan_prevention", "pp-1"));

    const r = await signer();

    expect(r.status).toBe("success");
    expect(prismaMock.signature.lignes).toHaveLength(1);
  });

  it("traversée : l'état lu est celui du plan de l'établissement du jeton, pas d'un homonyme", async () => {
    // Le voisin a un plan OUVERT sous le même identifiant, placé en premier :
    // une lecture non bornée le trouverait et laisserait signer.
    prismaMock.planPrevention.lignes.push(
      planComplet("pp-1", "etab-voisin", "attente_signatures"),
      planComplet("pp-1", "etab-a-moi", "clos"),
    );
    prismaMock.accessToken.lignes.push(lienValide("plan_prevention", "pp-1"));

    expect((await signer()).status).toBe("error");
    expect(prismaMock.signature.create).not.toHaveBeenCalled();
  });

  it("le donneur d'ordre connecté ne signe pas non plus un plan clos", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "clos"));

    const r = await signerEnCompteConnecte({
      etablissementId: "etab-a-moi",
      objetType: "plan_prevention",
      objetId: "pp-1",
    });

    expect(r).toEqual({ ok: false, raison: "non_signable" });
    expect(prismaMock.signature.create).not.toHaveBeenCalled();
  });

  it("aucun lien ne part pour un plan clos", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "clos"));

    const r = await demanderSignature({
      etablissementId: "etab-a-moi",
      objetType: "plan_prevention",
      objetId: "pp-1",
      signataireEmail: "signataire@exemple-externe.fr",
      signataireNom: "Jean Dupond",
    });

    expect(r.ok).toBe(false);
    expect(prismaMock.accessToken.create).not.toHaveBeenCalled();
    expect(mailsEnvoyes).toHaveLength(0);
  });
});
