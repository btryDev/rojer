// Registre d'accessibilité : vider un champ, slug dédoublonné, registre non
// servi hors ERP (2026-10-12, audit des modules).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ registre: null as unknown }));
vi.mock("@/lib/prisma", () => ({
  prisma: { registreAccessibilite: { findUnique: async () => h.registre } },
}));
vi.mock("@/lib/auth/scope", () => ({ requireEtablissement: vi.fn() }));

import {
  section1Schema,
  section2Schema,
  section3Schema,
  section4Schema,
  slugLibre,
} from "./schema";
import { getRegistrePublicParSlug } from "./queries";
import { registreServiAuPublic } from "./publication";

describe("un champ vidé s'efface", () => {
  // `undefined` laisse la colonne inchangée sous Prisma ; seul `null` l'efface.
  it("texte, date, régime et effectif vidés rendent null, jamais undefined", () => {
    expect(section1Schema.parse({ prestationsFournies: "  ", servicesAdaptes: "" })).toMatchObject({
      prestationsFournies: null,
      servicesAdaptes: null,
    });
    expect(
      section2Schema.parse({
        conformiteRegime: "",
        dateConformite: "",
        numeroAttestationAccess: "",
        dateDepotAdap: "",
      }),
    ).toEqual({
      conformiteRegime: null,
      dateConformite: null,
      numeroAttestationAccess: null,
      dateDepotAdap: null,
    });
    expect(
      section3Schema.parse({ dateDerniereFormation: "", organismeFormation: "", effectifForme: "" }),
    ).toMatchObject({ dateDerniereFormation: null, organismeFormation: null, effectifForme: null });
    expect(
      section4Schema.parse({ equipementsAccessibilite: "", modalitesMaintenance: "", dernierControleMaintenance: "" }),
    ).toEqual({ equipementsAccessibilite: null, modalitesMaintenance: null, dernierControleMaintenance: null });
  });

  it("un champ rempli garde sa valeur", () => {
    expect(section4Schema.parse({ modalitesMaintenance: " contrat annuel " }).modalitesMaintenance).toBe(
      "contrat annuel",
    );
  });
});

describe("la page publique publie ce qui est saisi", () => {
  // Le 9° de l'arrêté (art. 1er I) et la date de dépôt de l'Ad'AP se
  // saisissaient sans jamais paraître sur la page publique.
  it("modalités de maintenance et date de dépôt de l'Ad'AP sont rendues", () => {
    const page = readFileSync(join(process.cwd(), "src/app/accessibilite/[slug]/page.tsx"), "utf8");
    expect(page).toContain("{r.modalitesMaintenance}");
    expect(page).toContain("formatDate(r.dateDepotAdap)");
  });
});

describe("slugLibre", () => {
  it("deux sites du même nom reçoivent deux slugs", () => {
    expect(slugLibre("bistrot-000123", [])).toBe("bistrot-000123");
    expect(slugLibre("bistrot-000123", ["bistrot-000123"])).toBe("bistrot-000123-2");
    expect(slugLibre("bistrot-000123", ["bistrot-000123", "bistrot-000123-2"])).toBe("bistrot-000123-3");
  });
});

describe("registre servi au public", () => {
  const registre = (estERP: boolean, publie: boolean) => ({
    publie,
    slugPublic: "s",
    etablissement: { estERP, raisonDisplay: "X", adresse: "", typeErp: null, categorieErp: null, entreprise: { raisonSociale: "X" } },
  });
  beforeEach(() => {
    h.registre = null;
  });

  it("la règle : publié ET ERP", () => {
    expect(registreServiAuPublic({ publie: true, estERP: true })).toBe(true);
    expect(registreServiAuPublic({ publie: true, estERP: false })).toBe(false);
    expect(registreServiAuPublic({ publie: false, estERP: true })).toBe(false);
  });

  it("la lecture publique (page et affiche) ne sert plus un établissement repassé non-ERP", async () => {
    h.registre = registre(false, true);
    expect(await getRegistrePublicParSlug("s")).toBeNull();
    h.registre = registre(true, true);
    expect(await getRegistrePublicParSlug("s")).not.toBeNull();
  });
});
