import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { correspond } from "@/test/prisma-where";
import { Prisma } from "@prisma/client";

/**
 * Le cycle de vie d'un objet signable face à ses signatures.
 *
 * Les modèles Prisma sont des tables en mémoire qui APPLIQUENT la clause
 * reçue (égalité, `null`, `gte`) : une requête non bornée à l'établissement
 * voit la ligne du voisin, comme en base. C'est ce qui permet de tenter la
 * traversée plutôt que de relire la forme d'un `where`.
 */

type Ligne = Record<string, unknown>;

function table(lignes: Ligne[]) {
  const trouver = async ({ where }: { where: Ligne }) =>
    lignes.find((l) => correspond(l, where)) ?? null;
  return {
    lignes,
    findUnique: vi.fn(trouver),
    findFirst: vi.fn(trouver),
    findMany: vi.fn(async ({ where }: { where: Ligne }) =>
      lignes.filter((l) => correspond(l, where)),
    ),
    count: vi.fn(async ({ where }: { where: Ligne }) =>
      lignes.filter((l) => correspond(l, where)).length,
    ),
    create: vi.fn(async ({ data }: { data: Ligne }) => {
      lignes.push(data);
      return data;
    }),
    createMany: vi.fn(async ({ data }: { data: Ligne[] }) => {
      // `skipDuplicates` sur la clé `empreinteAdresse` du quota d'envois.
      const neuves = data.filter((d) => !lignes.some((l) => l.empreinteAdresse === d.empreinteAdresse));
      lignes.push(...neuves);
      return { count: neuves.length };
    }),
    update: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const l = lignes.find((x) => correspond(x, where));
      if (!l) throw new Error("P2025");
      Object.assign(l, data);
      return l;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const touchees = lignes.filter((x) => correspond(x, where));
      for (const l of touchees) {
        for (const [k, v] of Object.entries(data)) {
          const op = v as { decrement?: number; increment?: number } | null;
          l[k] =
            op && typeof op === "object" && "decrement" in op
              ? (l[k] as number) - (op.decrement as number)
              : op && typeof op === "object" && "increment" in op
                ? (l[k] as number) + (op.increment as number)
                : v;
        }
      }
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
  prismaMock: {} as Record<string, ReturnType<typeof table>> & {
    $transaction?: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
    $queryRaw?: (q: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
  },
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
  // La même garde, qui rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: vi.fn(async (etablissementId: string) => {
    if (etablissementId !== "etab-a-moi") {
      const e = new Error("NEXT_NOT_FOUND");
      (e as { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
      throw e;
    }
    return { user: { id: "user-1" }, db: (await import("@/lib/prisma")).prisma };
  }),
}));
vi.mock("@/lib/batiments/queries", () => ({ resoudreBatimentOptionnel: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: "moi@exemple.fr" })),
  getOptionalUser: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
/** Les verrous de ligne pris (`SELECT … FOR UPDATE`), dans l'ordre. */
const verrous: string[] = [];

const { mailsEnvoyes } = vi.hoisted(() => ({
  mailsEnvoyes: [] as { to: string; subject: string; text: string }[],
}));
const { envoi } = vi.hoisted(() => ({ envoi: { enService: true, echoue: false } }));
vi.mock("@/lib/email", () => ({
  sendMail: vi.fn(async (p: { to: string; subject: string; text: string }) => {
    // Le fournisseur refuse ou ne répond pas (Mailpace, 2026-10-30).
    if (envoi.echoue) throw new Error("Mailpace a refusé l'envoi (HTTP 500).");
    mailsEnvoyes.push(p);
  }),
  envoiEnService: () => envoi.enService,
  mailFrom: () => "no-reply@test.local",
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur inconnue"),
  publicAppUrl: () => "http://localhost:3000",
}));

import { cloturerPlan, supprimerPlan } from "@/lib/plan-prevention/actions";
import { marquerEnCours, marquerTermine, supprimerPermisFeu } from "@/lib/permis-feu/actions";
import {
  demanderSignature,
  poserSignatureAvecToken,
  renvoyerCodeOtp,
  signerEnCompteConnecte,
} from "./actions";
import { hashToken } from "@/lib/access-tokens/token";
import { MESSAGE_ENVOI_ECHOUE } from "@/lib/access-tokens/emission";
import { MOTIF_REVOCATION_ENVOI_ECHOUE } from "@/lib/access-tokens/revocation";
import { hashOtp } from "./otp";

async function sansRedirection(p: Promise<unknown>): Promise<void> {
  await p.catch((e: { digest?: string }) => {
    if (e?.digest !== "NEXT_REDIRECT") throw e;
  });
}

function plan(id: string, etablissementId: string, statut: string): Ligne {
  // La relation jusqu'au compte : les actions du permis de feu lisent dans le
  // périmètre du compte (`etablissement: { entreprise: { userId } }`, audit du
  // 2026-10-13), et `correspond` la traverse.
  const userId = etablissementId === "etab-a-moi" ? "user-1" : "user-voisin";
  return { id, etablissementId, statut, numero: 1, etablissement: { entreprise: { userId } } };
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
  prismaMock.quotaEnvoiOtp = table([]);
  prismaMock.$transaction = async (fn) => fn(prismaMock);
  verrous.length = 0;
  prismaMock.$queryRaw = async (q, ...v) => {
    verrous.push(`${q.join("?")} ${v.join(",")}`);
    return [];
  };
  mailsEnvoyes.length = 0;
  envoi.echoue = false;
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
    partie: "entreprise_exterieure",
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
      partie: "entreprise_exterieure",
    });

    expect(r).toEqual({
      ok: false,
      message: "Ce document n'est plus à signer : il a été clos ou annulé.",
    });
    expect(prismaMock.accessToken.create).not.toHaveBeenCalled();
    expect(mailsEnvoyes).toHaveLength(0);
  });
});

describe("renvoi du code, envoi hors service (C38, 2026-09-26)", () => {
  afterEach(() => {
    envoi.enService = true;
  });

  it("refuse avant de renouveler : le code précédent reste celui qui signe", async () => {
    envoi.enService = false;
    const lien = lienValide("plan_prevention", "pp-1");
    prismaMock.accessToken.lignes.push(lien);
    const avant = { otpHash: lien.otpHash, otpExpireLe: lien.otpExpireLe };

    const r = await renvoyerCodeOtp(JETON_CLAIR);

    expect(r).toEqual({
      status: "error",
      message:
        "Aucun nouveau code n'a été envoyé : l'envoi d'e-mails n'est pas encore en service dans Rojer. Le code précédent n'a pas été modifié.",
    });
    expect({ otpHash: lien.otpHash, otpExpireLe: lien.otpExpireLe }).toEqual(avant);
    expect(prismaMock.accessToken.update).not.toHaveBeenCalled();
    expect(mailsEnvoyes).toHaveLength(0);
  });

  it("refuse avant le délai de renvoi : pas de « Un code vient d'être envoyé » quand rien ne peut partir", async () => {
    envoi.enService = false;
    const lien = lienValide("plan_prevention", "pp-1");
    // Un code tout juste émis : le délai de renvoi n'est pas écoulé.
    lien.otpExpireLe = new Date(Date.now() + 10 * 60_000);
    prismaMock.accessToken.lignes.push(lien);

    const r = await renvoyerCodeOtp(JETON_CLAIR);

    expect(r.status).toBe("error");
    expect((r as { message: string }).message).toMatch(/^Aucun nouveau code n'a été envoyé/);
  });

  it("l'envoi en service, le code se renouvelle et part", async () => {
    // Un code émis il y a plus longtemps que le délai minimal de renvoi.
    const lien = lienValide("plan_prevention", "pp-1");
    lien.otpExpireLe = new Date(Date.now() + 60_000);
    prismaMock.accessToken.lignes.push(lien);
    const avant = lien.otpHash;

    const r = await renvoyerCodeOtp(JETON_CLAIR);

    expect(r.status).toBe("success");
    expect(lien.otpHash).not.toBe(avant);
    expect(mailsEnvoyes).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Défaut 3 (audit du 2026-10-12, constat 7) — la partie d'une signature était
// devinée par l'adresse. Elle est désormais enregistrée : choisie par le
// demandeur sur le jeton, recopiée sur la signature, forcée à l'entreprise
// utilisatrice pour le compte connecté.
// ─────────────────────────────────────────────────────────────────────────

/** L'unicité `(objetType, objetId, partie)` de la base, que le faux client
 *  n'a pas d'office : un doublon non nul lève la P2002 de Prisma. */
function unicitePartie() {
  const creer = prismaMock.signature.create.getMockImplementation()!;
  prismaMock.signature.create.mockImplementation(async (args: { data: Ligne }) => {
    const { objetType, objetId, partie } = args.data;
    if (
      partie != null &&
      prismaMock.signature.lignes.some(
        (s) => s.objetType === objetType && s.objetId === objetId && s.partie === partie,
      )
    ) {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      });
    }
    return creer(args);
  });
}

const DEMANDE_PLAN = {
  etablissementId: "etab-a-moi",
  objetType: "plan_prevention" as const,
  objetId: "pp-1",
  signataireEmail: "chef@exterieure.fr",
  signataireNom: "Jean Dupond",
};

describe("garantie 3 — la partie qui signe est enregistrée, jamais devinée", () => {
  it("une demande de signature d'un plan sans partie est refusée, aucun lien ne part", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));

    const r = await demanderSignature(DEMANDE_PLAN);

    expect(r).toEqual({ ok: false, message: "Partie signataire invalide pour ce document." });
    expect(prismaMock.accessToken.create).not.toHaveBeenCalled();
  });

  it("le lien émis porte la partie choisie par le demandeur", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));

    const r = await demanderSignature({ ...DEMANDE_PLAN, partie: "entreprise_exterieure" });

    expect(r).toEqual({ ok: true });
    expect(prismaMock.accessToken.lignes[0].partie).toBe("entreprise_exterieure");
  });

  it("aucun lien ne part vers une partie qui a déjà signé", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.signature.lignes.push({
      ...signature("plan_prevention", "pp-1", "etab-a-moi"),
      partie: "entreprise_exterieure",
    });

    const r = await demanderSignature({ ...DEMANDE_PLAN, partie: "entreprise_exterieure" });

    expect(r).toEqual({ ok: false, message: "Cette partie a déjà signé ce document." });
    expect(prismaMock.accessToken.create).not.toHaveBeenCalled();
  });

  it("la signature reprend la partie du JETON, quelle que soit l'adresse du signataire", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    // Le lien de l'entreprise utilisatrice part à une adresse quelconque : la
    // fiche attribuait la signature selon que cette adresse était ou non
    // celle du chef de l'entreprise extérieure.
    prismaMock.accessToken.lignes.push({
      ...lienValide("plan_prevention", "pp-1"),
      partie: "entreprise_utilisatrice",
    });

    expect((await signer()).status).toBe("success");
    expect(prismaMock.signature.lignes[0].partie).toBe("entreprise_utilisatrice");
  });

  it("un lien sans partie sur un plan ne signe pas, et ne consomme aucun essai", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.accessToken.lignes.push({ ...lienValide("plan_prevention", "pp-1"), partie: null });

    const r = await signer();

    expect(r.status).toBe("error");
    expect(prismaMock.signature.create).not.toHaveBeenCalled();
    expect(prismaMock.accessToken.lignes[0].otpEssaisRestants).toBe(3);
  });

  it("la même partie ne signe pas deux fois : le second lien est refusé", async () => {
    unicitePartie();
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.signature.lignes.push({
      ...signature("plan_prevention", "pp-1", "etab-a-moi"),
      partie: "entreprise_exterieure",
    });
    prismaMock.accessToken.lignes.push(lienValide("plan_prevention", "pp-1"));

    const r = await signer();

    expect(r).toEqual({ status: "error", message: "Cette partie a déjà signé ce document." });
    expect(prismaMock.signature.lignes).toHaveLength(1);
  });

  it("le compte connecté signe toujours au nom de l'entreprise utilisatrice", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));

    const r = await signerEnCompteConnecte({
      etablissementId: "etab-a-moi",
      objetType: "plan_prevention",
      objetId: "pp-1",
    });

    expect(r.ok).toBe(true);
    expect(prismaMock.signature.lignes[0].partie).toBe("entreprise_utilisatrice");
  });

  it("le compte connecté ne signe pas deux fois", async () => {
    unicitePartie();
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    const signerMoi = () =>
      signerEnCompteConnecte({
        etablissementId: "etab-a-moi",
        objetType: "plan_prevention",
        objetId: "pp-1",
      });

    expect((await signerMoi()).ok).toBe(true);
    expect(await signerMoi()).toEqual({ ok: false, raison: "deja_signee" });
    expect(prismaMock.signature.lignes).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Défaut 4 (audit du 2026-10-12, constats 3 et 5) — rien n'écrivait `valide` :
// un plan ou un permis signé des deux parties restait « En attente de
// signatures ».
// ─────────────────────────────────────────────────────────────────────────

const signerCommeDirigeant = (objetType: "plan_prevention" | "permis_feu", objetId: string) =>
  signerEnCompteConnecte({ etablissementId: "etab-a-moi", objetType, objetId });

describe("garantie 4 — le statut suit les signatures", () => {
  it("plan : la seconde partie signe, le plan passe « valide »", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.accessToken.lignes.push(lienValide("plan_prevention", "pp-1"));

    await signerCommeDirigeant("plan_prevention", "pp-1");
    expect(prismaMock.planPrevention.lignes[0].statut).toBe("attente_signatures");

    expect((await signer()).status).toBe("success");
    expect(prismaMock.planPrevention.lignes[0].statut).toBe("valide");
  });

  it("permis : signé des deux parties, il passe « valide »", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "attente_signatures"));
    prismaMock.accessToken.lignes.push(lienValide("permis_feu", "pf-1"));

    expect((await signer()).status).toBe("success");
    await signerCommeDirigeant("permis_feu", "pf-1");

    expect(prismaMock.permisFeu.lignes[0].statut).toBe("valide");
  });

  it("deux signatures sans partie (d'avant le 2026-10-12) ne valident rien", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "attente_signatures"));
    prismaMock.signature.lignes.push(
      { ...signature("permis_feu", "pf-1", "etab-a-moi"), id: "s1", partie: null },
      { ...signature("permis_feu", "pf-1", "etab-a-moi"), id: "s2", partie: null },
    );
    prismaMock.accessToken.lignes.push(lienValide("permis_feu", "pf-1"));

    await signer();

    expect(prismaMock.permisFeu.lignes[0].statut).toBe("attente_signatures");
  });

  it("démarrer et terminer ne partent que de leur statut (constat 6)", async () => {
    for (const statut of ["attente_signatures", "brouillon", "annule", "termine"]) {
      prismaMock.permisFeu = table([plan("pf-1", "etab-a-moi", statut)]);
      await marquerEnCours("pf-1");
      expect(prismaMock.permisFeu.lignes[0].statut, statut).toBe(statut);
    }
    for (const statut of ["valide", "attente_signatures", "annule"]) {
      prismaMock.permisFeu = table([plan("pf-1", "etab-a-moi", statut)]);
      prismaMock.accessToken = table([jeton("permis_feu", "pf-1", "etab-a-moi")]);
      await marquerTermine("pf-1");
      expect(prismaMock.permisFeu.lignes[0].statut, statut).toBe(statut);
      // Rien n'est terminé : aucun lien n'est révoqué.
      expect(prismaMock.accessToken.lignes[0].revoqueLe, statut).toBeNull();
    }
    prismaMock.permisFeu = table([plan("pf-1", "etab-a-moi", "valide")]);
    await marquerEnCours("pf-1");
    expect(prismaMock.permisFeu.lignes[0].statut).toBe("en_cours");
    await marquerTermine("pf-1");
    expect(prismaMock.permisFeu.lignes[0].statut).toBe("termine");
  });

  it("un permis déjà démarré ne revient pas à « valide »", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "en_cours"));
    prismaMock.accessToken.lignes.push(lienValide("permis_feu", "pf-1"));

    await signerCommeDirigeant("permis_feu", "pf-1");
    await signer();

    expect(prismaMock.permisFeu.lignes[0].statut).toBe("en_cours");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Relecture indépendante du 2026-10-12 — compter puis écrire sous un verrou.
// `modifier*` verrouille la ligne de l'objet avant de compter les signatures ;
// la pose d'une signature prend le même verrou AVANT de consommer le jeton.

describe("garantie 5 — la signature prend le verrou de l'objet que prend la modification", () => {
  it("par lien : le verrou du plan est pris avant que le jeton se consomme", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    prismaMock.accessToken.lignes.push(lienValide("plan_prevention", "pp-1"));
    const verrouAvantConsommation: boolean[] = [];
    const ecrire = prismaMock.accessToken.updateMany.getMockImplementation()!;
    prismaMock.accessToken.updateMany.mockImplementation(async (a: { where: Ligne; data: Ligne }) => {
      if (a.data.utiliseLe) verrouAvantConsommation.push(verrous.length > 0);
      return ecrire(a);
    });

    expect((await signer()).status).toBe("success");

    expect(verrouAvantConsommation).toEqual([true]);
    expect(verrous[0]).toBe('SELECT 1 FROM "PlanPrevention" WHERE "id" = ? FOR UPDATE pp-1');
  });

  it("en compte connecté : le verrou du permis est pris avant la signature", async () => {
    prismaMock.permisFeu.lignes.push(plan("pf-1", "etab-a-moi", "attente_signatures"));

    expect((await signerCommeDirigeant("permis_feu", "pf-1")).ok).toBe(true);

    expect(verrous).toEqual(['SELECT 1 FROM "PermisFeu" WHERE "id" = ? FOR UPDATE pf-1']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Envoi échoué (pilote Mailpace, 2026-10-30) : le fournisseur refuse ou ne
// répond pas APRÈS que le jeton ou le nouveau code a été écrit. Avant ce lot,
// l'erreur remontait telle quelle : un jeton valable restait en base sans
// que son e-mail soit parti, et l'écran affichait l'erreur générique.
// ─────────────────────────────────────────────────────────────────────────

describe("envoi échoué : rien de valable ne reste, et l'écran le dit", () => {
  it("demande de signature : le lien créé est révoqué, motif écrit, message vrai", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    envoi.echoue = true;

    const r = await demanderSignature({ ...DEMANDE_PLAN, partie: "entreprise_exterieure" });

    expect(r).toEqual({ ok: false, message: MESSAGE_ENVOI_ECHOUE });
    expect(prismaMock.accessToken.lignes).toHaveLength(1);
    expect(prismaMock.accessToken.lignes[0].revoqueLe).toBeInstanceOf(Date);
    expect(prismaMock.accessToken.lignes[0].revoqueMotif).toBe(MOTIF_REVOCATION_ENVOI_ECHOUE);
    expect(mailsEnvoyes).toHaveLength(0);
  });

  it("renvoi du code : la place au plafond est rendue, et rien n'annonce un envoi", async () => {
    const lien = lienValide("plan_prevention", "pp-1");
    lien.otpExpireLe = new Date(Date.now() + 60_000);
    prismaMock.accessToken.lignes.push(lien);
    envoi.echoue = true;

    const r = await renvoyerCodeOtp(JETON_CLAIR);

    expect(r.status).toBe("error");
    expect((r as { message: string }).message).toMatch(/n'a pas pu être envoyé/);
    expect(prismaMock.quotaEnvoiOtp.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { envois: { decrement: 1 } } }),
    );
    expect(mailsEnvoyes).toHaveLength(0);
  });

  it("un lien jamais parti ne compte pas dans le plafond de l'heure", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    // Dix liens révoqués pour envoi échoué dans l'heure : le plafond (10) serait
    // atteint s'ils comptaient.
    for (let i = 0; i < 10; i++) {
      prismaMock.accessToken.lignes.push(
        jeton("plan_prevention", `pp-x${i}`, "etab-a-moi", {
          createdByUserId: "user-1",
          revoqueLe: new Date(),
          revoqueMotif: MOTIF_REVOCATION_ENVOI_ECHOUE,
        }),
      );
    }

    const r = await demanderSignature({ ...DEMANDE_PLAN, partie: "entreprise_exterieure" });

    expect(r).toEqual({ ok: true });
    expect(mailsEnvoyes).toHaveLength(1);
  });

  it("contrôle : dix liens partis dans l'heure atteignent bien le plafond", async () => {
    prismaMock.planPrevention.lignes.push(planComplet("pp-1", "etab-a-moi", "attente_signatures"));
    for (let i = 0; i < 10; i++) {
      prismaMock.accessToken.lignes.push(
        jeton("plan_prevention", `pp-x${i}`, "etab-a-moi", { createdByUserId: "user-1" }),
      );
    }

    const r = await demanderSignature({ ...DEMANDE_PLAN, partie: "entreprise_exterieure" });

    expect(r).toEqual({ ok: false, message: expect.stringMatching(/Trop de liens/) });
  });
});
