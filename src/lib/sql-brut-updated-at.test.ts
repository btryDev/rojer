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
// Éprouvé en remettant `NOW()` seul dans l'une d'elles.

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

const POSE = /"updatedAt"\s*=\s*NOW\(\)(\s+AT\s+TIME\s+ZONE\s+'UTC')?/g;

describe("SQL brut : `updatedAt` posé en UTC", () => {
  const poses = sources(RACINE).flatMap((f) =>
    [...readFileSync(f, "utf8").matchAll(POSE)].map((m) => ({
      fichier: f.slice(RACINE.length + 1),
      utc: m[1] !== undefined,
    })),
  );

  it("le balayage voit bien les écritures brutes (borne basse : il n'est pas vide)", () => {
    expect(poses.length).toBeGreaterThanOrEqual(3);
  });

  it("aucune ne pose `NOW()` seul", () => {
    expect(poses.filter((p) => !p.utc).map((p) => p.fichier)).toEqual([]);
  });
});
