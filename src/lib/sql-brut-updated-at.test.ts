// `updatedAt` écrit à la main dans un SQL brut : en UTC (revue de
// `lot/reprise-suites-lot3`, 2026-10-13, R3).
//
// Les colonnes `updatedAt` sont des TIMESTAMP(3) sans fuseau où Prisma range
// des instants UTC (ADR-011 § 1). Un `UPDATE` brut qui pose `NOW()` seul y
// écrit l'heure locale de la SESSION : juste tant que la base tourne en UTC,
// décalée d'une ou deux heures le jour où elle ne l'est plus, sans qu'aucune
// requête ne change. Trois écritures suivent ce patron (équipements,
// réponses fermées du DUERP, registre) ; ce test les tient toutes, et celles
// qui viendront.
//
// Éprouvé en remettant `NOW()` seul dans l'une d'elles, puis `now()` en
// minuscules (seconde revue : le motif doit voir les formes que PostgreSQL
// accepte, pas seulement celle qu'on a écrite).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RACINE = join(__dirname, "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return sources(chemin);
    return /\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

/**
 * Une affectation de `updatedAt` à l'horloge de la base, sous les formes que
 * PostgreSQL accepte : `NOW()` ou `CURRENT_TIMESTAMP`, toute casse, colonne
 * entre guillemets ou non. Le fuseau, s'il est là, se lit sans casse : un nom
 * de fuseau ne dépend pas de la casse pour PostgreSQL, `'utc'` vaut `'UTC'`.
 */
const POSE =
  /"?updatedAt"?\s*=\s*(?:NOW\(\)|CURRENT_TIMESTAMP)(\s+AT\s+TIME\s+ZONE\s+'UTC')?/gi;

function poses(texte: string): { utc: boolean }[] {
  return [...texte.matchAll(POSE)].map((m) => ({ utc: m[1] !== undefined }));
}

describe("le motif voit les formes que PostgreSQL accepte", () => {
  it.each([
    ['"updatedAt" = NOW()', false],
    ['"updatedAt" = now()', false],
    ['"updatedAt" = CURRENT_TIMESTAMP', false],
    ['"updatedAt" = current_timestamp', false],
    ["updatedAt = NOW()", false],
    ['"updatedAt"=NOW()', false],
    [`"updatedAt" = NOW() AT TIME ZONE 'UTC'`, true],
    [`"updatedAt" = now() at time zone 'utc'`, true],
    [`"updatedAt" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'`, true],
  ] as const)("%s → UTC : %s", (sql, utc) => {
    expect(poses(sql)).toEqual([{ utc }]);
  });
});

describe("SQL brut : `updatedAt` posé en UTC", () => {
  const trouvees = sources(RACINE).flatMap((f) =>
    poses(readFileSync(f, "utf8")).map((p) => ({ ...p, fichier: f.slice(RACINE.length + 1) })),
  );

  it("le balayage voit bien les écritures brutes (borne basse : il n'est pas vide)", () => {
    expect(trouvees.length).toBeGreaterThanOrEqual(3);
  });

  it("aucune ne pose l'horloge de la base sans fuseau", () => {
    expect(trouvees.filter((p) => !p.utc).map((p) => p.fichier)).toEqual([]);
  });
});
