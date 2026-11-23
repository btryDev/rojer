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
  });
});
