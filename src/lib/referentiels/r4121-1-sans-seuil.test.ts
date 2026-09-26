import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * « OBLIGATOIRE DÈS LE PREMIER SALARIÉ (ART. R. 4121-1) » — revue finale de
 * l'intégration d, 2026-09-26.
 *
 * Relus sur Légifrance le 2026-09-26 : R. 4121-1 (en vigueur depuis le
 * 2011-04-01) écrit « L'employeur transcrit et met à jour dans un document
 * unique les résultats de l'évaluation des risques pour la santé et la
 * sécurité des travailleurs à laquelle il procède en application de
 * l'article L. 4121-3 » ; L. 4121-3 (depuis le 2022-03-31) fait évaluer les
 * risques par « L'employeur ». Ni l'un ni l'autre n'écrit « dès le premier
 * salarié » : c'est une lecture — qui est employeur a au moins un salarié —,
 * pas le texte. Trois surfaces l'attribuaient à R. 4121-1 : la checklist de
 * l'établissement, la carte « Pourquoi ce document » du document unique et
 * la liste des documents obligatoires. Elles disent désormais ce que
 * l'article dit, et qu'il ne fixe pas de seuil d'effectif.
 *
 * Portée : les écrans et la liste des documents. Les notes du référentiel
 * (commentaires, `notesInternes`) ne sont pas affichées.
 */
const RACINE = join(process.cwd(), "src");
const SURFACES = [
  "app",
  "components",
  "lib/referentiels/documents-obligatoires.ts",
];

function fichiers(p: string): string[] {
  const abs = join(RACINE, p);
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((n) => fichiers(join(p, n)));
}

describe("R. 4121-1 n'est pas cité pour « dès le premier salarié »", () => {
  it("aucune surface affichée ne l'écrit", () => {
    const fautifs = SURFACES.flatMap(fichiers)
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .filter((f) => /premier salarié/i.test(readFileSync(f, "utf8")))
      .map((f) => relative(RACINE, f));
    expect(fautifs).toEqual([]);
  });
});

/**
 * LE RÉFÉRENTIEL AUSSI (contre-lecture de C40, 2026-09-27). La description de
 * `prevention-etablissement-salarie-designe` écrivait « Cette désignation
 * s'impose dès le premier salarié » : L. 4644-1 I, relu le 2026-09-27, n'en
 * dit rien — il ne pose ni condition d'effectif ni de secteur, ce que la
 * description dit désormais. Celle de la formation du salarié désigné disait
 * « due dès le premier salarié désigné » : elle cite désormais l'alinéa.
 *
 * Restent, ADMIS À LA PHRASE EXACTE, des commentaires de code et des
 * `notesInternes` — qui ne s'affichent pas — où « dès le premier salarié »
 * est une lecture assumée : qui est employeur a au moins un salarié. Une
 * occurrence nouvelle, ou une phrase admise réécrite, fait tomber le test.
 */
const ADMIS_REFERENTIEL: readonly string[] = [
  // formation-securite.ts, commentaire d'en-tête
  "statut d'employeur : dès le premier salarié, sans condition de secteur,",
  // formation-securite.ts, notesInternes de l'accueil
  "(alors qu'elle est due dès le premier salarié)",
  // information-travailleurs.ts, notesInternes
  "l'avis est dû dès le premier salarié, alors que le règlement intérieur n'est dû qu'à cinquante.",
  // index.ts, commentaire
  "le socle de l'employeur : ce qui est dû dès le premier salarié,",
  // types.ts, commentaire (coupé en deux lignes de commentaire)
  "elle s'impose dès le premier salarié, sans condition d'équipement, de secteur ni d'effectif.",
];

describe("« dès le premier salarié » dans le référentiel de conformité", () => {
  const RE = /dès\s+le\s+(?:\*\s+)?premier\s+salarié/g;
  const plat = (t: string) => t.replace(/\n\s*\*\s*/g, " ").replace(/\s+/g, " ");
  const textes = fichiers("lib/referentiels/conformite")
    .filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))
    .map((f) => ({ f: relative(RACINE, f), t: plat(readFileSync(f, "utf8")) }));

  it("aucune occurrence hors des phrases admises", () => {
    const hors: string[] = [];
    for (const { f, t } of textes) {
      let reste = t;
      for (const a of ADMIS_REFERENTIEL) reste = reste.split(a).join("");
      if (RE.test(reste)) hors.push(f);
      RE.lastIndex = 0;
    }
    expect(hors).toEqual([]);
  });

  it("chaque phrase admise existe encore — sinon la retirer", () => {
    const tout = textes.map((x) => x.t).join("\n");
    for (const a of ADMIS_REFERENTIEL) expect(tout, a).toContain(a);
  });
});
