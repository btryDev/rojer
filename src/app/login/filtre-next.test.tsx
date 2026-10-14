/**
 * `/login` et `/signup` recopient `?next=` dans le formulaire et dans le lien
 * vers l'autre page. L'action refiltre, mais la page ne doit pas servir de
 * relais à une valeur forgée : ce qu'elle remet au formulaire comme au lien
 * est passé par `cheminDeRetour` (revue du lot audit-1013-auth, A2).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const recu = vi.hoisted(() => ({ login: [] as string[] }));

vi.mock("./LoginForm", () => ({
  LoginForm: ({ next }: { next: string }) => {
    recu.login.push(next);
    return null;
  },
}));
vi.mock("../signup/SignupForm", () => ({ SignupForm: () => null }));

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
