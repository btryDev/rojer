import { afterEach, describe, expect, it, vi } from "vitest";
import { registreAuDossier } from "./registre-au-dossier";

/**
 * Ce que le ZIP joint et ce que « Préparer un contrôle » annonce : une règle
 * (relecture indépendante du 2026-10-12). La page disait « Publié et
 * consultable en ligne » quand le ZIP écartait la pièce, faute d'adresse
 * publique en production.
 */
afterEach(() => vi.unstubAllEnvs());

describe("registreAuDossier", () => {
  it("publié, ERP, adresse publique connue : joint", () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
    expect(registreAuDossier({ publie: true, estERP: true })).toEqual({ joint: true });
  });

  it("publié, ERP, sans adresse publique en production : non joint, et pourquoi", () => {
    vi.stubEnv("PUBLIC_APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(registreAuDossier({ publie: true, estERP: true })).toEqual({
      joint: false,
      raison: "adresse_absente",
    });
  });

  it("publié puis repassé non-ERP : non applicable, pas « non publié »", () => {
    expect(registreAuDossier({ publie: true, estERP: false })).toEqual({
      joint: false,
      raison: "non_erp",
    });
  });

  it("ERP non publié : non publié", () => {
    expect(registreAuDossier({ publie: false, estERP: true })).toEqual({
      joint: false,
      raison: "non_publie",
    });
  });
});
