// @vitest-environment jsdom
/**
 * Une question sans réponse ne doit désigner aucune réponse.
 *
 * Contrôle visuel du 2026-10-13 : sur les questions de la checklist, « Oui »
 * était un bouton plein et « Non » un bouton cerné — ce qui se lit comme un
 * choix déjà fait. Les deux réponses ont le même poids : même classe.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuestionParametrage } from "./QuestionParametrage";

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });

describe("QuestionParametrage — aucune réponse n'est mise en avant avant le clic", () => {
  it("sans détail : « Oui » et « Non » portent la même classe", () => {
    render(<QuestionParametrage action={action} />);
    const oui = screen.getByRole("button", { name: "Oui" });
    const non = screen.getByRole("button", { name: "Non" });
    expect(oui.className).toBe(non.className);
  });

  it("avec détail : même chose avant le clic", () => {
    render(
      <QuestionParametrage
        action={action}
        detailSiOui={{ label: "Lesquels ?", placeholder: "…" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Oui" }).className).toBe(
      screen.getByRole("button", { name: "Non" }).className,
    );
  });

  it("avec détail : après « Oui », « Enregistrer » devient l'action principale", () => {
    render(
      <QuestionParametrage
        action={action}
        detailSiOui={{ label: "Lesquels ?", placeholder: "…" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Oui" }));
    const enregistrer = screen.getByRole("button", { name: "Enregistrer" });
    const non = screen.getByRole("button", { name: "Non" });
    expect(enregistrer.className).not.toBe(non.className);
  });
});
