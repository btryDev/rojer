// Le pré-détournement d'un compte non confirmé (audit de sécurité du
// 2026-11-10), contre un VRAI PostgreSQL et le vrai Better Auth : l'attaque
// confirmée ce jour-là doit échouer.
//
// L'attaque : un tiers inscrit l'adresse d'une personne avec SON mot de passe ;
// une entreprise invite cette personne ; elle s'inscrit à son tour et confirme
// son adresse. Avant le correctif, c'était le mot de passe du tiers qui ouvrait
// le compte, et le tiers acceptait l'invitation. Désormais, qui confirme
// choisit le mot de passe (`activation.ts`).
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ce qu'il crée.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/membres");
vi.unmock("@/lib/auth/portee/client");
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => undefined, get: () => undefined, getAll: () => [], toString: () => "" }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (cible: string) => {
    throw new Error(`NEXT_REDIRECT ${cible}`);
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  lireSessionCourante: async () => null,
  requireUser: async () => {
    throw new Error("pas de session ici");
  },
  entetesDeSession: async () => new Headers(),
}));
// Jamais d'appel réseau : le service des mots de passe divulgués est doublé.
vi.mock("@/lib/auth/mot-de-passe-divulgue", async (original) => ({
  ...(await original<typeof import("@/lib/auth/mot-de-passe-divulgue")>()),
  motDePasseDivulgue: async () => false,
}));

// Les mails partent dans ce tableau : on y lit les liens de confirmation.
const mails: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/email", async (original) => ({
  ...(await original<typeof import("@/lib/email")>()),
  sendMail: async (p: { to: string; subject: string; text: string }) => {
    mails.push(p);
  },
}));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("activation : qui confirme l'adresse choisit le mot de passe", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  process.env.BETTER_AUTH_SECRET ??= "secret-de-test-integration-0123456789abcdef";
  process.env.PUBLIC_APP_URL ??= "http://localhost:3000";
  const { prisma } = await import("@/lib/prisma");
  const { auth } = await import("@/lib/auth/better-auth");
  const { compteDOnboarding, appartenanceCourante, invitationsPourAdresse } = await import("@/lib/auth/membres");
  const { activerCompteAction } = await import("@/lib/auth/actions");

  const s = randomUUID().slice(0, 8);
  const PROPRIO = `proprio-${s}@exemple.test`;
  const VICTIME = `victime-${s}@exemple.test`;
  const AUTRE = `autre-${s}@exemple.test`;
  const MDP_PROPRIO = "mot-de-passe-proprio-42";
  const MDP_ATTAQUANT = "mot-de-passe-attaquant-42";
  const MDP_VICTIME = "mot-de-passe-victime-42";
  let compteId = "";
  const entreprises: string[] = [];
  let entetesProprio = new Headers();

  const attendre = async (cond: () => boolean) => {
    for (let i = 0; i < 100 && !cond(); i++) await new Promise((r) => setTimeout(r, 20));
  };
  const liensA = (adresse: string) => mails.filter((m) => m.to === adresse && /confirmez/.test(m.subject));
  const jeton = (texte: string) => /[?&]token=([^\s&]+)/.exec(texte)?.[1] ?? "";
  const cookiesDe = (h: Headers) => new Headers({ cookie: h.getSetCookie().map((c) => c.split(";")[0]).join("; ") });
  const formulaire = (champs: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(champs)) f.set(k, v);
    return f;
  };
  /** L'action redirige en levant : on rend la cible, ou l'erreur affichée. */
  const activer = async (token: string, motDePasse: string) => {
    try {
      const r = await activerCompteAction({}, formulaire({ token, password: motDePasse, confirm: motDePasse }));
      return `erreur: ${r.error}`;
    } catch (e) {
      return (e as Error).message.replace("NEXT_REDIRECT ", "");
    }
  };
  const connexion = (email: string, password: string) =>
    auth.api.signInEmail({ body: { email, password }, returnHeaders: true }).then(
      ({ headers }) => cookiesDe(headers),
      () => null,
    );

  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const p = await auth.api.signUpEmail({ body: { email: PROPRIO, password: MDP_PROPRIO, name: "Proprio" } });
    await prisma.user.update({ where: { id: p.user.id }, data: { emailVerified: true } });
    entetesProprio = (await connexion(PROPRIO, MDP_PROPRIO))!;
    compteId = (await compteDOnboarding(p.user.id, "Boulangerie")).compteId;
    const ent = await prisma.entreprise.create({
      data: {
        compteId,
        raisonSociale: "Boulangerie",
        effectif: 3,
        adresse: "1 rue",
        etablissements: { create: { raisonDisplay: "Boulangerie", adresse: "1 rue", codeNaf: "10.71C", effectifSurSite: 3 } },
      },
    });
    entreprises.push(ent.id);
  });

  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { id: { in: entreprises } } });
    await prisma.compte.deleteMany({ where: { id: compteId } });
    await prisma.user.deleteMany({ where: { email: { in: [PROPRIO, VICTIME, AUTRE] } } });
    await prisma.$disconnect();
  });

  it("l'attaque du 2026-11-10 échoue : le mot de passe du premier inscrit ne sert plus", async () => {
    await auth.api.signUpEmail({ body: { email: VICTIME, password: MDP_ATTAQUANT, name: "X" } });
    await auth.api.createInvitation({
      headers: entetesProprio,
      body: { email: VICTIME, role: "member", organizationId: compteId },
    });
    const avant = liensA(VICTIME).length;
    await auth.api.signUpEmail({ body: { email: VICTIME, password: MDP_VICTIME, name: "Victime" } });
    await attendre(() => liensA(VICTIME).length > avant);

    // La victime ouvre le lien et choisit son mot de passe.
    expect(await activer(jeton(liensA(VICTIME).at(-1)!.text), MDP_VICTIME)).toBe("/login?confirmed=1");

    expect(await connexion(VICTIME, MDP_ATTAQUANT)).toBeNull();
    const entetesVictime = await connexion(VICTIME, MDP_VICTIME);
    expect(entetesVictime).not.toBeNull();

    // C'est la victime, et elle seule, qui accepte l'invitation.
    const user = await prisma.user.findUniqueOrThrow({ where: { email: VICTIME } });
    const [invitation] = await invitationsPourAdresse(VICTIME);
    await auth.api.acceptInvitation({ headers: entetesVictime!, body: { invitationId: invitation.id } });
    expect(await appartenanceCourante(user.id, compteId)).toEqual({ compteId, role: "member" });
  });

  it("un compte déjà confirmé ne change pas de mot de passe par un vieux lien", async () => {
    const vieux = liensA(VICTIME).at(-1)!;
    expect(await activer(jeton(vieux.text), "un-autre-mot-de-passe-42")).toBe("/login?confirmation=deja");
    expect(await connexion(VICTIME, "un-autre-mot-de-passe-42")).toBeNull();
    expect(await connexion(VICTIME, MDP_VICTIME)).not.toBeNull();
  });

  it("une confirmation hors de la page d'activation est refusée", async () => {
    await auth.api.signUpEmail({ body: { email: AUTRE, password: MDP_ATTAQUANT, name: "Y" } });
    await attendre(() => liensA(AUTRE).length > 0);
    await expect(auth.api.verifyEmail({ query: { token: jeton(liensA(AUTRE)[0].text) } })).rejects.toThrow();
    expect((await prisma.user.findUniqueOrThrow({ where: { email: AUTRE } })).emailVerified).toBe(false);
  });
});
