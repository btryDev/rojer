// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { DashboardBundle } from "../types";
vi.mock("next/navigation", () => ({
  usePathname: () => "/etablissements/etab-1",
  useSearchParams: () => new URLSearchParams(),
}));
const { WidgetSemaine } = await import("./semaine");

afterEach(cleanup);

// Revue du lot 1 : le tableau de bord listait les échéances sans la mention
// « à confirmer ». Éprouvé en retirant `MentionAConfirmer` de la case du jour.
const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");
const evenement = (aConfirmer: string[]) => ({
  id: "v1",
  libelle: "Essais du matériel et exercices",
  date: new Date("2026-09-15T00:00:00.000Z"),
  tone: "ok" as const,
  sansEcheance: false,
  type: "verification" as const,
  contractuelle: false,
  rythmeRetenu: null,
  aConfirmer,
  equipement: "Tout l'établissement",
  batiment: null,
});
const bundle = (e: ReturnType<typeof evenement>) =>
  ({ aujourdhui: AUJOURDHUI, etablissementId: "etab-1", evenementsSemaine: [e] }) as unknown as DashboardBundle;

describe("la semaine porte la mention « à confirmer »", () => {
  it("marquée : la mention est là ; sans marque : absente", () => {
    const { container, unmount } = render(<WidgetSemaine bundle={bundle(evenement(["phrase de prudence"]))} />);
    expect(container.textContent).toContain("À confirmer");
    unmount();
    const r = render(<WidgetSemaine bundle={bundle(evenement([]))} />);
    expect(r.container.textContent).not.toContain("À confirmer");
  });
});
