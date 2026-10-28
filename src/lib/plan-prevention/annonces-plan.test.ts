// Les constantes d'`annonces-plan.ts` : confrontées au verbatim du corpus
// (relu à la source le 2026-09-26), et suivies jusqu'au fichier 07 du ZIP.
// Le rendu du formulaire et de la fiche est tenu à part, par
// `src/components/plan-prevention/annonces-surfaces.test.tsx`, qui rend les
// deux écrans et y cherche chaque texte ENTIER.
//
// ÉPROUVÉ — voir C30 au journal des vérifications pour la liste des
// injections rejouées et leur résultat.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import { CODE_TRAVAIL_PLAN_PREVENTION } from "@/lib/referentiels/corpus/code-travail-plan-prevention";
import {
  CHAPITRE_R4512,
  CONSTAT_R4512_1,
  CONSTAT_R4512_9,
  CONSTAT_R4512_11,
  CONSTAT_R4512_12,
  EN_CLAIR_ECRIT,
  RAISON_TRAVAUX_DANGEREUX,
  raisonDureeEstimee,
  raisonHeuresRevisees,
  ligneHeuresRevisees,
  EN_CLAIR_R4463_8,
  EN_CLAIR_R4512_1,
  EN_CLAIR_R4512_2,
  EN_CLAIR_R4512_2_MOMENT,
  EN_CLAIR_R4512_7_EN_COURS,
  EN_CLAIR_R4512_9,
  EN_CLAIR_R4512_11,
  EN_CLAIR_R4512_12,
  EN_CLAIR_R4512_12_SI_ECRIT,
  EXTRAIT_R4512_12,
  FAIT_DUREE_NON_RENSEIGNEE,
  R4463_8,
  R4512_2,
  R4512_6_MOMENT,
  R4512_7_1_EN_COURS,
  R4512_7_1_SEUIL,
  R4512_7_2_DUREE,
  R4512_7_2_LISTE,
  R4512_7_ECRIT,
  R4512_1,
  R4512_9,
  R4512_11,
  R4512_12_1,
  R4512_12_2,
  R4512_12_CHAPEAU,
  SENS_R4512_6,
  SENS_R4512_7,
  URL_R4463_8,
  URL_R4512_1,
  URL_R4512_2,
  URL_R4512_6,
  URL_R4512_7,
  URL_R4512_9,
  URL_R4512_11,
  URL_R4512_12,
  annoncesZip,
  citeR4512_12,
  ligneInformationInspection,
} from "./annonces-plan";
import { lignesR4512_12Zip } from "./annonces-zip";
import { depuisCleJourCivil, formaterDateFr } from "@/lib/dates";

/** Le ZIP d'un plan sans trace du 2° (C45) : « date non renseignée ». */
const zipSansTrace = (plan: { dureeHeuresEstimee: number | null; travauxDangereux: boolean }) =>
  lignesR4512_12Zip({ ...plan, inspectionTravailInformeeLe: null }, formaterDateFr);
import { diagnostiquerPlan } from "./schema";

const article = (ref: string) => indexArticlesParRef().get(ref)?.article;
const verbatim = (ref: string) => article(ref)?.citationCle ?? "";

describe("cinq articles écrits une fois, et dans leurs mots", () => {
  it.each([
    ["R. 4512-1", R4512_1, URL_R4512_1],
    ["R. 4512-2", R4512_2, URL_R4512_2],
    ["R. 4512-9", R4512_9, URL_R4512_9],
    ["R. 4512-11", R4512_11, URL_R4512_11],
    ["R. 4512-12", EXTRAIT_R4512_12, URL_R4512_12],
    ["R. 4463-8", R4463_8, URL_R4463_8],
  ])("%s : l'article entier, égal au verbatim du corpus, et la même page", (ref, texte, url) => {
    expect(verbatim(ref).length).toBeGreaterThan(80);
    expect(texte).toBe(verbatim(ref));
    expect(url).toBe(article(ref)?.url);
  });

  it("R. 4512-6 et R. 4512-7 : l'adresse du livre est celle du corpus", () => {
    expect(URL_R4512_6).toBe(article("R. 4512-6")?.url);
    expect(URL_R4512_7).toBe(article("R. 4512-7")?.url);
  });

  it("R. 4512-12 : chapeau, 1° et 2° recomposent exactement l'article", () => {
    expect(`${R4512_12_CHAPEAU} : 1° ${R4512_12_1} ; 2° ${R4512_12_2}.`).toBe(
      verbatim("R. 4512-12"),
    );
  });

  it("l'antécédent de « le présent chapitre » nomme les bornes du corpus intégral", () => {
    const refs = CODE_TRAVAIL_PLAN_PREVENTION.articles.map((a) => a.ref);
    expect(refs[0]).toBe("R. 4512-1");
    expect(refs.at(-1)).toBe("R. 4512-16");
    expect(CHAPITRE_R4512).toContain("articles R. 4512-1 à R. 4512-16");
  });
});

describe("le diagnostic : R. 4512-2, -6 et -7 dans leurs mots", () => {
  it.each([
    ["R. 4512-6", R4512_6_MOMENT],
    ["R. 4512-7", R4512_7_ECRIT],
    ["R. 4512-7", R4512_7_1_SEUIL],
    ["R. 4512-7", R4512_7_1_EN_COURS],
    ["R. 4512-7", R4512_7_2_LISTE],
    ["R. 4512-7", R4512_7_2_DUREE],
  ])("%s : « %s » est dans le verbatim de CET article", (ref, fragment) => {
    expect(verbatim(ref)).toContain(fragment);
  });

  it("chaque moment est rattaché au sien, et à aucun autre", () => {
    // Le défaut corrigé : « avant le début des travaux » valait pour
    // l'inspection, et « quelle que soit la durée » pour R. 4512-6.
    expect(verbatim("R. 4512-2")).not.toContain(R4512_6_MOMENT);
    expect(verbatim("R. 4512-6")).not.toMatch(/durée/);
    expect(SENS_R4512_6).toContain(R4512_6_MOMENT);
  });

  it.each([
    [400, false],
    [null, true],
    [null, false],
    [12, false],
  ] as const)("durée %s, dangereux %s : la phrase en clair de son état, sans citation", (duree, dangereux) => {
    // La règle en clair ; les articles se lisent sous le livre du
    // formulaire, tenu par `annonces-surfaces.test.tsx`.
    const d = diagnostiquerPlan({ dureeHeuresEstimee: duree, travauxDangereux: dangereux });
    expect(d.recommandation).toContain(EN_CLAIR_ECRIT[d.ecrit]);
    expect(d.recommandation).not.toMatch(/«|»|\bArt\.|R\. \d{4}/);
    expect(d.recommandation).not.toMatch(/restent? à faire|400 heures qui commandent/);
  });

  it("les phrases citées sous le livre gardent leur moment et leurs deux cas", () => {
    expect(SENS_R4512_7).toMatch(/1° [^;]*400 heures/);
    expect(SENS_R4512_7).toMatch(/2° [^.]*travaux dangereux[^.]*quelle que soit la durée prévisible/);
    for (const f of [R4512_7_ECRIT, R4512_7_1_SEUIL, R4512_7_1_EN_COURS, R4512_7_2_LISTE])
      expect(SENS_R4512_7).toContain(`« ${f} »`);
    // Le cas des heures revues en cours de chantier, et les deux listes du 2° :
    // le diagnostic peut naître de l'un comme de l'autre (revue du 2026-10-28).
    expect(SENS_R4512_7).toContain("arrêté du 19 mars 1993");
    expect(SENS_R4512_7).toContain("ministre chargé de l'agriculture");
    expect(SENS_R4512_6).toContain(`« ${R4512_6_MOMENT} »`);
  });
});

/**
 * Les seules phrases qui ne sont pas du texte : ce que le produit enregistre
 * ou sait, jamais ce que le droit exige. Le filtre raisonne sur des MOTS
 * (frontières Unicode, apostrophe typographique ramenée à la droite,
 * pluriels) : la première version, en `\b` ASCII, laissait passer « délais »,
 * « N’oubliez » et « À faire ». Liste courte et nommée — elle attrape la
 * dérive réaliste, pas toutes les dérives possibles.
 */
const PRESCRIPTION =
  /(?<![\p{L}'])(devez|doit|doivent|obligatoires?|obligations?|il faut|pensez|n'oubliez|oubliez|délais?|jours?|avant|dès|à faire|faites|veillez|informez|joignez|fournissez)(?![\p{L}])/iu;
const avise = (phrase: string) => PRESCRIPTION.test(phrase.replace(/[’‘]/g, "'"));

/**
 * Les phrases en clair (2026-10-28) : libellés d'écran, pas du droit. Ni
 * guillemets, ni numéro d'article — le texte est sous le livre —, ni délai :
 * aucun des articles qu'elles résument n'en fixe.
 */
describe("les phrases en clair ne citent pas et n'ajoutent pas de délai", () => {
  const EN_CLAIR: [string, string][] = [
    ["écrit obligatoire", EN_CLAIR_ECRIT.obligatoire],
    ["écrit indéterminé", EN_CLAIR_ECRIT.indetermine],
    ["écrit non imposé", EN_CLAIR_ECRIT.non_impose],
    ["R. 4512-12", EN_CLAIR_R4512_12],
    ["R. 4512-12, sous condition", EN_CLAIR_R4512_12_SI_ECRIT],
    ["R. 4512-2", EN_CLAIR_R4512_2],
    ["R. 4512-2, le moment", EN_CLAIR_R4512_2_MOMENT],
    ["R. 4512-7 en cours", EN_CLAIR_R4512_7_EN_COURS],
    ["R. 4512-1", EN_CLAIR_R4512_1],
    ["R. 4512-9", EN_CLAIR_R4512_9],
    ["R. 4512-11", EN_CLAIR_R4512_11],
    ["R. 4463-8", EN_CLAIR_R4463_8],
    // Les raisons du diagnostic (2026-10-28) : le fait saisi, rien d'autre.
    ["raison, durée estimée", raisonDureeEstimee(450)],
    ["raison, durée estimée au seuil", raisonDureeEstimee(400)],
    ["raison, travaux dangereux", RAISON_TRAVAUX_DANGEREUX],
    ["raison, heures revues", raisonHeuresRevisees(ligneHeuresRevisees(420, "05/10/2026"))],
  ];
  it.each(EN_CLAIR)("%s", (_nom, phrase) => {
    expect(phrase).not.toMatch(/«|»|\bArt\.|[LRD]\. ?\d{3,4}/);
    expect(phrase).not.toMatch(/\bdélais?\b|\bjours?\b|\bsous huit\b/i);
  });

  it("chaque moment reste le sien : l'inspection avant l'exécution, l'accord avant le début, l'écrit avant le commencement", () => {
    for (const p of [EN_CLAIR_R4512_2, EN_CLAIR_R4512_2_MOMENT]) {
      expect(p).toContain("avant l'exécution de l'opération");
      expect(p).not.toMatch(/début des travaux|démarrage|commencement/);
    }
    expect(EN_CLAIR_ECRIT.non_impose).toContain("avant le début des travaux");
    expect(EN_CLAIR_ECRIT.obligatoire).toContain("avant le commencement des travaux");
  });

  it("le 2° de R. 4512-12 n'est pas situé dans le temps", () => {
    // « pendant toute la durée des travaux » est le 1° ; le 2° vient après
    // la virgule, sans moment.
    for (const p of [EN_CLAIR_R4512_12, EN_CLAIR_R4512_12_SI_ECRIT]) {
      expect(p).not.toMatch(/pendant les travaux/i);
      const deuxieme = p.split(", et ")[1];
      expect(deuxieme).toBe("vous informez par écrit l'inspection du travail de l'ouverture des travaux.");
    }
  });
});

describe("les phrases de Rojer n'avisent pas", () => {
  it.each([
    ["R. 4512-1", CONSTAT_R4512_1],
    ["R. 4512-9", CONSTAT_R4512_9],
    ["R. 4512-11", CONSTAT_R4512_11],
    ["R. 4512-12", CONSTAT_R4512_12],
    ["R. 4512-12, trace notée", ligneInformationInspection("27/09/2026")],
    ["R. 4512-12, trace absente", ligneInformationInspection(null)],
    ["durée non renseignée", FAIT_DUREE_NON_RENSEIGNEE],
    ["chapitre, hors guillemets", CHAPITRE_R4512.replace(/«[^»]*»/g, "")],
  ])("%s", (_ref, phrase) => {
    expect(avise(phrase)).toBe(false);
  });

  it.each([
    "Transmettez les délais convenus.",
    "N’oubliez pas l’inspection du travail.",
    "À faire : informer l'inspection.",
    "Vous devez informer l'inspection du travail sous huit jours.",
  ])("le filtre attrape « %s »", (derive) => {
    expect(avise(derive)).toBe(true);
  });
});

describe("trois états de l'écrit, et R. 4512-12 dans deux", () => {
  const cas = [
    { nom: "obligatoire (400 h)", plan: { dureeHeuresEstimee: 400, travauxDangereux: false }, ecrit: "obligatoire" },
    { nom: "obligatoire (dangereux, sans durée)", plan: { dureeHeuresEstimee: null, travauxDangereux: true }, ecrit: "obligatoire" },
    { nom: "indéterminé (sans durée)", plan: { dureeHeuresEstimee: null, travauxDangereux: false }, ecrit: "indetermine" },
    { nom: "non imposé (399 h)", plan: { dureeHeuresEstimee: 399, travauxDangereux: false }, ecrit: "non_impose" },
  ] as const;

  it.each(cas)("$nom : l'état", ({ plan, ecrit }) => {
    const d = diagnostiquerPlan(plan);
    expect(d.ecrit).toBe(ecrit);
    expect(d.ecritObligatoire).toBe(ecrit === "obligatoire");
  });

  it.each(cas)("$nom : le ZIP cite R. 4512-12 entier, ou pas du tout ; le diagnostic le dit en clair", ({ plan, ecrit }) => {
    // ~~La recommandation citait l'article entier, comme le ZIP.~~
    // [2026-10-28 : à l'écran, il se lit sous le livre du diagnostic quand
    // `citeR4512_12` le veut (`annonces-surfaces.test.tsx`). La phrase en
    // clair le dit dans l'obligatoire ; dans l'indéterminé, elle demande la
    // durée, et l'article reste sous le livre.]
    const d = diagnostiquerPlan(plan);
    const zip = zipSansTrace(plan).join("\n");
    const cite = ecrit !== "non_impose";
    expect(citeR4512_12(d.ecrit)).toBe(cite);
    if (cite) expect(zip).toContain(`« ${EXTRAIT_R4512_12} »`);
    else expect(zip).not.toContain("R. 4512-12");
    if (cite) expect(zip).toContain(CONSTAT_R4512_12);
    expect(d.recommandation.includes(EN_CLAIR_R4512_12)).toBe(ecrit === "obligatoire");
    if (ecrit === "non_impose") expect(d.recommandation).not.toMatch(/inspection du travail/);
  });

  it("indéterminé : la durée est demandée, et la conclusion du seuil n'y est pas", () => {
    const plan = { dureeHeuresEstimee: null, travauxDangereux: false };
    const d = diagnostiquerPlan(plan);
    // ~~`toContain(FAIT_DUREE_NON_RENSEIGNEE)`~~ [2026-10-28 : le titre du
    // diagnostic dit « durée non renseignée » ; la phrase dit les deux cas et
    // demande la durée. Le fait reste dans le ZIP et sur la fiche.]
    expect(d.recommandation).toMatch(/400 heures/);
    expect(d.recommandation).toMatch(/travaux dangereux/);
    expect(d.recommandation).toMatch(/renseignez la durée/);
    expect(d.recommandation).not.toMatch(/pas atteintes|n'est pas imposé/);
    expect(zipSansTrace(plan).join("\n")).toContain(FAIT_DUREE_NON_RENSEIGNEE);
  });

  it("le fait n'est dit que dans l'indéterminé", () => {
    for (const plan of [
      { dureeHeuresEstimee: 400, travauxDangereux: false },
      { dureeHeuresEstimee: null, travauxDangereux: true },
      { dureeHeuresEstimee: 12, travauxDangereux: false },
    ]) {
      expect(diagnostiquerPlan(plan).recommandation).not.toContain(FAIT_DUREE_NON_RENSEIGNEE);
      expect(zipSansTrace(plan).join("\n")).not.toContain(FAIT_DUREE_NON_RENSEIGNEE);
    }
  });

  it("C45 : la trace du 2° se lit sous le plan — la date déclarée, ou qu'elle ne l'est pas", () => {
    const plan = { dureeHeuresEstimee: 400, travauxDangereux: false };
    expect(zipSansTrace(plan).join("\n")).toContain(
      "Information écrite de l'inspection du travail (2°) : date non renseignée",
    );
    const avecTrace = lignesR4512_12Zip(
      { ...plan, inspectionTravailInformeeLe: depuisCleJourCivil("2026-09-21") },
      formaterDateFr,
    ).join("\n");
    expect(avecTrace).toContain(
      `Information écrite de l'inspection du travail (2°) : ${formaterDateFr(depuisCleJourCivil("2026-09-21"))}`,
    );
    // Jamais « non informée » : Rojer ne le sait pas.
    expect(zipSansTrace(plan).join("\n")).not.toMatch(/non inform/i);
    // Et rien quand l'article ne se cite pas : pas de trace orpheline.
    expect(
      lignesR4512_12Zip(
        { dureeHeuresEstimee: 12, travauxDangereux: false, inspectionTravailInformeeLe: depuisCleJourCivil("2026-09-21") },
        formaterDateFr,
      ),
    ).toEqual([]);
  });

  it("l'en-tête du fichier 07 porte R. 4512-9 et R. 4512-11 entiers, avec leur constat", () => {
    const t = annoncesZip.enTete().join("\n");
    for (const c of [R4512_9, R4512_11]) expect(t).toContain(`« ${c} »`);
    for (const c of [CONSTAT_R4512_9, CONSTAT_R4512_11]) expect(t).toContain(c);
  });
});

const RACINE = join(__dirname, "..", "..");
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");

// La route du ZIP ne se rend pas en test (Prisma, stockage, PDF). Elle ne
// DÉCIDE plus rien : elle passe le plan à `lignesR4512_12Zip`, que les tests
// ci-dessus tiennent dans ses trois états. Ce qui reste à tenir ici est
// qu'elle passe le plan TEL QUEL — pas un plan retouché, pas un état écrit
// en dur — et qu'elle imprime l'en-tête.
describe("la route du ZIP passe le plan, elle ne décide rien", () => {
  const route = lire("app/api/etablissements/[id]/controle-zip/route.ts");
  it("un seul appel, avec le plan de la boucle", () => {
    expect(route.match(/lignesR4512_12Zip\(/g)?.length).toBe(1);
    expect(route).toContain("...lignesR4512_12Zip(p, formaterDateFr),");
  });
  it("aucune autre voie vers les lignes de R. 4512-12", () => {
    expect(route).not.toMatch(/annoncesZip\.parPlan|diagnostiquerPlan|EXTRAIT_R4512_12/);
  });
  it("l'en-tête est imprimé", () => {
    expect(route).toContain("...annoncesZip.enTete(),");
  });
});

// Une seule écriture : aucun autre fichier de `src/` ne recopie ces textes,
// hors le corpus, qui en est la source, et ce module.
describe("aucune seconde copie", () => {
  const fichiers: string[] = [];
  const parcourir = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) fichiers.push(p);
    }
  };
  parcourir(RACINE);

  it.each([
    ["R. 4512-1", R4512_1],
    ["R. 4512-2", R4512_2],
    ["R. 4512-9", R4512_9],
    ["R. 4512-11", R4512_11],
    ["R. 4512-12 1°", R4512_12_1],
    ["R. 4512-12 2°", R4512_12_2],
    ["R. 4463-8", R4463_8],
  ])("%s n'est recopié nulle part ailleurs", (_ref, texte) => {
    // Une tête de phrase assez longue pour être distinctive : une copie
    // tronquée est justement ce qu'on cherche.
    const fragment = texte.slice(0, 60);
    const copies = fichiers
      .map((f) => relative(RACINE, f))
      .filter((f) => !f.startsWith("lib/referentiels/corpus/"))
      .filter((f) => f !== "lib/plan-prevention/annonces-plan.ts")
      .filter((f) => lire(f).includes(fragment));
    expect(copies).toEqual([]);
  });
});
