import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * ADR-036, lot 4 — UNE SEULE FONCTION DATE UNE LIGNE, et deux fichiers
 * seulement l'écrivent en base. Garde statique, sur le modèle de
 * `lib/dates/garde-fuseau.test.ts`.
 *
 * CE QU'ELLE EMPÊCHE. Avant la bascule, la date d'une ligne s'écrivait à quatre
 * endroits — le `createMany` et l'`update` de la régénération, `rouler` au dépôt
 * d'un rapport, le recul à sa suppression — et le réconciliateur la redécidait
 * dans huit branches. Chaque chemin avait sa règle ; la régénération suivante
 * ne recalculait rien. La bascule a ramené les trois chemins sur
 * `echeanceDeLigne`. Le jour où quelqu'un recalcule une échéance « pour aller
 * plus vite » dans une action, ou écrit une `datePrevue` depuis un autre
 * module, les chemins divergent de nouveau — sans qu'aucun test de
 * comportement ne le voie, puisque chacun teste son chemin.
 *
 * DEUX RÈGLES :
 *  1. `prochaineEcheance(` — le pas calendaire d'une échéance — n'est APPELÉE
 *     que depuis :
 *       · `calendrier/echeance-de-ligne.ts` — la fonction ;
 *       · `salaries/echeance.ts` — `echeanceDuTitre`, la date d'un titre, que
 *         la règle 1 de la fonction reçoit toute faite ;
 *       · `calendrier/periodicite.ts` — qui la définit ;
 *       · `calendrier/passage-a-blanc.ts` — ÉCART AVEC LE PLAN, et voici
 *         pourquoi : l'outil de contrôle cherche si une date EN BASE s'explique
 *         par « une ancre + un rythme » (`rythmeQuiExplique`) pour CLASSER un
 *         écart. Il ne date aucune ligne et n'écrit rien (sa lecture seule est
 *         gardée par `passage-a-blanc.test.ts`), et aucun module de production
 *         ne l'importe (garde ci-dessous).
 *  2. Une écriture Prisma dont le `data` porte `datePrevue` — `create`,
 *     `createMany`, `update`, `updateMany`, `upsert`, sur n'importe quel
 *     client — n'existe que dans `calendrier/actions.ts` (la régénération) et
 *     `calendrier/recalcul-ligne.ts` (le dépôt et le retrait d'un rapport). Et
 *     aucune requête SQL brute n'écrit la colonne.
 *  3. Même règle pour le `statut` d'une `Verification` (2026-09-19). L'ADR-036
 *     § 2 dit que `datePrevue` ET `statut` sont dérivés ; la garde ne tenait
 *     que la date, et un module qui soldait une ligne par
 *     `prisma.verification.updateMany({ data: { statut: "realisee_conforme" } })`
 *     laissait la suite entière verte (mesuré par l'audit du 2026-09-19). Le
 *     nom `statut` est porté par d'autres modèles — `Action`, `PermisFeu`,
 *     `PlanPrevention` —, donc la règle ne vise que les écritures sur le
 *     délégué `verification` (appelé directement, ou imbriqué sous une clé
 *     `verification`/`verifications` du `data` d'un autre modèle), et le SQL
 *     brut qui vise la table `"Verification"`.
 *
 * PORTÉE : `src/`, tests exclus (ils fabriquent des dates), et
 * `calendrier/faux-prisma.ts`, le faux client des tests, qui simule les
 * écritures sans en faire. `scripts/` et `prisma/seed.ts` ont leur propre
 * garde — leur `datePrevue` sort de `echeanceDeLigne` —, dans
 * `seeds-en-faits.test.ts`.
 */

const RACINE_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const APPELANTS_PROCHAINE_ECHEANCE = [
  "lib/calendrier/echeance-de-ligne.ts",
  "lib/calendrier/periodicite.ts",
  "lib/calendrier/passage-a-blanc.ts",
  "lib/salaries/echeance.ts",
];

const ECRIVAINS_DATE_PREVUE = [
  "lib/calendrier/actions.ts",
  "lib/calendrier/recalcul-ligne.ts",
];

const HORS_PORTEE = new Set(["lib/calendrier/faux-prisma.ts"]);

function listerSources(): { chemin: string; code: string }[] {
  const out: { chemin: string; code: string }[] = [];
  const parcourir = (dossier: string): void => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const complet = join(dossier, e.name);
      if (e.isDirectory()) parcourir(complet);
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
        const chemin = relative(RACINE_SRC, complet).split(sep).join("/");
        if (!HORS_PORTEE.has(chemin)) {
          out.push({ chemin, code: readFileSync(complet, "utf8") });
        }
      }
    }
  };
  parcourir(RACINE_SRC);
  return out;
}

function source(chemin: string, code: string): ts.SourceFile {
  return ts.createSourceFile(
    chemin,
    code,
    ts.ScriptTarget.Latest,
    true,
    chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** Les APPELS à `prochaineEcheance` — un identifiant appelé, pas une mention
 *  en commentaire ni un import. Lu sur l'arbre syntaxique : un commentaire ne
 *  compte pas, une chaîne non plus. */
function appelsProchaineEcheance(chemin: string, code: string): number {
  let n = 0;
  const visiter = (noeud: ts.Node): void => {
    if (ts.isCallExpression(noeud)) {
      const appele = noeud.expression;
      const nom = ts.isIdentifier(appele)
        ? appele.text
        : ts.isPropertyAccessExpression(appele)
          ? appele.name.text
          : null;
      if (nom === "prochaineEcheance") n += 1;
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(source(chemin, code));
  return n;
}

const METHODES_ECRITURE = new Set(["create", "createMany", "update", "updateMany", "upsert"]);

/** Une clé `cle` quelque part sous `n` — propriété ou forme abrégée. */
function porteCle(n: ts.Node, cle: string): boolean {
  let trouve = false;
  const visiter = (x: ts.Node): void => {
    if (trouve) return;
    if (
      (ts.isPropertyAssignment(x) || ts.isShorthandPropertyAssignment(x)) &&
      x.name.getText() === cle
    ) {
      trouve = true;
      return;
    }
    ts.forEachChild(x, visiter);
  };
  visiter(n);
  return trouve;
}

function porteDatePrevue(n: ts.Node): boolean {
  return porteCle(n, "datePrevue");
}

/** Les propriétés d'un littéral objet, par nom. */
function proprietes(o: ts.ObjectLiteralExpression, nom: string): ts.Node[] {
  return o.properties.filter(
    (p) =>
      (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
      p.name.getText() === nom,
  );
}

/** Une écriture imbriquée sur la relation `verification(s)` qui porte
 *  `statut` : `data: { verifications: { updateMany: { data: { statut } } } }`. */
function imbriqueStatutVerification(n: ts.Node): boolean {
  let trouve = false;
  const visiter = (x: ts.Node): void => {
    if (trouve) return;
    if (
      ts.isPropertyAssignment(x) &&
      /^verifications?$/.test(x.name.getText()) &&
      porteCle(x.initializer, "statut")
    ) {
      trouve = true;
      return;
    }
    ts.forEachChild(x, visiter);
  };
  visiter(n);
  return trouve;
}

/** Les écritures Prisma du `statut` d'une vérification, « ligne: texte » :
 *  un appel sur le délégué `verification` dont le `data` porte `statut`, ou
 *  une écriture de n'importe quel modèle qui l'imbrique sous sa relation. */
function ecrituresDeStatutVerification(chemin: string, code: string): string[] {
  const sf = source(chemin, code);
  const out: string[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (
      ts.isCallExpression(noeud) &&
      ts.isPropertyAccessExpression(noeud.expression) &&
      METHODES_ECRITURE.has(noeud.expression.name.text)
    ) {
      const cible = noeud.expression.expression;
      const surVerification =
        ts.isPropertyAccessExpression(cible) && cible.name.text === "verification";
      for (const arg of noeud.arguments) {
        if (!ts.isObjectLiteralExpression(arg)) continue;
        for (const p of proprietes(arg, "data")) {
          if (
            (surVerification && porteCle(p, "statut")) ||
            imbriqueStatutVerification(p)
          ) {
            const { line } = sf.getLineAndCharacterOfPosition(noeud.getStart());
            out.push(`${line + 1}: ${noeud.expression.getText()}`);
          }
        }
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(sf);
  return out;
}

/** Les écritures Prisma dont le `data` porte `datePrevue`, « ligne: texte ». */
function ecrituresDeDatePrevue(chemin: string, code: string): string[] {
  const sf = source(chemin, code);
  const out: string[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (
      ts.isCallExpression(noeud) &&
      ts.isPropertyAccessExpression(noeud.expression) &&
      METHODES_ECRITURE.has(noeud.expression.name.text)
    ) {
      for (const arg of noeud.arguments) {
        if (!ts.isObjectLiteralExpression(arg)) continue;
        for (const p of arg.properties) {
          if (
            (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
            p.name.getText() === "data" &&
            porteDatePrevue(p)
          ) {
            const { line } = sf.getLineAndCharacterOfPosition(noeud.getStart());
            out.push(`${line + 1}: ${noeud.expression.getText()}`);
          }
        }
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(sf);
  return out;
}

/** Commentaires neutralisés, chaînes préservées (même règle que la garde de
 *  `echeance-de-ligne.test.ts`) : ce dépôt commente densément les noms qu'on
 *  cherche. */
function sansCommentaires(code: string): string {
  return code.replace(
    /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (tout: string, chaine: string | undefined) => chaine ?? tout.replace(/[^\n]/g, " "),
  );
}

/** Une écriture SQL brute de la colonne. */
const SQL_DATE_PREVUE = /(SET|,)\s*"datePrevue"\s*=/;

/** Une écriture SQL brute du statut d'une vérification : la table est nommée,
 *  puisque d'autres tables ont une colonne `statut`. */
const SQL_STATUT_VERIFICATION =
  /UPDATE\s+"Verification"[^;`]*?(SET|,)\s*"statut"\s*=|INSERT\s+INTO\s+"Verification"[^;`]*?"statut"/;

const SOURCES = listerSources();

describe("ADR-036 — une seule fonction date une ligne", () => {
  it("le parcours voit le dépôt, et les modules autorisés existent", () => {
    expect(SOURCES.length).toBeGreaterThan(100);
    for (const c of [...APPELANTS_PROCHAINE_ECHEANCE, ...ECRIVAINS_DATE_PREVUE]) {
      expect(SOURCES.some((s) => s.chemin === c), `${c} autorisé mais absent`).toBe(true);
    }
  });

  it("les motifs reconnaissent ce qu'ils cherchent, et pas les commentaires", () => {
    // La garde de la garde : un motif trop étroit passerait à vide.
    expect(appelsProchaineEcheance("x.ts", "const p = prochaineEcheance(d, 'annuelle');")).toBe(1);
    expect(appelsProchaineEcheance("x.ts", "const p = periodicite.prochaineEcheance(d, r);")).toBe(1);
    expect(appelsProchaineEcheance("x.ts", "// prochaineEcheance(d, r)\nimport { prochaineEcheance } from 'y';")).toBe(0);
    expect(ecrituresDeDatePrevue("x.ts", "tx.verification.updateMany({ where, data: { datePrevue: d } });")).toHaveLength(1);
    expect(ecrituresDeDatePrevue("x.ts", "prisma.verification.createMany({ data: lignes.map((v) => ({ datePrevue: v.d })) });")).toHaveLength(1);
    expect(ecrituresDeDatePrevue("x.ts", "db.verification.update({ where, data: { datePrevue } });")).toHaveLength(1);
    expect(ecrituresDeDatePrevue("x.ts", "prisma.verification.findMany({ where: { datePrevue: { lt: d } } });")).toHaveLength(0);
    expect(ecrituresDeDatePrevue("x.ts", "prisma.verification.updateMany({ where: { datePrevue: d }, data: { statut } });")).toHaveLength(0);
    expect(SQL_DATE_PREVUE.test('UPDATE "Verification" SET "datePrevue" = now()')).toBe(true);
    // `statut`, sur le délégué `verification` seulement.
    expect(ecrituresDeStatutVerification("x.ts", 'prisma.verification.updateMany({ where, data: { statut: "realisee_conforme" } });')).toHaveLength(1);
    expect(ecrituresDeStatutVerification("x.ts", "tx.verification.update({ where, data: { statut } });")).toHaveLength(1);
    expect(ecrituresDeStatutVerification("x.ts", "prisma.verification.createMany({ data: lignes.map((v) => ({ statut: v.s })) });")).toHaveLength(1);
    expect(ecrituresDeStatutVerification("x.ts", "prisma.equipement.update({ where, data: { verifications: { updateMany: { where, data: { statut } } } } });")).toHaveLength(1);
    expect(ecrituresDeStatutVerification("x.ts", 'prisma.action.update({ where, data: { statut: "levee" } });')).toHaveLength(0);
    expect(ecrituresDeStatutVerification("x.ts", "prisma.verification.updateMany({ where: { statut }, data: { archiveLe: d } });")).toHaveLength(0);
    expect(SQL_STATUT_VERIFICATION.test('UPDATE "Verification" SET "statut" = \'a_planifier\'')).toBe(true);
    expect(SQL_STATUT_VERIFICATION.test('UPDATE "Action" SET "statut" = \'levee\'')).toBe(false);
  });

  it("`prochaineEcheance(` n'est appelée que par la fonction d'échéance et ses sources", () => {
    const fautes = SOURCES.filter((s) => !APPELANTS_PROCHAINE_ECHEANCE.includes(s.chemin))
      .map((s) => ({ chemin: s.chemin, n: appelsProchaineEcheance(s.chemin, s.code) }))
      .filter((x) => x.n > 0)
      .map((x) => `${x.chemin} (${x.n})`);
    expect(
      fautes,
      "Une échéance calculée hors de `echeanceDeLigne` : c'est un second calculateur " +
        "de date (ADR-036). Passez par `recalculerLigne` ou par la régénération.",
    ).toEqual([]);
    // Et la fonction l'appelle bien : sans quoi la liste ne garderait rien.
    const fonction = SOURCES.find((s) => s.chemin === "lib/calendrier/echeance-de-ligne.ts")!;
    expect(appelsProchaineEcheance(fonction.chemin, fonction.code)).toBeGreaterThan(0);
  });

  it("une écriture de `datePrevue` n'existe que dans la régénération et le recalcul d'une ligne", () => {
    const fautes: string[] = [];
    for (const s of SOURCES) {
      const ecritures = ecrituresDeDatePrevue(s.chemin, s.code);
      if (ecritures.length > 0 && !ECRIVAINS_DATE_PREVUE.includes(s.chemin)) {
        fautes.push(...ecritures.map((e) => `${s.chemin}:${e}`));
      }
      if (SQL_DATE_PREVUE.test(sansCommentaires(s.code))) fautes.push(`${s.chemin} : SQL brut`);
    }
    expect(
      fautes,
      "`datePrevue` écrite hors de `calendrier/actions.ts` et `calendrier/recalcul-ligne.ts` " +
        "(ADR-036) : la date d'une ligne sort de `echeanceDeLigne`, par ces deux chemins.",
    ).toEqual([]);
    // Les deux autorisés écrivent bien la colonne : une entrée morte serait une
    // porte ouverte à un fichier futur du même nom.
    for (const c of ECRIVAINS_DATE_PREVUE) {
      const s = SOURCES.find((x) => x.chemin === c)!;
      expect(ecrituresDeDatePrevue(s.chemin, s.code).length, c).toBeGreaterThan(0);
    }
  });

  it("une écriture du `statut` d'une vérification n'existe que dans la régénération et le recalcul d'une ligne", () => {
    const fautes: string[] = [];
    for (const s of SOURCES) {
      const ecritures = ecrituresDeStatutVerification(s.chemin, s.code);
      if (ecritures.length > 0 && !ECRIVAINS_DATE_PREVUE.includes(s.chemin)) {
        fautes.push(...ecritures.map((e) => `${s.chemin}:${e}`));
      }
      if (SQL_STATUT_VERIFICATION.test(sansCommentaires(s.code))) fautes.push(`${s.chemin} : SQL brut`);
    }
    expect(
      fautes,
      "`Verification.statut` écrit hors de `calendrier/actions.ts` et " +
        "`calendrier/recalcul-ligne.ts` (ADR-036 § 2) : le statut d'une ligne est " +
        "dérivé, il sort de `echeanceDeLigne` ou de la boucle NB4, par ces deux chemins.",
    ).toEqual([]);
    // Les mêmes deux fichiers écrivent le statut avec la date : une entrée
    // morte ici serait une porte ouverte.
    for (const c of ECRIVAINS_DATE_PREVUE) {
      const s = SOURCES.find((x) => x.chemin === c)!;
      expect(ecrituresDeStatutVerification(s.chemin, s.code).length, c).toBeGreaterThan(0);
    }
  });

  it("l'outil de contrôle n'est importé par aucun module de production", () => {
    // Il est autorisé à appeler `prochaineEcheance` parce qu'il n'est pas un
    // chemin de production : scripts et tests seulement.
    const importateurs = SOURCES.filter((s) =>
      /["'`][^"'`]*passage-a-blanc(\.[cm]?[jt]sx?)?["'`]/.test(sansCommentaires(s.code)),
    )
      .map((s) => s.chemin)
      .filter((c) => c !== "lib/calendrier/passage-a-blanc.ts");
    expect(importateurs).toEqual([]);
  });
});
