import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  chiffresReferentielSuivi,
  estNiveauAudit,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { Cadran } from "./Cadran";

/**
 * La page d'accueil est **publique** — `src/proxy.ts` laisse passer `/` sans
 * session. Les chiffres qu'elle affiche sont donc lus par des prospects, pas
 * par des utilisateurs connectés qui pourraient recouper.
 *
 * Deux endroits annonçaient « 64 obligations · 9 domaines » quand le
 * référentiel en portait **85 sur 10**. Les deux portaient un commentaire
 * disant « à recompter quand le référentiel s'étend » — et personne ne l'a
 * fait, parce qu'un commentaire ne recompte rien. Le référentiel a grandi
 * trois fois depuis, le chiffre est resté. Il ne s'est pas trouvé tout seul :
 * il a fallu qu'un contrôle visuel ouvre la page.
 *
 * Le repère du dépôt est le préfixe d'`EMPREINTE_ATTENDUE`, qui fait tomber
 * un test dès que le compte change. La page publique était le seul endroit
 * qui annonçait ce compte **sans** être rattachée à ce mécanisme. Elle l'est
 * maintenant : le test lit le texte rendu et le confronte au référentiel.
 *
 * Il n'impose aucune formulation — seulement que tout nombre présenté comme
 * un compte d'obligations ou de domaines soit le bon.
 *
 * LE BON, DEPUIS LE 2026-10-08, EST LE COMPTE SUIVI. ~~La page annonce le
 * compte du référentiel, niveau audit compris.~~ Décision de la propriétaire
 * du 2026-10-08 : « dans nos documents vitrine on reste sur 171, mais dans
 * l'app il faudra soustraire les obligations dites d'audit ». La page annonce
 * donc les obligations SUIVIES AU QUOTIDIEN — total moins niveau audit
 * (ADR-042). Le chiffre n'est plus écrit dans les composants : `app/page.tsx`
 * le calcule (`chiffresReferentielSuivi`) et le passe en props, parce que
 * `Cadran` est un composant client qui n'importe pas le référentiel. Le test
 * vérifie donc trois choses : (1) le texte RENDU annonce le compte suivi,
 * recalculé ici à la main (total − audit) et non relu dans la fonction qu'il
 * contrôle ; (2) aucun chiffre écrit dans les sources ne s'en écarte ; (3) la
 * page d'accueil passe bien le calcul au cadran. [2026-11-06 : la note de
 * provenance de « Une prise en main rapide » est partie avec la section ; le
 * cadran est le seul à annoncer le compte.]
 */

const DOSSIER = dirname(fileURLToPath(import.meta.url));

// Recalculé ici, sans passer par `nombreObligationsSuivies` : le test ne
// relit pas la réponse de la fonction qu'il contrôle.
const AUDIT = obligationsConformite.filter((o) => estNiveauAudit(o));
const OBLIGATIONS = obligationsConformite.length - AUDIT.length;
const DOMAINES = new Set(
  obligationsConformite.filter((o) => !AUDIT.includes(o)).map((o) => o.domaine),
).size;

/** Les composants de la page qui annoncent le compte suivi. Ajouter ou
 *  retirer une section qui l'annonce, c'est ajouter ou retirer une ligne ici :
 *  le plancher d'annonces et la vérification de `page.tsx` en découlent. */
const ANNONCEURS = [{ nom: "Cadran", composant: Cadran }];

/** Le texte que la page publique rend, avec les chiffres que la page calcule. */
function texteRendu(): string {
  const chiffres = chiffresReferentielSuivi();
  return ANNONCEURS.map(({ composant }) =>
    renderToStaticMarkup(createElement(composant, { chiffres })),
  ).join("");
}

/** Les composants de la page publique, sans les tests. */
function sourcesLanding(): { fichier: string; texte: string }[] {
  return readdirSync(DOSSIER)
    .filter((n) => n.endsWith(".tsx") && !n.includes(".test."))
    .map((n) => ({ fichier: n, texte: readFileSync(join(DOSSIER, n), "utf8") }));
}

/**
 * Les nombres annoncés comme un compte, quel que soit le tour de phrase.
 *
 * On accepte que le nombre et son mot soient séparés par des espaces, des
 * retours à la ligne et du JSX — « 85\n obligations sur 10 domaines » se
 * découpe sur plusieurs lignes dans le source, et une expression trop
 * étroite ne verrait que la moitié des occurrences.
 *
 * Mais l'intervalle **ne peut pas contenir un autre chiffre** : sans cette
 * restriction, « 85 obligations · 10 domaines » rattachait aussi 85 au mot
 * « domaines », et le test échouait sur une page pourtant juste. Chaque
 * nombre appartient au mot qui le suit immédiatement, pas au suivant.
 *
 * Et le nombre doit être **isolé** : collé à une lettre, un point, un tiret
 * ou un crochet, c'est une classe ou une mesure (`max-w-[42ch]`, `mt-3.5`),
 * pas un compte — « max-w-[42ch]">Chaque obligation » faisait échouer la
 * garde sur une page juste (2026-11-06).
 */
function comptesAnnonces(texte: string, mot: RegExp): number[] {
  const motif = new RegExp(
    String.raw`(?<![\w.\-\[])(\d+)(?![\w.\]])[^\d]{0,40}?` + mot.source,
    "g",
  );
  return [...texte.matchAll(motif)].map((m) => Number(m[1]));
}

describe("comptesAnnonces — ce qui est un compte", () => {
  it("lit un nombre isolé, même séparé de son mot par du JSX", () => {
    expect(comptesAnnonces("Sur 188 obligations suivies", /obligations?/)).toEqual([188]);
    expect(comptesAnnonces("{n}\n 85\n            obligations", /obligations?/)).toEqual([85]);
  });

  it("ne lit pas une classe ni une mesure comme un compte", () => {
    expect(
      comptesAnnonces('<p className="lp-texte mt-3.5 max-w-[42ch]">Chaque obligation', /obligations?/),
    ).toEqual([]);
    expect(comptesAnnonces('grid-cols-[0.6fr_1.4fr]"> une obligation', /obligations?/)).toEqual([]);
  });
});

describe("les chiffres de la page publique", () => {
  it("le compte suivi est le référentiel moins le niveau audit", () => {
    // Le repère : 174 au référentiel dont 3 au niveau audit le 2026-10-08.
    // Pas d'égalité à une valeur : une borne qui ne se répare pas en recopiant.
    expect(AUDIT.length).toBeGreaterThan(0);
    expect(OBLIGATIONS).toBeLessThan(obligationsConformite.length);
    expect(chiffresReferentielSuivi()).toEqual({
      obligations: OBLIGATIONS,
      domaines: DOMAINES,
    });
  });

  it("le texte rendu annonce le nombre d'obligations suivies au quotidien", () => {
    const annonces = comptesAnnonces(texteRendu(), /obligations?/);
    // Chaque annonceur l'annonce au moins une fois, et toutes sont justes.
    expect(annonces.length).toBeGreaterThanOrEqual(ANNONCEURS.length);
    expect(
      annonces.filter((n) => n !== OBLIGATIONS),
      `La page d'accueil est publique et annonce un nombre d'obligations qui n'est pas celui que Rojer suit au quotidien (${OBLIGATIONS} = référentiel − niveau audit). Corrigez le calcul — ne relâchez pas ce test.`,
    ).toEqual([]);
  });

  it("le texte rendu annonce le nombre de domaines suivis", () => {
    const annonces = comptesAnnonces(texteRendu(), /domaines?/);
    expect(annonces.length).toBeGreaterThanOrEqual(ANNONCEURS.length);
    expect(annonces.filter((n) => n !== DOMAINES)).toEqual([]);
  });

  it("aucun chiffre écrit dans les sources ne contredit le compte suivi", () => {
    // Le chiffre est calculé ; un chiffre réécrit à la main dans un
    // composant — le défaut d'origine — tombe ici.
    const fautifs: string[] = [];
    for (const { fichier, texte } of sourcesLanding()) {
      for (const n of comptesAnnonces(texte, /obligations?/)) {
        if (n !== OBLIGATIONS) fautifs.push(`${fichier} → ${n} obligations`);
      }
      for (const n of comptesAnnonces(texte, /domaines?/)) {
        if (n !== DOMAINES) fautifs.push(`${fichier} → ${n} domaines`);
      }
    }
    expect(fautifs).toEqual([]);
  });

  it("la page d'accueil passe le calcul au cadran", () => {
    // Les props sont obligatoires (tsc) ; ce qui reste à garder, c'est
    // qu'elles viennent du calcul et non d'un littéral.
    const page = readFileSync(join(DOSSIER, "../../app/page.tsx"), "utf8");
    expect(page).toMatch(/const chiffres = chiffresReferentielSuivi\(\);/);
    for (const { nom } of ANNONCEURS) {
      expect(page).toMatch(new RegExp(`<${nom}[^>]*chiffres=\\{chiffres\\}`));
    }
  });
});
