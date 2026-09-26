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
  EXTRAIT_R4512_12,
  FAIT_DUREE_NON_RENSEIGNEE,
  R4463_8,
  R4512_1,
  R4512_9,
  R4512_11,
  R4512_12_1,
  R4512_12_2,
  R4512_12_CHAPEAU,
  URL_R4463_8,
  URL_R4512_1,
  URL_R4512_9,
  URL_R4512_11,
  URL_R4512_12,
  annoncesZip,
  citeR4512_12,
} from "./annonces-plan";
import { lignesR4512_12Zip } from "./annonces-zip";
import { diagnostiquerPlan } from "./schema";

const article = (ref: string) => indexArticlesParRef().get(ref)?.article;
const verbatim = (ref: string) => article(ref)?.citationCle ?? "";

describe("cinq articles écrits une fois, et dans leurs mots", () => {
  it.each([
    ["R. 4512-1", R4512_1, URL_R4512_1],
    ["R. 4512-9", R4512_9, URL_R4512_9],
    ["R. 4512-11", R4512_11, URL_R4512_11],
    ["R. 4512-12", EXTRAIT_R4512_12, URL_R4512_12],
    ["R. 4463-8", R4463_8, URL_R4463_8],
  ])("%s : l'article entier, égal au verbatim du corpus, et la même page", (ref, texte, url) => {
    expect(verbatim(ref).length).toBeGreaterThan(80);
    expect(texte).toBe(verbatim(ref));
    expect(url).toBe(article(ref)?.url);
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

describe("les phrases de Rojer n'avisent pas", () => {
  it.each([
    ["R. 4512-1", CONSTAT_R4512_1],
    ["R. 4512-9", CONSTAT_R4512_9],
    ["R. 4512-11", CONSTAT_R4512_11],
    ["R. 4512-12", CONSTAT_R4512_12],
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

  it.each(cas)("$nom : diagnostic et ZIP citent R. 4512-12 entier, ou pas du tout", ({ plan, ecrit }) => {
    const d = diagnostiquerPlan(plan);
    const zip = lignesR4512_12Zip(plan).join("\n");
    const cite = ecrit !== "non_impose";
    expect(citeR4512_12(d.ecrit)).toBe(cite);
    for (const t of [d.recommandation, zip]) {
      if (cite) expect(t).toContain(`« ${EXTRAIT_R4512_12} »`);
      else expect(t).not.toContain("R. 4512-12");
    }
    if (cite) expect(zip).toContain(CONSTAT_R4512_12);
  });

  it("indéterminé : le fait est dit, et la conclusion du seuil n'y est pas", () => {
    const plan = { dureeHeuresEstimee: null, travauxDangereux: false };
    const d = diagnostiquerPlan(plan);
    expect(d.recommandation).toContain(FAIT_DUREE_NON_RENSEIGNEE);
    expect(d.recommandation).not.toMatch(/pas atteintes/);
    expect(lignesR4512_12Zip(plan).join("\n")).toContain(FAIT_DUREE_NON_RENSEIGNEE);
  });

  it("le fait n'est dit que dans l'indéterminé", () => {
    for (const plan of [
      { dureeHeuresEstimee: 400, travauxDangereux: false },
      { dureeHeuresEstimee: null, travauxDangereux: true },
      { dureeHeuresEstimee: 12, travauxDangereux: false },
    ]) {
      expect(diagnostiquerPlan(plan).recommandation).not.toContain(FAIT_DUREE_NON_RENSEIGNEE);
      expect(lignesR4512_12Zip(plan).join("\n")).not.toContain(FAIT_DUREE_NON_RENSEIGNEE);
    }
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
    expect(route).toContain("...lignesR4512_12Zip(p),");
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
