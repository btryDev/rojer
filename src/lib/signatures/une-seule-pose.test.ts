import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Une signature ne se pose que par deux portes, chacune avec un code par
 * e-mail (2026-11-21, décision de la propriétaire) :
 * - `poserSignatureAvecToken` (`signatures/actions.ts`) — le lien et son code ;
 * - `poserSignatureCompteAvecCode` (`signatures/code-compte.ts`) — le compte,
 *   son code et le consentement.
 *
 * Garde de relecture du code, comme les gardes `tenancy-*` : toute autre
 * écriture d'une `Signature` (création, création en lot, upsert, SQL brut)
 * fait échouer ce test. ~~`signerEnCompteConnecte`~~, qui signait d'un clic
 * sans code ni consentement, a été retirée le même jour.
 */

const RACINE = join(process.cwd(), "src");

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

// Chaîne sur plusieurs lignes (`signature\n  .create(`), accès par crochets
// (`db["signature"]`), écriture imbriquée (`signatures: { create … }`), SQL brut.
const ECRITURE =
  /\bsignature\s*\.\s*(?:create|createMany|createManyAndReturn|upsert)\s*\(|\[\s*["'`]signature["'`]\s*\]|\bsignatures?\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert)\b|INSERT\s+INTO\s+"?Signature"?\b|creerEnLot\w*\([^)]*["']Signature["']/g;

/** Les portes autorisées : fichier → la fonction qui contient la seule pose. */
const PORTES: Record<string, string> = {
  "lib/signatures/actions.ts": "poserSignatureAvecToken",
  "lib/signatures/code-compte.ts": "poserSignatureCompteAvecCode",
};

/** La fonction qui englobe une position (la dernière déclarée avant elle). */
function fonctionEnglobante(source: string, position: number): string | null {
  const avant = source.slice(0, position);
  // Toute fonction déclarée, exportée ou non : un helper placé après une porte
  // ne prend pas son nom.
  const noms = [...avant.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm)];
  return noms.length ? noms[noms.length - 1][1] : null;
}

describe("une signature ne se pose que par le lien ou le compte, avec un code", () => {
  it("aucune écriture de `Signature` hors des deux portes", () => {
    const poses: string[] = [];
    for (const chemin of fichiers(RACINE)) {
      const source = readFileSync(chemin, "utf8");
      for (const m of source.matchAll(ECRITURE)) {
        poses.push(`${relative(RACINE, chemin)}:${fonctionEnglobante(source, m.index ?? 0)}`);
      }
    }
    expect(poses.sort()).toEqual(
      Object.entries(PORTES)
        .map(([f, fn]) => `${f}:${fn}`)
        .sort(),
    );
  });


  it("le motif attrape les formes détournées", () => {
    const formes = [
      "db.signature\n    .create({",
      'db["signature"].create({',
      "db.etablissement.update({ data: { signatures: { create: {",
      "tx.signature.upsert(",
      'INSERT INTO "Signature"',
    ];
    for (const f of formes) expect(f.match(ECRITURE), f).not.toBeNull();
    expect("db.signature.updateMany({".match(ECRITURE)).toBeNull();
  });
});
