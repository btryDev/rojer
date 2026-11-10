// Toute fonction exportée d'un module `"use server"` ouvre par `verifierSaisie`
// (ADR-053 § 3) : un impayé ferme la saisie du titulaire, jamais la lecture
// ni l'export. Même forme d'exception que `tenancy-routes` : des listes
// FERMÉES, chaque entrée avec son motif, et une entrée qui ne désigne plus
// rien fait échouer le test.
//
// [2026-11-05, lot 0 du lot « quotas »] La garde ne part plus des écritures
// que la sonde reconnaît (`ecrituresExposees`, Prisma seul) mais de TOUTES
// les fonctions exportées, relevées sur l'arbre syntaxique : un dépôt de
// fichier, un appel Better Auth, un e-mail ou un appel Stripe sans écriture
// Prisma échappaient à la sonde. Une fonction qui ne fait que lire se nomme
// dans `LECTURES_EXPOSEES` ; celle qui écrit et reste ouverte à un impayé,
// dans `OUVERTES`. Le balayage couvre les `.tsx`, refuse la directive en
// ligne, et s'étend aux gestionnaires de route qui écrivent (POST, PUT,
// PATCH, DELETE).

import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  cheminDEcriture,
  ECRITURE,
  ecrituresExposees,
  estServerAction,
  fonctionsAtteintes,
  modulesServerAction,
  resoudre,
} from "@/lib/auth/tenancy-sonde";

const SRC = join(process.cwd(), "src");
const relatif = (f: string) => f.slice(SRC.length + 1);
/** Le seul module d'où une garde de saisie ou de rôle peut venir. */
const MODULE_DES_GARDES = join(SRC, "lib/abonnements/saisie.ts");

type Ouverte = {
  motif: string;
  /**
   * Ouverte AUSSI à un membre en lecture seule (ADR-054 § 4) : le compte et sa
   * sécurité, l'assistance, les actes d'un tiers ou de la personne invitée, le
   * changement de compte actif (le rôle de la session est celui d'un AUTRE
   * compte). Sans ce drapeau, l'action ouvre par une garde de rôle
   * (`GARDES_DE_ROLE`).
   */
  lectureSeule?: true;
};

const COMPTE: Ouverte = {
  motif:
    "le compte et sa sécurité (connexion, déconnexion, inscription, mot de passe, sessions, double authentification) : jamais fermés",
  lectureSeule: true,
};
const MEMBRES: Ouverte = {
  motif:
    "retirer un membre, annuler une invitation, changer un rôle : des mesures de sécurité, ouvertes à un impayé (ADR-054 § 5) — propriétaire seul",
};
const INVITE: Ouverte = {
  motif:
    "acte de la personne invitée, hors du compte actif de sa session : `verifierSaisie` jugerait un autre compte, ou aucun",
  lectureSeule: true,
};
const TIERS: Ouverte = { motif: "acte d'un tiers par lien vérifié, pas du titulaire", lectureSeule: true };
const RGPD: Ouverte = { motif: "supprimer ses données reste possible à tout moment (RGPD, règle 9)" };

/** Écritures qui restent ouvertes quand la saisie est fermée. */
const OUVERTES = new Map<string, Ouverte>([
  ["lib/auth/actions.ts:activerCompteAction", COMPTE],
  ["lib/auth/actions.ts:activerDoubleAuthAction", COMPTE],
  ["lib/auth/actions.ts:changerMotDePasseAction", COMPTE],
  ["lib/auth/actions.ts:confirmerDoubleAuthAction", COMPTE],
  ["lib/auth/actions.ts:definirMotDePasseAction", COMPTE],
  ["lib/auth/actions.ts:fermerSessionsAction", COMPTE],
  ["lib/auth/actions.ts:gererDoubleAuthAction", COMPTE],
  ["lib/auth/actions.ts:requestPasswordResetAction", COMPTE],
  ["lib/auth/actions.ts:signInAction", COMPTE],
  ["lib/auth/actions.ts:signOutAction", COMPTE],
  ["lib/auth/actions.ts:signUpAction", COMPTE],
  ["lib/auth/actions.ts:verifierSecondFacteurAction", COMPTE],
  [
    "lib/assistance/actions.ts:demanderAssistance",
    { motif: "joindre l'assistance, y compris pour une question d'abonnement", lectureSeule: true },
  ],
  ["lib/access-tokens/actions.ts:revoquerAccessToken", { motif: "retirer l'accès d'un prestataire : une mesure de sécurité" }],
  ["lib/accessibilite/actions.ts:depublierRegistre", { motif: "retirer une page publique : une mesure de protection" }],
  ["lib/signatures/actions.ts:poserSignatureAvecToken", TIERS],
  ["lib/signatures/actions.ts:renvoyerCodeOtp", TIERS],
  ["lib/entreprises/actions.ts:supprimerEntreprise", RGPD],
  ["lib/etablissements/actions.ts:supprimerEtablissement", RGPD],
  [
    "lib/membres/actions.ts:quitterCompte",
    { motif: "quitter un compte reste possible à tout moment, quel que soit son rôle (ADR-054 § 6)", lectureSeule: true },
  ],
  ["lib/membres/actions.ts:annulerInvitation", MEMBRES],
  ["lib/membres/actions.ts:changerRoleMembre", MEMBRES],
  ["lib/membres/actions.ts:retirerMembre", MEMBRES],
  ["lib/membres/actions.ts:accepterInvitation", INVITE],
  ["lib/membres/actions.ts:refuserInvitation", INVITE],
  [
    "lib/membres/actions.ts:choisirCompte",
    {
      motif:
        "changer de compte actif (session Better Auth) : il faut pouvoir quitter un compte impayé pour un autre de ses comptes (ADR-054 § 7)",
      lectureSeule: true,
    },
  ],
  // L'abonnement lui-même (ADR-053 §§ 8 à 12) : c'est par lui qu'un compte
  // impayé reprend la main. Propriétaire seul (`verifierProprietaire`) ;
  // l'essai, avant que le compte existe, ouvre par `verifierRole`.
  ["lib/abonnements/actions.ts:demarrerEssaiAction", { motif: "démarrer l'essai : avant tout abonnement, propriétaire seul" }],
  ["lib/abonnements/actions.ts:ouvrirPortailAction", { motif: "le portail : payer, reprendre, résilier — propriétaire seul" }],
  ["lib/abonnements/actions.ts:sAbonnerAction", { motif: "s'abonner : formule, rythme, carte — c'est par là qu'un compte en essai, en pause ou résilié reprend la main ; propriétaire seul" }],
  ["lib/abonnements/actions.ts:finaliserCarteAction", { motif: "appliquer la formule au retour de la page de paiement — propriétaire seul" }],
  ["lib/abonnements/actions.ts:changerFormuleAction", { motif: "changer de formule : un geste d'abonnement, refusé par l'action elle-même hors d'un abonnement à jour ; propriétaire seul" }],
  ["lib/abonnements/actions.ts:annulerBaisseAction", { motif: "garder sa formule (renoncer à une baisse planifiée) — propriétaire seul" }],
]);

/**
 * Fonctions exportées d'un module `"use server"` qui n'écrivent RIEN côté
 * serveur — ni base, ni fichier, ni Better Auth, ni e-mail, ni Stripe : elles
 * restent ouvertes, comme toute lecture. Un cookie de navigation n'est pas
 * une écriture du compte.
 */
const LECTURES_EXPOSEES = new Map<string, string>([
  [
    "lib/duerps/import/actions.ts:previewImport",
    "aperçu d'un import : le fichier est analysé en mémoire, rien n'est enregistré (l'import, `commitImport`, est gardé)",
  ],
  [
    "lib/etats-permanents/lecture-widget.ts:resumeEtatsPermanentsPourWidget",
    "le résumé du widget « Ce qui doit être en place », lu à la demande du tableau de bord",
  ],
  [
    "lib/etablissements/actions.ts:choisirEtablissementActif",
    "le sélecteur d'établissement : pose le cookie de navigation, après le contrôle d'appartenance",
  ],
]);

/**
 * Gestionnaires de route d'une méthode qui écrit (POST, PUT, PATCH, DELETE)
 * et qui n'ouvrent pas par `verifierSaisie`. Aucun n'a de session de
 * titulaire : `verifierSaisie` y renverrait à la page de l'abonnement.
 */
const ROUTES_OUVERTES = new Map<string, string>([
  [
    "app/api/taches/chaque-minute/route.ts:POST",
    "les tâches quotidiennes (rappel de fin d'essai) : sans session, prouvées par le secret de la crontab ; elles n'écrivent dans aucun dossier",
  ],
  [
    "app/api/stripe/webhook/route.ts:POST",
    "la notification de Stripe : sans session, prouvée par sa signature — c'est elle qui rouvre un compte impayé",
  ],
  [
    "app/api/mcp/[cle]/route.ts:POST",
    "serveur MCP, authentifié par sa clé, sans session : lecture seule (aucune écriture dans `lib/mcp`, hors le compteur anti-abus)",
  ],
  ["app/api/mcp/[cle]/route.ts:DELETE", "serveur MCP : la fin de session du protocole, aucune donnée du compte"],
]);
const METHODES_QUI_ECRIVENT = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Ce qui ferme la lecture seule en tête d'une ouverte, importé SANS alias de
 * `@/lib/abonnements/saisie`. `verifierProprietaire` la ferme aussi : un
 * lecteur n'est jamais propriétaire. `proprietaireOuRefus` — fonction locale
 * de `lib/membres/actions.ts`, et de lui seul — fait le même contrôle et rend
 * le refus à l'écran plutôt qu'en redirection.
 */
const GARDES_DE_ROLE = ["verifierRole", "verifierProprietaire"];
/** Ce qui relit le compte actif et rend un client : interdit après `verifierProprietaire`. */
const RELECTURES_DU_COMPTE = new Set([
  "requireCompte",
  "getOptionalCompte",
  "requireEtablissement",
  "getOptionalUserEtablissement",
  "assertEtablissementOwnership",
]);
/** Les gardes de portée qui prennent le compte vérifié en second argument. */
const GARDES_A_COMPTE_VERIFIE = new Set(["assertEntrepriseDuCompte", "assertEtablissementDuCompte"]);
const GARDE_LOCALE_MEMBRES = { fichier: "lib/membres/actions.ts", garde: "proprietaireOuRefus" };

/**
 * Écritures déclenchées par une LECTURE : une fonction qu'un composant serveur
 * (page, layout, composant sans `"use client"`) appelle pendant le rendu, et
 * qui écrit. Aucune n'est une saisie du titulaire ; chacune se nomme, pour
 * qu'une écriture nouvelle depuis une page ne passe pas inaperçue.
 */
const ECRITURES_A_LA_LECTURE = new Map<string, string>([
  [
    "lib/calendrier/regeneration-sure.ts:assurerCalendrierAJour",
    "réparation du calendrier à l'affichage (tableau de bord, calendrier) : des lignes dérivées du référentiel, pas une saisie — la lecture d'un impayé reste juste",
  ],
  [
    "lib/signatures/verification-publique.ts:verifierSousLimite",
    "le compteur anti-abus de la page publique de vérification d'une signature (`limite-debit`) : ni donnée du compte, ni saisie",
  ],
  [
    "lib/signatures/verification-publique.ts:lireSignatureSousLimite",
    "le même compteur anti-abus, pour la page de confirmation /signe (2026-11-09) : ni donnée du compte, ni saisie",
  ],
]);

/** Une écriture hors Prisma : Better Auth (hors lectures `get…`/`list…`), stockage, Stripe, e-mail. */
const ECRITURE_HORS_PRISMA =
  /\bauth\.api\.(?!get|list)\w+\(|\bgetStorage\(|\bclientStripe\(|\bsendMail\(|\bgetEmailDriver\(/;

// ─── Le relevé ───────────────────────────────────────────────────────────────

const sourceDe = (fichier: string) =>
  ts.createSourceFile(
    fichier,
    readFileSync(fichier, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    fichier.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

/** Les directives d'un prologue : les chaînes en tête d'un fichier ou d'un corps. */
function directives(instructions: ts.NodeArray<ts.Statement>): string[] {
  const out: string[] = [];
  for (const st of instructions) {
    if (!ts.isExpressionStatement(st) || !ts.isStringLiteral(st.expression)) break;
    out.push(st.expression.text);
  }
  return out;
}

const aExport = (st: ts.Statement) =>
  ts.canHaveModifiers(st) && (ts.getModifiers(st) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** Nom local → (fichier du dépôt importé, nom importé, sans alias ?). Imports nommés de valeur seulement. */
type Imports = Map<string, { cible: string | null; nom: string; sansAlias: boolean }>;
function importsDe(sf: ts.SourceFile, fichier: string): Imports {
  const out: Imports = new Map();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || st.importClause?.isTypeOnly) continue;
    const liaisons = st.importClause?.namedBindings;
    if (!liaisons || !ts.isNamedImports(liaisons)) continue;
    const cible = resoudre(fichier, (st.moduleSpecifier as ts.StringLiteral).text);
    for (const el of liaisons.elements) {
      if (el.isTypeOnly) continue;
      out.set(el.name.text, { cible, nom: (el.propertyName ?? el.name).text, sansAlias: !el.propertyName });
    }
  }
  return out;
}

/** Ce que la garde lit d'une fonction exposée : son corps et les imports de son fichier. */
type Exposee = { corps: ts.Block | null; fichier: string; imports: Imports; locales: Set<string> };

type Releve = {
  /** `lib/x/actions.ts:nom` → la fonction (`corps: null` : une fonction fléchée sans bloc). */
  exportees: Map<string, Exposee>;
  modules: Set<string>;
  /** `app/…/route.ts:POST` → le gestionnaire d'une méthode qui écrit. */
  routes: Map<string, Exposee>;
  /** Un export que le relevé ne sait pas lire comme une fonction nommée. */
  formesInconnues: string[];
  /** `fichier:ligne` d'une directive `"use server"` dans le corps d'une fonction. */
  directivesEnLigne: string[];
};

/** Les fonctions exportées d'un fichier, par nom ; les formes non lues vont à `inconnues`. */
function exportsDe(sf: ts.SourceFile, fichier: string, inconnues: string[]): Map<string, Exposee> {
  const rel = relatif(fichier);
  const imports = importsDe(sf, fichier);
  const locales = new Set(
    sf.statements.filter(ts.isFunctionDeclaration).flatMap((f) => (f.name ? [f.name.text] : [])),
  );
  const out = new Map<string, Exposee>();
  const noter = (nom: string, corps: ts.Block | null) => out.set(nom, { corps, fichier: rel, imports, locales });
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) continue;
    if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) {
      if (ts.isExportDeclaration(st) && st.isTypeOnly) continue;
      inconnues.push(`${rel}: ${st.getText(sf).slice(0, 60)}`);
      continue;
    }
    if (!aExport(st)) continue;
    if (ts.isFunctionDeclaration(st)) {
      noter(st.name?.text ?? "default", st.body ?? null);
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const init = d.initializer;
        if (ts.isIdentifier(d.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          noter(d.name.text, ts.isBlock(init.body) ? init.body : null);
        } else if (ts.isIdentifier(d.name)) {
          // Relevée quand même, sans corps : une route `POST = autreChose` n'est
          // pas gardée, et doit se nommer.
          noter(d.name.text, null);
          inconnues.push(`${rel}: ${d.getText(sf).slice(0, 60)}`);
        }
      }
    } else {
      inconnues.push(`${rel}: ${ts.SyntaxKind[st.kind]}`);
    }
  }
  return out;
}

function relever(fichiers: string[]): Releve {
  const r: Releve = {
    exportees: new Map(),
    modules: new Set(),
    routes: new Map(),
    formesInconnues: [],
    directivesEnLigne: [],
  };
  for (const fichier of fichiers) {
    const rel = relatif(fichier);
    // Les gestionnaires de route : les méthodes qui écrivent, quel que soit
    // le reste du fichier (`dynamic`, `GET`…).
    if (/^route\.tsx?$/.test(basename(fichier)) && rel.startsWith("app/")) {
      const sf = sourceDe(fichier);
      // Les autres exports d'une route (`dynamic`, `maxDuration`) ne sont pas
      // des fonctions : seules comptent les méthodes, relevées par leur nom.
      for (const [nom, fn] of exportsDe(sf, fichier, [])) {
        if (METHODES_QUI_ECRIVENT.has(nom)) r.routes.set(`${rel}:${nom}`, fn);
      }
      // Un `export { POST }` échapperait à ce relevé : refusé.
      for (const st of sf.statements) {
        if ((ts.isExportDeclaration(st) && !st.isTypeOnly) || ts.isExportAssignment(st)) {
          r.formesInconnues.push(`${rel}: ${st.getText(sf).slice(0, 60)}`);
        }
      }
    }
    if (!/["']use server["']/.test(readFileSync(fichier, "utf8"))) continue;
    const sf = sourceDe(fichier);
    const visiter = (n: ts.Node) => {
      const corps = ts.isFunctionLike(n) ? (n as { body?: ts.Node }).body : undefined;
      if (corps && ts.isBlock(corps) && directives(corps.statements).includes("use server")) {
        r.directivesEnLigne.push(`${rel}:${sf.getLineAndCharacterOfPosition(corps.getStart()).line + 1}`);
      }
      ts.forEachChild(n, visiter);
    };
    visiter(sf);
    if (!directives(sf.statements).includes("use server")) continue;
    r.modules.add(fichier);
    for (const [nom, fn] of exportsDe(sf, fichier, r.formesInconnues)) r.exportees.set(`${rel}:${nom}`, fn);
  }
  return r;
}

const tousLesFichiers = (): string[] =>
  execFileSync("find", [SRC, "(", "-name", "*.ts", "-o", "-name", "*.tsx", ")"])
    .toString()
    .trim()
    .split("\n")
    .filter((f) => !/\.test\.tsx?$/.test(f));

/**
 * La première instruction est `await garde(…)` ou `const … = await garde(…)`,
 * où `garde` est importé SANS alias de `@/lib/abonnements/saisie` — une
 * fonction locale du même nom, ou `import { verifierRole as verifierSaisie }`,
 * ne compte pas. `locale` : la garde est une fonction déclarée dans le fichier
 * (seul cas : `proprietaireOuRefus`).
 */
function ouvrePar(fn: Exposee | undefined, garde: string, locale = false): boolean {
  const premiere = fn?.corps?.statements[0];
  if (!fn || !premiere) return false;
  let attendu: ts.Expression | undefined;
  if (ts.isExpressionStatement(premiere)) attendu = premiere.expression;
  else if (ts.isVariableStatement(premiere) && premiere.declarationList.declarations.length === 1) {
    attendu = premiere.declarationList.declarations[0].initializer;
  }
  if (!attendu || !ts.isAwaitExpression(attendu)) return false;
  const appel = attendu.expression;
  if (!ts.isCallExpression(appel) || !ts.isIdentifier(appel.expression) || appel.expression.text !== garde) return false;
  if (locale) return fn.locales.has(garde) && !fn.imports.has(garde);
  const imp = fn.imports.get(garde);
  return !fn.locales.has(garde) && imp?.cible === MODULE_DES_GARDES && imp.nom === garde && imp.sansAlias;
}

/** Une écriture Prisma écrite dans le nœud même (un appel, ou `$executeRaw` en gabarit). */
function ecritPrisma(n: ts.Node, sf: ts.SourceFile): boolean {
  if (ts.isCallExpression(n)) return ECRITURE.test(`${n.expression.getText(sf)}(`);
  if (ts.isTaggedTemplateExpression(n)) return ECRITURE.test(n.tag.getText(sf));
  return false;
}

/**
 * Les écritures qu'un composant serveur atteint pendant le rendu : chaque
 * import nommé d'un module `.ts` du dépôt que le fichier utilise, suivi par
 * `cheminDEcriture` ; une écriture Prisma écrite dans le fichier même ; et
 * l'APPEL d'une action importée d'un module `"use server"` — passer sa
 * référence (`action={…}`, `.bind(…)`) reste permis, c'est un geste.
 */
function ecrituresALaLecture(fichiers: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const noter = (cle: string, page: string) => out.set(cle, [...(out.get(cle) ?? []), page]);
  for (const fichier of fichiers.filter((f) => f.endsWith(".tsx"))) {
    const sf = sourceDe(fichier);
    const prologue = directives(sf.statements);
    if (prologue.includes("use client") || prologue.includes("use server")) continue;
    const rel = relatif(fichier);
    const imports = importsDe(sf, fichier);
    const actions = new Set(
      [...imports].filter(([, i]) => i.cible && estServerAction(readFileSync(i.cible, "utf8"))).map(([local]) => local),
    );
    const occurrences = new Map<string, number>();
    const visiter = (n: ts.Node) => {
      if (ts.isIdentifier(n)) occurrences.set(n.text, (occurrences.get(n.text) ?? 0) + 1);
      if (ecritPrisma(n, sf)) noter(`${rel}:${n.getText(sf).slice(0, 40)}`, rel);
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && actions.has(n.expression.text)) {
        noter(`${rel}: appel de l'action ${n.expression.text} au rendu`, rel);
      }
      ts.forEachChild(n, visiter);
    };
    visiter(sf);
    for (const [local, { cible, nom }] of imports) {
      // Une occurrence, c'est l'import lui-même : le nom n'est pas utilisé.
      if (!cible || actions.has(local) || (occurrences.get(local) ?? 0) < 2) continue;
      const chemin = cheminDEcriture(cible, nom);
      if (chemin) noter(chemin[0], rel);
    }
  }
  return out;
}

// ─── La garde ────────────────────────────────────────────────────────────────

describe("la saisie fermée (ADR-053 § 3)", () => {
  const fichiers = tousLesFichiers();
  const releve = relever(fichiers);
  const exportees = [...releve.exportees.keys()].sort();
  const gardee = (cle: string) => ouvrePar(releve.exportees.get(cle), "verifierSaisie");
  const ecritures = ecrituresExposees().map((e) => e.cle);

  it("le relevé voit toutes les actions exposées, et la sonde n'en voit pas d'autre", () => {
    expect(exportees.length).toBeGreaterThan(100);
    // Les deux lectures de la directive (l'arbre ici, la sonde des balayages
    // de portée) désignent les mêmes modules, et chaque écriture que la sonde
    // voit est une exportée relevée ici.
    expect([...releve.modules].sort()).toEqual([...modulesServerAction()].sort());
    expect(ecritures.filter((c) => !releve.exportees.has(c))).toEqual([]);
  });

  it("aucun fichier JavaScript sous src : le balayage ne lit que .ts et .tsx", () => {
    // `allowJs` est actif : un module `"use server"` en `.js` serait servi
    // sans être relu. Plus simple de n'en avoir aucun que d'élargir le relevé.
    const js = execFileSync("find", [
      SRC,
      "(",
      ...["js", "jsx", "mjs", "cjs", "mts", "cts"].flatMap((e, i) => (i ? ["-o"] : []).concat("-name", `*.${e}`)),
      ")",
    ])
      .toString()
      .trim();
    expect(js).toBe("");
  });

  it("aucune directive \"use server\" en ligne, dans le corps d'une fonction", () => {
    // Refusée plutôt que gardée : une action en ligne est une fermeture
    // anonyme d'un composant, sans nom stable pour une liste d'exceptions, et
    // qui emporte des variables du rendu jusqu'au navigateur. Toutes les
    // actions du dépôt vivent dans un module `"use server"` : la règle ne
    // coûte rien et garde un seul endroit à relire.
    expect(
      releve.directivesEnLigne,
      "Déplacez l'action dans un module `\"use server\"` (lib/…/actions.ts), ouverte par `await verifierSaisie()`.",
    ).toEqual([]);
  });

  it("chaque export d'un module \"use server\" ou d'une route est une forme que le relevé lit", () => {
    expect(
      releve.formesInconnues,
      "Écrivez l'action `export async function nom(…) {` : une autre forme échapperait à la garde.",
    ).toEqual([]);
  });

  it("chaque fonction exportée appelle verifierSaisie, sauf les ouvertes et les lectures nommées", () => {
    const sansGarde = exportees.filter((c) => !OUVERTES.has(c) && !LECTURES_EXPOSEES.has(c) && !gardee(c));
    expect(
      sansGarde,
      "Appelez `await verifierSaisie()` (importée de `@/lib/abonnements/saisie`, sans alias) en tête de l'action, " +
        "ou nommez-la avec son motif dans OUVERTES (une écriture qui reste ouverte à un compte impayé) " +
        "ou LECTURES_EXPOSEES (elle n'écrit rien).",
    ).toEqual([]);
  });

  it("les ouvertes et les lectures nommées existent, sont distinctes, et aucune n'appelle verifierSaisie", () => {
    const nommees = [...OUVERTES.keys(), ...LECTURES_EXPOSEES.keys()];
    expect(nommees.filter((c) => !releve.exportees.has(c)), "entrée qui ne désigne plus rien").toEqual([]);
    expect([...OUVERTES.keys()].filter((c) => LECTURES_EXPOSEES.has(c))).toEqual([]);
    expect(nommees.filter(gardee), "gardée : à retirer de la liste").toEqual([]);
  });

  it("une lecture exposée n'écrit rien, ni par Prisma ni hors Prisma", () => {
    expect([...LECTURES_EXPOSEES.keys()].filter((c) => ecritures.includes(c))).toEqual([]);
    const horsPrisma = [...LECTURES_EXPOSEES.keys()].flatMap((c) => {
      const [fichier, nom] = c.split(":");
      return fonctionsAtteintes(join(SRC, fichier), nom)
        .fonctions.filter((a) => ECRITURE_HORS_PRISMA.test(a.fn.corps))
        .map((a) => `${c} → ${relatif(a.fichier)}:${a.fn.nom}`);
    });
    expect(horsPrisma).toEqual([]);
  });

  it("une ouverte qui ne l'est pas à la lecture seule commence par une garde de rôle (ADR-054 § 4)", () => {
    const ferme = (c: string) => {
      const fn = releve.exportees.get(c);
      return (
        GARDES_DE_ROLE.some((g) => ouvrePar(fn, g)) ||
        (fn?.fichier === GARDE_LOCALE_MEMBRES.fichier && ouvrePar(fn, GARDE_LOCALE_MEMBRES.garde, true))
      );
    };
    const sansRole = [...OUVERTES].filter(([c, o]) => !o.lectureSeule && !ferme(c)).map(([c]) => c);
    expect(
      sansRole,
      "Appelez `await verifierRole()` (ou `verifierProprietaire()`) en tête de l'action, ou marquez-la `lectureSeule` dans OUVERTES.",
    ).toEqual([]);
    expect([...OUVERTES].filter(([c, o]) => o.lectureSeule && ferme(c)).map(([c]) => c)).toEqual([]);
  });

  it("un geste du propriétaire agit sur le compte vérifié, sans relire le compte actif (audit du 2026-11-10)", () => {
    // Entre la garde et une seconde lecture, un autre onglet peut changer de
    // compte actif : le geste passerait sur un compte où la personne n'est pas
    // propriétaire. Le compte que rend `verifierProprietaire` se nomme, se
    // passe aux gardes de portée, et rien ne relit la session.
    const fautes: string[] = [];
    for (const [cle, fn] of releve.exportees) {
      if (!ouvrePar(fn, "verifierProprietaire") || !fn.corps) continue;
      const premiere = fn.corps.statements[0];
      const decl = ts.isVariableStatement(premiere) ? premiere.declarationList.declarations[0] : undefined;
      const nom = decl && ts.isIdentifier(decl.name) ? decl.name.text : null;
      const visiter = (n: ts.Node): void => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
          const appel = n.expression.text;
          if (RELECTURES_DU_COMPTE.has(appel)) fautes.push(`${cle} : ${appel}() relit le compte actif`);
          if (GARDES_A_COMPTE_VERIFIE.has(appel)) {
            const passe = n.arguments[1];
            if (!nom || !passe || !ts.isIdentifier(passe) || passe.text !== nom) {
              fautes.push(`${cle} : ${appel}() sans le compte vérifié en second argument`);
            }
          }
        }
        ts.forEachChild(n, visiter);
      };
      fn.corps.statements.slice(1).forEach(visiter);
    }
    expect(fautes).toEqual([]);
  });

  it("chaque route d'une méthode qui écrit appelle verifierSaisie, sauf les ouvertes nommées", () => {
    const routes = [...releve.routes.keys()].sort();
    expect(routes.length).toBeGreaterThan(0);
    const routeGardee = (c: string) => ouvrePar(releve.routes.get(c), "verifierSaisie");
    expect(
      routes.filter((c) => !ROUTES_OUVERTES.has(c) && !routeGardee(c)),
      "Appelez `await verifierSaisie()` en tête du gestionnaire, ou nommez-le dans ROUTES_OUVERTES avec son motif.",
    ).toEqual([]);
    expect([...ROUTES_OUVERTES.keys()].filter((c) => !releve.routes.has(c)), "entrée qui ne désigne plus rien").toEqual([]);
    expect([...ROUTES_OUVERTES.keys()].filter(routeGardee), "gardée : à retirer de la liste").toEqual([]);
  });

  it("le serveur MCP, ouvert sans session, n'écrit rien (motif de ROUTES_OUVERTES)", () => {
    // Les outils sont des méthodes d'objet, que `cheminDEcriture` ne suit pas :
    // la preuve se lit sur les fichiers de `lib/mcp`, sans appel d'action.
    const mcp = fichiers.filter((f) => relatif(f).startsWith("lib/mcp/"));
    expect(mcp.length).toBeGreaterThan(0);
    const fautifs = mcp.filter((f) => {
      const sf = sourceDe(f);
      let ecrit = false;
      const visiter = (n: ts.Node) => {
        if (ecritPrisma(n, sf) || (ts.isCallExpression(n) && ECRITURE_HORS_PRISMA.test(`${n.expression.getText(sf)}(`))) {
          ecrit = true;
        }
        ts.forEachChild(n, visiter);
      };
      visiter(sf);
      const actions = [...importsDe(sf, f).values()].some((i) => i.cible && estServerAction(readFileSync(i.cible, "utf8")));
      return ecrit || actions;
    });
    expect(fautifs.map(relatif)).toEqual([]);
  });

  it("chaque écriture déclenchée par une lecture (rendu d'une page) est nommée avec son motif", () => {
    const trouvees = ecrituresALaLecture(fichiers);
    expect(
      [...trouvees.keys()].filter((c) => !ECRITURES_A_LA_LECTURE.has(c)).map((c) => `${c} ← ${trouvees.get(c)!.join(", ")}`),
      "Une page écrit en se rendant : nommez l'écriture dans ECRITURES_A_LA_LECTURE avec son motif, " +
        "ou faites-en une action (gardée) déclenchée par un geste.",
    ).toEqual([]);
    expect([...ECRITURES_A_LA_LECTURE.keys()].filter((c) => !trouvees.has(c)), "entrée qui ne désigne plus rien").toEqual(
      [],
    );
  });

  it("un écran qui attrape l'erreur d'une action gardée laisse repartir la redirection", () => {
    // Next fait échouer l'appel d'une action qui redirige ; c'est cette erreur
    // qui navigue. Un `catch` qui l'avale affiche « échec » au lieu de la
    // page de l'abonnement (`unstable_rethrow`, revue du lot 3).
    const gardes = new Set(exportees.filter(gardee).map((c) => c.split(":")[1]));
    const clients = execSync(`grep -rl '"use client"' "${SRC}" --include=*.tsx --include=*.ts`)
      .toString()
      .trim()
      .split("\n")
      .filter((f) => !/\.test\.tsx?$/.test(f));
    // Chaque `try` qui contient l'appel d'une action gardée : son `catch` relance.
    const fautifs = clients.filter((f) => {
      const sf = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true);
      let fautif = false;
      const visiter = (n: ts.Node) => {
        if (ts.isTryStatement(n) && n.catchClause) {
          const essai = n.tryBlock.getText(sf);
          const appelle = [...gardes].some((g) => new RegExp(`\\bawait\\s+${g}\\(`).test(essai));
          if (appelle && !/\bunstable_rethrow\(/.test(n.catchClause.block.getText(sf))) fautif = true;
        }
        ts.forEachChild(n, visiter);
      };
      visiter(sf);
      return fautif;
    });
    expect(fautifs.map((f) => f.slice(process.cwd().length + 1))).toEqual([]);
  });
});
