// Les constantes d'`annonces-plan.ts` sont lues par quatre surfaces : le
// formulaire, la fiche du plan, le diagnostic et le fichier 07 du ZIP de
// contrôle. Si l'une s'écarte du texte, toutes s'en écartent ensemble : ce
// test les confronte au verbatim que le corpus consigne, relu à la source le
// 2026-09-26.
//
// ÉPROUVÉ en y injectant, une à une, les paraphrases que le dépôt a DÉJÀ
// écrites pour ces articles — le `prescrit` du corpus, qui résume :
// « tiennent compte, le cas échéant, du risque lié aux épisodes de chaleur
// intense » (R. 4463-8), « le chef de l'entreprise utilisatrice informe par
// écrit l'inspection du travail de l'ouverture des travaux » sans son 1°
// (R. 4512-12), « fait recommencer, à leur égard, toutes les procédures du
// chapitre » (R. 4512-1). Chacune a fait rougir ce fichier. Voir C30 au
// journal des vérifications.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import {
  CHAPITRE_R4512,
  CONSTAT_R4512_1,
  CONSTAT_R4512_9,
  CONSTAT_R4512_11,
  CONSTAT_R4512_12,
  EXTRAIT_R4512_12,
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
} from "./annonces-plan";
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

  it.each([
    ["chapeau", R4512_12_CHAPEAU],
    ["1°", R4512_12_1],
    ["2°", R4512_12_2],
  ])("R. 4512-12 %s : mot pour mot dans le verbatim", (_rang, texte) => {
    expect(verbatim("R. 4512-12")).toContain(texte);
  });
});

// Les seules phrases qui ne sont pas du texte. Elles disent ce que le
// produit enregistre, jamais ce que le droit exige : aucun mot de
// prescription, aucun délai. Liste courte et nommée — elle attrape la dérive
// réaliste (« vous devez informer l'inspection sous huit jours »), pas toutes
// les dérives possibles, et le dit.
describe("les constats sur le produit n'avisent pas", () => {
  const PRESCRIPTION = /\b(devez|doit|doivent|obligatoire|obligation|il faut|pensez|n'oubliez|délai|jours?|avant|dès)\b/i;
  it.each([
    ["R. 4512-1", CONSTAT_R4512_1],
    ["R. 4512-9", CONSTAT_R4512_9],
    ["R. 4512-11", CONSTAT_R4512_11],
    ["R. 4512-12", CONSTAT_R4512_12],
    ["chapitre", CHAPITRE_R4512.replace(/«[^»]*»/g, "")],
  ])("%s", (_ref, phrase) => {
    expect(phrase).not.toMatch(PRESCRIPTION);
  });
});

describe("R. 4512-12 n'est dit que sous la condition qu'il pose", () => {
  it("écrit obligatoire : le diagnostic cite l'article entier", () => {
    const d = diagnostiquerPlan({ dureeHeuresEstimee: 400, travauxDangereux: false });
    expect(d.recommandation).toContain(`« ${EXTRAIT_R4512_12} »`);
    expect(annoncesZip.parPlan(d.ecritObligatoire).join("\n")).toContain(EXTRAIT_R4512_12);
  });

  it("écrit non imposé : ni le diagnostic ni le ZIP ne le citent", () => {
    const d = diagnostiquerPlan({ dureeHeuresEstimee: 399, travauxDangereux: false });
    expect(d.recommandation).not.toContain("R. 4512-12");
    expect(annoncesZip.parPlan(d.ecritObligatoire)).toEqual([]);
  });

  it("l'en-tête du fichier 07 porte R. 4512-9 et R. 4512-11 entiers", () => {
    const t = annoncesZip.enTete().join("\n");
    expect(t).toContain(`« ${R4512_9} »`);
    expect(t).toContain(`« ${R4512_11} »`);
  });
});

// Une seule écriture : aucun autre fichier de `src/` ne recopie ces textes —
// hors le corpus, qui en est la source, et ce module. Et chaque surface lit
// bien le module plutôt que de le contourner.
describe("aucune seconde copie, et chaque surface lit le module", () => {
  const RACINE = join(__dirname, "..", "..");
  const fichiers: string[] = [];
  const parcourir = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) fichiers.push(p);
    }
  };
  parcourir(RACINE);
  const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");

  it.each([
    ["R. 4512-1", R4512_1],
    ["R. 4512-9", R4512_9],
    ["R. 4512-11", R4512_11],
    ["R. 4512-12 1°", R4512_12_1],
    ["R. 4512-12 2°", R4512_12_2],
    ["R. 4463-8", R4463_8],
  ])("%s n'est recopié nulle part ailleurs", (_ref, texte) => {
    // Une proposition assez longue pour être distinctive, pas le texte
    // entier : une copie tronquée est justement ce qu'on cherche.
    const fragment = texte.slice(0, 60);
    const copies = fichiers
      .map((f) => relative(RACINE, f))
      .filter((f) => !f.startsWith("lib/referentiels/corpus/"))
      .filter((f) => f !== "lib/plan-prevention/annonces-plan.ts")
      .filter((f) => lire(f).includes(fragment));
    expect(copies).toEqual([]);
  });

  it.each([
    ["components/plan-prevention/FormulairePlanPrevention.tsx", ["R4512_1", "R4463_8", "R4512_9", "R4512_11"]],
    ["app/etablissements/[id]/plan-prevention/[planId]/page.tsx", ["R4512_1", "R4463_8", "R4512_9", "R4512_11", "R4512_12_2"]],
    ["app/api/etablissements/[id]/controle-zip/route.ts", ["annoncesZip.enTete()", "annoncesZip.parPlan("]],
    ["lib/plan-prevention/schema.ts", ["EXTRAIT_R4512_12"]],
  ])("%s lit le module", (chemin, noms) => {
    const source = lire(chemin);
    const specifier = chemin.startsWith("lib/plan-prevention/")
      ? '"./annonces-plan"'
      : '"@/lib/plan-prevention/annonces-plan"';
    expect(source).toContain(`from ${specifier}`);
    for (const nom of noms) {
      // Employé dans le corps, pas seulement importé : un identifiant nu
      // compte ses occurrences à la frontière de mot (`R4512_1` n'est pas
      // `R4512_11`), un appel se cherche tel quel.
      const emplois = nom.includes("(")
        ? source.split(nom).length - 1
        : (source.match(new RegExp(`\\b${nom}\\b`, "g")) ?? []).length;
      expect(emplois, `${nom} dans ${chemin}`).toBeGreaterThanOrEqual(
        nom.includes("(") ? 1 : 2,
      );
    }
  });
});
