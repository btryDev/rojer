import { describe, expect, it } from "vitest";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching";
import { determineObligationsApplicables } from "@/lib/matching";
import { porteurDe } from "@/lib/referentiels/conformite/types";
import { construireChezVous, SEUIL_MAJ_ANNUELLE_DUERP } from "./chez-vous";

function etabBureau(
  over: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab-bureau",
    effectifSurSite: 12,
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
    ...over,
  };
}

function elec(): EquipementMatching {
  return {
    id: "eq-elec",
    libelle: "TGBT",
    categorie: "INSTALLATION_ELECTRIQUE",
    caracteristiques: null,
  };
}

function extincteur(): EquipementMatching {
  return {
    id: "eq-ext",
    libelle: "Extincteurs",
    categorie: "EXTINCTEUR",
    caracteristiques: null,
  };
}

function autre(): EquipementMatching {
  return {
    id: "eq-autre",
    libelle: "Machine spéciale",
    categorie: "AUTRE",
    caracteristiques: null,
  };
}

describe("construireChezVous — DUERP", () => {
  it("effectif ≥ 11 → mise à jour au moins annuelle", () => {
    const r = construireChezVous(etabBureau({ effectifSurSite: 11 }), [], 11);
    expect(r.duerp.misAJourAnnuel).toBe(true);
    expect(r.duerp.effectif).toBe(11);
  });

  it("le seuil lit l'effectif de l'ENTREPRISE, pas celui du site", () => {
    // Quinze salariés sur deux sites, huit sur celui-ci : le 1° s'applique.
    const r = construireChezVous(etabBureau({ effectifSurSite: 8 }), [], 15);
    expect(r.duerp.misAJourAnnuel).toBe(true);
    expect(r.duerp.effectif).toBe(15);
    // L'en-tête, lui, dit le site.
    expect(r.duerp.effectifSurSite).toBe(8);
  });

  it("effectif < 11 → pas d'annualité imposée", () => {
    const r = construireChezVous(etabBureau({ effectifSurSite: 8 }), [], 8);
    expect(r.duerp.misAJourAnnuel).toBe(false);
  });

  it("le seuil exporté correspond à R. 4121-2", () => {
    expect(SEUIL_MAJ_ANNUELLE_DUERP).toBe(11);
  });
});

describe("construireChezVous — domaines", () => {
  it("bureau avec élec + extincteurs → domaines électricité et incendie, dans l'ordre du référentiel", () => {
    const r = construireChezVous(etabBureau(), [elec(), extincteur()], 12);
    const ids = r.domaines.map((d) => d.domaine);
    expect(ids).toContain("electricite");
    expect(ids).toContain("incendie");
    expect(ids.indexOf("electricite")).toBeLessThan(ids.indexOf("incendie"));
    const elecDom = r.domaines.find((d) => d.domaine === "electricite")!;
    expect(elecDom.nbObligations).toBeGreaterThan(0);
    expect(elecDom.equipements).toContain("TGBT");
    expect(elecDom.raisons.length).toBeGreaterThan(0);
  });

  it("les périodicités sont triées de la plus fréquente à la plus espacée, sans doublon", () => {
    const r = construireChezVous(etabBureau(), [elec()], 12);
    const elecDom = r.domaines.find((d) => d.domaine === "electricite")!;
    expect(new Set(elecDom.periodicites).size).toBe(
      elecDom.periodicites.length,
    );
    // annuelle (rang 4) avant mise_en_service_uniquement (rang 9)
    const iAnnuelle = elecDom.periodicites.indexOf("annuelle");
    const iMes = elecDom.periodicites.indexOf("mise_en_service_uniquement");
    if (iAnnuelle !== -1 && iMes !== -1) {
      expect(iAnnuelle).toBeLessThan(iMes);
    }
  });

  it("les raisons sont dédupliquées entre obligations d'un même domaine", () => {
    const r = construireChezVous(etabBureau(), [elec()], 12);
    const elecDom = r.domaines.find((d) => d.domaine === "electricite")!;
    expect(new Set(elecDom.raisons).size).toBe(elecDom.raisons.length);
  });

  it("ERP pur avec ascenseur → domaine ascenseur présent (disjonction des régimes)", () => {
    const erpPur = etabBureau({
      estEtablissementTravail: false,
      estERP: true,
      typeErp: "M",
      categorieErp: "N3",
    });
    const r = construireChezVous(erpPur, [
      {
        id: "eq-asc",
        libelle: "Ascenseur",
        categorie: "ASCENSEUR",
        caracteristiques: null,
      },
    ], 12);
    expect(r.domaines.map((d) => d.domaine)).toContain("ascenseur");
  });
});

describe("construireChezVous — trous honnêtes", () => {
  it("catégorie AUTRE déclarée → signalée comme sans obligation générée", () => {
    const r = construireChezVous(etabBureau(), [elec(), autre()], 12);
    expect(r.categoriesSansObligation).toContain("AUTRE");
    expect(r.categoriesSansObligation).not.toContain(
      "INSTALLATION_ELECTRIQUE",
    );
  });

  it("aucun équipement déclaré → aucunEquipement, mais pas zéro obligation", () => {
    // Ce test figeait `domaines: []` jusqu'au 2026-08-27, et il figeait donc
    // un faux négatif : un employeur sans appareil déclaré lisait, dans un
    // guide qui s'intitule « chez vous », qu'il ne lui incombait rien. Or
    // R. 4222-20 lui impose d'entretenir et de contrôler l'ensemble de ses
    // installations d'aération, déclarées ou non (ADR-022).
    const r = construireChezVous(etabBureau(), [], 12);
    expect(r.aucunEquipement).toBe(true);
    expect(r.categoriesSansObligation).toEqual([]);

    // LA GARANTIE, et elle ne nomme aucun domaine.
    //
    // Ce que ce test existe pour interdire, c'est la page vide : un employeur
    // qui n'a rien déclaré lisant, dans un guide qui s'intitule « chez vous »,
    // que rien ne lui incombe. Cette phrase-là ne se périme pas.
    //
    // L'assertion précédente était une LISTE EXHAUSTIVE écrite à la main. Elle
    // a cassé à chaque lot de couverture, et les trois lots du 2026-08-31 l'ont
    // réécrite chacun de son côté : deux d'entre eux ont affirmé, tous les
    // deux, que l'écart « mesure exactement ce que ce lot a livré » — l'un
    // annonçait quatre domaines, l'autre deux, la réponse était cinq. Le
    // troisième, prévenu, a écrit ce que lui seul ajoutait et laissé le total
    // à l'intégration. Un test dont la réparation consiste à recopier ce que
    // le code rend cesse de mesurer quoi que ce soit — et celui-ci se réparait
    // ainsi. Il ne nomme donc plus aucun domaine : ce que la liste garantissait
    // vraiment est repris par les trois assertions qui suivent.
    expect(r.domaines.length).toBeGreaterThan(0);

    // Et il apparaît SANS équipement rattaché : c'est ce couple qui distingue
    // « vous n'avez rien déclaré » de « rien ne vous incombe ».
    for (const d of r.domaines) {
      expect(d.equipements, d.domaine).toEqual([]);
      expect(d.raisons.join(" "), d.domaine).toContain(
        "porte sur l'établissement",
      );
    }
  });

  /**
   * La borne haute, sans liste non plus.
   *
   * `toEqual([...])` faisait deux métiers à la fois : garantir qu'il y a
   * quelque chose, et surveiller qu'il n'y a rien de trop. Le second est réel
   * — une obligation d'équipement qui apparaîtrait sans équipement déclaré
   * serait un faux positif — mais il n'a pas besoin d'une liste pour être
   * vérifié : il se dit en une phrase que le référentiel rend vraie ou fausse.
   */
  it("sans équipement déclaré, tout ce qui s'affiche est porté par l'établissement", () => {
    for (const etab of [
      etabBureau(),
      etabBureau({ effectifSurSite: 3 }),
      etabBureau({ estEtablissementTravail: false, estERP: true, typeErp: "N", categorieErp: "N5" }),
    ]) {
      for (const a of determineObligationsApplicables(etab, [])) {
        expect(
          porteurDe(a.obligation),
          `${a.obligation.id} s'affiche chez un établissement qui n'a rien ` +
            "déclaré : elle doit donc être portée par l'établissement",
        ).toBe("etablissement");
      }
    }
  });

  /**
   * Le guide ne perd ni n'invente rien par rapport au moteur.
   *
   * C'est l'assertion qui remplace vraiment la liste, et elle n'est pas une
   * tautologie : `construireChezVous` est une COUCHE au-dessus de
   * `determineObligationsApplicables` — elle regroupe par domaine, déduplique
   * les raisons, trie les périodicités. Un domaine peut s'y perdre sans que le
   * moteur ait tort, et c'est précisément le genre de faux négatif que ce
   * fichier traque.
   *
   * Elle ne demandera jamais de mise à jour à la main : quand un lot ajoute
   * une obligation portée par l'établissement, les deux côtés bougent
   * ensemble. Elle ne tombe que si le guide diverge du moteur — ce qui est le
   * seul défaut qu'elle puisse constater.
   */
  it("le guide montre exactement les domaines que le moteur retient", () => {
    for (const etab of [
      etabBureau(),
      etabBureau({ effectifSurSite: 60, personnesPresentesHabituellement: 60 }),
      etabBureau({ estEtablissementTravail: false, estERP: true, typeErp: "N", categorieErp: "N5" }),
    ]) {
      const duMoteur = [
        ...new Set(
          determineObligationsApplicables(etab, []).map(
            (a) => a.obligation.domaine,
          ),
        ),
      ].sort();
      const duGuide = construireChezVous(etab, [], 12)
        .domaines.map((d) => d.domaine)
        .sort();
      expect(duGuide).toEqual(duMoteur);
    }
  });
});
