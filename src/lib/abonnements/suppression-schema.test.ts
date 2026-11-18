// Garde : `supprimerCompte` (suppression.ts) efface un compte entier dans une
// transaction. Une relation qui REFUSE l'effacement de ce qu'elle pointe
// (Restrict, NoAction, ou le défaut d'une relation obligatoire) la ferait
// échouer — pour tous les comptes, chaque jour, sans que rien ne casse
// ailleurs (relecture du 2026-11-17). Le test d'intégration, qui le
// prouverait, ne tourne pas en CI (base locale seulement).
//
// Chaque relation de ce genre, dans tout le schéma, est donc listée ici avec
// la façon dont la suppression la traite. Une relation neuve fait échouer ce
// test : la traiter dans `supprimerCompte`, la semer dans
// `suppression.integration.test.ts`, puis l'ajouter. Une relation retirée du
// schéma le fait échouer aussi, pour que la liste reste vraie.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DANS_LA_CASCADE = "les deux bouts partent dans la cascade de l'établissement (semé au test d'intégration)";

const TRAITEES: Record<string, string> = {
  "Entreprise.compte": "les entreprises du compte sont effacées avant lui",
  "DuerpVersion.duerp": "les versions de DUERP sont effacées avant les entreprises",
  "Equipement.batiment": DANS_LA_CASCADE,
  "Verification.salarie": DANS_LA_CASCADE,
  "RapportVerification.verification": DANS_LA_CASCADE,
  "Action.verification": DANS_LA_CASCADE,
  "Action.equipement": DANS_LA_CASCADE,
  "Signature.user": "une signature garde la personne (comptée avant de l'effacer)",
  "AccessToken.createdBy": "un lien d'accès créé garde la personne (compté)",
  "DemandeAssistance.compte": "les demandes du compte sont effacées avant lui",
  "DemandeAssistance.user": "une demande sur un autre compte garde la personne (comptée)",
  "Abonnement.compte": "la ligne d'abonnement est effacée avant le compte",
  "AcceptationConditions.compte": "les acceptations du compte sont effacées avant lui (la trace les garde)",
  "AcceptationConditions.user": "une acceptation sur un autre compte garde la personne (comptée)",
};

/** Les relations qui refusent l'effacement de leur cible, `Modele.champ`. */
function relationsBloquantes(schema: string): string[] {
  const trouvees: string[] = [];
  let modele: string | null = null;
  for (const ligne of schema.split("\n")) {
    const debut = /^model\s+(\w+)\s*\{/.exec(ligne);
    if (debut) {
      modele = debut[1];
      continue;
    }
    if (/^\}/.test(ligne)) {
      modele = null;
      continue;
    }
    if (!modele) continue;
    const champ = /^\s+(\w+)\s+(\w+)(\??)\s+.*@relation\(([^)]*)\)/.exec(ligne);
    if (!champ) continue;
    const args = champ[4];
    // Le côté qui porte la clé étrangère ; l'autre côté ne bloque rien.
    if (!/fields:/.test(args)) continue;
    const regle = /onDelete:\s*(\w+)/.exec(args)?.[1] ?? (champ[3] === "?" ? "SetNull" : "Restrict");
    if (regle === "Restrict" || regle === "NoAction") trouvees.push(`${modele}.${champ[1]}`);
  }
  return trouvees.sort();
}

describe("suppression d'un compte : les relations qui la bloqueraient sont toutes traitées", () => {
  const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("la liste des relations bloquantes est celle que `supprimerCompte` traite", () => {
    expect(relationsBloquantes(schema)).toEqual(Object.keys(TRAITEES).sort());
  });

  it("le relevé voit le défaut d'une relation obligatoire et ignore le côté sans clé", () => {
    const essai = [
      "model A {",
      "  user   User   @relation(fields: [userId], references: [id])",
      "  compte Compte? @relation(fields: [compteId], references: [id])",
      "  duerp  Duerp  @relation(fields: [duerpId], references: [id], onDelete: Cascade)",
      "  zone   Batiment @relation(fields: [zoneId], references: [id], onDelete: NoAction)",
      "}",
      "model B {",
      "  user   User   @relation(\"x\")",
      "}",
    ].join("\n");
    expect(relationsBloquantes(essai)).toEqual(["A.user", "A.zone"]);
  });
});
