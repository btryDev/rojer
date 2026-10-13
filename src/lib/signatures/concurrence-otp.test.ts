import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le code de confirmation sous concurrence (audit du 2026-10-12, constat 9).
 *
 * Deux défauts, tous deux invisibles à une soumission isolée :
 *  - la limite de trois essais se contournait EN RAFALE : chaque requête lisait
 *    « 3 essais » au début, comparait son code, puis décrémentait — dix codes
 *    éprouvés pour trois promis ;
 *  - deux soumissions SIMULTANÉES du bon code posaient deux signatures : le
 *    jeton n'était marqué « utilisé » qu'après, sans condition.
 *
 * Le faux client ci-dessous applique les clauses qu'il reçoit (égalité, `null`,
 * `gt`, `lte`) et refuse celles qu'il ne connaît pas. Chaque méthode CÈDE la
 * main avant d'agir, comme un aller-retour réseau : `Promise.all` entrelace
 * donc réellement les requêtes, et seule une écriture dont la CONDITION porte
 * la garde tient — ce que ferait la base.
 */

type Ligne = Record<string, unknown>;

function correspond(ligne: Ligne, where: Ligne): boolean {
  return Object.entries(where).every(([clef, attendu]) => {
    const valeur = ligne[clef];
    if (attendu === null) return valeur === null || valeur === undefined;
    if (attendu instanceof Date) return valeur instanceof Date && valeur.getTime() === attendu.getTime();
    if (typeof attendu === "object") {
      const ops = attendu as Ligne;
      return Object.entries(ops).every(([op, borne]) => {
        if (op === "gt") return (valeur as number) > (borne as number);
        if (op === "lte") return (valeur as number) <= (borne as number);
        if (op === "in") return (borne as unknown[]).includes(valeur);
        throw new Error(`clause inconnue du faux client : ${clef}.${op}`);
      });
    }
    return valeur === attendu;
  });
}

function appliquer(ligne: Ligne, data: Ligne) {
  for (const [clef, v] of Object.entries(data)) {
    if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
      const op = v as Ligne;
      if ("decrement" in op) ligne[clef] = (ligne[clef] as number) - (op.decrement as number);
      else throw new Error(`écriture inconnue du faux client : ${clef}`);
    } else ligne[clef] = v;
  }
}

const cede = () => new Promise((r) => setTimeout(r, 0));

function table(lignes: Ligne[]) {
  const trouver = async ({ where }: { where: Ligne }) => {
    await cede();
    const l = lignes.find((x) => correspond(x, where));
    return l ? { ...l } : null;
  };
  return {
    lignes,
    findUnique: vi.fn(trouver),
    findFirst: vi.fn(trouver),
    findMany: vi.fn(async ({ where }: { where: Ligne }) => {
      await cede();
      return lignes.filter((x) => correspond(x, where)).map((x) => ({ ...x }));
    }),
    create: vi.fn(async ({ data }: { data: Ligne }) => {
      await cede();
      lignes.push({ ...data });
      return { ...data };
    }),
    // L'écriture conditionnelle est ATOMIQUE : lecture de la condition et
    // écriture dans le même tour de boucle, sans céder entre les deux.
    updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      await cede();
      const touchees = lignes.filter((x) => correspond(x, where));
      for (const l of touchees) appliquer(l, data);
      return { count: touchees.length };
    }),
  };
}

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {} as Record<string, unknown> & {
    accessToken: ReturnType<typeof table>;
    signature: ReturnType<typeof table>;
    planPrevention: ReturnType<typeof table>;
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("@/lib/storage", () => ({ getStorage: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(), getOptionalUser: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({ assertEtablissementOwnership: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendMail: vi.fn(),
  envoiEnService: () => true,
  mailFrom: () => "no-reply@test.local",
  publicAppUrl: () => "http://localhost:3000",
}));

import { poserSignatureAvecToken } from "./actions";
import { hashToken } from "@/lib/access-tokens/token";
import { hashOtp } from "./otp";

const JETON = "jeton-clair-de-test-assez-long-pour-passer-0042";
const CODE = "424242";

function soumettre(code: string) {
  const fd = new FormData();
  fd.set("otp", code);
  return poserSignatureAvecToken(JETON, { status: "idle" }, fd);
}

beforeEach(() => {
  prismaMock.accessToken = table([
    {
      id: "atk_1",
      tokenHash: hashToken(JETON),
      etablissementId: "etab-1",
      scope: "signature",
      objetType: "plan_prevention",
      objetId: "pp-1",
      partie: "entreprise_exterieure",
      emailDestinataire: "chef@exterieure.fr",
      nomDestinataire: "Jean Dupond",
      otpHash: hashOtp(CODE),
      otpEssaisRestants: 3,
      otpExpireLe: new Date(Date.now() + 5 * 60_000),
      expireLe: new Date(Date.now() + 24 * 3_600_000),
      utiliseLe: null,
      revoqueLe: null,
      revoqueMotif: null,
    },
  ]);
  prismaMock.signature = table([]);
  prismaMock.planPrevention = table([
    {
      id: "pp-1",
      etablissementId: "etab-1",
      statut: "attente_signatures",
      numero: 1,
      lignes: [],
      phasesDangereuses: [],
    },
  ]);
  prismaMock.$transaction = async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock);
  // Le verrou de ligne de l'objet (`verrouillerObjetSigne`) : sans effet ici.
  prismaMock.$queryRaw = async () => [];
});

describe("trois essais, même en rafale", () => {
  it("dix codes faux en parallèle : trois sont comparés, sept refusés sans comparaison, le lien révoqué", async () => {
    const r = await Promise.all(
      Array.from({ length: 10 }, (_, i) => soumettre(String(100000 + i))),
    );
    const messages = r.map((x) => (x.status === "error" ? x.message : x.status));
    const compares = messages.filter((m) => /^Code incorrect|^Trop d'essais/.test(m));
    const refuses = messages.filter((m) => /^Ce lien n'accepte plus de code/.test(m));

    expect(compares).toHaveLength(3);
    expect(refuses).toHaveLength(7);
    const [t] = prismaMock.accessToken.lignes;
    expect(t.otpEssaisRestants).toBe(0);
    expect(t.revoqueLe).toBeInstanceOf(Date);
  });

  it("le bon code glissé en sixième position d'une rafale ne signe pas", async () => {
    const codes = ["100001", "100002", "100003", "100004", "100005", CODE, "100007"];
    const r = await Promise.all(codes.map(soumettre));

    expect(r.every((x) => x.status === "error")).toBe(true);
    expect(prismaMock.signature.lignes).toHaveLength(0);
  });

  it("contrôle positif : le bon code au premier essai signe", async () => {
    const r = await soumettre(CODE);
    expect(r.status).toBe("success");
    expect(prismaMock.signature.lignes).toHaveLength(1);
  });
});

describe("un jeton, une signature", () => {
  it("deux soumissions simultanées du bon code : une seule signature", async () => {
    const [a, b] = await Promise.all([soumettre(CODE), soumettre(CODE)]);

    expect([a.status, b.status].sort()).toEqual(["error", "success"]);
    expect(prismaMock.signature.lignes).toHaveLength(1);
    const echec = [a, b].find((x) => x.status === "error") as { message: string };
    expect(echec.message).toBe("Ce lien a déjà servi à signer ce document.");
    expect(prismaMock.accessToken.lignes[0].utiliseLe).toBeInstanceOf(Date);
  });

  it("cinq soumissions simultanées du bon code : toujours une seule", async () => {
    // Trois obtiennent un essai, une seule le jeton.
    await Promise.all(Array.from({ length: 5 }, () => soumettre(CODE)));
    expect(prismaMock.signature.lignes).toHaveLength(1);
  });
});
