import { describe, expect, it } from "vitest";
import {
  obligationParId,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { AIDE_GROUPE_ELECTROGENE, DESCRIPTION_CATEGORIE } from "./labels";
import { CHAMPS_TRI_ETAT, VALEURS_TRI_ETAT } from "./schema";
import { EXPLICATION_NIVEAU_AUDIT, estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import type { CategorieEquipement, Periodicite } from "@/lib/referentiels/types-communs";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";

/**
 * L'aide de la question « groupe électrogène » dit ce que chaque réponse
 * déclenche, et cite ce qui le fonde — lu dans le référentiel, pas recopié de
 * mémoire. Elle a cité EL 20 (installations temporaires) après que le
 * référentiel l'avait corrigé (C39) ; la case est devenue une question à
 * trois états le 2026-09-27 (C41).
 */
const GOUVERNEES = [
  "elec-erp-groupe-electrogene-annuel",
  "elec-erp-groupe-electrogene-quinzaine",
];

describe("aide de la question groupe électrogène", () => {
  it("ne cite pas EL 20", () => {
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/EL\s*20\b/);
  });

  it("est une question à trois états", () => {
    expect(CHAMPS_TRI_ETAT).toContain("aGroupeElectrogene");
  });

  // ~~« par une condition qui survit au silence »~~ (C41, `non_infirmee`) —
  // rayé le 2026-10-13, décision de la propriétaire : un « oui » est exigé.
  it("gouverne les deux lignes d'EL 18 § 4, par une condition qui exige « oui » (2026-10-13)", () => {
    const gouvernees = obligationsConformite.filter((o) =>
      (o.conditions ?? []).some(
        (c) => "propriete" in c && c.propriete === "aGroupeElectrogene",
      ),
    );
    expect(gouvernees.map((o) => o.id).sort()).toEqual(GOUVERNEES);
    for (const o of gouvernees) {
      expect(o.conditions, o.id).toEqual([
        {
          // ~~type: "equipement_propriete_non_infirmee"~~ — 2026-10-13.
          type: "equipement_propriete_booleenne",
          categorie: "INSTALLATION_ELECTRIQUE",
          propriete: "aGroupeElectrogene",
          valeur: true,
        },
      ]);
      expect(o.referencesLegales[0].reference, o.id).toContain("EL 18 § 4");
    }
  });

  it("dit le rythme de chacune, lu dans le référentiel", () => {
    expect(obligationParId("elec-erp-groupe-electrogene-annuel")!.periodicite).toBe(
      "mensuelle",
    );
    expect(
      obligationParId("elec-erp-groupe-electrogene-quinzaine")!.periodicite,
    ).toBe("bimensuelle");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("art. EL 18 § 4");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("chaque mois");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("toutes les deux semaines");
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/annuel/i);
    // Rien hors ERP : les deux lignes portent `erp: true`, le texte le dit.
    expect(AIDE_GROUPE_ELECTROGENE).toContain("recevant du public seulement");
    // Plus de case : le texte ne peut plus parler de « cochée ».
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/coch/i);
  });

  it("ne promet rien sans « oui » et ne conseille pas de laisser la question en suspens (2026-10-13)", () => {
    // L'aide disait « Avec « Oui » ou « Je ne sais pas encore », le calendrier
    // suit… » et finissait par « En cas de doute, laissez « Je ne sais pas
    // encore » » : vrai sous `non_infirmee`, faux sous `booleenne`.
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/« Oui » ou « Je ne sais pas encore »/);
    expect(AIDE_GROUPE_ELECTROGENE).not.toMatch(/laissez/i);
    // ~~« Avec « Non » ou « Je ne sais pas encore », aucune des deux n'est
    // suivie. »~~ — 2026-10-13, seconde décision : la réponse est exigée en
    // ERP, l'aide le dit et ne présente plus le silence comme une réponse.
    expect(AIDE_GROUPE_ELECTROGENE).toContain("la réponse y est exigée");
    expect(AIDE_GROUPE_ELECTROGENE).toContain("Avec « Non », aucune des deux n'est suivie.");
  });

  it("nomme les trois réponses par les libellés mêmes du menu", () => {
    const citees = [...AIDE_GROUPE_ELECTROGENE.matchAll(/« ([^»]+) »/g)].map(
      (m) => m[1],
    );
    const libelles: string[] = VALEURS_TRI_ETAT.map((v) => v.label);
    expect(new Set(citees)).toEqual(new Set(libelles));
  });

  it("porte la réserve du livre II, comme la référence de la ligne", () => {
    for (const id of GOUVERNEES) {
      expect(obligationParId(id)!.referencesLegales[0].reference).toMatch(
        /livre II(?!I)/,
      );
    }
    expect(AIDE_GROUPE_ELECTROGENE).toMatch(/livre II(?!I)/);
  });
});

describe("aide de l'installation de gaz : la double ligne s'explique (revue du 2026-10-14, point 5)", () => {
  // Une cuisine au gaz déclarée porte déjà GZ 15 ; déclarer aussi
  // l'installation en ajoute une seconde ligne. L'aide le dit, pour que le
  // dirigeant comprenne les deux lignes. Éprouvé en retirant la phrase.
  it("dit que l'appareil de cuisson au gaz porte déjà la vérification annuelle", () => {
    const aide = DESCRIPTION_CATEGORIE.INSTALLATION_GAZ ?? "";
    expect(aide).toMatch(/appareil de cuisson au gaz déjà déclaré porte déjà cette vérification annuelle/);
    expect(aide).toMatch(/seconde ligne/);
    expect(aide).toContain("GZ 15");
  });
});

describe("aide de l'installation frigorifique : la chambre froide (2026-10-14)", () => {
  it("dit les trois dispositifs de l'arrêté du 30 septembre 1957, et que Rojer ne les suit pas", () => {
    const aide = DESCRIPTION_CATEGORIE.INSTALLATION_FRIGORIFIQUE ?? "";
    expect(aide).toContain("arrêté du 30 septembre 1957");
    for (const art of ["art. 2", "art. 3", "art. 4"]) expect(aide).toContain(art);
    expect(aide).toMatch(/s'ouvrir à la main de l'intérieur/);
    expect(aide).toMatch(/avertissement sonore/);
    expect(aide).toMatch(/voyant lumineux/);
    expect(aide).toContain("Rojer ne suit pas");
  });

  it("aucune obligation n'est créée sur ce texte (décision de la propriétaire)", () => {
    const citant = obligationsConformite.filter((o) =>
      o.referencesLegales.some((r) => r.reference.includes("30 septembre 1957")),
    );
    expect(citant).toEqual([]);
  });
});

// 2026-10-17, relecture de B (contrôle visuel de c6) : les aides de l'appareil
// respiratoire et du gilet annonçaient « tous les douze mois » alors que leurs
// lignes sont au niveau audit (ADR-042). Une aide qui dit le rythme d'une ligne
// audit, sans ligne servie du même rythme sur la catégorie, doit dire qu'elle
// n'est pas suivie.

/**
 * Les mots par lesquels une aide dit un rythme. Borne basse, pas une liste
 * close : un rythme écrit autrement passe. [Suites de B, 2026-10-17 : « tous
 * les ans », les chiffres, biennal, triennal, hebdomadaire ajoutés.]
 */
const MOTS_DU_RYTHME: Partial<Record<Periodicite, RegExp>> = {
  hebdomadaire: /chaque semaine|hebdomadaire|\b1 fois par semaine/i,
  mensuelle: /chaque mois|tous les mois|mensuel/i,
  trimestrielle: /trois mois|\b3 mois|trimestriel/i,
  semestrielle: /six mois|\b6 mois|semestriel/i,
  annuelle: /douze mois|\b12 mois|une fois par an|tous les ans|\b(un|1) an\b|annuel|chaque année/i,
  biennale: /deux ans|\b2 ans|biennal/i,
  triennale: /trois ans|\b3 ans|triennal/i,
  quadriennale: /quatre ans|\b4 ans|quadriennal/i,
  quinquennale: /cinq ans|\b5 ans|quinquennal/i,
  decennale: /dix ans|\b10 ans|décennal/i,
};

/**
 * Le rythme d'une ligne audit annoncé par une aide qui ne dit pas le niveau
 * audit. Le rythme est celui que la ligne date, `periodiciteEffective` —
 * `rythmeRetenu` compris (la révision décennale de l'extincteur hors ERP n'a
 * que `autre` pour texte, et dix ans par la norme).
 *
 * ~~Exemptée si une ligne servie de même rythme existe sur la catégorie~~
 * [suites de B : l'exemption couvrait la décennale de l'extincteur par sa
 * jumelle ERP (MS 38 § 4), alors qu'hors ERP elle n'est pas suivie. Une
 * exemption « par objet » demanderait de savoir que deux lignes visent le même
 * acte pour les mêmes établissements, ce que le modèle ne dit pas : elle n'est
 * pas écrite. Une aide qui annonce le rythme d'une ligne audit dit le niveau
 * audit, même si une ligne sœur est servie.]
 */
function rythmesAuditNonDits(aides: Partial<Record<CategorieEquipement, string>>): string[] {
  const parCat = (c: string) =>
    obligationsConformite.filter((o) => ((o.categoriesEquipement ?? []) as readonly string[]).includes(c));
  return Object.entries(aides).flatMap(([c, aide]) =>
    parCat(c)
      .filter((o) => estNiveauAudit(o))
      .filter((o) => {
        const mots = MOTS_DU_RYTHME[periodiciteEffective(o)];
        return Boolean(mots?.test(aide ?? "")) && !(aide ?? "").includes(EXPLICATION_NIVEAU_AUDIT);
      })
      .map((o) => `${c} → ${o.id}`),
  );
}

describe("une aide ne promet pas le rythme d'une ligne au niveau audit (2026-10-17)", () => {
  it("aucune aide n'annonce le rythme d'une ligne audit sans dire qu'elle n'est pas suivie", () => {
    expect(rythmesAuditNonDits(DESCRIPTION_CATEGORIE)).toEqual([]);
  });

  it("borne basse : les deux catégories en cause disent bien le niveau audit", () => {
    expect(DESCRIPTION_CATEGORIE.EPI_RESPIRATOIRE).toContain(EXPLICATION_NIVEAU_AUDIT);
    expect(DESCRIPTION_CATEGORIE.EPI_GILET_SAUVETAGE).toContain(EXPLICATION_NIVEAU_AUDIT);
  });

  it("cassure : l'aide de l'extincteur qui annonce la révision tous les dix ans sans le dire est vue (rythme retenu)", () => {
    const casse = {
      ...DESCRIPTION_CATEGORIE,
      EXTINCTEUR: `${DESCRIPTION_CATEGORIE.EXTINCTEUR} Révision en atelier tous les dix ans.`,
    };
    expect(rythmesAuditNonDits(casse)).toEqual(["EXTINCTEUR → incendie-travail-extincteurs-revision-atelier-decennale"]);
  });

  it("cassure : l'aide de l'appareil respiratoire sans la mention est vue", () => {
    const casse = {
      ...DESCRIPTION_CATEGORIE,
      EPI_RESPIRATOIRE: DESCRIPTION_CATEGORIE.EPI_RESPIRATOIRE!.replace(EXPLICATION_NIVEAU_AUDIT, ""),
    };
    expect(rythmesAuditNonDits(casse)).toEqual(["EPI_RESPIRATOIRE → epi-verification-generale-periodique-respiratoire"]);
  });
});
