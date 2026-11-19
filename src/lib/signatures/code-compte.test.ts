import { beforeEach, describe, expect, it, vi } from "vitest";
import { correspond, type Ligne } from "@/test/prisma-where";

/**
 * La signature depuis le compte, confirmée par un code (2026-11-19) : le
 * code part à l'adresse du compte, la signature ne se pose qu'avec le bon
 * code et la case cochée, et la preuve garde la méthode et le consentement.
 */

function table(lignes: Ligne[]) {
  const appliquer = (l: Ligne, data: Ligne) => {
    for (const [k, v] of Object.entries(data)) {
      const op = v as { decrement?: number } | null;
      l[k] = op && typeof op === "object" && "decrement" in op ? (l[k] as number) - (op.decrement as number) : v;
    }
  };
  return {
    lignes,
    findFirst: vi.fn(async ({ where }: { where: Ligne }) => lignes.find((l) => correspond(l, where)) ?? null),
    count: vi.fn(async ({ where }: { where: Ligne }) => lignes.filter((l) => correspond(l, where)).length),
    create: vi.fn(async ({ data }: { data: Ligne }) => {
      lignes.push({ ...data });
      return data;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const t = lignes.filter((x) => correspond(x, where));
      for (const l of t) appliquer(l, data);
      return { count: t.length };
    }),
    deleteMany: vi.fn(async ({ where }: { where: Ligne }) => {
      const avant = lignes.length;
      for (let i = lignes.length - 1; i >= 0; i--) if (correspond(lignes[i], where)) lignes.splice(i, 1);
      return { count: avant - lignes.length };
    }),
  };
}

const { db, etat } = vi.hoisted(() => ({
  db: {} as Record<string, unknown> & { $transaction?: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown> },
  etat: { codes: [] as string[], signable: true, envois: 0 },
}));

vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementDuCompte: vi.fn(async () => ({
    user: { id: "user-1", email: "Paloma@Exemple.fr", name: "Paloma Sanchez" },
    compte: { compteId: "compte-1" },
    db,
  })),
}));
vi.mock("@/lib/abonnements/validation", () => ({ exigerSignatureDEssai: async () => {} }));
vi.mock("@/lib/abonnements/quotas", () => ({
  prendreQuota: vi.fn(async () => []),
  RefusQuota: class extends Error {},
}));
vi.mock("@/lib/plan-prevention/resignature", () => ({ signatureDejaComptee: async () => false }));
vi.mock("@/lib/access-tokens/mail", () => ({
  envoyerMailCodeCompte: vi.fn(async ({ otp }: { otp: string }) => {
    etat.codes.push(otp);
  }),
}));
vi.mock("@/lib/access-tokens/verify", () => ({
  reserverEnvoiOtp: vi.fn(async () => {
    etat.envois += 1;
    return etat.envois <= 5 ? { ok: true } : { ok: false, possibleLe: new Date() };
  }),
  rendreEnvoiOtp: vi.fn(async () => {}),
}));
vi.mock("@/lib/email", () => ({ envoiEnService: () => true, motifErreur: (e: unknown) => String(e) }));
vi.mock("next/headers", () => ({ headers: async () => new Map([["user-agent", "test"]]) }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("@/lib/securite/ip-client", () => ({ ipClient: () => "203.0.113.1" }));
vi.mock("./hash-objet", () => ({
  calculerHashObjet: async () => ({ ok: true, hash: "a".repeat(64), nomDocument: "Plan de prévention PP-001" }),
}));
vi.mock("./verrou-contenu", () => ({ verrouillerObjetSigne: async () => {} }));
vi.mock("./etat-signable", () => ({ objetEstSignable: async () => etat.signable }));
vi.mock("./statut-objet", () => ({ validerSiCoSigne: async () => false }));
vi.mock("./avis-co-signature", () => ({ envoyerAvisCoSignature: async () => {} }));
vi.mock("./libelle-document", () => ({ libelleDocumentSignable: async () => "Plan de prévention PP-001" }));

import { envoyerCodeSignatureCompte, poserSignatureCompteAvecCode } from "./code-compte";
import { texteConsentement } from "./consentement";

const OBJET = { etablissementId: "etab-1", objetType: "plan_prevention" as const, objetId: "pp-1" };
const CONSENTEMENT = { texte: texteConsentement("Test Paiement SARL") };
const codes = () => (db.codeSignatureCompte as ReturnType<typeof table>).lignes;
const signatures = () => (db.signature as ReturnType<typeof table>).lignes;

beforeEach(() => {
  db.codeSignatureCompte = table([]);
  db.signature = table([]);
  db.propositionModificationPlan = table([]);
  db.$transaction = async (fn) => fn(db);
  etat.codes = [];
  etat.signable = true;
  etat.envois = 0;
});

async function codeEnvoye(): Promise<string> {
  const r = await envoyerCodeSignatureCompte(OBJET);
  expect(r.ok).toBe(true);
  return etat.codes.at(-1)!;
}

describe("le code de signature du compte", () => {
  it("part à l'adresse du compte ; seule son empreinte est gardée", async () => {
    const r = await envoyerCodeSignatureCompte(OBJET);
    expect(r).toMatchObject({ ok: true, email: "paloma@exemple.fr" });
    expect(codes()).toHaveLength(1);
    expect(codes()[0].otpHash).not.toBe(etat.codes[0]);
    expect(codes()[0].essaisRestants).toBe(3);
  });

  it("pas deux codes dans la minute", async () => {
    await codeEnvoye();
    const r = await envoyerCodeSignatureCompte(OBJET);
    expect(r.ok).toBe(false);
    expect(etat.codes).toHaveLength(1);
  });

  it("aucun code pour un plan qui ne se signe pas", async () => {
    etat.signable = false;
    const r = await envoyerCodeSignatureCompte(OBJET);
    expect(r.ok).toBe(false);
    expect(etat.codes).toHaveLength(0);
  });
});

describe("la signature avec le code", () => {
  it("sans la case cochée : refusée, aucun essai consommé", async () => {
    const code = await codeEnvoye();
    const r = await poserSignatureCompteAvecCode({ ...OBJET, code, consentement: null });
    expect(r.ok).toBe(false);
    expect(codes()[0].essaisRestants).toBe(3);
    expect(signatures()).toHaveLength(0);
  });

  it("un code faux consomme un essai ; au troisième, le code est effacé", async () => {
    const code = await codeEnvoye();
    const faux = code === "000000" ? "111111" : "000000";
    expect(await poserSignatureCompteAvecCode({ ...OBJET, code: faux, consentement: CONSENTEMENT })).toMatchObject({
      ok: false,
      message: "Code incorrect. Il vous reste 2 essais.",
    });
    await poserSignatureCompteAvecCode({ ...OBJET, code: faux, consentement: CONSENTEMENT });
    const r = await poserSignatureCompteAvecCode({ ...OBJET, code: faux, consentement: CONSENTEMENT });
    expect(r).toMatchObject({ ok: false, codeAReDemander: true });
    expect(codes()).toHaveLength(0);
    // Le bon code ne sert plus : il faut en demander un nouveau.
    expect((await poserSignatureCompteAvecCode({ ...OBJET, code, consentement: CONSENTEMENT })).ok).toBe(false);
    expect(signatures()).toHaveLength(0);
  });

  it("le bon code : la signature porte la méthode, le nom du compte et le consentement ; le code est consommé", async () => {
    const code = await codeEnvoye();
    const r = await poserSignatureCompteAvecCode({ ...OBJET, code, consentement: CONSENTEMENT });
    expect(r.ok).toBe(true);
    expect(signatures()).toHaveLength(1);
    expect(signatures()[0]).toMatchObject({
      methode: "compte_code_email",
      partie: "entreprise_utilisatrice",
      signataireNom: "Paloma Sanchez",
      userId: "user-1",
      consentementTexte: CONSENTEMENT.texte,
    });
    expect(signatures()[0].consentementLe).toBeInstanceOf(Date);
    expect(codes()).toHaveLength(0);
    // Rejoué : le code a servi.
    expect((await poserSignatureCompteAvecCode({ ...OBJET, code, consentement: CONSENTEMENT })).ok).toBe(false);
  });

  it("un code expiré ne consomme aucun essai", async () => {
    const code = await codeEnvoye();
    codes()[0].otpExpireLe = new Date(Date.now() - 1000);
    const r = await poserSignatureCompteAvecCode({ ...OBJET, code, consentement: CONSENTEMENT });
    expect(r).toMatchObject({ ok: false, codeAReDemander: true });
    expect(codes()[0].essaisRestants).toBe(3);
  });

  it("la signature termine une correction en cours de ce plan", async () => {
    (db.propositionModificationPlan as ReturnType<typeof table>).lignes.push({
      id: "prop-1",
      etablissementId: "etab-1",
      planPreventionId: "pp-1",
      corrigeeLe: new Date(),
      finaliseeLe: null,
    });
    const code = await codeEnvoye();
    await poserSignatureCompteAvecCode({ ...OBJET, code, consentement: CONSENTEMENT });
    expect((db.propositionModificationPlan as ReturnType<typeof table>).lignes[0].finaliseeLe).toBeInstanceOf(Date);
  });
});

describe("la phrase de consentement", () => {
  it("nomme l'entreprise au nom de laquelle on signe, sur une ligne", () => {
    expect(texteConsentement("  Test\nPaiement  SARL ")).toBe(
      "Je confirme avoir pris connaissance du plan de prévention et de son contenu, et j'accepte d'y apposer ma signature électronique au nom de Test Paiement SARL.",
    );
  });
});
