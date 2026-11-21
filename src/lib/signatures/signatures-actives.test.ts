import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Seules les signatures ACTIVES comptent (ADR-061 § 1) : une signature
 * révoquée garde sa preuve, mais ne scelle plus rien, ne valide plus l'acte,
 * ne bloque plus une nouvelle signature de la même partie.
 *
 * Cette garde relit le code : toute lecture du modèle `Signature` (`findMany`,
 * `findFirst`, `count`) porte `active` dans sa requête, sauf les lectures
 * nommées ci-dessous, qui lisent exprès TOUTES les signatures.
 */

const RACINE = join(process.cwd(), "src");

const EXEMPTEES: Record<string, string> = {
  // ~~`verification-publique.ts`~~ (page publique retirée le 2026-11-21).
  "lib/signatures/verification.ts": "« Vérifier » dans l'application porte aussi sur une signature révoquée, et le dit",
  "lib/signatures/trace.ts": "une signature révoquée reste une trace : le plan ne s'efface pas",
  "lib/abonnements/suppression.ts": "la suppression du compte compte tout ce qui part",
  "lib/salaries/suppression.ts": "la suppression d'un salarié compte tout ce qui le désigne",
};

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

describe("les lectures de signatures (ADR-061 § 1)", () => {
  it("filtrent toutes les signatures actives, sauf les lectures nommées", () => {
    const fautes: string[] = [];
    for (const chemin of fichiers(RACINE)) {
      const rel = relative(RACINE, chemin);
      if (EXEMPTEES[rel]) continue;
      const texte = readFileSync(chemin, "utf8");
      for (const m of texte.matchAll(/\.signature\.(findMany|findFirst|count)\(/g)) {
        // La requête : jusqu'à la parenthèse qui ferme l'appel.
        let profondeur = 0;
        let fin = m.index! + m[0].length - 1;
        for (; fin < texte.length; fin++) {
          if (texte[fin] === "(") profondeur++;
          else if (texte[fin] === ")" && --profondeur === 0) break;
        }
        if (!/\bactive\b/.test(texte.slice(m.index!, fin))) {
          const ligne = texte.slice(0, m.index!).split("\n").length;
          fautes.push(`${rel}:${ligne}`);
        }
      }
    }
    expect(fautes, "Ajouter `active: true` (ou `active: null` pour les révoquées) à la requête").toEqual([]);
  });

  it("chaque exemption existe encore", () => {
    for (const rel of Object.keys(EXEMPTEES)) {
      expect(() => statSync(join(RACINE, rel)), rel).not.toThrow();
    }
  });
});
