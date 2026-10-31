// Ce que le client borné refuse à l'exécution ne doit pas s'écrire dans un
// module migré (ADR-051, lot 2b).
//
// Les tests des modules simulent le client brut, et `vitest.setup.ts` leur
// rend ce client simulé à la place du client borné : un `createMany` direct y
// passe, alors qu'en production le client borné le refuse (Prisma n'accepte
// pas de `connect` dans un `createMany`). Le scan du 2026-10-30 en a trouvé
// quatre, que les tests laissaient verts. Cette garde relit le code.
//
// Refusé : `db.<modèle>.createMany(…)` partout, et `tx.<modèle>.createMany(…)`
// dans un fichier qui n'importe plus le client brut, ou dont la transaction
// est ouverte sur `db` (`db.$transaction`). Le chemin : `creerEnLotVerifie`.
//
// Ce qu'elle ne voit pas : un client borné renommé (`const c = db`). Elle
// ferme l'oubli, pas le détour.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

const BRUT = /from\s+["']@\/lib\/prisma["']/;
const LOT = /\b(db|tx)\.\w+\.(createMany|createManyAndReturn)\s*\(/g;

function interdits(rel: string, texte: string): string[] {
  if (rel === "src/lib/auth/portee/lot-verifie.ts") return [];
  const txBorne = !BRUT.test(texte) || /\bdb\.\$transaction\s*\(/.test(texte);
  return [...texte.matchAll(LOT)]
    .filter((m) => m[1] === "db" || txBorne)
    .map((m) => `${rel}:${texte.slice(0, m.index).split("\n").length} ${m[0]}`);
}

// --- updateMany qui change une clé étrangère --------------------------------
//
// Prisma n'accepte pas de `connect` dans un `updateMany` : le client borné
// refuse d'y voir changer une clé vers une ligne d'un compte. Trouvé le
// 2026-10-30 dans un module migré (rendez-vous), passé à `update`. Une
// transaction ouverte sur le client brut (`prisma.$transaction`) n'est pas
// concernée tant que son module n'est pas migré. Limite : une transaction reçue en
// paramètre n'est pas suivie jusqu'à son ouverture.

const CLES = new Set(
  Prisma.dmmf.datamodel.models.flatMap((m) =>
    m.fields.filter((f) => f.kind === "object").flatMap((f) => f.relationFromFields ?? []),
  ),
);

/** Le corps entre accolades qui commence à `debut` (juste après la `{`). */
function corps(texte: string, debut: number): string {
  let profondeur = 1;
  let i = debut;
  while (i < texte.length && profondeur > 0) {
    if (texte[i] === "{") profondeur++;
    else if (texte[i] === "}") profondeur--;
    i++;
  }
  return texte.slice(debut, i);
}

function updateManyAvecCle(rel: string, texte: string): string[] {
  const trouves: string[] = [];
  for (const m of texte.matchAll(/\b(db|tx)\.\w+\.updateMany\(\{/g)) {
    const avant = texte.slice(0, m.index);
    if (m[1] === "tx") {
      const ouverte = [...avant.matchAll(/\b(\w+)\.\$transaction\(/g)].at(-1)?.[1];
      if (ouverte !== "db") continue;
    }
    const c = corps(texte, (m.index ?? 0) + m[0].length);
    const data = c.slice(c.search(/\bdata\s*:\s*\{/) >= 0 ? c.search(/\bdata\s*:\s*\{/) : c.length);
    const cles = [...CLES].filter((k) => new RegExp(`\\b${k}\\b\\s*[:,}\\n]`).test(data));
    if (cles.length > 0) trouves.push(`${rel}:${avant.split("\n").length} ${m[0]} ${cles.join(", ")}`);
  }
  return trouves;
}

describe("updateMany qui change une clé étrangère sur le client borné", () => {
  it.each([
    ["db.verification.updateMany({ where: { id }, data: { prestataireId: p } })", true],
    ["db.verification.updateMany({ where: { etablissementId }, data: { statut } })", false],
    ["db.$transaction(async (tx) => tx.permisFeu.updateMany({ where: {}, data: { batimentId: b } }))", true],
    ["prisma.$transaction(async (tx) => tx.permisFeu.updateMany({ where: {}, data: { batimentId: b } }))", false],
  ])("%s → refusé : %s", (texte, attendu) => {
    expect(updateManyAvecCle("src/x.ts", texte).length > 0).toBe(attendu);
  });

  it("aucun module ne l'écrit", () => {
    const trouves = fichiers(join(DEPOT, "src")).flatMap((f) =>
      updateManyAvecCle(relative(DEPOT, f), readFileSync(f, "utf8")),
    );
    expect(trouves).toEqual([]);
  });
});

describe("createMany direct sur le client borné", () => {
  it.each([
    ["db.equipement.createMany({ data })", "", true],
    ["await tx.risque.createMany({ data })", "", true],
    ['import { prisma } from "@/lib/prisma";\nawait tx.risque.createMany({ data })', "brut", false],
    ['import { prisma } from "@/lib/prisma";\ndb.$transaction(async (tx) => tx.a.createMany({}))', "brut", true],
    ["creerEnLotVerifie(tx, \"Risque\", lignes)", "", false],
  ])("%s → refusé : %s", (texte, _genre, attendu) => {
    expect(interdits("src/x.ts", texte).length > 0).toBe(attendu);
  });

  it("aucun module ne l'écrit", () => {
    const trouves = fichiers(join(DEPOT, "src")).flatMap((f) =>
      interdits(relative(DEPOT, f), readFileSync(f, "utf8")),
    );
    expect(trouves).toEqual([]);
  });
});
