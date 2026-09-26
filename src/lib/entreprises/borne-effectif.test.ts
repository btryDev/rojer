import { describe, expect, it } from "vitest";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { validerIdentite } from "@/components/onboarding/validation";
import { VALEURS_INITIALES } from "@/components/onboarding/types";
import { couvertureDeLEtablissement } from "@/lib/perimetre/couverture";
import { entrepriseCreationSchema, entrepriseSchema } from "./schema";

/**
 * LA BORNE DU PRODUIT SUR L'EFFECTIF DE L'ENTREPRISE (décision de la
 * propriétaire du 2026-09-26, ADR-031 § 1 ter : « c'est la limite de Rojer »).
 *
 * Le patron est celui du site, et ces tests le vérifient aux bornes : refusé à
 * la création au-delà d'`EFFECTIF_MAX` (parcours d'entrée, création d'une
 * entreprise), accepté au seuil, vide refusé ; jamais refusé en édition, où le
 * dossier reste ouvert et la couverture annonce le dépassement.
 */

const ONBOARDING = {
  raisonSociale: "Bistrot du marché SARL",
  siret: "",
  adresse: "12 rue des halles, 44000 Nantes",
  codeNaf: "56.10A",
  effectifSurSite: 8,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
};
const ENTREPRISE = {
  raisonSociale: "Bistrot du marché SARL",
  codeNaf: "56.10A",
  adresse: "12 rue des halles, 44000 Nantes",
};
const ETAPE_1 = {
  ...VALEURS_INITIALES,
  raisonSociale: "Bistrot du marché",
  adresseRue: "12 rue des Halles",
  adresseCodePostal: "44000",
  adresseVille: "Nantes",
  codeNaf: "56.10A",
  effectifSurSite: "8",
};

describe("à la création : parcours d'entrée (serveur)", () => {
  it(`accepte ${EFFECTIF_MAX} salariés dans l'entreprise`, () => {
    expect(
      onboardingSchema.safeParse({ ...ONBOARDING, effectifEntreprise: EFFECTIF_MAX })
        .success,
    ).toBe(true);
  });
  it(`refuse ${EFFECTIF_MAX + 1}, en le disant « dans l'entreprise »`, () => {
    const r = onboardingSchema.safeParse({
      ...ONBOARDING,
      effectifEntreprise: EFFECTIF_MAX + 1,
    });
    expect(r.success).toBe(false);
    expect(
      !r.success && r.error.flatten().fieldErrors.effectifEntreprise?.[0],
    ).toContain("dans l'entreprise");
  });
  it("refuse le vide", () => {
    expect(
      onboardingSchema.safeParse({ ...ONBOARDING, effectifEntreprise: "" }).success,
    ).toBe(false);
  });
});

describe("à la création : parcours d'entrée (client, porte fermée avant le clic)", () => {
  it(`laisse passer ${EFFECTIF_MAX}`, () => {
    expect(
      validerIdentite({ ...ETAPE_1, effectifEntreprise: String(EFFECTIF_MAX) }),
    ).toBeNull();
  });
  it(`ferme la porte à ${EFFECTIF_MAX + 1}, comme pour le site`, () => {
    const b = validerIdentite({
      ...ETAPE_1,
      effectifEntreprise: String(EFFECTIF_MAX + 1),
    });
    expect(b?.champ).toBe("effectifEntreprise");
    expect(b?.perimetre).toBe(true);
    expect(b?.message).toContain("salariés de l'entreprise");
  });
  it("refuse le vide", () => {
    expect(validerIdentite({ ...ETAPE_1, effectifEntreprise: "" })?.champ).toBe(
      "effectifEntreprise",
    );
  });
});

describe("à la création : une entreprise créée hors du parcours", () => {
  it(`accepte ${EFFECTIF_MAX}, refuse ${EFFECTIF_MAX + 1} et le vide`, () => {
    expect(
      entrepriseCreationSchema.safeParse({ ...ENTREPRISE, effectif: EFFECTIF_MAX })
        .success,
    ).toBe(true);
    expect(
      entrepriseCreationSchema.safeParse({
        ...ENTREPRISE,
        effectif: EFFECTIF_MAX + 1,
      }).success,
    ).toBe(false);
    expect(
      entrepriseCreationSchema.safeParse({ ...ENTREPRISE, effectif: "" }).success,
    ).toBe(false);
  });
});

describe("en édition : le dossier reste ouvert, la couverture le dit (ADR-031 § 1 bis)", () => {
  it(`une entreprise passée à ${EFFECTIF_MAX + 1} n'est pas refusée`, () => {
    expect(
      entrepriseSchema.safeParse({ ...ENTREPRISE, effectif: EFFECTIF_MAX + 1 })
        .success,
    ).toBe(true);
  });

  it("la couverture annonce le dépassement de l'entreprise", () => {
    const c = couvertureDeLEtablissement({
      regime: {
        estEtablissementTravail: true,
        estERP: false,
        estIGH: false,
        estHabitation: false,
        typeErp: null,
        categorieErp: null,
        classeIgh: null,
        familleHabitation: null,
        comporteLocauxSommeilPublic: null,
      },
      duerp: null,
      equipements: { nbSansObligation: 0, nbEquipements: 1, nbRetires: 0 },
      effectif: { surSite: 10, entreprise: EFFECTIF_MAX + 1, seuilServi: EFFECTIF_MAX },
    } as Parameters<typeof couvertureDeLEtablissement>[0]);
    const m = c.manques.filter((x) => x.axe === "effectif");
    expect(m).toHaveLength(1);
    expect(m[0].motif).toContain(
      `Votre entreprise déclare ${EFFECTIF_MAX + 1} salariés, au-delà`,
    );
  });
});
