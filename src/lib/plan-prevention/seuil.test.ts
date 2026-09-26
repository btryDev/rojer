import { describe, it, expect } from "vitest";
import { diagnostiquerPlan } from "./schema";

/**
 * Le seuil des 400 heures, tenu par un test parce qu'il s'affiche comme un fait.
 *
 * `R. 4512-7` dit « un nombre total d'heures de travail prévisible **égal au
 * moins à** 400 heures », et ajoute « dès lors qu'il apparaît, en cours
 * d'exécution des travaux, que le nombre d'heures **doit atteindre** 400
 * heures ». Verbatim relevé sur Légifrance le 2026-08-27, version en vigueur
 * au 2008-05-01.
 *
 * Le code comparait `> 400`. À 400 heures pile, il affichait donc « plan écrit
 * recommandé » là où le texte le rend obligatoire — l'inverse exact, sur un
 * écran qui présente le seuil comme un fait de droit.
 */
describe("seuil des 400 h — art. R. 4512-7", () => {
  const diag = (heures: number | null, dangereux = false) =>
    diagnostiquerPlan({
      dureeHeuresEstimee: heures,
      travauxDangereux: dangereux,
    });

  it("rend l'écrit obligatoire à 400 heures pile", () => {
    expect(diag(400).ecritObligatoire).toBe(true);
  });

  it("ne le rend pas obligatoire à 399 heures", () => {
    expect(diag(399).ecritObligatoire).toBe(false);
  });

  it("le rend obligatoire au-delà", () => {
    expect(diag(401).ecritObligatoire).toBe(true);
  });

  it("le rend obligatoire sur des travaux dangereux, quelle que soit la durée", () => {
    // Le 2° de l'article : « quelle que soit la durée prévisible de
    // l'opération ». Les deux motifs sont indépendants, chacun suffit.
    expect(diag(1, true).ecritObligatoire).toBe(true);
    expect(diag(null, true).ecritObligatoire).toBe(true);
  });

  it("dit « atteignent » et non « dépassent »", () => {
    // Le texte dit « atteindre ». « Dépasser » exclut la valeur pivot, et
    // c'est précisément l'erreur que la comparaison portait.
    expect(diag(400).raisons.join(" ")).toContain("atteignent");
  });
});

/**
 * Ce que le seuil ne conditionne PAS, et que le produit laissait croire.
 *
 * `R. 4512-6` fait naître le plan : dès que l'analyse conjointe révèle un
 * risque d'interférence, les employeurs « arrêtent d'un commun accord, avant
 * le début des travaux, un plan de prévention » — quelle que soit la durée.
 * `R. 4512-7` ne commande que l'ÉCRIT. Sous le seuil, le dirigeant doit donc
 * toujours coordonner et inspecter ; le diagnostic lui disait à la place que
 * l'écrit était « fortement recommandé » parce qu'il « protège les deux
 * parties en cas de litige » — un argument de prudence à la place d'une
 * obligation, sur le seul écran qui répond à la question.
 */
describe("sous le seuil, ce qui reste dû", () => {
  const sousLeSeuil = diagnostiquerPlan({
    dureeHeuresEstimee: 120,
    travauxDangereux: false,
  });

  it("le diagnostic ne conclut pas que l'écrit est obligatoire", () => {
    // La borne basse : sans elle, les deux suivantes mesureraient le message
    // de l'autre branche, qui parle d'obligation par construction.
    expect(sousLeSeuil.ecritObligatoire).toBe(false);
  });

  // Réécrits le 2026-09-26 (contre-lecture de C30) : la phrase qu'ils
  // tenaient, « le plan reste dû […] quelle que soit la durée (art.
  // R. 4512-6) », attribuait à R. 4512-6 des mots qui ouvrent le 2° de
  // R. 4512-7, et rangeait l'inspection sous le moment de l'accord. Ce qui
  // est tenu désormais : chaque acte, avec son article et SON moment.
  it("il dit que le plan lui-même est arrêté, par R. 4512-6, avant le début des travaux", () => {
    expect(
      sousLeSeuil.recommandation,
      "Le message sous le seuil ne dit pas que le plan est dû : le dirigeant " +
        "lit qu'il n'a rien à faire tant qu'il n'atteint pas 400 heures.",
    ).toContain(
      "Art. R. 4512-6 : lorsque des risques d'interférence existent, les employeurs arrêtent d'un commun accord le plan de prévention « avant le début des travaux ».",
    );
  });

  it("il nomme l'inspection commune avec le moment de R. 4512-2, pas celui de l'accord", () => {
    expect(sousLeSeuil.recommandation).toContain(
      "Art. R. 4512-2 : l'inspection commune a lieu « préalablement à l'exécution de l'opération réalisée par une entreprise extérieure ».",
    );
    expect(sousLeSeuil.recommandation).not.toMatch(/restent? à faire/i);
  });

  it("« quelle que soit la durée » n'est jamais attribué à R. 4512-6", () => {
    for (const d of [sousLeSeuil, diagnostiquerPlan({ dureeHeuresEstimee: null, travauxDangereux: false })]) {
      expect(d.recommandation).not.toMatch(/quelle que soit la durée[^.]*R\. 4512-6/i);
    }
  });

  it("il dit les deux cas de l'écrit, pas seulement les 400 heures", () => {
    expect(sousLeSeuil.recommandation).toMatch(/1° [^;]*400 heures/);
    expect(sousLeSeuil.recommandation).toMatch(/2° [^.]*travaux dangereux[^.]*quelle que soit la durée prévisible/);
  });

  it("il ne présente plus l'écrit comme une précaution contre le litige", () => {
    // Le mot qui portait le défaut : la raison donnée était le litige, pas le
    // texte. Un argument de prudence se discute ; une obligation, non.
    expect(
      sousLeSeuil.recommandation.toLowerCase(),
      "Le diagnostic justifie l'écrit par la protection en cas de litige : " +
        "c'est un conseil, là où R. 4512-6 porte une obligation.",
    ).not.toContain("litige");
  });
});

/**
 * Le fondement affiché doit être CELUI QUI S'APPLIQUE.
 *
 * Constaté à l'écran le 2026-09-07 sur la fiche PP-001 : sous « Durée estimée
 * 22 h », l'écran écrivait « seuil des 400 h franchi ». 22 h ne franchit pas
 * 400 h. L'écrit était bien obligatoire — mais par l'autre branche, les travaux
 * figurant sur la liste dangereuse de l'arrêté du 19 mars 1993.
 *
 * La cause : `ecritObligatoire` est un OU, et l'écran s'en servait pour annoter
 * la DURÉE. Un agrégat ne peut pas justifier l'un de ses termes. `seuil400` est
 * donc exposé à part, et ces trois cas tiennent la distinction — ils échouent
 * si on la réduit à nouveau à `ecritObligatoire`.
 *
 * Ce n'est pas de la cosmétique : c'est l'écran qui dit au dirigeant au titre
 * de quoi son document est dû, sur une pièce qu'un inspecteur peut demander.
 */
describe("le fondement affiché est celui qui s'applique", () => {
  const diag = (heures: number | null, dangereux = false) =>
    diagnostiquerPlan({
      dureeHeuresEstimee: heures,
      travauxDangereux: dangereux,
    });

  it("22 h sur des travaux dangereux : l'écrit est dû, mais pas par le seuil", () => {
    const d = diag(22, true);
    expect(d.ecritObligatoire).toBe(true);
    expect(d.seuil400).toBe(false);
  });

  it("le seuil ne se déduit jamais de l'obligation d'écrit", () => {
    // La borne haute du même piège : 400 h SANS travaux dangereux. Si
    // `seuil400` était recopié d'`ecritObligatoire`, ce cas passerait quand
    // même — c'est le précédent qui casse. Les deux sont là pour que la
    // distinction soit tenue des deux côtés, pas seulement là où elle se voit.
    const d = diag(400, false);
    expect(d.ecritObligatoire).toBe(true);
    expect(d.seuil400).toBe(true);
  });

  it("la raison énoncée nomme la liste dangereuse, pas les 400 heures", () => {
    const raisons = diag(22, true).raisons;
    expect(raisons).toHaveLength(1);
    expect(raisons[0]).toContain("liste dangereuse");
    expect(raisons.join(" ")).not.toContain("400");
  });
});
