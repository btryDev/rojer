/**
 * `/login` et `/signup` recopient `?next=` dans le formulaire et dans le lien
 * vers l'autre page. L'action refiltre, mais la page ne doit pas servir de
 * relais à une valeur forgée : ce qu'elle remet au formulaire comme au lien
 * est passé par `cheminDeRetour` (revue du lot audit-1013-auth, A2).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recu = vi.hoisted(() => ({ login: [] as string[], ouvertes: true }));

// L'interrupteur des inscriptions (`lib/ouverture.ts`) : ouvert pour les
// tests du filtre, fermé pour ceux de la fermeture, plus bas.
vi.mock("@/lib/ouverture", async (original) => {
  const o = await original<typeof import("@/lib/ouverture")>();
  type Options = Parameters<typeof o.inscriptionAffichee>[0];
  return {
    ...o,
    inscriptionAffichee: (opts: Options = {}) => o.inscriptionAffichee({ ...opts, ouvertes: recu.ouvertes }),
    lienInscription: (chemin: string, opts: Options = {}) => o.lienInscription(chemin, { ...opts, ouvertes: recu.ouvertes }),
  };
});
vi.mock("next/navigation", () => ({
  redirect: (cible: string) => {
    throw new Error(`NEXT_REDIRECT ${cible}`);
  },
}));

vi.mock("./LoginForm", () => ({
  LoginForm: ({ next }: { next: string }) => {
    recu.login.push(next);
    return null;
  },
}));
vi.mock("../signup/SignupForm", () => ({ SignupForm: () => null }));
// Personne de connecté : la page montre le formulaire seul.
vi.mock("@/lib/auth/require-user", () => ({ getOptionalUser: async () => null }));

const { default: LoginPage } = await import("./page");
const { default: SignupPage } = await import("../signup/page");

const FORGES = ["https://evil.tld", "//evil.tld", "/.//evil.tld"];

async function rendre(
  page: (p: { searchParams: Promise<{ next?: string }> }) => Promise<React.ReactElement>,
  next: string,
): Promise<string> {
  return renderToStaticMarkup(await page({ searchParams: Promise.resolve({ next }) }));
}

describe("filtre de `next` dans les pages d'entrée", () => {
  it("/login ne transmet ni au formulaire ni au lien une adresse forgée", async () => {
    for (const next of FORGES) {
      const html = await rendre(LoginPage, next);
      expect(recu.login.at(-1), next).toBe("/entreprises");
      expect(html, next).not.toContain("evil");
    }
  });

  it("/signup ne transmet pas au lien vers /login une adresse forgée", async () => {
    for (const next of FORGES) {
      const html = await rendre(SignupPage, next);
      expect(html, next).toContain('href="/login?next=%2Fentreprises"');
      expect(html, next).not.toContain("evil");
    }
  });

  it("garde un chemin interne", async () => {
    const html = await rendre(LoginPage, "/etablissements/e1");
    expect(recu.login.at(-1)).toBe("/etablissements/e1");
    expect(html).toContain(`/signup?next=${encodeURIComponent("/etablissements/e1")}`);
  });
});

/**
 * Inscriptions fermées (`lib/ouverture.ts`, 2026-11-23) : `/signup` renvoie
 * à /bientot, et le lien de /login y mène — sauf pour la personne invitée qui
 * revient à son invitation (ADR-054 § 5).
 */
describe("inscriptions fermées", () => {
  beforeEach(() => {
    recu.ouvertes = false;
  });
  afterEach(() => {
    recu.ouvertes = true;
  });

  it("/signup renvoie à /bientot", async () => {
    await expect(SignupPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT /bientot");
    await expect(
      SignupPage({ searchParams: Promise.resolve({ next: "/compte", offre: "rojer_pro_annuel" }) }),
    ).rejects.toThrow("NEXT_REDIRECT /bientot");
  });

  it("/signup s'affiche pour revenir à une invitation", async () => {
    const html = await rendre(SignupPage, "/invitation/inv-1");
    expect(html).toContain('href="/login?next=%2Finvitation%2Finv-1"');
  });

  it("/login : « Créer un compte » mène à /bientot, et à /signup pour une invitation", async () => {
    expect(await rendre(LoginPage, "/etablissements/e1")).toContain('href="/bientot"');
    const invitation = await rendre(LoginPage, "/invitation/inv-1");
    expect(invitation).toContain(`href="/signup?next=${encodeURIComponent("/invitation/inv-1")}"`);
    expect(invitation).not.toContain('href="/bientot"');
  });
});
