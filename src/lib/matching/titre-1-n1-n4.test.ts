import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { DESCRIPTION_GN_10 } from "@/lib/referentiels/conformite/texte-gn10";
import { CORPUS } from "@/lib/referentiels/corpus";
import { manquesAnnoncesDuDossier } from "@/lib/perimetre/manques-annonces";

/**
 * Sous-lot C du plan « mise à jour du référentiel » (2026-10-17) : les états
 * permanents du livre II, titre Ier, servis aux ERP des catégories 1 à 4.
 *
 * Ce que ces tests tiennent : qui reçoit chaque ligne (catégorie, matériel
 * déclaré, réponse à la question du SSI de catégorie A ou B), et la phrase
 * GN 10 là où la décision Q7 de c6 la veut — et seulement là.
 */

const PLAN = "incendie-erp-plan-intervention-entrees";
const APPEL = "incendie-erp-modalites-appel-pompiers-affichees";
const PRESENCE_QUALIFIEE = "incendie-erp-personnel-qualifie-detection";
const CONTRAT_SSI = "incendie-erp-ssi-contrat-entretien";
const NOTICE_BAES = "incendie-erp-eclairage-securite-notice-registre";
const CONTRAT_PORTES = "porte-auto-erp-contrat-entretien";
const AVIS = "incendie-erp-avis-controle-affiche";
const AVIS_5_SOMMEIL = "incendie-erp-5-sommeil-avis-controle-affiche";
const ARRET_URGENCE = "cuisson-erp-consignes-arret-urgence";
const EXPLOITANT = "incendie-erp-exploitant-present-public";

const DIX = [
  PLAN,
  APPEL,
  PRESENCE_QUALIFIEE,
  CONTRAT_SSI,
  NOTICE_BAES,
  CONTRAT_PORTES,
  AVIS,
  AVIS_5_SOMMEIL,
  ARRET_URGENCE,
  EXPLOITANT,
];

function erp(
  categorieErp: EtablissementMatching["categorieErp"],
  autres: Partial<EtablissementMatching> = {},
): EtablissementMatching {
  return {
    id: "etab",
    effectifSurSite: 8,
    effectifEntreprise: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "N",
    typesErpAutres: [],
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
    ...autres,
  };
}

function appareil(categorie: EquipementMatching["categorie"]): EquipementMatching {
  return { id: `eq-${categorie}`, libelle: categorie, categorie, caracteristiques: null };
}

function servies(etab: EtablissementMatching, eqs: EquipementMatching[] = []): string[] {
  return determineObligationsApplicables(etab, eqs)
    .map((a) => a.obligation.id)
    .filter((id) => DIX.includes(id));
}

describe("sous-lot C — les dix lignes existent, et une seule fois", () => {
  it("chaque identifiant est au référentiel, état permanent, porteur établissement", () => {
    for (const id of DIX) {
      const o = obligationsConformite.find((x) => x.id === id);
      expect(o, id).toBeDefined();
      expect(o?.nature, id).toBe("etat_permanent");
      expect(o?.porteur, id).toBe("etablissement");
      expect(o?.usageEcran, id).not.toBeNull();
    }
  });
});

describe("restaurant de 3ᵉ catégorie sans matériel déclaré", () => {
  it("reçoit le plan, l'appel des pompiers, l'avis et la présence de l'exploitant — rien de ce qui naît d'un matériel", () => {
    expect(servies(erp("N3")).sort()).toEqual([APPEL, AVIS, EXPLOITANT, PLAN].sort());
  });
});

describe("5ᵉ catégorie : le livre II ne s'applique pas, sauf renvoi exprès", () => {
  const tout = [
    appareil("ALARME_INCENDIE"),
    appareil("BAES"),
    appareil("PORTE_AUTO"),
    appareil("APPAREIL_CUISSON_ERP"),
  ];
  it("sans locaux à sommeil : aucune des dix, même tout déclaré et SSI A ou B", () => {
    expect(
      servies(
        erp("N5", { typeErp: "O", comporteLocauxSommeilPublic: false, ssiCategorieAouB: true }),
        tout,
      ),
    ).toEqual([]);
  });
  it("hôtel avec locaux à sommeil pour le public : l'avis de GE 5, par PE 37, et lui seul (le moteur ne lit le sommeil que pour les types où il est plausible)", () => {
    expect(
      servies(
        erp("N5", { typeErp: "O", comporteLocauxSommeilPublic: true, ssiCategorieAouB: true }),
        tout,
      ),
    ).toEqual([AVIS_5_SOMMEIL]);
  });
  it("en 4ᵉ catégorie avec locaux à sommeil : l'avis N1–N4, pas celui de PE 37", () => {
    const res = servies(erp("N4", { typeErp: "O", comporteLocauxSommeilPublic: true }));
    expect(res).toContain(AVIS);
    expect(res).not.toContain(AVIS_5_SOMMEIL);
  });
});

describe("la présence qualifiée et le contrat du SSI : alarme déclarée ET SSI de catégorie A ou B", () => {
  const alarme = [appareil("ALARME_INCENDIE")];
  it("« oui » : les deux sont servies", () => {
    const res = servies(erp("N3", { ssiCategorieAouB: true }), alarme);
    expect(res).toContain(PRESENCE_QUALIFIEE);
    expect(res).toContain(CONTRAT_SSI);
  });
  it("pas répondu : les deux sont retenues, à confirmer (règle du non-renseigné)", () => {
    const applicables = determineObligationsApplicables(erp("N3"), alarme);
    for (const id of [PRESENCE_QUALIFIEE, CONTRAT_SSI]) {
      const a = applicables.find((x) => x.obligation.id === id);
      expect(a, id).toBeDefined();
      // ~~`toMatch(/ssi/i)` sur la ligne sérialisée~~ — toujours vrai (l'id
      // contient « ssi ») : revue indépendante du 2026-10-17. La marque qui
      // compte est la question restée sans réponse.
      expect(a?.sansReponse ?? [], id).toContain("ssi_categorie_ab");
    }
  });
  it("« non » : les deux sont retirées", () => {
    const res = servies(erp("N3", { ssiCategorieAouB: false }), alarme);
    expect(res).not.toContain(PRESENCE_QUALIFIEE);
    expect(res).not.toContain(CONTRAT_SSI);
  });
  it("« oui » sans alarme déclarée : aucune des deux", () => {
    const res = servies(erp("N3", { ssiCategorieAouB: true }));
    expect(res).not.toContain(PRESENCE_QUALIFIEE);
    expect(res).not.toContain(CONTRAT_SSI);
  });
});

describe("les lignes qui naissent d'un matériel déclaré", () => {
  it("BAES → la notice de l'éclairage de sécurité", () => {
    expect(servies(erp("N3"), [appareil("BAES")])).toContain(NOTICE_BAES);
  });
  it("porte automatique → le contrat ; un portail automatique seul, non (CO 48 vise les portes)", () => {
    expect(servies(erp("N3"), [appareil("PORTE_AUTO")])).toContain(CONTRAT_PORTES);
    expect(servies(erp("N3"), [appareil("PORTAIL_AUTO")])).not.toContain(CONTRAT_PORTES);
  });
  it("appareil de cuisson ERP → les consignes de l'arrêt d'urgence", () => {
    expect(servies(erp("N3"), [appareil("APPAREIL_CUISSON_ERP")])).toContain(ARRET_URGENCE);
  });
});

describe("chaque ligne dit sa temporalité (consigne de la propriétaire, 2026-10-17)", () => {
  it("les dix notes portent « TEMPORALITÉ : »", () => {
    const sans = DIX.filter(
      (id) => !(obligationsConformite.find((o) => o.id === id)?.notesInternes ?? "").includes("TEMPORALITÉ : "),
    );
    expect(sans).toEqual([]);
  });
});

describe("CH 58 : la ligne dit ce qu'elle ne sert pas (décision Q4 de c6)", () => {
  const d = obligationsConformite.find((o) => o.id === "aeration-erp-chauffage-ventilation-annuelle")?.description ?? "";
  it("le ramonage de CH 57 est dit non suivi", () => {
    expect(d).toMatch(/ne suit pas le ramonage/);
    expect(d).toContain("CH 57");
  });
  it("la ligne ne naît que d'une VMC ou d'une CTA, et nomme le stockage des combustibles", () => {
    expect(d).toMatch(/quand une VMC ou une centrale de traitement d'air est déclarée/);
    expect(d).toContain("stockage des combustibles");
  });
});

describe("GN 10 (décision Q7 de c6) : cité là où la disposition n'est ni administrative, ni un contrôle, ni de l'entretien", () => {
  const AVEC = [PLAN, APPEL, PRESENCE_QUALIFIEE, ARRET_URGENCE, EXPLOITANT];
  const SANS = [CONTRAT_SSI, NOTICE_BAES, CONTRAT_PORTES, AVIS, AVIS_5_SOMMEIL];
  const description = (id: string) =>
    obligationsConformite.find((o) => o.id === id)?.description ?? "";
  it("les cinq qui le portent le citent entier", () => {
    expect(AVEC.filter((id) => !description(id).includes(DESCRIPTION_GN_10))).toEqual([]);
  });
  it("les cinq autres ne le citent pas : il ne s'y applique pas", () => {
    expect(SANS.filter((id) => description(id).includes("GN 10"))).toEqual([]);
  });
  it("les deux listes font les dix, sans recouvrement", () => {
    expect([...AVEC, ...SANS].sort()).toEqual([...DIX].sort());
  });
});

describe("rubrique « Règlement de sécurité, catégories 1 à 4 »", () => {
  const faits = (categorieErp: string | null) => ({
    travail: true,
    habitation: false,
    categorieErp,
    epiPresents: null,
    operationsElectriques: null,
  });
  const rubrique = (categorieErp: string | null) =>
    manquesAnnoncesDuDossier(CORPUS, faits(categorieErp) as never).find(
      (d) => d.cle === "reglement_erp_1_4",
    );
  it("servie à un ERP des catégories 1 à 4, avec CO 10 et les annonces du sous-lot C", () => {
    const refs = rubrique("N3")?.articles.map((a) => a.ref) ?? [];
    expect(refs).toContain("CO 10");
    expect(refs).toContain("MS 46 § 3 — convention avec un organisateur, annexée au registre");
    expect(refs).toContain("EL 23 § 2 — vérification des installations électriques semi-permanentes");
    expect(refs).toContain("CH 52");
  });
  it("absente en 5ᵉ catégorie et hors ERP", () => {
    expect(rubrique("N5")).toBeUndefined();
    expect(rubrique(null)).toBeUndefined();
  });
});

describe("revue indépendante du sous-lot C (2026-10-17) : ce qui a été corrigé ne revient pas", () => {
  const o = (id: string) => obligationsConformite.find((x) => x.id === id);
  const desc = (id: string) => o(id)?.description ?? "";
  const notes = (id: string) => o(id)?.notesInternes ?? "";
  const corpus = (ref: string) =>
    CORPUS.flatMap((c) => [...c.articles]).find((a) => a.ref === ref) as
      | (Record<string, unknown> & { ref: string })
      | undefined;
  const champ = (ref: string, k: string) => String(corpus(ref)?.[k] ?? "");

  it("1. EC 13 : l'entretien « peut être réalisé » (une faculté), et la source centralisée est dite", () => {
    expect(desc(NOTICE_BAES)).toContain("« peut être réalisé dès qu'une anomalie est constatée »");
    expect(desc(NOTICE_BAES)).toContain("source centralisée");
  });
  it("2. MS 57 : les classements A–E et 1–4 sont dits venir de normes non lues", () => {
    for (const s of ["MS 53 § 2", "MS 62 § 1", "que Rojer n'a pas lues"]) {
      expect(desc(PRESENCE_QUALIFIEE)).toContain(s);
    }
  });
  it("3. MS 58 § 3 : le fascicule du CCTG (§ 7.3) est nommé non lu, sans référence NORME", () => {
    expect(desc(CONTRAT_SSI)).toMatch(/paragraphe 7\.3 du fascicule[^.]*que Rojer n'a pas lu/);
    expect(DIX.filter((id) => o(id)?.referencesLegales.some((r) => r.source === "NORME"))).toEqual([]);
  });
  it("4. GC 4 : la sur-application aux cuisines hors section I est dite (description et réserve)", () => {
    expect(desc(ARRET_URGENCE)).toContain("GC 1 § 3");
    expect(desc(ARRET_URGENCE)).toContain("20 kW ou moins");
    expect(champ("GC 4", "reserve")).toContain("seule section VI");
  });
  it("6. les motifs devenus faux sont rayés, et les `bloquePar` recopiés", () => {
    expect(champ("EL 23", "motif")).toContain("~~(`obligation_manquante`, cause `evenement`)~~");
    expect(champ("EC 13", "motif")).toContain("~~(`obligation_manquante`, cause `libre`)~~");
    for (const ref of [
      "MS 41",
      "GE 5",
      "MS 46 § 3 — convention avec un organisateur, annexée au registre",
      "EL 23 § 2 — vérification des installations électriques semi-permanentes",
    ]) {
      expect(champ(ref, "historique"), ref).toContain("Champ `bloquePar` retiré");
    }
  });
  it("7. DF 9 : l'entretien est dit un autre geste, non suivi", () => {
    expect(desc("incendie-erp-desenfumage-annuelle")).toMatch(/DF 9 fait aussi ENTRETENIR[^.]*Rojer ne le suit pas/);
  });
  it("8. MS 72 : l'assiette (tout le personnel / le personnel désigné) est dite", () => {
    expect(notes("incendie-erp-personnel-designe-moyens-secours")).toContain("tout entier");
    expect(champ("MS 72", "reserve")).toContain("tout entier");
  });
  it("remarques : MS 70 § 5 sans « téléphone », MS 41 dans la famille de sa sœur, EL 23 sans glose", () => {
    expect(desc(APPEL)).not.toContain("téléphone");
    expect(o(PLAN)?.usageEcran).toEqual(o("incendie-erp-5-sommeil-plans-affiches")?.usageEcran);
    const el23 = manquesAnnoncesDuDossier(CORPUS, {
      travail: true,
      habitation: false,
      categorieErp: "N3",
      epiPresents: null,
      operationsElectriques: null,
    } as never)
      .flatMap((d) => d.articles)
      .find((a) => a.ref.startsWith("EL 23 § 2"));
    expect(el23?.phrase).toBeDefined();
    expect(el23?.phrase).not.toContain("stands");
  });
});

describe("contrôle visuel de c6 (2026-10-17)", () => {
  it("b. MS 57 : le libellé dit le déclencheur du texte (la détection) et le repère de Rojer (SSI A ou B)", () => {
    const l = obligationsConformite.find((o) => o.id === PRESENCE_QUALIFIEE)?.libelle ?? "";
    // Relecture de c6 : « automatique » n'est pas dans le texte, et le
    // libellé reste court.
    expect(l).toContain("en présence d'une détection");
    expect(l).toContain("(repère : SSI de catégorie A ou B)");
    expect(l).not.toContain("automatique");
    expect(l.length).toBeLessThanOrEqual(130);
  });
});
