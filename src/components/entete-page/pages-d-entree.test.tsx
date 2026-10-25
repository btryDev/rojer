/**
 * Un seul idiome pour dire où vit une page d'entrée de registre (ADR-014).
 *
 * Contrôle visuel du 2026-10-13 : « ← LE COMPTOIR DES HALLES » sur les permis
 * de feu, les plans de prévention et les zones, un fil d'Ariane sur le carnet
 * sanitaire — la même relation dite de deux façons. Le lien vers
 * l'établissement dit où la page est RANGÉE : c'est un fil d'Ariane, pas un
 * retour (le retour dit d'où l'on vient).
 *
 * [2026-10-25 : le fil d'Ariane a quitté les pages d'entrée, avec le
 * composant `FilAriane` (décision de la propriétaire, maquette v3 du
 * Calendrier) — la marque du rail et la gélule de compte mènent à
 * l'établissement. La garde, déplacée ici depuis `FilAriane.test.tsx`, dit
 * désormais deux choses : chaque page d'entrée s'ouvre sur `EnTetePage`, et
 * aucune n'écrit de retour en dur vers l'établissement.]
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Le source privé de ses commentaires, par l'arbre syntaxique de TypeScript
 * (comme `question-matieres.test.tsx`) : un commentaire qui raconte l'ancien
 * « ← » n'est pas du texte affiché, et une expression régulière ne sait pas
 * distinguer un « // » de fin de ligne d'un « // » dans une chaîne.
 */
const IMPRIMEUR = ts.createPrinter({ removeComments: true });
const analyser = (source: string) =>
  ts.createSourceFile("f.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const sansCommentaires = (source: string) => IMPRIMEUR.printFile(analyser(source));

const FLECHE = /←|&larr;|&#8592;|&#x2190;/i;

/** Une valeur de href qui s'arrête sur l'établissement lui-même. */
function finitSurLEtablissement(
  expr: ts.Expression,
  constantes: Map<string, ts.Expression>,
  profondeur = 0,
): boolean {
  if (profondeur > 5) return false;
  if (ts.isParenthesizedExpression(expr)) {
    return finitSurLEtablissement(expr.expression, constantes, profondeur + 1);
  }
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return /^\/etablissements\/[^/?#]+\/?$/.test(expr.text);
  }
  if (ts.isTemplateExpression(expr)) {
    // `/etablissements/${…}` — quel que soit le nom de la variable — et rien
    // après : ni sous-chemin, ni query.
    return (
      expr.head.text === "/etablissements/" &&
      expr.templateSpans.length === 1 &&
      ["", "/"].includes(expr.templateSpans[0].literal.text)
    );
  }
  if (ts.isIdentifier(expr)) {
    const init = constantes.get(expr.text);
    return init ? finitSurLEtablissement(init, constantes, profondeur + 1) : false;
  }
  return false;
}

/**
 * Ce qui, dans le source d'une page d'entrée (ou du bandeau auquel elle
 * délègue son en-tête), écrit un RETOUR en dur vers l'établissement au lieu de
 * dire où la page est rangée. Lu sur l'arbre syntaxique, donc indifférent à
 * l'ordre des attributs et au nom des variables :
 * - une icône de flèche ou de chevron gauche (`ArrowLeft`, `ChevronLeft`…) ;
 * - un chevron ou une flèche droite retournés par un `rotate-180` NU — le
 *   calendrier, le registre et le périmètre le portaient jusqu'au 2026-10-13 ;
 *   `group-open:rotate-180` (le volet qui se déplie) n'est pas un retour ;
 * - « ← » (ou `&larr;`) dans un texte ou une chaîne ;
 * - un `<Link>` ou `<a>` dont le href s'arrête sur l'établissement — ~~c'est le
 *   fil d'Ariane, et lui seul, qui porte ce lien~~ [2026-10-25 : la marque du
 *   rail et la gélule de compte le portent].
 *
 * ~~Un `retour` passé à `AppTopbar`~~ [2026-10-25 : le composant est supprimé,
 * toutes les pages d'entrée ouvrent sur `EnTetePage`, qui n'a pas de retour.]
 */
function retoursEnDur(source: string): string[] {
  const racine = analyser(sansCommentaires(source));
  const constantes = new Map<string, ts.Expression>();
  const fautes = new Set<string>();

  const relever = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      constantes.set(n.name.text, n.initializer);
    }
    ts.forEachChild(n, relever);
  };
  relever(racine);

  const attribut = (el: ts.JsxOpeningLikeElement, nom: string) =>
    el.attributes.properties.find(
      (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === nom,
    );

  const visiter = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const balise = n.tagName.getText();
      if (/^(Arrow|Chevrons?|Move)Left/.test(balise)) {
        fautes.add(`icône gauche (${balise})`);
      }
      if (/^(Arrow|Chevrons?|Move)Right/.test(balise)) {
        const classes = attribut(n, "className")?.initializer?.getText() ?? "";
        if (classes.split(/[\s"'`{}(),]+/).includes("rotate-180")) {
          fautes.add("chevron retourné (rotate-180)");
        }
      }
      if (balise === "Link" || balise === "a") {
        const init = attribut(n, "href")?.initializer;
        const expr =
          init && ts.isJsxExpression(init) ? init.expression : (init as ts.Expression | undefined);
        if (expr && finitSurLEtablissement(expr, constantes)) {
          fautes.add("lien écrit à la main vers l'établissement");
        }
      }
    }
    if (ts.isJsxText(n) && FLECHE.test(n.text)) fautes.add("« ← » en texte");
    if (
      (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) &&
      FLECHE.test(n.text)
    ) {
      fautes.add("« ← » en texte");
    }
    ts.forEachChild(n, visiter);
  };
  visiter(racine);
  return [...fautes];
}

describe("les pages d'entrée s'ouvrent sur l'en-tête commun, sans retour écrit en dur", () => {
  const SRC = path.resolve(__dirname, "../..");
  const RACINE = path.join(SRC, "app/etablissements/[id]");
  // Toutes les pages d'entrée de module : chaque dossier direct sous
  // `etablissements/[id]` qui porte une page. Balayées et non énumérées — une
  // page d'entrée neuve tombe sous la garde sans qu'on ait à l'y inscrire.
  // Les fiches de détail (`[actionId]`, `[permisFeuId]`…) et les écrans de
  // saisie (`nouveau`, `modifier` d'une fiche) sont plus profonds : leur
  // retour suit la provenance (ADR-014), pas cette règle.
  // [2026-10-24, revue] Plus les ONGLETS d'une page d'entrée, un cran plus
  // bas — ils sont des pages d'entrée au même titre —, moins les anciennes
  // adresses qui ne font que rediriger.
  // [2026-10-24 : « equipe/formations » n'est plus un onglet mais une
  // redirection vers la section de la page Équipe.]
  const ONGLETS = ["etats-permanents/en-cas-de"];
  const REDIRECTIONS = ["quand-ca-arrive"];
  const pages = [
    ...readdirSync(RACINE, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("["))
      .map((e) => e.name)
      .filter((nom) => !REDIRECTIONS.includes(nom)),
    ...ONGLETS,
  ]
    .filter((nom) => existsSync(path.join(RACINE, nom, "page.tsx")))
    .sort();
  const lire = (dossier: string) =>
    readFileSync(path.join(RACINE, dossier, "page.tsx"), "utf8");

  // Les bandeaux auxquels une page d'entrée délègue son en-tête : les
  // composants qu'elle importe et qui portent le `<h1>` (~~`BandeauParc`~~
  // [2026-10-25 : `EnTetePage`] pour les équipements, dont le bouton rond
  // « Retour à Mon établissement » avait échappé à la première garde). `AppTopbar` est le chrome commun : son « ← »
  // est le retour de provenance des fiches (ADR-014), et la règle qui le vise
  // ici est qu'aucune page d'entrée ne lui passe de `retour`.
  const resoudre = (specifieur: string) =>
    ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]
      .map((ext) => path.join(SRC, specifieur.slice("@/".length) + ext))
      .find((f) => existsSync(f) && statSync(f).isFile());
  const bandeaux = [
    ...new Set(
      pages.flatMap((dossier) =>
        analyser(lire(dossier))
          .statements.filter(ts.isImportDeclaration)
          .map((i) => (i.moduleSpecifier as ts.StringLiteral).text)
          .filter((s) => s.startsWith("@/components/"))
          .map(resoudre)
          .filter((f): f is string => !!f && f.endsWith(".tsx"))
          .filter((f) => sansCommentaires(readFileSync(f, "utf8")).includes("<h1")),
      ),
    ),
  ].sort();

  it("balaie bien les pages d'entrée (borne basse)", () => {
    // 21 au 2026-10-13. Une borne basse : un dossier renommé ou un chemin
    // cassé ferait passer la garde à vide, pas une page ajoutée.
    expect(pages.length).toBeGreaterThanOrEqual(21);
  });

  it("lit aussi les bandeaux délégués (borne basse)", () => {
    // ~~`BandeauParc.tsx`~~ [2026-10-25 : le parc a perdu son titre au profit
    // de l'en-tête commun ; c'est lui, désormais, le bandeau délégué qui
    // porte le `<h1>` des pages d'entrée.]
    expect(bandeaux.map((f) => path.basename(f))).toContain("EnTetePage.tsx");
  });

  it.each(pages)(
    "%s : aucune flèche de retour écrite en dur vers l'établissement",
    (dossier) => {
      expect(retoursEnDur(lire(dossier))).toEqual([]);
    },
  );

  it.each(bandeaux.map((f) => [path.relative(SRC, f), f]))(
    "bandeau délégué %s : aucune flèche de retour écrite en dur",
    (_nom, fichier) => {
      expect(retoursEnDur(readFileSync(fichier, "utf8"))).toEqual([]);
    },
  );

  // Le pendant positif. ~~Une liste de seize pages qui devaient porter un
  // fil d'Ariane~~ [2026-10-25 : toutes les pages d'entrée ouvrent désormais
  // sur l'en-tête commun, qui n'en porte pas — décision de la propriétaire
  // (maquette v3 du Calendrier) : la sidebar et la gélule de compte disent où
  // l'on est. La liste ne vérifiait donc plus rien ; la règle devient celle-ci,
  // sur TOUTES les pages balayées.] Importé ET rendu, lus par l'arbre de
  // syntaxe et sans les commentaires : un en-tête laissé en commentaire ne
  // compte pas.
  it.each(pages)("%s : s'ouvre sur l'en-tête commun", (dossier) => {
    const source = lire(dossier);
    const importeEnTete = analyser(source).statements.some(
      (i) =>
        ts.isImportDeclaration(i) &&
        (i.moduleSpecifier as ts.StringLiteral).text === "@/components/entete-page/EnTetePage",
    );
    expect(importeEnTete && /<EnTetePage\b/.test(sansCommentaires(source))).toBe(true);
  });
});

describe("la garde elle-même", () => {
  const lien = (attributs: string, contenu = "{etab.raisonDisplay}") =>
    `export const P = () => <Link ${attributs}>${contenu}</Link>;`;

  it("attrape le lien quel que soit l'ordre des attributs", () => {
    expect(retoursEnDur(lien('className="x" href={`/etablissements/${id}`}'))).toEqual([
      "lien écrit à la main vers l'établissement",
    ]);
  });

  it("attrape le lien quel que soit le nom de la variable", () => {
    expect(retoursEnDur(lien("href={`/etablissements/${etablissement.id}`}"))).toEqual([
      "lien écrit à la main vers l'établissement",
    ]);
    expect(
      retoursEnDur(
        "const base = `/etablissements/${id}`;\n" + lien('className="x" href={base}'),
      ),
    ).toEqual(["lien écrit à la main vers l'établissement"]);
  });

  it("ne prend pas un sous-chemin pour l'établissement", () => {
    expect(retoursEnDur(lien("href={`/etablissements/${id}/actions`}"))).toEqual([]);
    expect(
      retoursEnDur("const base = `/etablissements/${id}`;\n" + lien("href={`${base}/calendrier`}")),
    ).toEqual([]);
  });

  it("attrape &larr; comme ←", () => {
    expect(retoursEnDur(lien('href="/ailleurs"', "&larr; Retour"))).toEqual(["« ← » en texte"]);
    expect(retoursEnDur(lien('href="/ailleurs"', "← Retour"))).toEqual(["« ← » en texte"]);
    expect(retoursEnDur(lien('href="/ailleurs"', '{"← Retour"}'))).toEqual(["« ← » en texte"]);
  });

  it("attrape les icônes de retour", () => {
    expect(retoursEnDur(`export const P = () => <ArrowLeft className="size-3" />;`)).toEqual([
      "icône gauche (ArrowLeft)",
    ]);
    expect(retoursEnDur(`export const P = () => <ChevronLeft className="size-4" />;`)).toEqual([
      "icône gauche (ChevronLeft)",
    ]);
    expect(
      retoursEnDur(`export const P = () => <ChevronRight aria-hidden className="size-3 rotate-180" />;`),
    ).toEqual(["chevron retourné (rotate-180)"]);
  });

  it("ne prend pas un volet qui se déplie pour un retour", () => {
    expect(
      retoursEnDur(`export const P = () => <ChevronDown className="group-open:rotate-180" />;`),
    ).toEqual([]);
    expect(
      retoursEnDur(`export const P = () => <ChevronRight className="group-open:rotate-180" />;`),
    ).toEqual([]);
  });

  it("ne prend pas un commentaire pour du texte", () => {
    expect(
      retoursEnDur(
        `export const P = () => <p>Texte</p>; // l'ancien « ← LE COMPTOIR DES HALLES »\n` +
          `export const Q = () => <div>{/* « ← » */}<FilAriane crumbs={[]} /></div>;`,
      ),
    ).toEqual([]);
  });

});
