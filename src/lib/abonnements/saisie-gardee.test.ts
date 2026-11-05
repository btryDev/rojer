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
// dans `OUVERTES`. Le balayage couvre les `.tsx`, et refuse la directive en
// ligne (voir le test qui la nomme).

import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  cheminDEcriture,
  ecrituresExposees,
  estServerAction,
  fonctionsAtteintes,
  modulesServerAction,
  resoudre,
} from "@/lib/auth/tenancy-sonde";

const SRC = join(process.cwd(), "src");
const relatif = (f: string) => f.slice(SRC.length + 1);

const MOTIF_COMPTE = "le compte et sa sécurité (connexion, déconnexion, inscription, mot de passe, sessions, double authentification) : jamais fermés";
const MOTIF_MEMBRES =
  "retirer un membre, annuler une invitation, changer un rôle : des mesures de sécurité, ouvertes à un impayé (ADR-054 § 5) — propriétaire seul";
const MOTIF_INVITE =
  "acte de la personne invitée, hors du compte actif de sa session : `verifierSaisie` jugerait un autre compte, ou aucun";

/** Écritures qui restent ouvertes quand la saisie est fermée. */
const OUVERTES = new Map<string, string>([
  ["lib/auth/actions.ts:activerDoubleAuthAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:changerMotDePasseAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:confirmerDoubleAuthAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:definirMotDePasseAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:fermerSessionsAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:gererDoubleAuthAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:requestPasswordResetAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:signInAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:signOutAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:signUpAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:verifierSecondFacteurAction", MOTIF_COMPTE],
  ["lib/assistance/actions.ts:demanderAssistance", "joindre l'assistance, y compris pour une question d'abonnement"],
  ["lib/access-tokens/actions.ts:revoquerAccessToken", "retirer l'accès d'un prestataire : une mesure de sécurité"],
  ["lib/accessibilite/actions.ts:depublierRegistre", "retirer une page publique : une mesure de protection"],
  ["lib/signatures/actions.ts:poserSignatureAvecToken", "acte d'un tiers par lien vérifié, pas du titulaire"],
  ["lib/signatures/actions.ts:renvoyerCodeOtp", "acte d'un tiers par lien vérifié, pas du titulaire"],
  ["lib/entreprises/actions.ts:supprimerEntreprise", "supprimer ses données reste possible à tout moment (RGPD, règle 9)"],
  ["lib/etablissements/actions.ts:supprimerEtablissement", "supprimer ses données reste possible à tout moment (RGPD, règle 9)"],
  ["lib/membres/actions.ts:quitterCompte", "quitter un compte reste possible à tout moment, quel que soit son rôle (ADR-054 § 6)"],
  ["lib/membres/actions.ts:annulerInvitation", MOTIF_MEMBRES],
  ["lib/membres/actions.ts:changerRoleMembre", MOTIF_MEMBRES],
  ["lib/membres/actions.ts:retirerMembre", MOTIF_MEMBRES],
  ["lib/membres/actions.ts:accepterInvitation", MOTIF_INVITE],
  ["lib/membres/actions.ts:refuserInvitation", MOTIF_INVITE],
  [
    "lib/membres/actions.ts:choisirCompte",
    "changer de compte actif (session Better Auth) : il faut pouvoir quitter un compte impayé pour un autre de ses comptes (ADR-054 § 7)",
  ],
  // L'abonnement lui-même (ADR-053 §§ 8 à 12) : c'est par lui qu'un compte
  // impayé reprend la main. Propriétaire seul (`verifierProprietaire`) ;
  // l'essai, avant que le compte existe, ouvre par `verifierRole`.
  ["lib/abonnements/actions.ts:demarrerEssaiAction", "démarrer l'essai : avant tout abonnement, propriétaire seul"],
  ["lib/abonnements/actions.ts:ouvrirPortailAction", "le portail : payer, reprendre, résilier — propriétaire seul"],
  ["lib/abonnements/actions.ts:souscrireAction", "souscrire de nouveau après un abonnement terminé — propriétaire seul"],
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
 * Parmi les ouvertes, celles qui le restent aussi à un membre en LECTURE SEULE
 * (ADR-054 § 4) : le compte et sa sécurité, l'assistance, les actes d'un tiers
 * ou de la personne invitée, le changement de compte actif (le rôle de la
 * session est celui d'un AUTRE compte). Les autres ouvrent par une garde de
 * rôle (`GARDES_DE_ROLE`).
 */
const OUVERTES_A_LA_LECTURE = new Set<string>(
  [...OUVERTES.keys()].filter(
    (c) =>
      c.startsWith("lib/auth/actions.ts:") ||
      c === "lib/assistance/actions.ts:demanderAssistance" ||
      c === "lib/signatures/actions.ts:poserSignatureAvecToken" ||
      c === "lib/signatures/actions.ts:renvoyerCodeOtp" ||
      c === "lib/membres/actions.ts:quitterCompte" ||
      c === "lib/membres/actions.ts:accepterInvitation" ||
      c === "lib/membres/actions.ts:refuserInvitation" ||
      c === "lib/membres/actions.ts:choisirCompte",
  ),
);

/**
 * Ce qui ferme la lecture seule en tête d'une ouverte. `verifierProprietaire`
 * la ferme aussi : un lecteur n'est jamais propriétaire. `proprietaireOuRefus`
 * (membres seulement) fait le même contrôle et rend le refus à l'écran plutôt
 * qu'en redirection.
 */
const GARDES_DE_ROLE: { garde: string; fichier?: string }[] = [
  { garde: "verifierRole" },
  { garde: "verifierProprietaire" },
  { garde: "proprietaireOuRefus", fichier: "lib/membres/actions.ts" },
];

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

type Releve = {
  /** `lib/x/actions.ts:nom` → le corps (`null` : une fonction fléchée sans bloc). */
  exportees: Map<string, ts.Block | null>;
  modules: Set<string>;
  /** Un export que le relevé ne sait pas lire comme une fonction nommée. */
  formesInconnues: string[];
  /** `fichier:ligne` d'une directive `"use server"` dans le corps d'une fonction. */
  directivesEnLigne: string[];
};

function relever(fichiers: string[]): Releve {
  const r: Releve = { exportees: new Map(), modules: new Set(), formesInconnues: [], directivesEnLigne: [] };
  for (const fichier of fichiers) {
    if (!/["']use server["']/.test(readFileSync(fichier, "utf8"))) continue;
    const sf = sourceDe(fichier);
    const rel = relatif(fichier);
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
    for (const st of sf.statements) {
      if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) continue;
      if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) {
        if (ts.isExportDeclaration(st) && st.isTypeOnly) continue;
        r.formesInconnues.push(`${rel}: ${st.getText(sf).slice(0, 60)}`);
        continue;
      }
      if (!aExport(st)) continue;
      if (ts.isFunctionDeclaration(st)) {
        r.exportees.set(`${rel}:${st.name?.text ?? "default"}`, st.body ?? null);
      } else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          const init = d.initializer;
          if (ts.isIdentifier(d.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
            r.exportees.set(`${rel}:${d.name.text}`, ts.isBlock(init.body) ? init.body : null);
          } else {
            r.formesInconnues.push(`${rel}: ${d.getText(sf).slice(0, 60)}`);
          }
        }
      } else {
        r.formesInconnues.push(`${rel}: ${ts.SyntaxKind[st.kind]}`);
      }
    }
  }
  return r;
}

const tousLesFichiers = (): string[] =>
  execFileSync("find", [SRC, "(", "-name", "*.ts", "-o", "-name", "*.tsx", ")"])
    .toString()
    .trim()
    .split("\n")
    .filter((f) => !/\.test\.tsx?$/.test(f));

/** La première instruction de `corps` est `await garde(…)` ou `const … = await garde(…)`. */
function ouvrePar(corps: ts.Block | null | undefined, garde: string): boolean {
  const premiere = corps?.statements[0];
  if (!premiere) return false;
  let attendu: ts.Expression | undefined;
  if (ts.isExpressionStatement(premiere)) attendu = premiere.expression;
  else if (ts.isVariableStatement(premiere) && premiere.declarationList.declarations.length === 1) {
    attendu = premiere.declarationList.declarations[0].initializer;
  }
  if (!attendu || !ts.isAwaitExpression(attendu)) return false;
  const appel = attendu.expression;
  return ts.isCallExpression(appel) && ts.isIdentifier(appel.expression) && appel.expression.text === garde;
}

/**
 * Les écritures qu'un composant serveur atteint pendant le rendu : chaque
 * import nommé d'un module `.ts` du dépôt (hors `"use server"` : une action
 * passée à un formulaire n'est pas appelée au rendu) que le fichier utilise,
 * suivi par `cheminDEcriture` ; plus une écriture Prisma écrite dans le
 * fichier même. Clé : la fonction importée, là où elle vit.
 */
function ecrituresALaLecture(fichiers: string[]): Map<string, string[]> {
  const ECRITURES = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"]);
  const out = new Map<string, string[]>();
  const noter = (cle: string, page: string) => out.set(cle, [...(out.get(cle) ?? []), page]);
  for (const fichier of fichiers.filter((f) => f.endsWith(".tsx"))) {
    const sf = sourceDe(fichier);
    const prologue = directives(sf.statements);
    if (prologue.includes("use client") || prologue.includes("use server")) continue;
    const rel = relatif(fichier);
    const occurrences = new Map<string, number>();
    const visiter = (n: ts.Node) => {
      if (ts.isIdentifier(n)) occurrences.set(n.text, (occurrences.get(n.text) ?? 0) + 1);
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        ts.isPropertyAccessExpression(n.expression.expression) &&
        ECRITURES.has(n.expression.name.text)
      ) {
        noter(`${rel}:${n.expression.getText(sf)}`, rel);
      }
      ts.forEachChild(n, visiter);
    };
    visiter(sf);
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || st.importClause?.isTypeOnly) continue;
      const liaisons = st.importClause?.namedBindings;
      if (!liaisons || !ts.isNamedImports(liaisons)) continue;
      const cible = resoudre(fichier, (st.moduleSpecifier as ts.StringLiteral).text);
      if (!cible || estServerAction(readFileSync(cible, "utf8"))) continue;
      for (const el of liaisons.elements) {
        // Une occurrence, c'est l'import lui-même : le nom n'est pas utilisé.
        if (el.isTypeOnly || (occurrences.get(el.name.text) ?? 0) < 2) continue;
        const chemin = cheminDEcriture(cible, (el.propertyName ?? el.name).text);
        if (chemin) noter(chemin[0], rel);
      }
    }
  }
  return out;
}

// ─── La garde ────────────────────────────────────────────────────────────────

describe("la saisie fermée (ADR-053 § 3)", () => {
  const fichiers = tousLesFichiers();
  const releve = relever(fichiers);
  const exportees = [...releve.exportees.keys()].sort();
  const corps = (cle: string) => releve.exportees.get(cle);
  const gardee = (cle: string) => ouvrePar(corps(cle), "verifierSaisie");
  const ecritures = ecrituresExposees().map((e) => e.cle);

  it("le relevé voit toutes les actions exposées, et la sonde n'en voit pas d'autre", () => {
    expect(exportees.length).toBeGreaterThan(100);
    // Les deux lectures de la directive (l'arbre ici, la sonde des balayages
    // de portée) désignent les mêmes modules, et chaque écriture que la sonde
    // voit est une exportée relevée ici.
    expect([...releve.modules].sort()).toEqual([...modulesServerAction()].sort());
    expect(ecritures.filter((c) => !releve.exportees.has(c))).toEqual([]);
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

  it("chaque export d'un module \"use server\" est une fonction nommée que le relevé lit", () => {
    expect(
      releve.formesInconnues,
      "Écrivez l'action `export async function nom(…) {` : une autre forme échapperait à la garde.",
    ).toEqual([]);
  });

  it("chaque fonction exportée appelle verifierSaisie, sauf les ouvertes et les lectures nommées", () => {
    const sansGarde = exportees.filter((c) => !OUVERTES.has(c) && !LECTURES_EXPOSEES.has(c) && !gardee(c));
    expect(
      sansGarde,
      "Appelez `await verifierSaisie()` en tête de l'action (`@/lib/abonnements/saisie`), " +
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
    const ferme = (c: string) =>
      GARDES_DE_ROLE.some((g) => (!g.fichier || c.startsWith(`${g.fichier}:`)) && ouvrePar(corps(c), g.garde));
    const sansRole = [...OUVERTES.keys()].filter((c) => !OUVERTES_A_LA_LECTURE.has(c) && !ferme(c));
    expect(
      sansRole,
      "Appelez `await verifierRole()` (ou `verifierProprietaire()`) en tête de l'action, ou nommez-la dans OUVERTES_A_LA_LECTURE.",
    ).toEqual([]);
    expect([...OUVERTES_A_LA_LECTURE].filter(ferme)).toEqual([]);
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
