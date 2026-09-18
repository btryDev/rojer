import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ADR-036, lot 3 — aucun script ne pose une `datePrevue` qu'aucun fait
 * n'explique.
 *
 * Le passage à blanc du 2026-09-18 a trouvé vingt et une dates arbitraires sur
 * le dossier de démonstration en production, toutes posées par des scripts :
 * `etaler-echeances-demo.ts` (un hachage de la clé de ligne), `prisma/seed.ts
 * --planifier` (J−80 à J+730) et `seed-dossier-complet.ts` (une répartition à
 * la main). Après la bascule, le moteur les aurait toutes renvoyées à « à
 * planifier ». Les deux premiers sont retirés ; le troisième écrit des faits et
 * calcule sa date par `echeanceDeLigne`.
 *
 * LA RÈGLE, lue dans le texte des scripts : une propriété `datePrevue:` n'y a
 * que deux formes admises —
 *   · une clause de requête (`orderBy: { datePrevue: "asc" }`, `select`, un
 *     filtre `{ lt: … }`), qui lit une date et n'en écrit aucune ;
 *   · `x.datePrevue`, où `x` est le résultat d'un appel à `echeanceDeLigne`
 *     dans le même fichier.
 * Toute autre valeur — `jours(12)`, `dans(n)`, une date calculée à la main —
 * est une date que le script invente.
 *
 * CE QU'ELLE NE VOIT PAS, écrit : l'affectation (`data.datePrevue = …`) et la
 * forme abrégée (`{ datePrevue }`). Aucun script ne s'en sert ; un filet plus
 * large accuserait surtout les lectures.
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Scripts qui construisent une ligne EN MÉMOIRE, sans rien écrire en base. */
const EXEMPTES: Record<string, string> = {
  // Mesure le score avant/après l'ADR-034 sur des lignes fabriquées en
  // mémoire ; aucun appel Prisma n'écrit de vérification.
  "scripts/mesure-score-adr034.ts": "lignes en mémoire, aucune écriture",
};

function listerScripts(): { chemin: string; code: string }[] {
  const out: { chemin: string; code: string }[] = [];
  const parcourir = (dossier: string): void => {
    for (const e of readdirSync(join(RACINE, dossier), { withFileTypes: true })) {
      const relatif = `${dossier}/${e.name}`;
      if (e.isDirectory()) {
        if (!e.name.startsWith(".")) parcourir(relatif);
      } else if (/\.tsx?$/.test(e.name)) {
        out.push({ chemin: relatif, code: readFileSync(join(RACINE, relatif), "utf8") });
      }
    }
  };
  parcourir("scripts");
  out.push({
    chemin: "prisma/seed.ts",
    code: readFileSync(join(RACINE, "prisma/seed.ts"), "utf8"),
  });
  return out;
}

/** Commentaires neutralisés, numérotation des lignes préservée. */
function sansCommentaires(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (bloc) => bloc.replace(/[^\n]/g, " "))
    .split("\n")
    .map((ligne) => ligne.replace(/\/\/.*$/, ""))
    .join("\n");
}

const MOTIF_PROPRIETE = /\bdatePrevue\s*:\s*([^,}\n]*)/g;
/**
 * Une lecture : tri, sélection ou filtre. Le scalaire doit être SEUL — sinon
 * `true ? dans(3) : null` passait —, et un objet n'est admis que s'il ouvre
 * sur un opérateur de filtre — sinon `{ set: dans(3) }`, une écriture Prisma,
 * passait (relecture du lot 3).
 */
const CLAUSE_DE_REQUETE =
  /^((["'`](asc|desc)["'`]|true|false)\s*$|\{\s*(lt|lte|gt|gte|equals|not|in|notIn)\s*:)/;

/** Les emplacements fautifs d'un fichier, « chemin:ligne → valeur ». */
function datesInventees(chemin: string, code: string): string[] {
  const propre = sansCommentaires(code);
  // Les identifiants liés au résultat d'`echeanceDeLigne` dans ce fichier.
  const lies = new Set(
    [...propre.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*echeanceDeLigne\s*\(/g)].map(
      (m) => m[1],
    ),
  );
  const out: string[] = [];
  propre.split("\n").forEach((ligne, i) => {
    for (const m of ligne.matchAll(MOTIF_PROPRIETE)) {
      const valeur = m[1].trim();
      if (CLAUSE_DE_REQUETE.test(valeur)) continue;
      const lue = /^(\w+)\.datePrevue$/.exec(valeur);
      if (lue && lies.has(lue[1])) continue;
      out.push(`${chemin}:${i + 1} → ${valeur}`);
    }
  });
  return out;
}

describe("ADR-036 lot 3 — les scripts écrivent des faits, pas des dates", () => {
  const scripts = listerScripts();

  it("parcourt bien les scripts, le seed et le dossier complet", () => {
    // Un chemin faux ferait passer la garde à vide.
    expect(scripts.length).toBeGreaterThan(8);
    const complet = scripts.find((s) => s.chemin === "scripts/seed-dossier-complet.ts");
    expect(complet).toBeDefined();
    // Le dossier complet écrit ses lignes, et par la fonction d'échéance.
    expect(complet!.code).toMatch(/datePrevue:\s*\w+\.datePrevue/);
    expect(complet!.code).toMatch(/=\s*echeanceDeLigne\(/);
    // Chaque exemption vise un fichier qui existe.
    for (const e of Object.keys(EXEMPTES)) {
      expect(scripts.some((s) => s.chemin === e), e).toBe(true);
    }
  });

  it("le motif accuse une date inventée et laisse passer lectures et faits", () => {
    const fichier = [
      "const echeance = echeanceDeLigne(faits);",
      "a({ datePrevue: echeance.datePrevue });",
      'b({ orderBy: { datePrevue: "asc" } });',
      "c({ where: { datePrevue: { lt: jours(0) } } });",
      "d({ select: { datePrevue: true } });",
      "// e({ datePrevue: jours(3) });",
      "f({ datePrevue: jours(160) });",
      "g({ data: { datePrevue: dans(jours), statut: 'planifiee' } });",
      "h({ datePrevue: autre.datePrevue });",
      "i({ datePrevue: v.datePrevue });",
      "j({ data: { datePrevue: { set: dans(3) } } });",
      "k({ datePrevue: true ? dans(3) : null });",
    ].join("\n");
    expect(datesInventees("x.ts", fichier)).toEqual([
      "x.ts:7 → jours(160)",
      "x.ts:8 → dans(jours)",
      "x.ts:9 → autre.datePrevue",
      "x.ts:10 → v.datePrevue",
      "x.ts:11 → { set: dans(3)",
      "x.ts:12 → true ? dans(3) : null",
    ]);
  });

  it("aucun script ni le seed ne pose une datePrevue hors d'echeanceDeLigne", () => {
    const fautes = scripts
      .filter((s) => !(s.chemin in EXEMPTES))
      .flatMap((s) => datesInventees(s.chemin, s.code));
    expect(
      fautes,
      "Une date écrite par un script doit sortir de faits — mise en service, " +
        "rapport réalisé, `suiviDepuis` — par `echeanceDeLigne` (ADR-036, lot 3). " +
        "Une date posée à la main devient « à planifier » à la bascule.",
    ).toEqual([]);
  });
});
