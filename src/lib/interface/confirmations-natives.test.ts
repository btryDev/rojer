import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appelsNatifs,
  balayerSources,
  fichiersSources,
  sansCommentairesNiChaines,
} from "./confirmations-natives";

/**
 * La garde, et de quoi la croire.
 *
 * Le raisonnement complet est en tête de `confirmations-natives.ts`. Ici on
 * établit trois choses, séparément, parce qu'un seul test qui ferait les trois
 * se réparerait en enlevant celle qui gêne :
 *
 *  1. **la borne basse** — un appel réel est relevé, avec sa ligne ;
 *  2. **la borne haute** — un mot qui ressemble à `confirm` ne l'est pas, et
 *     le texte qui en parle non plus ;
 *  3. **la couche voisine** — le dépôt entier, confronté à la règle.
 *
 * Aucun test ne recopie la liste des quinze fichiers corrigés. Une liste se
 * répare en la recopiant : elle cesserait de vérifier quoi que ce soit le jour
 * où quelqu'un en retire une ligne pour faire passer le test.
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("ce que la garde relève", () => {
  it("un appel nu, avec sa ligne", () => {
    const releve = appelsNatifs(
      ["export function f() {", '  if (!confirm("x")) return;', "}"].join("\n"),
    );
    expect(releve).toHaveLength(1);
    expect(releve[0].ligne).toBe(2);
  });

  it("l'appel porté par un global, et coupé par le formateur", () => {
    // Trois formes qu'un `grep "confirm("` manque : le préfixe, l'espace, et
    // la coupure de ligne que Prettier introduit quand l'appel s'allonge.
    expect(appelsNatifs("window.confirm('x')")).toHaveLength(1);
    expect(appelsNatifs("globalThis.confirm ('x')")).toHaveLength(1);
    expect(appelsNatifs("const r = self\n  .confirm(\n  'x',\n);")).toHaveLength(
      1,
    );
  });

  it("un appel caché dans une interpolation reste vu", () => {
    // Le nettoyage efface les gabarits ; il ne doit pas effacer le code qui
    // vit dedans, sinon la garde se contourne en une ligne.
    const releve = appelsNatifs("const s = `réponse : ${confirm('x')}`;");
    expect(releve).toHaveLength(1);
  });
});

describe("ce que la garde ne relève pas", () => {
  it("un homonyme n'est pas un appel natif", () => {
    expect(appelsNatifs("demanderConfirmation('x');")).toEqual([]);
    expect(appelsNatifs("const motDePasseConfirm = 1; motDePasseConfirm;")).toEqual(
      [],
    );
    // Un appel de méthode homonyme : écarté volontairement, cf. les limites
    // écrites en tête du module.
    expect(appelsNatifs("api.confirm('x');")).toEqual([]);
  });

  it("le texte qui parle du défaut n'est pas le défaut", () => {
    // Sans cette propriété, la garde crierait sur les commentaires qui
    // expliquent pourquoi elle existe — y compris les siens. Une garde qui
    // crie faux finit désactivée.
    expect(appelsNatifs("// on n'appelle plus confirm('x') ici")).toEqual([]);
    expect(appelsNatifs("/* le vieux confirm( du wizard */")).toEqual([]);
    expect(appelsNatifs("const doc = \"n'employez pas confirm(\";")).toEqual([]);
  });

  it("une apostrophe isolée ne fait pas taire la suite du fichier", () => {
    // Le faux négatif le plus dangereux : si un guillemet ouvrant sans
    // fermant ouvrait une chaîne, tout ce qui suit serait effacé et la garde
    // passerait au vert en ne lisant plus rien. Une chaîne ne franchit pas la
    // fin de ligne — c'est ce qui borne les dégâts.
    const releve = appelsNatifs(
      ["const r = /['\"]/;", "const motif = \"l'un\" + 'l\\'autre';", "confirm('x');"].join(
        "\n",
      ),
    );
    expect(releve).toHaveLength(1);
    expect(releve[0].ligne).toBe(3);
  });

  it("le nettoyage garde la longueur et les retours à la ligne", () => {
    // C'est ce qui rend le numéro de ligne juste. Sans cette propriété, la
    // garde nommerait la mauvaise ligne, ce qui est presque aussi coûteux que
    // de ne rien nommer.
    const source = "const a = 'x';\n// y\nconst b = `z`;\n";
    const propre = sansCommentairesNiChaines(source);
    expect(propre).toHaveLength(source.length);
    expect(propre.split("\n")).toHaveLength(source.split("\n").length);
  });
});

describe("la règle, sur le dépôt", () => {
  it("aucun appel à confirm() dans src/", () => {
    const releves = balayerSources(RACINE);
    // Le message porte le fichier ET la ligne : « il en reste un » enverrait
    // chercher, et c'est ce qui a permis aux seize de tenir.
    expect(
      releves.map((a) => `${a.fichier}:${a.ligne} — ${a.extrait}`),
    ).toEqual([]);
    // Délai explicite (2026-09-17) : ce test lit et nettoie chacun des
    // quelque 800 fichiers de `src/`, et il a dépassé une fois les 5 s par
    // défaut pendant la suite complète, sur une machine très chargée. Le
    // dépassement ne disait rien de la règle, seulement de la charge.
  }, 30_000);

  it("le balayage descend vraiment dans src/, sans excepter personne", () => {
    // La borne basse du balayage lui-même : un relevé vide ne prouve rien si
    // le parcours n'est entré nulle part. On établit donc séparément qu'il
    // voit beaucoup de fichiers, et qu'il voit en particulier les deux qu'on
    // aurait pu être tenté de mettre à part — ce module et son test, dont les
    // exemples ne sont pas relevés parce qu'ils sont des chaînes, pas parce
    // qu'ils sont exclus.
    const vus = fichiersSources(RACINE);
    expect(vus.length).toBeGreaterThan(200);
    for (const nom of [
      "confirmations-natives.ts",
      "confirmations-natives.test.ts",
      "Confirmation.tsx",
    ]) {
      expect(vus.some((f) => f.endsWith(nom)), nom).toBe(true);
    }
  });
});
