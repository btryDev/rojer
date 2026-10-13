// @vitest-environment jsdom
/**
 * Les pages d'incident existent, parlent français et ne disent rien de
 * technique (audit du 2026-10-13, B1). Sans `error.tsx`, `global-error.tsx`
 * et `not-found.tsx`, une exception serveur affichait la page anglaise par
 * défaut de Next.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

// `next/font` ne se charge que sous le compilateur de Next.
vi.mock("./polices", () => ({ variablesPolices: "polices" }));

import ErreurPage from "./error";
import ErreurGlobale from "./global-error";
import NotFound from "./not-found";

afterEach(cleanup);

const SECRET = "connexion refusée à postgres://admin:motdepasse@10.0.0.1";

function erreurServeur(): Error & { digest?: string } {
  return Object.assign(new Error(SECRET), { digest: "1234567890" });
}

describe("error.tsx", () => {
  it("dit en français que la page n'a pas pu s'afficher, montre le digest et rien d'autre", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErreurPage error={erreurServeur()} retry={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "La page n'a pas pu s'afficher.",
    );
    expect(screen.getByText("1234567890")).toBeTruthy();
    expect(document.body.textContent).not.toContain(SECRET);
    expect(document.body.textContent).not.toMatch(/something went wrong|try again/i);
  });

  it("« Réessayer » relance le rendu du segment", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<ErreurPage error={erreurServeur()} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("sans digest (erreur côté navigateur), ne promet pas de référence", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErreurPage error={new Error(SECRET)} retry={() => {}} />);
    expect(document.body.textContent).not.toMatch(/référence/i);
    expect(document.body.textContent).not.toContain(SECRET);
  });
});

describe("global-error.tsx", () => {
  it("porte son propre document, en français, sans détail technique", () => {
    const html = renderToStaticMarkup(
      <ErreurGlobale error={erreurServeur()} retry={() => {}} />,
    );
    expect(html).toMatch(/^<html lang="fr"[^>]*>/);
    expect(html).toContain("<body");
    expect(html).toContain("Rojer n&#x27;a pas pu s&#x27;afficher.");
    expect(html).toContain("1234567890");
    expect(html).not.toContain("motdepasse");
  });
});

describe("not-found.tsx", () => {
  it("dit en français que la page n'existe pas et ramène à l'accueil", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Cette page n'existe pas.",
    );
    expect(screen.getByRole("link", { name: "Revenir à l'accueil" }).getAttribute("href")).toBe("/");
  });
});
