import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * CE QUE CE FICHIER DÉFEND, ET POURQUOI IL BALAIE DES SOURCES.
 *
 * Le lot qui a posé le fait de fraîcheur l'a branché sur quatre sorties. Une
 * contre-lecture a montré que TROIS d'entre elles n'étaient tenues par rien :
 * couper l'avertissement du ZIP de contrôle, du PDF de dossier et de l'écran
 * « Préparer un contrôle » laissait 806 tests verts. La cause est simple et
 * n'est pas réparable test par test : aucun fichier de test n'importe une route
 * d'API ni une page serveur, et le test du composant PDF garde la PROP, pas le
 * builder qui la remplit. Une correction qu'aucune garde ne tient se défait à
 * la première réécriture — et celle-ci porte sur le document qu'on remet à un
 * contrôleur.
 *
 * LA GARDE NE RECOPIE PAS UNE LISTE, ELLE DÉRIVE UN CRITÈRE. Le critère est
 * causal : **une sortie qui LIT le calendrier doit DIRE son âge** (ou le
 * réparer avant de lire).
 *
 * [2026-10-13, revue du lot « calendrier périmé par lien direct ».] Le critère
 * était dérivé, mais pas ses LECTEURS : une liste de sept fonctions écrite à la
 * main, à laquelle manquaient `compterEtatEcheances`, `compterEtatCalendrier`,
 * `listerEvenementsCalendrier`, `compterVerifsParEquipement`,
 * `listerBatimentsAvecCharge`, `getModulesMatrice`, `compterObligationsParMois`,
 * `listerEvenementsFenetre`, `compterEnRetardParFamille` — et tout appel direct
 * à `prisma.verification` depuis une page. Elle est désormais DÉRIVÉE du code :
 * une fonction lit le calendrier si elle lit la table `Verification` (requête
 * `x.verification.findMany|…|count…`, ou relation `verification(s)` dans un
 * `include`/`select`), ou si elle appelle une fonction qui le fait. La
 * clôture se calcule sur l'arbre syntaxique de `src/` (TypeScript), par nom.
 *
 * Même technique que `corpus/citations-ecran.ts` et `auth/tenancy-sonde.ts` :
 * on lit les sources, parce que la propriété porte sur le CÂBLAGE et qu'aucune
 * exécution ne l'observe.
 */

const RACINE = join(__dirname, "..", "..", "..");

/** Les dossiers où vivent les sorties qui rendent un état de conformité. */
const SURFACES = ["src/app", "src/lib/pdf", "src/lib/mcp"] as const;

/**
 * Porter la fraîcheur, c'est APPELER l'une de ces fonctions — un appel, dans
 * l'arbre syntaxique, pas un nom dans le texte.
 *
 * PREMIÈRE RÉDACTION, ET SA PANNE. La liste contenait aussi
 * `avertissementCalendrier`, cherché par `includes` sans parenthèse. Or c'est
 * le NOM DE LA PROP : il reste écrit quand on passe `avertissementCalendrier:
 * null`. La garde écrite pour empêcher qu'on coupe le fil ne voyait pas qu'on
 * l'avait coupé. Trouvé en l'éprouvant, pas en la relisant.
 */
const PORTE_LA_FRAICHEUR = [
  "fraicheurCalendrier", // application, portée par la session
  "getFraicheurCalendrier", // serveur MCP, portée explicite
] as const;
// [2026-10-13] `phraseFraicheur` et `etatSelonCalendrier` en ont été retirés :
// ils mettent en forme un état, ils ne le LISENT pas. Une fiche du registre
// dont la lecture était remplacée par `Promise.resolve(null)` gardait son
// appel à `phraseFraicheur` — dans une branche qui ne s'exécutait plus — et
// passait au vert.

/** Mettent en forme un état lu ailleurs : ne propagent pas la lecture. */
const MISE_EN_FORME = ["phraseFraicheur", "etatSelonCalendrier"] as const;

/**
 * Ces fonctions TOUCHENT la table sans être des lecteurs pour leurs
 * appelants : les marqueurs eux-mêmes (ils comptent les lignes pour départager
 * « jamais généré » d'un échec), et la réparation, dont l'ordre est tenu par
 * le second bloc de ce fichier. Les appeler ne fait pas « lire le calendrier ».
 */
const NE_PROPAGENT_PAS = new Set<string>([
  ...PORTE_LA_FRAICHEUR,
  ...MISE_EN_FORME,
  "fraicheurDepuisRepere",
  "assurerCalendrierAJour",
  "regenererSansInvalider",
  "regenererApresMutation",
  "genererCalendrier",
]);

/** Les requêtes Prisma qui LISENT une table. */
const REQUETES_DE_LECTURE = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "groupBy",
  "aggregate",
]);

/**
 * Les lecteurs qui n'ont rien à dire de la fraîcheur, avec leur raison.
 *
 * Chaque entrée est un ENGAGEMENT : elle dit pourquoi cette sortie échappe au
 * critère, et se relit quand elle change. Une exemption sans motif est une
 * liste exhaustive déguisée. Les motifs reprennent l'état des lieux du
 * 2026-10-13 (message de 56f3c2b2) : ces sorties lisent la table sans rendre
 * d'échéance calculée.
 */
const EXEMPTES: Record<string, string> = {
  // Les contrôles dont le prestataire est attitré (ADR-049) : leur nom et le
  // rendez-vous, colonnes qu'aucune régénération n'écrit ; aucune échéance.
  "src/app/etablissements/[id]/prestataires/[prestataireId]/page.tsx":
    "prestataire attitré et rendez-vous seulement, jamais l'échéance",
  // Les deux pages d'entrée RÉPARENT le calendrier avant de le lire : elles
  // n'ont pas à dire un âge qu'elles viennent de remettre à zéro. Vérifié par
  // le second bloc — un `await` autonome, avant tout autre.
  "src/app/etablissements/[id]/page.tsx":
    "page d'entrée : régénère avant de lire",
  "src/app/etablissements/[id]/calendrier/page.tsx":
    "page d'entrée : régénère avant de lire",
  // Le libellé de la ligne d'origine, jamais son échéance : celle qu'on lit
  // est celle de l'ACTION, une colonne qu'aucune régénération ne touche.
  "src/app/etablissements/[id]/actions/page.tsx":
    "libellé du porteur de la ligne d'origine ; l'échéance est celle de l'action",
  "src/app/etablissements/[id]/actions/[actionId]/modifier/page.tsx":
    "lit l'action et sa ligne d'origine, n'en affiche rien",
  // Limite écrite au § 12 de `chantiers-ouverts.md` : sans rapport,
  // `datePrevue` sert de repli à la date de CONSTAT — ce n'est pas une
  // échéance présentée comme à venir.
  "src/app/etablissements/[id]/actions/[actionId]/page.tsx":
    "libellé et rapports de la ligne d'origine ; datePrevue en repli de date de constat",
  "src/app/api/etablissements/[id]/plan-actions/pdf/route.ts":
    "plan d'actions : libellé du porteur ; l'échéance est celle de l'action",
  // Des faits acquis, que la régénération ne touche pas (ADR-012).
  "src/app/etablissements/[id]/registre/page.tsx":
    "rapports déposés et libellé de leur ligne, pas d'échéance calculée",
  "src/app/etablissements/[id]/prescriptions/page.tsx":
    "compte les lignes visées qui portent une preuve — un rapport",
  "src/app/etablissements/[id]/equipe/[salarieId]/page.tsx":
    "compte de cascade pour l'avertissement de suppression",
  // Page d'accès externe (lien magique) : elle nomme le rapport à signer par
  // le libellé de sa ligne, rien d'autre.
  "src/app/acces/[token]/page.tsx":
    "libellé du rapport à signer, pas d'échéance",
  // Les requêtes du serveur MCP n'ont qu'un lecteur, `tools.ts`, qui porte
  // la fraîcheur (`avecFraicheur`) — tenu par le test nominatif plus bas.
  "src/lib/mcp/queries.ts":
    "requêtes du serveur MCP ; tools.ts, qui les rend, porte la fraîcheur",
};

// ---------------------------------------------------------------------------
// Lecture des sources
// ---------------------------------------------------------------------------

function fichiersSources(dossier: string): string[] {
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) {
        if (entree !== "node_modules" && entree !== "generated") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) && !/\.d\.ts$/.test(p)) {
        trouves.push(p);
      }
    }
  };
  descendre(join(RACINE, dossier));
  return trouves;
}

const arbres = new Map<string, ts.SourceFile>();
function arbre(chemin: string): ts.SourceFile {
  let sf = arbres.get(chemin);
  if (!sf) {
    sf = ts.createSourceFile(
      chemin,
      readFileSync(chemin, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    arbres.set(chemin, sf);
  }
  return sf;
}

/** Ce qu'un nœud fait, en profondeur. */
type Faits = { litLaTable: boolean; appels: Set<string> };

function nomPropriete(n: ts.PropertyName): string | null {
  return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : null;
}

function faitsDe(racine: ts.Node): Faits {
  const faits: Faits = { litLaTable: false, appels: new Set() };
  const visiter = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const c = n.expression;
      if (ts.isIdentifier(c)) faits.appels.add(c.text);
      // `x.verification.findMany(…)` — quel que soit `x` (prisma, tx, db).
      if (
        ts.isPropertyAccessExpression(c) &&
        REQUETES_DE_LECTURE.has(c.name.text) &&
        ts.isPropertyAccessExpression(c.expression) &&
        c.expression.name.text === "verification"
      ) {
        faits.litLaTable = true;
      }
    }
    // `include: { verification: … }`, `select: { verifications: … }`.
    if (ts.isPropertyAssignment(n)) {
      const nom = nomPropriete(n.name);
      const parent = n.parent;
      const grandParent = parent?.parent;
      if (
        (nom === "verification" || nom === "verifications") &&
        ts.isObjectLiteralExpression(parent) &&
        grandParent &&
        ts.isPropertyAssignment(grandParent) &&
        ["include", "select"].includes(nomPropriete(grandParent.name) ?? "")
      ) {
        faits.litLaTable = true;
      }
    }
    ts.forEachChild(n, visiter);
  };
  visiter(racine);
  return faits;
}

/** Les fonctions nommées d'un fichier : déclarations et `const f = …`. */
function fonctionsDe(sf: ts.SourceFile): { nom: string; faits: Faits }[] {
  const out: { nom: string; faits: Faits }[] = [];
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) {
      out.push({ nom: st.name.text, faits: faitsDe(st) });
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer) {
          out.push({ nom: d.name.text, faits: faitsDe(d.initializer) });
        }
      }
    }
  }
  return out;
}

/**
 * La clôture : les noms de fonction qui lisent le calendrier, et ceux qui en
 * portent la fraîcheur. Par NOM, sur tout `src/` : deux homonymes se
 * confondent, ce qui ne peut qu'ajouter des lecteurs — l'erreur se fait du
 * côté qui fait parler une sortie, jamais de celui qui la tait.
 */
function cloture(): { lecteurs: Set<string>; porteurs: Set<string> } {
  const fonctions = [...fichiersSources("src/lib"), ...fichiersSources("src/app")]
    .flatMap((f) => fonctionsDe(arbre(f)));
  const lecteurs = new Set<string>();
  const porteurs = new Set<string>(PORTE_LA_FRAICHEUR);
  let change = true;
  while (change) {
    change = false;
    for (const { nom, faits } of fonctions) {
      if (NE_PROPAGENT_PAS.has(nom)) continue;
      if (
        !lecteurs.has(nom) &&
        (faits.litLaTable ||
          [...faits.appels].some(
            (a) => lecteurs.has(a) && !NE_PROPAGENT_PAS.has(a),
          ))
      ) {
        lecteurs.add(nom);
        change = true;
      }
      if (!porteurs.has(nom) && [...faits.appels].some((a) => porteurs.has(a))) {
        porteurs.add(nom);
        change = true;
      }
    }
  }
  return { lecteurs, porteurs };
}

const { lecteurs: LECTEURS, porteurs: PORTEURS } = cloture();

/**
 * Les points d'entrée de la réparation : ce qui RÉÉCRIT les lignes du
 * calendrier. Une fonction qui en appelle un, directement ou par transitivité,
 * répare.
 */
const RACINES_DE_REPARATION = [
  "assurerCalendrierAJour",
  "regenererSansInvalider",
  "genererCalendrier",
] as const;

/**
 * [2026-10-13, revue.] La clôture des RÉPARATRICES, par nom, sur tout `src/`
 * — la même technique que les lecteurs. La première rédaction de la garde
 * « aucun layout ne répare » ne cherchait que les appels écrits dans
 * `layout.tsx` : `await assurerCalendrierAJour(etablissementId);` ajouté en
 * tête de `chargerSidebarCounts`, que le layout appelle, laissait la garde
 * verte. Deux homonymes se confondent, ce qui ne peut qu'ajouter des
 * réparatrices — l'erreur se fait du côté qui fait tomber la garde.
 */
function clotureReparatrices(): Set<string> {
  const fonctions = [...fichiersSources("src/lib"), ...fichiersSources("src/app")]
    .flatMap((f) => fonctionsDe(arbre(f)));
  const reparatrices = new Set<string>(RACINES_DE_REPARATION);
  let change = true;
  while (change) {
    change = false;
    for (const { nom, faits } of fonctions) {
      if (
        !reparatrices.has(nom) &&
        [...faits.appels].some((a) => reparatrices.has(a))
      ) {
        reparatrices.add(nom);
        change = true;
      }
    }
  }
  return reparatrices;
}

const REPARATRICES = clotureReparatrices();

/** Les sorties qui lisent le calendrier, avec ce qu'elles en disent. */
function sorties(): { chemin: string; lit: string[]; dit: boolean }[] {
  const resultat: { chemin: string; lit: string[]; dit: boolean }[] = [];
  for (const dossier of SURFACES) {
    for (const fichier of fichiersSources(dossier)) {
      const faits = faitsDe(arbre(fichier));
      const lit = [
        ...(faits.litLaTable ? ["Verification (requête directe)"] : []),
        ...[...faits.appels].filter(
          (a) => LECTEURS.has(a) && !NE_PROPAGENT_PAS.has(a),
        ),
      ];
      if (lit.length === 0) continue;
      resultat.push({
        chemin: fichier.slice(RACINE.length + 1),
        lit,
        dit: [...faits.appels].some((a) => PORTEURS.has(a)),
      });
    }
  }
  return resultat;
}

describe("toute sortie qui lit le calendrier en dit l'âge", () => {
  it("la dérivation retrouve les lecteurs connus — sinon elle ne prouve rien", () => {
    // Borne BASSE, nominative : non pour énumérer, mais pour que la clôture
    // qui ne trouverait rien échoue ici plutôt que de passer au vert partout.
    // Ce sont les fonctions que la revue du 2026-10-13 a trouvées hors de la
    // liste écrite à la main, plus les sept qu'elle portait.
    for (const f of [
      "listerVerifications",
      "getDashboardData",
      "construireDossierConformiteData",
      "getVerification",
      "getFicheEquipement",
      "etatVerificationsParEquipement",
      "compterEtatEcheances",
      "compterEtatCalendrier",
      "listerEvenementsCalendrier",
      "compterVerifsParEquipement",
      "listerBatimentsAvecCharge",
      // `getModulesMatrice`, citée par la revue, n'y est pas : elle compte des
      // permis de feu, des plans de prévention et le registre d'accessibilité,
      // jamais `Verification` (relu le 2026-10-13, `dashboard/queries.ts`).
      "compterObligationsParMois",
      "listerEvenementsFenetre",
      "compterEnRetardParFamille",
    ]) {
      expect(LECTEURS.has(f), f).toBe(true);
    }
    expect(sorties().length).toBeGreaterThanOrEqual(5);
  });

  it("borne HAUTE : une fonction qui ne touche pas la table n'est pas un lecteur", () => {
    // Sans elle, une clôture qui marquerait tout passerait la borne basse.
    for (const f of [
      "getEtablissement",
      "getModulesMatrice",
      "listerEquipementsDeLEtablissement",
      "listPrestataires",
      "requireUser",
    ]) {
      expect(LECTEURS.has(f), f).toBe(false);
    }
  });

  it("chacune porte la fraîcheur, ou figure aux exemptions motivées", () => {
    const muettes = sorties()
      .filter((s) => !s.dit && !(s.chemin in EXEMPTES))
      .map((s) => `${s.chemin} (lit ${s.lit.join(", ")})`);

    expect(
      muettes,
      muettes.length === 0
        ? ""
        : `Ces sorties lisent le calendrier sans rien dire de son âge :\n` +
          `  ${muettes.join("\n  ")}\n` +
          `Un calendrier jamais calculé y rend une liste vide, et une liste ` +
          `vide se lit comme « rien à signaler ». Branchez ` +
          `\`fraicheurCalendrier\` (ou \`getFraicheurCalendrier\` hors session), ` +
          `ou inscrivez la sortie dans EXEMPTES avec sa raison.`,
    ).toEqual([]);
  });

  it("aucune exemption ne survit à la sortie qu'elle couvrait", () => {
    // Une exemption qui ne désigne plus rien — ou plus une sortie muette — est
    // une dette invisible : elle couvrirait un fichier recréé plus tard sous
    // le même nom, sans que personne ait relu sa raison.
    const muettes = new Set(
      sorties().filter((s) => !s.dit).map((s) => s.chemin),
    );
    const mortes = Object.keys(EXEMPTES).filter((c) => !muettes.has(c));
    expect(mortes, `Exemptions sans objet, à retirer : ${mortes.join(", ")}`)
      .toEqual([]);
  });

  it("les quatre sorties corrigées le 2026-09-20 sont toujours branchées", () => {
    // Borne haute, nominative — non pour énumérer, mais parce que ces
    // quatre-là ont été trouvées muettes une fois.
    const parChemin = new Map(sorties().map((s) => [s.chemin, s]));
    for (const chemin of [
      "src/app/api/etablissements/[id]/controle-zip/route.ts",
      "src/app/etablissements/[id]/controle/page.tsx",
      "src/lib/pdf/builders.ts",
      "src/lib/mcp/tools.ts",
    ]) {
      expect(parChemin.get(chemin)?.dit, chemin).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// La réparation
// ---------------------------------------------------------------------------

/**
 * LA RÉPARATION RESTE OÙ ELLE EST — une fois par requête, avant les lectures.
 *
 * Réparer depuis le layout d'établissement n'est pas sûr, et la documentation
 * de Next 16.3.5 le dit en deux phrases : « layouts and pages are rendered in
 * parallel » (`getting-started/fetching-data`), et un layout « does not stop
 * [route segments] from running » (`guides/authentication`). La page lirait
 * les anciennes lignes pendant que le layout les réécrit — la raison que
 * `regeneration-sure.ts` donnait déjà (revue du 2026-09-14).
 *
 * [2026-10-13, revue.] La première rédaction comparait des POSITIONS dans le
 * texte : la réparation devait précéder le premier appel d'une liste de
 * lecteurs. Deux mutants y passaient au vert — la réparation déplacée après
 * `listerBatimentsAvecCharge` (qui lit `Verification` sans être sur la liste),
 * et la réparation SANS `await` en tête d'un `Promise.all`, où elle tourne
 * en même temps que les lectures. La règle est maintenant syntaxique : la
 * réparation est une instruction `await assurerCalendrierAJour(…);`
 * autonome, au premier niveau de la page, et c'est le PREMIER `await` de la
 * page hors `params` et `searchParams`.
 */
const APPELS_DE_REPARATION = [
  "assurerCalendrierAJour",
  "regenererSansInvalider",
] as const;

function appels(sf: ts.SourceFile, fn: string): number {
  let n = 0;
  const visiter = (x: ts.Node): void => {
    if (
      ts.isCallExpression(x) &&
      ts.isIdentifier(x.expression) &&
      x.expression.text === fn
    ) {
      n++;
    }
    ts.forEachChild(x, visiter);
  };
  visiter(sf);
  return n;
}

/** Le corps de la fonction exportée par défaut d'une page. */
function corpsDeLaPage(sf: ts.SourceFile): ts.Block | null {
  for (const st of sf.statements) {
    if (
      ts.isFunctionDeclaration(st) &&
      st.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) &&
      st.body
    ) {
      return st.body;
    }
  }
  return null;
}

/** Les `await` d'un nœud, dans l'ordre du texte, hors fonctions imbriquées. */
function attentes(n: ts.Node): ts.AwaitExpression[] {
  const out: ts.AwaitExpression[] = [];
  const visiter = (x: ts.Node): void => {
    if (ts.isFunctionLike(x)) return;
    if (ts.isAwaitExpression(x)) out.push(x);
    ts.forEachChild(x, visiter);
  };
  ts.forEachChild(n, visiter);
  return out;
}

const ARGUMENTS_DE_ROUTE = new Set(["params", "searchParams"]);

/** Vrai si la réparation est un `await` autonome, le premier qui compte. */
function repareDAbord(sf: ts.SourceFile): string | null {
  const corps = corpsDeLaPage(sf);
  if (!corps) return "pas de fonction exportée par défaut";
  const premiere = attentes(corps).find(
    (a) => !(ts.isIdentifier(a.expression) && ARGUMENTS_DE_ROUTE.has(a.expression.text)),
  );
  if (!premiere) return "aucun await";
  const appel = premiere.expression;
  const estReparation =
    ts.isCallExpression(appel) &&
    ts.isIdentifier(appel.expression) &&
    appel.expression.text === "assurerCalendrierAJour";
  if (!estReparation) {
    return `le premier await est « ${premiere.getText(sf).slice(0, 60)} », pas la réparation`;
  }
  if (
    !ts.isExpressionStatement(premiere.parent) ||
    premiere.parent.parent !== corps
  ) {
    return "la réparation n'est pas une instruction autonome au premier niveau";
  }
  // [2026-10-13, revue.] Le premier `await` ne suffit pas : une lecture
  // LANCÉE sans `await` avant la réparation (`const p = lecteur(…)`, attendue
  // plus bas) tourne en même temps qu'elle et passait au vert. Aucun appel à
  // un lecteur, attendu ou non, ni aucune requête directe sur `Verification`
  // ne doit précéder la réparation dans le corps de la page.
  const avant = corps.statements.slice(
    0,
    corps.statements.indexOf(premiere.parent),
  );
  for (const st of avant) {
    const faits = faitsDe(st);
    const lus = [
      ...(faits.litLaTable ? ["Verification (requête directe)"] : []),
      ...[...faits.appels].filter((a) => LECTEURS.has(a)),
    ];
    if (lus.length > 0) {
      return `lecture lancée avant la réparation : ${lus.join(", ")}`;
    }
  }
  return null;
}

describe("la réparation à l'affichage : une fois, avant de lire", () => {
  const rendus = fichiersSources("src/app").filter((f) =>
    /[\\/](page|layout|template)\.tsx?$/.test(f),
  );

  it("trouve des layouts et des pages qui réparent — sinon rien n'est prouvé", () => {
    expect(rendus.some((f) => /[\\/]layout\.tsx?$/.test(f))).toBe(true);
    expect(
      rendus.filter((f) => appels(arbre(f), "assurerCalendrierAJour") > 0)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("la clôture des réparatrices remonte au-delà des racines — sinon elle ne prouve rien", () => {
    // Borne basse : les appelants connus de la réparation.
    for (const f of ["regenererApresMutation"]) {
      expect(REPARATRICES.has(f), f).toBe(true);
    }
    // Borne haute : ce que le layout appelle aujourd'hui ne répare pas.
    for (const f of ["chargerSidebarCounts", "fraicheurCalendrier", "requireUser"]) {
      expect(REPARATRICES.has(f), f).toBe(false);
    }
  });

  it("aucun layout ne répare, même par une fonction qu'il appelle : il tournerait EN PARALLÈLE de la page", () => {
    const fautifs = rendus
      .filter((f) => /[\\/](layout|template)\.tsx?$/.test(f))
      .flatMap((f) =>
        [...faitsDe(arbre(f)).appels]
          .filter((fn) => REPARATRICES.has(fn))
          .map((fn) => `${f.slice(RACINE.length + 1)} → ${fn}`),
      );
    expect(fautifs, `Ces layouts réparent le calendrier :\n  ${fautifs.join("\n  ")}`)
      .toEqual([]);
  });

  it("aucun rendu ne répare deux fois", () => {
    const doubles = rendus.flatMap((f) => {
      const n = APPELS_DE_REPARATION.reduce(
        (s, fn) => s + appels(arbre(f), fn),
        0,
      );
      return n > 1 ? [`${f.slice(RACINE.length + 1)} (${n} appels)`] : [];
    });
    expect(doubles).toEqual([]);
  });

  it("toute page qui répare le fait par un await autonome, AVANT tout autre await", () => {
    // Couvre les pages exemptées « régénère » ET toute page qui se mettrait à
    // réparer : une réparation lancée avec ses lectures ne protège rien.
    const reparatrices = new Set([
      ...Object.entries(EXEMPTES)
        .filter(([, motif]) => motif.includes("régénère"))
        .map(([c]) => join(RACINE, c)),
      ...rendus.filter((f) => appels(arbre(f), "assurerCalendrierAJour") > 0),
    ]);
    expect(reparatrices.size).toBeGreaterThanOrEqual(1);
    const fautes = [...reparatrices].flatMap((f) => {
      const faute = repareDAbord(arbre(f));
      return faute ? [`${f.slice(RACINE.length + 1)} : ${faute}`] : [];
    });
    expect(fautes).toEqual([]);
  });
});
