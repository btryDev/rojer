import { beforeEach, describe, expect, it, vi } from "vitest";
import { correspond, type Ligne } from "@/test/prisma-where";

/**
 * Un lien qui en remplace un autre (2026-11-19, « Renvoyer le lien » et
 * nouveau lien au refus d'une proposition) : il ne prend pas de place de
 * lien actif — l'ancien est révoqué après l'envoi —, et un nouveau lien à la
 * MÊME adresse pour la même partie ne reprend pas de signature de la formule.
 *
 * Le plafond est simulé à sa règle (`placesRestantesDuPlafond`) : cinq liens
 * actifs au plus, la formule Essentiel ; `nombre` est ce que l'émission
 * demande.
 */

function table(lignes: Ligne[]) {
  return {
    lignes,
    findFirst: vi.fn(async ({ where }: { where: Ligne }) => lignes.find((l) => correspond(l, where)) ?? null),
    findMany: vi.fn(async ({ where }: { where: Ligne }) => lignes.filter((l) => correspond(l, where))),
    count: vi.fn(async ({ where }: { where: Ligne }) => lignes.filter((l) => correspond(l, where)).length),
    create: vi.fn(async ({ data }: { data: Ligne }) => {
      const l = { createdAt: new Date(), utiliseLe: null, revoqueLe: null, revoqueMotif: null, ...data };
      lignes.push(l);
      return l;
    }),
    update: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const l = lignes.find((x) => correspond(x, where));
      if (!l) throw new Error("P2025");
      return Object.assign(l, data);
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const t = lignes.filter((x) => correspond(x, where));
      for (const l of t) Object.assign(l, data);
      return { count: t.length };
    }),
  };
}

const { db, quotas } = vi.hoisted(() => ({
  db: {} as Record<string, ReturnType<typeof table>>,
  quotas: { signatures: 0 },
}));

vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementDuCompte: vi.fn(async () => ({
    user: { id: "user-1", email: "moi@exemple.fr" },
    compte: { compteId: "compte-1" },
    db,
  })),
}));
vi.mock("@/lib/signatures/appartenance", () => ({ objetAppartientAEtablissement: async () => true }));
vi.mock("@/lib/email", () => ({ envoiEnService: () => true, motifErreur: (e: unknown) => String(e) }));
vi.mock("./mail", () => ({
  envoyerMailAcces: vi.fn(async () => {}),
  urlAccesPourToken: (t: string) => `http://localhost/acces/${t}`,
}));
vi.mock("@/lib/abonnements/quotas", async () => {
  const { lienActif } = await import("./revocation");
  class RefusQuota extends Error {
    constructor(public motif: string) {
      super(motif);
    }
  }
  return {
    RefusQuota,
    rendreQuota: vi.fn(async () => {}),
    prendreQuota: vi.fn(async () => {
      quotas.signatures += 1;
      return ["q"];
    }),
    // La règle de `prendreQuota` pour un plafond de stock : refus si les
    // places restantes sont moins que le nombre demandé.
    creerSousPlafond: vi.fn(
      async (base: typeof db, _c: string, _cle: string, creer: (tx: unknown) => Promise<unknown>, nombre = 1) => {
        const actifs = base.accessToken.lignes.filter((l) => correspond(l, lienActif())).length;
        if (5 - actifs < nombre) return { ok: false, motif: "Plafond de 5 liens actifs atteint." };
        return { ok: true, valeur: await creer(base) };
      },
    ),
  };
});

import { emettreAccessToken } from "./emission";
import { MOTIF_REVOCATION_NOUVEAU_LIEN } from "./revocation";

const DEMAIN = new Date(Date.now() + 86_400_000);

function lien(n: number, extra: Ligne = {}): Ligne {
  return {
    id: `atk_${n}`,
    etablissementId: "etab-1",
    scope: "signature",
    objetType: "plan_prevention",
    objetId: `pp-${n}`,
    partie: "entreprise_exterieure",
    emailDestinataire: `ee${n}@exemple.fr`,
    expireLe: DEMAIN,
    createdAt: new Date(Date.now() - 60_000),
    utiliseLe: null,
    revoqueLe: null,
    revoqueMotif: null,
    ...extra,
  };
}

const emission = (objetId: string, email: string, partie: "entreprise_exterieure" | "entreprise_utilisatrice" = "entreprise_exterieure") =>
  emettreAccessToken({
    etablissementId: "etab-1",
    scope: "signature",
    objetType: "plan_prevention",
    objetId,
    emailDestinataire: email,
    nomDestinataire: "Paul",
    partie,
    sujetMail: "Plan à signer",
    messageMail: "Bonjour.",
  });

beforeEach(() => {
  db.accessToken = table([1, 2, 3, 4, 5].map((n) => lien(n)));
  db.signature = table([]);
  db.propositionModificationPlan = table([]);
  quotas.signatures = 0;
});

describe("un lien qui en remplace un autre", () => {
  it("cinq liens actifs : le renvoi à une partie qui a déjà le sien passe, et l'ancien est révoqué", async () => {
    const r = await emission("pp-3", "ee3@exemple.fr");
    expect(r.ok).toBe(true);
    const ancien = db.accessToken.lignes.find((l) => l.id === "atk_3")!;
    expect(ancien.revoqueMotif).toBe(MOTIF_REVOCATION_NOUVEAU_LIEN);
    expect(db.accessToken.lignes).toHaveLength(6);
  });

  it("contrôle : un sixième lien à une partie nouvelle est refusé au plafond", async () => {
    const r = await emission("pp-9", "autre@exemple.fr");
    expect(r).toMatchObject({ ok: false, raison: "plafond" });
    expect(db.accessToken.lignes).toHaveLength(5);
  });

  it("une autre partie du même plan n'est pas un remplacement", async () => {
    const r = await emission("pp-3", "moi@exemple.fr", "entreprise_utilisatrice");
    expect(r).toMatchObject({ ok: false, raison: "plafond" });
  });

  it("le renvoi à la même adresse ne reprend pas de signature de la formule", async () => {
    await emission("pp-3", "ee3@exemple.fr");
    expect(quotas.signatures).toBe(0);
  });

  it("un lien expiré, jamais consommé, à la même adresse : le nouveau ne reprend pas de signature", async () => {
    db.accessToken.lignes[2].expireLe = new Date(Date.now() - 1000);
    await emission("pp-3", "ee3@exemple.fr");
    expect(quotas.signatures).toBe(0);
  });

  it("une autre adresse pour la même partie reprend une signature", async () => {
    await emission("pp-3", "nouvelle@exemple.fr");
    expect(quotas.signatures).toBe(1);
  });

  it("un lien consommé (sa partie a signé) ne rend pas le suivant gratuit", async () => {
    db.accessToken.lignes[2].utiliseLe = new Date();
    await emission("pp-3", "ee3@exemple.fr");
    expect(quotas.signatures).toBe(1);
  });

  it("un lien dont l'e-mail n'est jamais parti ne rend pas le suivant gratuit", async () => {
    Object.assign(db.accessToken.lignes[2], {
      revoqueLe: new Date(),
      revoqueMotif: "l'e-mail n'a pas pu être envoyé ; demandez un nouveau lien à votre interlocuteur",
    });
    await emission("pp-3", "ee3@exemple.fr");
    expect(quotas.signatures).toBe(1);
  });
});
