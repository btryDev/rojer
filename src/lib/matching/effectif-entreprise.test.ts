import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    declarationEtatPermanent: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const {
  effectifRetenuPourSeuil,
  phraseEffectifAConfirmer,
  seuilEntrepriseAtteint,
} = await import("./effectif-entreprise");
const { exigenceEcheanceActions } = await import(
  "@/lib/actions/echeance-exigee"
);
const { evaluerEtatDuerp } = await import("@/lib/dashboard/duerp");
const { declencheursMiseAJour } = await import("@/lib/duerps/mise-a-jour");
const { construireChezVous } = await import("@/lib/guide/chez-vous");
const { couvertureDeLEtablissement } = await import(
  "@/lib/perimetre/couverture"
);
const { listerEtatsPermanents } = await import(
  "@/lib/etats-permanents/queries"
);
const { determineObligationsApplicables } = await import("./engine");

/**
 * UNE RÈGLE, TOUS SES LECTEURS (C37, contre-lecture M2).
 *
 * Le dossier observé : un site de cinquante dans une entreprise déclarée à
 * quarante-neuf. La couverture annonçait le programme annuel, l'écran des
 * actions disait « sans échéance ». Ce fichier pose le même dossier à chaque
 * lecteur d'un seuil d'entreprise et exige la même réponse — « atteint, à
 * confirmer ». Casser un lecteur (le rendre à `effectif >= seuil` sur
 * l'entreprise seule) fait tomber sa ligne ici.
 */

const DOUTE_50 = { entreprise: 49, site: 50 };
const DOUTE_11 = { entreprise: 10, site: 12 };

function etab(site: number, entreprise: number) {
  return {
    id: "etab-1",
    effectifSurSite: site,
    effectifEntreprise: entreprise,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
  };
}

describe("effectifRetenuPourSeuil — la règle", () => {
  it("retient l'entreprise quand elle atteint le seuil", () => {
    expect(effectifRetenuPourSeuil(11, { entreprise: 15, site: 6 })).toEqual({
      valeur: 15,
      aConfirmer: false,
    });
  });

  it("retient le site, à confirmer, quand lui seul atteint le seuil", () => {
    expect(effectifRetenuPourSeuil(11, DOUTE_11)).toEqual({
      valeur: 12,
      aConfirmer: true,
    });
  });

  it("ne conclut à rien quand ni l'un ni l'autre ne l'atteint", () => {
    expect(seuilEntrepriseAtteint(11, { entreprise: 10, site: 10 })).toEqual({
      atteint: false,
      aConfirmer: false,
    });
  });
});

describe("tous les lecteurs d'un seuil d'entreprise lisent la même règle", () => {
  it("écran des actions (L. 4121-3-1) : à dater, à confirmer", () => {
    const r = exigenceEcheanceActions(DOUTE_50);
    expect(r.exigee).toBe(true);
    expect(r.aConfirmer).toBe(true);
  });

  it("état du document unique (R. 4121-2 1°) : soumis, à confirmer", () => {
    const e = evaluerEtatDuerp(
      { ouvert: true, dateDerniereVersion: null, effectifs: DOUTE_11 },
      new Date("2026-09-26T10:00:00Z"),
    );
    expect(e.soumisMajAnnuelle).toBe(true);
    expect(e.majAnnuelleAConfirmer).toBe(true);
  });

  it("carte de mise à jour du document unique : le 1° applicable, à confirmer", () => {
    const premier = declencheursMiseAJour(DOUTE_11).find((d) => d.rang === "1°");
    expect(premier?.applicable).toBe(true);
    expect(premier?.portee).toContain("à confirmer");
  });

  it("guide « Chez vous » : mise à jour annuelle retenue, à confirmer", () => {
    const r = construireChezVous(etab(12, 10), [], 10);
    expect(r.duerp.misAJourAnnuel).toBe(true);
    expect(r.duerp.aConfirmer).toContain("L. 1111-3");
  });

  it("couverture : le programme annuel est annoncé, à confirmer", () => {
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
      effectif: { surSite: 50, entreprise: 49, seuilServi: 50 },
    } as Parameters<typeof couvertureDeLEtablissement>[0]);
    const m = c.manques.find((x) => x.axe === "effectif");
    expect(m?.motif).toContain("À confirmer");
  });

  it("moteur : le règlement intérieur retenu, marqué à confirmer", () => {
    const ri = determineObligationsApplicables(etab(50, 49), []).find(
      (a) => a.obligation.id === "prevention-etablissement-reglement-interieur",
    );
    expect(ri?.effectifAConfirmer).toEqual(DOUTE_50);
  });
});

describe("« Ce qui doit être en place » porte la mention (M1)", () => {
  it("la ligne du CSE retenue par prudence dit « à confirmer » et de quoi conclure", async () => {
    const d = await listerEtatsPermanents(etab(12, 10), []);
    const lignes = d.groupes.flatMap((g) => g.lignes);
    const cse = lignes.find(
      (l) => l.obligation.id === "prevention-etablissement-cse",
    );
    expect(cse?.aConfirmer).toContain("apprentis");
    // Et seulement là où la prudence joue.
    const franc = await listerEtatsPermanents(etab(12, 12), []);
    const cseFranc = franc.groupes
      .flatMap((g) => g.lignes)
      .find((l) => l.obligation.id === "prevention-etablissement-cse");
    expect(cseFranc?.aConfirmer).toBeNull();
  });
});

describe("la phrase « à confirmer » donne de quoi conclure (M3)", () => {
  const p = phraseEffectifAConfirmer(DOUTE_11);

  it("nomme les deux nombres", () => {
    expect(p).toContain("10 salariés");
    expect(p).toContain("12 travailleurs");
  });

  it("dit la sortie par le texte, au plus près de L. 1111-3", () => {
    expect(p).toContain("apprentis");
    expect(p).toContain("contrat de professionnalisation");
    expect(p).toContain("L. 1111-3");
    // Le 6° ne vaut que jusqu'à un terme, et le texte le dit.
    expect(p).toContain("jusqu'au terme");
  });

  it("ne présente pas l'écart comme binaire", () => {
    expect(p).toContain("notamment");
    expect(p).toContain("L. 1111-2");
  });

  it("dit la sortie par la mise à jour", () => {
    expect(p).toMatch(/mettez-le à jour/);
  });
});
