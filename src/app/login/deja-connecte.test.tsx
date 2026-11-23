// /login, navigateur déjà connecté : le message et ses deux sorties, pas de
// formulaire (2026-11-23, contrôle en préprod).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({
  getOptionalUser: async () => ({ id: "u1", email: "moi@exemple.fr" }),
}));
vi.mock("@/lib/auth/scope", () => ({ getOptionalUserEtablissement: async () => ({ id: "e1" }) }));
vi.mock("@/lib/auth/actions", () => ({ signOutAction: async () => {} }));
vi.mock("./LoginForm", () => ({ LoginForm: () => <form data-testid="formulaire-connexion" /> }));

import LoginPage from "./page";

describe("/login déjà connecté", () => {
  it("dit qui est connecté, propose le dossier et la sortie, sans formulaire", async () => {
    const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("déjà connecté avec moi@exemple.fr");
    expect(html).toContain("Reprendre mon dossier");
    expect(html).toContain('href="/etablissements/e1"');
    expect(html).not.toContain("formulaire-connexion");
    // Ni connexion ni création de compte à proposer à qui est connecté.
    expect(html).not.toContain("Créer un compte");
  });

  it("un retour demandé prime sur le dossier (connexion d'un assistant)", async () => {
    const next = "/oauth/reprendre?client_id=abc&sig=xyz";
    const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ next }) }));
    expect(html).toContain('href="/oauth/reprendre?client_id=abc&amp;sig=xyz"');
    expect(html).toContain("Continuer");
    expect(html).not.toContain("Reprendre mon dossier");
  });

  it("un retour qui sortirait du site est ignoré : le dossier", async () => {
    const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ next: "//evil.tld" }) }));
    expect(html).toContain("Continuer");
    expect(html).toContain('href="/entreprises"');
    expect(html).not.toContain("evil.tld");
  });
});
