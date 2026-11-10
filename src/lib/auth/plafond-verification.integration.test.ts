// Les liens de confirmation vers UNE adresse sont plafonnés (audit de sécurité
// du 2026-11-10) : réinscriptions et connexions d'un compte non confirmé en
// renvoyaient un à chaque fois, sans limite par destinataire. Contre un VRAI
// PostgreSQL et le vrai Better Auth.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ce qu'il crée.

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => undefined, get: () => undefined, getAll: () => [], toString: () => "" }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth/require-user", () => ({ lireSessionCourante: async () => null }));

const mails: { to: string; subject: string }[] = [];
vi.mock("@/lib/email", async (original) => ({
  ...(await original<typeof import("@/lib/email")>()),
  sendMail: async (p: { to: string; subject: string }) => {
    mails.push(p);
  },
}));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("plafond des liens de confirmation par adresse", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  process.env.BETTER_AUTH_SECRET ??= "secret-de-test-integration-0123456789abcdef";
  process.env.PUBLIC_APP_URL ??= "http://localhost:3000";
  const { prisma } = await import("@/lib/prisma");
  const { auth } = await import("@/lib/auth/better-auth");
  const { LIMITES, cleLimite } = await import("@/lib/securite/limite-debit");

  const CIBLE = `cible-${randomUUID().slice(0, 8)}@exemple.test`;
  const MDP = "mot-de-passe-de-test-42";
  const liens = () => mails.filter((m) => m.to === CIBLE && /confirmez/.test(m.subject)).length;
  const avertissement = vi.spyOn(console, "warn").mockImplementation(() => {});
  const plafonnes = () =>
    avertissement.mock.calls.filter((c) => String(c[0]).includes("envoi_mail_compte_plafonne")).length;
  /** Les envois sont détachés : on attend que chaque demande ait abouti, envoyée ou plafonnée. */
  const toutesTraitees = async (demandes: number) => {
    for (let i = 0; i < 200 && liens() + plafonnes() < demandes; i++) {
      await new Promise((r) => setTimeout(r, 25));
    }
  };

  afterAll(async () => {
    avertissement.mockRestore();
    await prisma.user.deleteMany({ where: { email: CIBLE } });
    await prisma.limiteDebit.deleteMany({ where: { cle: cleLimite("verification-envoi", "adresse", CIBLE) } });
    await prisma.$disconnect();
  });

  it("au plus le plafond par heure, quels que soient les chemins", async () => {
    await auth.api.signUpEmail({ body: { email: CIBLE, password: MDP, name: "X" } });
    for (let i = 0; i < 6; i++) {
      await auth.api.signInEmail({ body: { email: CIBLE, password: MDP } }).catch(() => undefined);
      await auth.api.signUpEmail({ body: { email: CIBLE, password: MDP, name: "X" } }).catch(() => undefined);
    }
    // 1 inscription + 6 connexions + 6 réinscriptions = 13 demandes de lien.
    await toutesTraitees(13);
    expect(liens()).toBe(LIMITES.verificationEnvoiAdresse.max);
    expect(plafonnes()).toBe(13 - LIMITES.verificationEnvoiAdresse.max);
  }, 60_000);
});
