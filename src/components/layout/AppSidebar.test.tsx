// @vitest-environment jsdom
/**
 * La pastille du calendrier, telle que la barre latérale la rend.
 *
 * Calendrier non recalculé : aucun nombre dans le lien, une pastille neutre
 * qui dit « à mettre à jour » à l'infobulle et aux lecteurs d'écran.
 * Calendrier à jour : le nombre, comme avant (2026-10-13).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/etablissements/e1/calendrier",
  useSearchParams: () => new URLSearchParams(),
}));

import { AppSidebar } from "./AppSidebar";
import { LIBELLE_CALENDRIER_A_METTRE_A_JOUR } from "./sidebar-nav";

afterEach(cleanup);

// Le rail de l'ordinateur. La barre du bas du téléphone est rendue à côté,
// masquée par CSS que jsdom n'applique pas (`NavigationMobile.test.tsx`).
const rail = () =>
  within(screen.getByRole("complementary", { name: "Navigation principale" }));

const ETAB = {
  id: "e1",
  raisonDisplay: "Le Comptoir",
  adresse: "1 rue",
  effectifSurSite: 4,
  entrepriseId: "ent-1",
};

function lienCalendrier(): HTMLElement {
  // Le panneau est replié à l'arrivée : on ouvre celui de « À faire ».
  fireEvent.click(rail().getByRole("button", { name: /À faire/ }));
  return rail()
    .getAllByRole("link")
    .filter((a) => a.getAttribute("href") === "/etablissements/e1/calendrier")
    .find((a) => a.textContent?.startsWith("Calendrier"))!;
}

describe("AppSidebar — pastille du calendrier", () => {
  it("calendrier à jour : le nombre de retards", () => {
    render(
      <AppSidebar
        etablissement={ETAB}
        active="calendrier"
        counts={{ enRetardTotal: 7, calendrierAMettreAJour: false }}
      />,
    );
    const lien = lienCalendrier();
    expect(lien).toBeDefined();
    expect(lien.textContent).toContain("7");
    expect(lien.textContent).not.toContain(LIBELLE_CALENDRIER_A_METTRE_A_JOUR);
  });

  it("calendrier à mettre à jour : AUCUN nombre, une pastille neutre qui le dit", () => {
    render(
      <AppSidebar
        etablissement={ETAB}
        active="calendrier"
        counts={{ enRetardTotal: 7, calendrierAMettreAJour: true }}
      />,
    );
    const lien = lienCalendrier();
    expect(lien.textContent).not.toMatch(/\d/);
    expect(lien.textContent).toContain(LIBELLE_CALENDRIER_A_METTRE_A_JOUR);
    expect(
      lien.querySelector(`[title="${LIBELLE_CALENDRIER_A_METTRE_A_JOUR}"]`),
    ).not.toBeNull();
    // Neutre : jamais la couleur du signal.
    expect(lien.innerHTML).not.toContain("board-signal");
  });
});
