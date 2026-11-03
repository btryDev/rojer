// Toute écriture exposée par une server action passe par `verifierSaisie`
// (ADR-053 § 3) : un impayé ferme la saisie du titulaire, jamais la lecture
// ni l'export. Même balayage que `auth/tenancy-ecritures.test.ts`
// (`ecrituresExposees`), même forme d'exception que `tenancy-routes` : une
// liste FERMÉE, chaque entrée avec son motif.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { ecrituresExposees } from "@/lib/auth/tenancy-sonde";

const MOTIF_COMPTE = "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés";

/** Écritures qui restent ouvertes quand la saisie est fermée. */
const OUVERTES = new Map<string, string>([
  ["lib/auth/actions.ts:activerDoubleAuthAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:changerMotDePasseAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:confirmerDoubleAuthAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:definirMotDePasseAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:gererDoubleAuthAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:requestPasswordResetAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:signInAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:signUpAction", MOTIF_COMPTE],
  ["lib/auth/actions.ts:verifierSecondFacteurAction", MOTIF_COMPTE],
  ["lib/assistance/actions.ts:demanderAssistance", "joindre l'assistance, y compris pour une question d'abonnement"],
  ["lib/access-tokens/actions.ts:revoquerAccessToken", "retirer l'accès d'un prestataire : une mesure de sécurité"],
  ["lib/accessibilite/actions.ts:depublierRegistre", "retirer une page publique : une mesure de protection"],
  ["lib/signatures/actions.ts:poserSignatureAvecToken", "acte d'un tiers par lien vérifié, pas du titulaire"],
  ["lib/signatures/actions.ts:renvoyerCodeOtp", "acte d'un tiers par lien vérifié, pas du titulaire"],
  ["lib/entreprises/actions.ts:supprimerEntreprise", "supprimer ses données reste possible à tout moment (RGPD, règle 9)"],
  ["lib/etablissements/actions.ts:supprimerEtablissement", "supprimer ses données reste possible à tout moment (RGPD, règle 9)"],
]);

/** Le corps de chaque fonction de premier niveau d'un fichier, par nom (une lecture par fichier). */
const corps = new Map<string, Map<string, ts.Block>>();
function corpsDe(fichier: string): Map<string, ts.Block> {
  let m = corps.get(fichier);
  if (m) return m;
  const chemin = join(process.cwd(), "src", fichier);
  const sf = ts.createSourceFile(chemin, readFileSync(chemin, "utf8"), ts.ScriptTarget.Latest, true);
  m = new Map();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name && st.body) m.set(st.name.text, st.body);
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const init = d.initializer;
        if (ts.isIdentifier(d.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && ts.isBlock(init.body)) {
          m.set(d.name.text, init.body);
        }
      }
    }
  }
  corps.set(fichier, m);
  return m;
}

/**
 * `await verifierSaisie();` est la PREMIÈRE instruction de l'action : ni sous
 * une condition, ni dans un commentaire, ni après une écriture, ni dans un
 * `try` qui avalerait la redirection.
 */
function gardee(cle: string): boolean {
  const [fichier, nom] = cle.split(":");
  const premiere = corpsDe(fichier).get(nom)?.statements[0];
  if (!premiere || !ts.isExpressionStatement(premiere) || !ts.isAwaitExpression(premiere.expression)) return false;
  const appel = premiere.expression.expression;
  return ts.isCallExpression(appel) && ts.isIdentifier(appel.expression) && appel.expression.text === "verifierSaisie";
}

describe("la saisie fermée (ADR-053 § 3)", () => {
  const ecritures = ecrituresExposees().map((e) => e.cle).sort();

  it("le balayage voit les écritures exposées", () => {
    expect(ecritures.length).toBeGreaterThan(50);
  });

  it("chaque écriture exposée appelle verifierSaisie, sauf les ouvertes nommées", () => {
    const sansGarde = ecritures.filter((c) => !OUVERTES.has(c) && !gardee(c));
    expect(
      sansGarde,
      "Appelez `await verifierSaisie()` en tête de l'action (`@/lib/abonnements/saisie`), " +
        "ou nommez-la dans OUVERTES avec son motif si elle doit rester ouverte à un compte impayé.",
    ).toEqual([]);
  });

  it("les ouvertes existent, et aucune n'appelle verifierSaisie", () => {
    expect([...OUVERTES.keys()].filter((c) => !ecritures.includes(c))).toEqual([]);
    expect([...OUVERTES.keys()].filter(gardee)).toEqual([]);
  });

  it("un écran qui attrape l'erreur d'une action gardée laisse repartir la redirection", () => {
    // Next fait échouer l'appel d'une action qui redirige ; c'est cette erreur
    // qui navigue. Un `catch` qui l'avale affiche « échec » au lieu de la
    // page de l'abonnement (`unstable_rethrow`, revue du lot 3).
    const gardes = new Set(ecritures.filter((c) => !OUVERTES.has(c)).map((c) => c.split(":")[1]));
    const clients = execSync(`grep -rl '"use client"' "${join(process.cwd(), "src")}" --include=*.tsx --include=*.ts`)
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
