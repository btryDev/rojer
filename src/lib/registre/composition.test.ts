import { describe, expect, it } from "vitest";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching";
import {
  composerRegistre,
  composerRegistreParPartie,
  evaluerSection,
} from "./composition";
import { SECTIONS_REGISTRE, type SectionRegistre } from "./sections";

function etabBureau(
  over: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab_bureau",
    effectifSurSite: 8,
    effectifEntreprise: 8,
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

function etabErp(over: Partial<EtablissementMatching> = {}): EtablissementMatching {
  return etabBureau({
    id: "etab_erp",
    estERP: true,
    typeErp: "N",
    categorieErp: "N5",
    effectifSurSite: 12,
    effectifEntreprise: 12,
    ...over,
  });
}

function equipement(
  categorie: string,
  libelle: string,
  id = `eq_${categorie}`,
): EquipementMatching {
  return {
    id,
    libelle,
    categorie: categorie as EquipementMatching["categorie"],
    caracteristiques: null,
  };
}

const extincteur = () => equipement("EXTINCTEUR", "Extincteurs du hall");
const alarme = () => equipement("ALARME_INCENDIE", "Alarme type 4");

describe("evaluerSection — déclencheur de régime", () => {
  const ficheErp: SectionRegistre = {
    id: "test-erp",
    partie: "1",
    titre: "Fiche ERP",
    typologies: { erp: true },
    attendu: "…",
  };

  it("écarte la fiche ERP d'un bureau non-ERP", () => {
    expect(evaluerSection(ficheErp, etabBureau(), [])).toBeNull();
  });

  it("retient la fiche ERP d'un ERP, avec sa raison", () => {
    const due = evaluerSection(ficheErp, etabErp(), []);
    expect(due).not.toBeNull();
    expect(due?.raisons.length).toBeGreaterThan(0);
  });
});

describe("evaluerSection — déclencheur d'équipement", () => {
  const ficheExtincteurs: SectionRegistre = {
    id: "test-extincteurs",
    partie: "2.1",
    titre: "Extincteurs mobiles",
    categoriesEquipement: ["EXTINCTEUR"],
    attendu: "…",
  };

  it("écarte la fiche quand aucun équipement de la catégorie n'est déclaré", () => {
    expect(evaluerSection(ficheExtincteurs, etabErp(), [alarme()])).toBeNull();
  });

  it("retient la fiche et nomme l'équipement déclencheur", () => {
    const due = evaluerSection(ficheExtincteurs, etabBureau(), [extincteur()]);
    expect(due?.raisons).toContain("équipement déclaré : Extincteurs du hall");
  });

  it("ne dépend pas du régime : un bureau non-ERP avec extincteurs a la fiche", () => {
    expect(evaluerSection(ficheExtincteurs, etabBureau(), [extincteur()])).not.toBeNull();
  });

  it("compte les équipements quand il y en a plusieurs", () => {
    const due = evaluerSection(ficheExtincteurs, etabBureau(), [
      extincteur(),
      equipement("EXTINCTEUR", "Extincteurs réserve", "eq_2"),
    ]);
    expect(due?.raisons.some((r) => r.startsWith("2 équipements déclarés"))).toBe(true);
  });
});

describe("evaluerSection — régime et équipement lus en ET", () => {
  const fiche: SectionRegistre = {
    id: "test-et",
    partie: "3.1",
    titre: "Fiche cumulée",
    typologies: { erp: true },
    categoriesEquipement: ["EXTINCTEUR"],
    attendu: "…",
  };

  it("exige les deux critères", () => {
    expect(evaluerSection(fiche, etabBureau(), [extincteur()])).toBeNull();
    expect(evaluerSection(fiche, etabErp(), [])).toBeNull();
    expect(evaluerSection(fiche, etabErp(), [extincteur()])).not.toBeNull();
  });
});

describe("evaluerSection — fiche sans déclencheur", () => {
  it("est due dans tous les cas, et le dit plutôt que de rendre une raison vide", () => {
    const fiche: SectionRegistre = {
      id: "test-toujours",
      partie: "1",
      titre: "Renseignements généraux",
      attendu: "…",
    };
    const due = evaluerSection(fiche, etabBureau(), []);
    expect(due?.raisons).toEqual(["fiche due dans tous les cas"]);
  });
});

describe("composerRegistre — le catalogue réel", () => {
  it("un bureau de 8 personnes sans équipement n'a que les fiches inconditionnelles", () => {
    const dues = composerRegistre(etabBureau(), []);
    const ids = dues.map((d) => d.section.id);
    expect(ids).toContain("renseignements-generaux");
    expect(ids).not.toContain("renseignements-erp");
    expect(ids).not.toContain("service-securite-equipe");
    expect(ids).not.toContain("inv-colonnes-seches");
  });

  it("le seuil de R. 4227-34 commande les fiches d'exercices", () => {
    const sous = composerRegistre(etabBureau({ personnesPresentesHabituellement: 30 }), []);
    expect(sous.map((d) => d.section.id)).not.toContain("exercices-themes");

    const au = composerRegistre(etabBureau({ personnesPresentesHabituellement: 51 }), []);
    expect(au.map((d) => d.section.id)).toContain("exercices-themes");
  });

  it("la branche « matières inflammables » ouvre les exercices quel que soit l'effectif", () => {
    const dues = composerRegistre(
      etabBureau({ effectifSurSite: 3, manipuleMatieresR422722: true }),
      [],
    );
    expect(dues.map((d) => d.section.id)).toContain("exercices-themes");
  });

  it("déclarer un extincteur ouvre sa fiche d'inventaire ET sa fiche de vérification", () => {
    const ids = composerRegistre(etabBureau(), [extincteur()]).map((d) => d.section.id);
    expect(ids).toContain("inv-extincteurs");
    expect(ids).toContain("verif-extincteurs");
  });

  it("garde l'ordre du catalogue", () => {
    const dues = composerRegistre(etabErp(), [extincteur(), alarme()]);
    const ordreCatalogue = SECTIONS_REGISTRE.map((s) => s.id);
    const positions = dues.map((d) => ordreCatalogue.indexOf(d.section.id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("rend une raison non vide pour chaque fiche due", () => {
    for (const due of composerRegistre(etabErp(), [extincteur(), alarme()])) {
      expect(due.raisons.length, due.section.id).toBeGreaterThan(0);
    }
  });
});

describe("catalogue — service de sécurité et 5ᵉ catégorie", () => {
  // MS 45 à MS 52 relèvent du Livre II du règlement de sécurité, écarté en 5ᵉ
  // catégorie par PE 1 § 1. Ce qui subsiste en N5 vient de R. 143-44 2°.
  it("un ERP de 5ᵉ catégorie n'a ni encadrement ni équipe professionnelle", () => {
    const ids = composerRegistre(etabErp({ categorieErp: "N5" }), []).map(
      (d) => d.section.id,
    );
    expect(ids).not.toContain("service-securite-encadrement");
    expect(ids).not.toContain("service-securite-equipe");
    expect(ids).not.toContain("service-securite-surveillance");
  });

  it("un ERP de 5ᵉ catégorie doit malgré tout nommer ses personnes désignées", () => {
    const ids = composerRegistre(etabErp({ categorieErp: "N5" }), []).map(
      (d) => d.section.id,
    );
    expect(ids).toContain("service-securite-personnes-designees");
  });

  it("un ERP de 2ᵉ catégorie a l'appareil complet, sans la fiche allégée", () => {
    const ids = composerRegistre(etabErp({ categorieErp: "N2" }), []).map(
      (d) => d.section.id,
    );
    expect(ids).toContain("service-securite-encadrement");
    expect(ids).toContain("service-securite-equipe");
    expect(ids).not.toContain("service-securite-personnes-designees");
  });

  it("un bureau non-ERP n'a aucune fiche de service de sécurité", () => {
    const ids = composerRegistre(etabBureau(), []).map((d) => d.section.id);
    expect(ids.filter((i) => i.startsWith("service-securite-"))).toEqual([]);
  });
});

describe("catalogue — exercices : deux fondements lus en OU", () => {
  it("côté travail : le seuil de R. 4227-34 suffit, hors ERP", () => {
    const ids = composerRegistre(
      etabBureau({ personnesPresentesHabituellement: 51 }),
      [],
    ).map((d) => d.section.id);
    expect(ids).toContain("exercices-themes");
  });

  it("côté ERP : le 5° de R. 143-44 suffit, sous le seuil et en 5ᵉ catégorie", () => {
    const ids = composerRegistre(
      etabErp({ categorieErp: "N5", effectifSurSite: 20 }),
      [],
    ).map((d) => d.section.id);
    expect(ids).toContain("exercices-themes");
    expect(ids).toContain("exercices-comptes-rendus");
  });

  it("ni l'un ni l'autre : un petit bureau non-ERP n'a pas la fiche", () => {
    const ids = composerRegistre(etabBureau({ effectifSurSite: 8 }), []).map(
      (d) => d.section.id,
    );
    expect(ids).not.toContain("exercices-themes");
  });
});

describe("composerRegistreParPartie", () => {
  it("n'annonce aucune partie vide", () => {
    const parties = composerRegistreParPartie(etabBureau(), []);
    for (const p of parties) {
      expect(p.sections.length, p.id).toBeGreaterThan(0);
    }
  });

  it("un bureau sans équipement n'a ni partie 2.1 ni partie 2.2", () => {
    const ids = composerRegistreParPartie(etabBureau(), []).map((p) => p.id);
    expect(ids).not.toContain("2.1");
    expect(ids).not.toContain("2.2");
  });

  it("les parties sortent dans l'ordre du document", () => {
    const ids = composerRegistreParPartie(etabErp(), [extincteur(), alarme()]).map((p) => p.id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("catalogue — invariants structurels", () => {
  it("aucun identifiant de fiche en double", () => {
    const ids = SECTIONS_REGISTRE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque fiche annonce ce qu'elle attend", () => {
    for (const s of SECTIONS_REGISTRE) {
      expect(s.attendu.length, s.id).toBeGreaterThan(10);
    }
  });

  it("une fiche de vérification a toujours la fiche d'inventaire correspondante", () => {
    const ids = new Set(SECTIONS_REGISTRE.map((s) => s.id));
    for (const s of SECTIONS_REGISTRE) {
      if (s.partie === "3.1" || s.partie === "3.2") {
        const inventaire = s.id.replace(/^verif-/, "inv-");
        if (ids.has(inventaire)) {
          const inv = SECTIONS_REGISTRE.find((x) => x.id === inventaire)!;
          expect(inv.categoriesEquipement, s.id).toEqual(s.categoriesEquipement);
        }
      }
    }
  });
});
