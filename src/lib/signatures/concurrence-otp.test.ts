import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { correspond } from "@/test/prisma-where";

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

function appliquer(ligne: Ligne, data: Ligne) {
  for (const [clef, v] of Object.entries(data)) {
    if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
      const op = v as Ligne;
      if ("decrement" in op) ligne[clef] = (ligne[clef] as number) - (op.decrement as number);
      else if ("increment" in op) ligne[clef] = (ligne[clef] as number) + (op.increment as number);
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
    count: vi.fn(async ({ where }: { where: Ligne }) => {
      await cede();
      return lignes.filter((x) => correspond(x, where)).length;
    }),
    // `INSERT … ON CONFLICT DO NOTHING` sur la clé `empreinteAdresse` : atomique, comme
    // l'écriture conditionnelle.
    createMany: vi.fn(async ({ data, skipDuplicates }: { data: Ligne[]; skipDuplicates?: boolean }) => {
      await cede();
      let count = 0;
      for (const d of data) {
        if (lignes.some((x) => x.empreinteAdresse === d.empreinteAdresse)) {
          if (!skipDuplicates) throw new Error("P2002");
          continue;
        }
        lignes.push({ ...d });
        count++;
      }
      return { count };
    }),
    update: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      await cede();
      const l = lignes.find((x) => correspond(x, where));
      if (!l) throw new Error("P2025");
      appliquer(l, data);
      return { ...l };
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
    quotaEnvoiOtp: ReturnType<typeof table>;
    signature: ReturnType<typeof table>;
    planPrevention: ReturnType<typeof table>;
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
// Sans session, le compte vient du propriétaire de l'établissement du jeton
// (ADR-051, `compte-hors-session.ts`) : ici, le client borné simulé.
vi.mock("@/lib/auth/compte-hors-session", async () =>
  (await import("@/test/garde-simulee")).compteHorsSessionSimule(),
);
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("@/lib/storage", () => ({ getStorage: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(), getOptionalUser: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({ assertEtablissementOwnership: vi.fn() }));
const { mails } = vi.hoisted(() => ({ mails: [] as { to: string; text: string }[] }));
vi.mock("@/lib/email", () => ({
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur inconnue"),
  sendMail: vi.fn(async (m: { to: string; text: string }) => {
    mails.push(m);
  }),
  envoiEnService: () => true,
  mailFrom: () => "no-reply@test.local",
  publicAppUrl: () => "http://localhost:3000",
}));

import { poserSignatureAvecToken, renvoyerCodeOtp } from "./actions";
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
      createdAt: new Date(Date.now() - 3 * 3_600_000),
      utiliseLe: null,
      revoqueLe: null,
      revoqueMotif: null,
    },
  ]);
  prismaMock.quotaEnvoiOtp = table([]);
  mails.length = 0;
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

// ─────────────────────────────────────────────────────────────────────────
// ASVS 5.0.0 V6.6.3 et ADR-006 (« max 5 envois d'OTP / heure / email ») —
// audit du 2026-10-13. Le renvoi n'avait qu'un délai de 60 s entre deux codes,
// aucun plafond total, et chaque renvoi remettait le compteur à trois essais :
// soixante codes par heure, trois essais chacun, sur un lien de 72 h.
// ─────────────────────────────────────────────────────────────────────────

const JETON_2 = "jeton-clair-de-test-assez-long-pour-passer-0043";

function second(lien: Record<string, unknown>, jeton: string, id: string) {
  return { ...lien, id, tokenHash: hashToken(jeton) };
}

describe("renvoi du code : plafond par adresse, sur la base", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const avancer = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms));

  it("cinq envois dans l'heure, le sixième refusé avec un message clair, le code intact", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await renvoyerCodeOtp(JETON);
      expect(r.status, `renvoi ${i + 1}`).toBe("success");
      avancer(61_000);
    }
    expect(mails).toHaveLength(5);
    const [t] = prismaMock.accessToken.lignes;
    const avant = { otpHash: t.otpHash, otpExpireLe: t.otpExpireLe };

    const r = await renvoyerCodeOtp(JETON);

    expect(r.status).toBe("error");
    expect((r as { message: string }).message).toMatch(/^Cinq codes ont déjà été envoyés à cette adresse dans l'heure\. Vous pourrez en demander un nouveau à \d{2}:\d{2}/);
    expect({ otpHash: t.otpHash, otpExpireLe: t.otpExpireLe }).toEqual(avant);
    expect(mails).toHaveLength(5);
  });

  it("l'envoi du lien compte : un lien émis il y a dix minutes n'a plus que quatre renvois", async () => {
    prismaMock.accessToken.lignes[0].createdAt = new Date(Date.now() - 10 * 60_000);
    for (let i = 0; i < 4; i++) {
      expect((await renvoyerCodeOtp(JETON)).status, `renvoi ${i + 1}`).toBe("success");
      avancer(61_000);
    }
    expect((await renvoyerCodeOtp(JETON)).status).toBe("error");
    expect(mails).toHaveLength(4);
  });

  it("le plafond est celui de l'ADRESSE : deux liens vers la même boîte le partagent", async () => {
    prismaMock.accessToken.lignes.push(second(prismaMock.accessToken.lignes[0], JETON_2, "atk_2"));
    for (let i = 0; i < 5; i++) {
      expect((await renvoyerCodeOtp(i % 2 ? JETON_2 : JETON)).status).toBe("success");
      avancer(61_000);
    }
    expect((await renvoyerCodeOtp(JETON_2)).status).toBe("error");
    expect((await renvoyerCodeOtp(JETON)).status).toBe("error");
    expect(mails).toHaveLength(5);
  });

  it("la fenêtre se rouvre une heure après le premier envoi", async () => {
    for (let i = 0; i < 5; i++) {
      await renvoyerCodeOtp(JETON);
      avancer(61_000);
    }
    expect((await renvoyerCodeOtp(JETON)).status).toBe("error");
    avancer(60 * 60_000);
    expect((await renvoyerCodeOtp(JETON)).status).toBe("success");
    expect(mails).toHaveLength(6);
  });

  it("en rafale sur dix liens de la même adresse : cinq envois, pas un de plus", async () => {
    const base = prismaMock.accessToken.lignes[0];
    const jetons = Array.from({ length: 10 }, (_, i) => `jeton-clair-de-test-assez-long-pour-passer-1${String(i).padStart(3, "0")}`);
    prismaMock.accessToken.lignes.length = 0;
    jetons.forEach((j, i) => prismaMock.accessToken.lignes.push(second(base, j, `atk_r${i}`)));

    const r = await Promise.all(jetons.map((j) => renvoyerCodeOtp(j)));

    expect(r.filter((x) => x.status === "success")).toHaveLength(5);
    expect(mails).toHaveLength(5);
    expect(prismaMock.quotaEnvoiOtp.lignes[0].envois).toBe(5);
  });

  it("en rafale sur UN lien : un seul nouveau code, les autres refusés par le délai", async () => {
    const r = await Promise.all(Array.from({ length: 8 }, () => renvoyerCodeOtp(JETON)));
    expect(r.filter((x) => x.status === "success")).toHaveLength(1);
    expect(mails).toHaveLength(1);
    // Les renvois devancés rendent leur place : un double clic ne coûte qu'un
    // des cinq envois de l'heure.
    expect(prismaMock.quotaEnvoiOtp.lignes[0].envois).toBe(1);
  });

  it("un renvoi ne rend pas d'essai : le total des codes éprouvables par lien reste trois", async () => {
    // Deux codes faux, puis un renvoi : il reste un essai, pas trois.
    await soumettre("000001");
    await soumettre("000002");
    expect(prismaMock.accessToken.lignes[0].otpEssaisRestants).toBe(1);

    const r = await renvoyerCodeOtp(JETON);

    expect(r.status).toBe("success");
    expect((r as { message: string }).message).toMatch(/Il vous reste 1 essai sur ce lien\.$/);
    expect(prismaMock.accessToken.lignes[0].otpEssaisRestants).toBe(1);
  });

  it("contrôle positif : un renvoi sur un lien neuf part, et le nouveau code signe", async () => {
    const r = await renvoyerCodeOtp(JETON);
    expect(r.status).toBe("success");
    expect(mails).toHaveLength(1);
    const code = /Code de confirmation : (\d{6})/.exec(mails[0].text)?.[1];
    expect(code).toBeDefined();
    expect((await soumettre(code!)).status).toBe("success");
  });
});

describe("la fonction du signataire, sur la page publique (ASVS V2.2.1)", () => {
  const soumettreAvecRole = (role: string, code = CODE) => {
    const fd = new FormData();
    fd.set("otp", code);
    fd.set("signataireRole", role);
    return poserSignatureAvecToken(JETON, { status: "idle" }, fd);
  };

  it("refuse 121 caractères, sans consommer d'essai ni rien écrire", async () => {
    const r = await soumettreAvecRole("R".repeat(121));
    expect(r.status).toBe("error");
    expect(prismaMock.accessToken.lignes[0].otpEssaisRestants).toBe(3);
    expect(prismaMock.signature.lignes).toHaveLength(0);
  });

  it("refuse un caractère de contrôle (saut de ligne, tabulation, NUL)", async () => {
    for (const role of ["Chef\nde chantier", "Chef\tde chantier", "Chef\u0000"]) {
      const r = await soumettreAvecRole(role);
      expect(r.status, JSON.stringify(role)).toBe("error");
    }
    expect(prismaMock.accessToken.lignes[0].otpEssaisRestants).toBe(3);
    expect(prismaMock.signature.lignes).toHaveLength(0);
  });

  it("accepte 120 caractères accentués, et les enregistre", async () => {
    const role = "Chef d'équipe — électricité ".repeat(5).slice(0, 120);
    const r = await soumettreAvecRole(role);
    expect(r.status).toBe("success");
    expect(prismaMock.signature.lignes[0].signataireRole).toBe(role.trim());
  });

  it("la fonction reste facultative", async () => {
    expect((await soumettreAvecRole("")).status).toBe("success");
    expect(prismaMock.signature.lignes[0].signataireRole).toBeNull();
  });
});
