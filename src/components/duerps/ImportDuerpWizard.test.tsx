// @vitest-environment jsdom
/**
 * La taille annoncée est celle que le serveur applique (audit du 2026-10-13,
 * B3). L'écran disait « max 20 Mo » quand `validerFichierImport` refusait
 * au-delà de 5 Mo : un fichier de 8 Mo, annoncé acceptable, était refusé.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/duerps/import/actions", () => ({
  previewImport: async () => ({ status: "idle" }),
  commitImport: async () => ({ status: "idle" }),
}));

import { ImportDuerpWizard } from "./ImportDuerpWizard";
import { TAILLE_MAX_IMPORT_OCTETS } from "@/lib/duerps/import/format";

afterEach(cleanup);

describe("ImportDuerpWizard — la taille maximale annoncée", () => {
  it("est celle que le serveur applique", () => {
    render(<ImportDuerpWizard etablissementId="etab-1" />);
    const mo = TAILLE_MAX_IMPORT_OCTETS / (1024 * 1024);
    expect(screen.getByText(new RegExp(`max ${mo} Mo`))).toBeTruthy();
    expect(document.body.textContent).not.toMatch(new RegExp(`max (?!${mo} )\\d+ Mo`));
  });
});
