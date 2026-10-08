import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  MENTION_SUR_APPLICATION_5E,
  contexteDesSuggestions,
  suggererEquipements,
} from "./pre-remplissage";

function categories(out: ReturnType<typeof suggererEquipements>): string[] {
  return out.map((e) => e.categorie).sort();
}

describe("suggererEquipements — secteurs cibles V2", () => {
  it("restauration classique (NAF 56.10A) — ERP N cat 5 + travail", () => {
    const r = suggererEquipements({
      codeNaf: "56.10A",
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
    });
    const cats = categories(r);
    expect(cats).toContain("HOTTE_PRO");
    expect(cats).toContain("APPAREIL_CUISSON_ERP");
    expect(cats).toContain("INSTALLATION_ELECTRIQUE");
    expect(cats).toContain("EXTINCTEUR");
    expect(cats).toContain("BAES");
    expect(cats).toContain("ALARME_INCENDIE");
    expect(cats).toContain("VMC");
    expect(cats).toContain("INSTALLATION_FRIGORIFIQUE");
  });

  it("commerce de détail (NAF 47.11B) — ERP + travail", () => {
    const r = suggererEquipements({
      codeNaf: "47.11B",
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
    });
    const cats = categories(r);
    expect(cats).toContain("INSTALLATION_ELECTRIQUE");
    expect(cats).toContain("BAES");
    expect(cats).toContain("EXTINCTEUR");
    expect(cats).toContain("ALARME_INCENDIE");
    expect(cats).toContain("INSTALLATION_FRIGORIFIQUE");
  });

  it("l'installation frigorifique est suggérée avec sa raison, pas sans", () => {
    // Une suggestion sans motif vérifiable est une suggestion qu'on ne peut
    // pas défendre devant l'utilisateur : la raison cite l'article qui fonde
    // le contrôle d'étanchéité.
    for (const naf of ["56.10A", "47.11B"]) {
      const entree = suggererEquipements({
        codeNaf: naf,
        estEtablissementTravail: true,
        estERP: true,
        estIGH: false,
        estHabitation: false,
      }).find((e) => e.categorie === "INSTALLATION_FRIGORIFIQUE");
      expect(entree, naf).toBeDefined();
      expect(entree?.raison).toContain("R. 543-79");
      expect(entree?.raison).toContain("2024/573");
    }
  });

  it("le froid ne suit que le commerce alimentaire, pas tout le 47", () => {
    // `isCommerce` couvre tout le 47. Proposer une chambre froide à une
    // librairie, avec une raison de criticité 4, c'est suggérer une
    // obligation sur une supposition — et une suggestion se coche vite.
    const froid = (naf: string) =>
      categories(
        suggererEquipements({
          codeNaf: naf,
          estEtablissementTravail: true,
          estERP: true,
          estIGH: false,
          estHabitation: false,
        }),
      ).includes("INSTALLATION_FRIGORIFIQUE");

    // Alimentaire : supérette, boucherie, poissonnerie, marché.
    for (const naf of ["47.11B", "47.22Z", "47.23Z", "47.81Z"]) {
      expect(froid(naf), naf).toBe(true);
    }
    // Non alimentaire : librairie, prêt-à-porter, tabac, bricolage.
    for (const naf of ["47.61Z", "47.71Z", "47.26Z", "47.52B"]) {
      expect(froid(naf), naf).toBe(false);
    }
    // Le reste des suggestions du commerce ne bouge pas.
    const cats = categories(
      suggererEquipements({
        codeNaf: "47.61Z",
        estEtablissementTravail: true,
        estERP: true,
        estIGH: false,
        estHabitation: false,
      }),
    );
    expect(cats).toContain("BAES");
    expect(cats).toContain("EXTINCTEUR");
  });

  it("un bureau tertiaire ne se voit pas proposer d'installation frigorifique", () => {
    const cats = categories(
      suggererEquipements({
        codeNaf: "70.22Z",
        estEtablissementTravail: true,
        estERP: false,
        estIGH: false,
        estHabitation: false,
      }),
    );
    expect(cats).not.toContain("INSTALLATION_FRIGORIFIQUE");
  });

  it("bureau tertiaire (NAF 70.22Z) — travail seul", () => {
    const r = suggererEquipements({
      codeNaf: "70.22Z",
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
    });
    const cats = categories(r);
    expect(cats).toContain("INSTALLATION_ELECTRIQUE");
    expect(cats).toContain("BAES");
    expect(cats).toContain("ALARME_INCENDIE");
    expect(cats).toContain("VMC");
    expect(cats).toContain("EXTINCTEUR");
    // pas d'équipement ERP propre (MS 73…) puisque estERP=false
    expect(cats).not.toContain("DESENFUMAGE");
  });

  it("déduplique EXTINCTEUR quand à la fois travail + ERP", () => {
    const r = suggererEquipements({
      codeNaf: "56.10A",
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
    });
    const extincteurs = r.filter((e) => e.categorie === "EXTINCTEUR");
    expect(extincteurs.length).toBe(1);
  });

  it("IGH ajoute l'ascenseur, plus le désenfumage (IGH retiré le 2026-10-07)", () => {
    const base = {
      codeNaf: "70.10Z",
      estEtablissementTravail: true,
      estERP: false,
      estHabitation: false,
    };
    const cats = categories(suggererEquipements({ ...base, estIGH: true }));
    expect(cats).toContain("ASCENSEUR");
    expect(cats).not.toContain("DESENFUMAGE");
    // Borne basse : hors IGH, un bureau ne se voit pas suggérer d'ascenseur.
    expect(
      categories(suggererEquipements({ ...base, estIGH: false })),
    ).not.toContain("ASCENSEUR");
  });

  it("habitation seule — suggère la VMC (cas VMC-Gaz)", () => {
    const r = suggererEquipements({
      codeNaf: null,
      estEtablissementTravail: false,
      estERP: false,
      estIGH: false,
      estHabitation: true,
    });
    const cats = categories(r);
    expect(cats).toContain("VMC");
  });

  it("établissement sans aucun régime (cas improbable) — suggère rien", () => {
    const r = suggererEquipements({
      codeNaf: null,
      estEtablissementTravail: false,
      estERP: false,
      estIGH: false,
      estHabitation: false,
    });
    expect(r.length).toBe(0);
  });

  it("NAF inconnu — tombe sur les règles de typologie seulement", () => {
    const r = suggererEquipements({
      codeNaf: "99.99Z",
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
    });
    const cats = categories(r);
    // aucune règle sectorielle, mais règles travail → élec, VMC, extincteurs
    expect(cats).toContain("INSTALLATION_ELECTRIQUE");
    expect(cats).toContain("VMC");
    expect(cats).toContain("EXTINCTEUR");
    // pas de hotte (pas de restauration)
    expect(cats).not.toContain("HOTTE_PRO");
  });
});

describe("suggererEquipements — la raison ne promet que ce que le référentiel produit", () => {
  /**
   * La suggestion de BAES au bureau non-ERP annonçait une « vérification
   * annuelle des blocs de sécurité ». Cette périodicité-là n'existe que dans
   * le régime ERP (arrêté du 25 juin 1980, art. EC 14 et EC 15) : hors ERP,
   * l'arrêté du 14 décembre 2011 pose un essai mensuel et un contrôle
   * semestriel de l'autonomie. L'outil promettait une échéance qu'il
   * n'allait pas calculer.
   */
  function raisonBaes(ctx: Parameters<typeof suggererEquipements>[0]): string {
    const e = suggererEquipements(ctx).find((x) => x.categorie === "BAES");
    expect(e).toBeDefined();
    return e!.raison;
  }

  it("bureau non-ERP : la raison cite le régime travail, pas une périodicité annuelle", () => {
    const raison = raisonBaes({
      codeNaf: "70.22Z",
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
    });
    expect(raison).toContain("R. 4227-14");
    expect(raison).toContain("14 décembre 2011");
    expect(raison).not.toMatch(/annuelle?/i);
  });

  it("commerce non-ERP : même correction, pas de renvoi implicite au régime ERP", () => {
    const raison = raisonBaes({
      codeNaf: "47.11B",
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
    });
    expect(raison).toContain("R. 4227-14");
    expect(raison).not.toMatch(/annuelle?/i);
  });

  it("ERP : la raison ERP prime et garde sa vérification annuelle", () => {
    const raison = raisonBaes({
      codeNaf: "47.11B",
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
    });
    expect(raison).toContain("EC 14");
    expect(raison).toMatch(/annuelle/i);
  });
});

describe("suggererEquipements — chaque entrée a une raison non vide", () => {
  it("tous les contextes possibles renvoient des raisons renseignées", () => {
    const combos: Parameters<typeof suggererEquipements>[0][] = [
      { codeNaf: "56.10A", estEtablissementTravail: true, estERP: true, estIGH: false, estHabitation: false },
      { codeNaf: "47.11B", estEtablissementTravail: true, estERP: true, estIGH: false, estHabitation: false },
      { codeNaf: "70.22Z", estEtablissementTravail: true, estERP: false, estIGH: false, estHabitation: false },
      { codeNaf: null,     estEtablissementTravail: false, estERP: false, estIGH: true,  estHabitation: true  },
    ];
    for (const ctx of combos) {
      for (const e of suggererEquipements(ctx)) {
        expect(e.raison.trim().length).toBeGreaterThan(10);
        expect(e.libelle.trim().length).toBeGreaterThan(3);
      }
    }
  });
});

describe("suggererEquipements — aucune référence n'est écrite en dur", () => {
  /**
   * Le garde-fou du doublon (amendement 2026-08-25). Ce module citait ses
   * articles dans des chaînes recopiées à la main, sans importer le
   * référentiel : corriger une référence dans `conformite/` laissait la
   * suggestion sur l'ancien texte. Quatre dérives avaient déjà pris, dont un
   * arrêté abrogé en 2018 encore affiché à l'utilisateur.
   *
   * Ce test relit chaque citation produite et exige qu'elle existe, mot pour
   * mot, dans `referencesLegales` d'une obligation. Il échoue donc aussi bien
   * si quelqu'un réintroduit une référence en dur que si une obligation citée
   * est retirée ou renommée.
   */
  const CONTEXTES: Parameters<typeof suggererEquipements>[0][] = [];
  for (const codeNaf of ["56.10A", "47.11B", "47.26Z", "70.22Z", null]) {
    for (const estEtablissementTravail of [true, false]) {
      for (const estERP of [true, false]) {
        for (const estIGH of [true, false]) {
          for (const estHabitation of [true, false]) {
            CONTEXTES.push({
              codeNaf,
              estEtablissementTravail,
              estERP,
              estIGH,
              estHabitation,
            });
          }
        }
      }
    }
  }

  const REFERENCES_CONNUES = new Set(
    obligationsConformite.flatMap((o) =>
      o.referencesLegales.map((r) => r.reference),
    ),
  );

  it("chaque citation affichée provient du référentiel de conformité", () => {
    let citationsVues = 0;

    for (const ctx of CONTEXTES) {
      for (const e of suggererEquipements(ctx)) {
        // `motif (référence ; référence).` — le motif ne contient jamais de
        // parenthèse, la première ouvre donc la citation. Les références, si.
        const m = /^(.*?) \((.*)\)\.$/.exec(e.raison);
        expect(m, `raison mal formée : ${e.raison}`).not.toBeNull();

        const [, motif, citations] = m!;
        // Un motif qui cite un article rouvre exactement la porte qu'on ferme.
        expect(motif, `article dans le motif : ${motif}`).not.toMatch(
          /\b(R\.|L\.|D\.|art\.|arrêté|règlement)\s/i,
        );

        for (const ref of citations.split(" ; ")) {
          expect(
            REFERENCES_CONNUES.has(ref),
            `référence absente du référentiel : « ${ref} » (${e.categorie})`,
          ).toBe(true);
          citationsVues += 1;
        }
      }
    }

    // Garde-fou du garde-fou : si le format change et que plus rien n'est
    // extrait, la boucle passerait à vide sans rien vérifier.
    expect(citationsVues).toBeGreaterThan(50);
  });

  it("aucun fondement déclaré ne pointe vers une obligation disparue", () => {
    // `citer()` lève `FondementInconnuError` ; aucun contexte ne doit y mener.
    for (const ctx of CONTEXTES) {
      expect(() => suggererEquipements(ctx)).not.toThrow();
    }
  });
});

describe("suggererEquipements — une citation du livre II dit la sur-application (C39)", () => {
  // La référence dit « — livre II, établissements des quatre premières
  // catégories » ; à côté d'une suggestion faite à un ERP de 5ᵉ, elle se lit
  // comme « pas pour vous » alors que le calendrier pose l'échéance. La
  // mention est ce qui réconcilie les deux, au même endroit.
  const ERP = {
    codeNaf: "47.11B",
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
  };

  it("les extincteurs d'un ERP portent la mention", () => {
    const e = suggererEquipements(ERP).find((x) => x.categorie === "EXTINCTEUR");
    expect(e?.raison).toContain("MS 38 § 4 — livre II");
    expect(e?.mention).toBe(MENTION_SUR_APPLICATION_5E);
  });

  it("une suggestion qui ne cite pas le livre II n'en porte pas", () => {
    const e = suggererEquipements({ ...ERP, estERP: false }).find(
      (x) => x.categorie === "EXTINCTEUR",
    );
    expect(e?.raison).not.toMatch(/livre II/);
    expect(e?.mention).toBeUndefined();
  });

  it("toute raison qui cite le livre II porte la mention, et elle seule", () => {
    for (const estERP of [true, false])
      for (const naf of ["56.10A", "47.11B", "69.20Z", null]) {
        for (const e of suggererEquipements({ ...ERP, codeNaf: naf, estERP })) {
          expect(Boolean(e.mention), e.raison).toBe(/livre II(?!I)/.test(e.raison));
        }
      }
  });
});

describe("un second établissement sans NAF propre (2026-09-27, A1)", () => {
  // `Etablissement.codeNaf` n'est renseigné que s'il diffère de celui de
  // l'entreprise. La page du parc le passait nu : un second restaurant sans
  // NAF propre perdait la hotte, la cuisson et le froid. Éprouvé en passant
  // `etab.codeNaf` seul dans `contexteDesSuggestions`.
  const secondRestaurant = {
    codeNaf: null,
    entreprise: { codeNaf: "56.10A" },
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
  };

  it("hérite du NAF de l'entreprise, et de ses suggestions sectorielles", () => {
    const cats = categories(suggererEquipements(contexteDesSuggestions(secondRestaurant)));
    expect(cats).toContain("HOTTE_PRO");
    expect(cats).toContain("APPAREIL_CUISSON_ERP");
  });

  it("un NAF propre l'emporte sur celui de l'entreprise", () => {
    expect(
      contexteDesSuggestions({ ...secondRestaurant, codeNaf: "47.11B" }).codeNaf,
    ).toBe("47.11B");
  });
});
