import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { marqueursDePortee, sansCommentairesNiChaines } from "./tenancy-sonde";

/**
 * Toute écriture exposée par une server action établit sa portée.
 *
 * ## Pourquoi ce test existe, et pourquoi il ne balaie que les écritures
 *
 * Sept fichiers `isolation.test.ts` rattrapent chacun une action qui écrivait
 * sur un identifiant reçu du client sans le confronter au compte :
 * `supprimerUnite` détruisait l'unité d'un autre client et ses risques en
 * cascade, `supprimerActionPlan` faisait un `delete` sur l'id brut,
 * `validerTransverses` marquait n'importe quel DUERP. Chaque fois le défaut a
 * été trouvé après coup, puis gardé un par un. Ce fichier garde la classe.
 *
 * `docs/revues/axe-5-en-cours.md` a mesuré une règle équivalente sur les
 * **lectures** hors `queries.ts` : dix faux positifs sur douze signalements,
 * et conclu contre l'outil. Les écritures ont été mesurées le 2026-09-08 avant
 * d'écrire ceci : 75 fonctions, zéro nue, zéro faux positif — parce que les
 * server actions sont le seul endroit du dépôt où la convention est déjà
 * uniforme. C'est ce qui rend la garde possible ici et pas là-bas. Et c'est le
 * côté où le dégât ne se répare pas : une lecture qui fuit se voit, une
 * suppression qui traverse ne se voit plus.
 *
 * ## Ce que le test regarde
 *
 * Un module est une server action si sa première instruction est la directive
 * `"use server"` — pas si le mot apparaît dans un commentaire :
 * `calendrier/reconciliation.ts` explique justement pourquoi il n'en est pas
 * une, et un `grep` l'y aurait rangé.
 *
 * Dans ces modules, toute fonction **exportée** dont le corps écrit en base
 * doit établir sa portée, de l'une de ces façons :
 *
 *  1. un marqueur dans son corps — les helpers de `scope.ts`, `requireUser`,
 *     `portee(`, ou `userId` porté dans un `where` ;
 *  2. un appel à une fonction **du même fichier** qui, elle, en porte un —
 *     `modifierBatiment` passe par `trouverBatimentDuUser`, `enregistrerFiche`
 *     par `preparer`. La résolution est transitive et reste dans le fichier :
 *     un helper importé d'ailleurs ne compte pas, sauf s'il vient de `scope.ts`.
 *
 * Les corps sont découpés sur **toute** déclaration de fonction, exportée ou
 * non, `function` ou `const … = async (`. Le balayage des lectures découpe
 * d'un `export` au suivant, et axe-5 a relevé ce que ça coûte : une fonction
 * non exportée placée après une exportée est absorbée dans son corps et hérite
 * de ses marqueurs. Ici, un helper privé nu reste nu.
 */

const RACINE = join(process.cwd(), "src");

type Fonction = { nom: string; exportee: boolean; corps: string };

function estServerAction(source: string): boolean {
  // La directive est la première instruction ; seuls des commentaires peuvent
  // la précéder. C'est la règle de Next, et c'est ce qui distingue une
  // directive d'une mention.
  return /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(
    source,
  );
}

function modulesServerAction(): { chemin: string; source: string }[] {
  const fichiers = execSync(`find "${RACINE}" -name "*.ts" -not -name "*.test.ts"`)
    .toString()
    .trim()
    .split("\n");
  return fichiers
    .map((f) => ({ chemin: f.slice(RACINE.length + 1), source: readFileSync(f, "utf8") }))
    .filter((m) => estServerAction(m.source));
}

/** Toutes les fonctions du fichier, exportées ou non, corps commentaires exclus. */
function fonctions(source: string): Fonction[] {
  const src = sansCommentairesNiChaines(source);
  const decl = [
    ...src.matchAll(
      /^(export )?(?:async )?function (\w+)\(|^(export )?const (\w+) = (?:async )?\(/gm,
    ),
  ];
  return decl.map((m, i) => ({
    nom: m[2] ?? m[4],
    exportee: Boolean(m[1] ?? m[3]),
    corps: src.slice(m.index, decl[i + 1]?.index ?? src.length),
  }));
}

const ECRITURE =
  /prisma\.\w+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/;

function ecritures(): { cle: string; scopee: boolean }[] {
  const marqueurs = marqueursDePortee();
  const out: { cle: string; scopee: boolean }[] = [];
  for (const { chemin, source } of modulesServerAction()) {
    const fns = fonctions(source);
    const parNom = new Map(fns.map((f) => [f.nom, f]));

    const etablitSaPortee = (fn: Fonction, vus = new Set<string>()): boolean => {
      if (vus.has(fn.nom)) return false;
      vus.add(fn.nom);
      if (marqueurs.some((m) => fn.corps.includes(m))) return true;
      for (const [nom, autre] of parNom) {
        if (nom === fn.nom) continue;
        if (new RegExp(`\\b${nom}\\(`).test(fn.corps) && etablitSaPortee(autre, vus)) {
          return true;
        }
      }
      return false;
    };

    for (const fn of fns) {
      if (!fn.exportee || !ECRITURE.test(fn.corps)) continue;
      out.push({ cle: `${chemin}:${fn.nom}`, scopee: etablitSaPortee(fn) });
    }
  }
  return out;
}

describe("les écritures des server actions", () => {
  it("établissent toutes leur portée", () => {
    const toutes = ecritures();

    // Contre-épreuve d'abord : 75 écritures relevées le 2026-09-08. Une
    // expression qui cesserait de les trouver rendrait ce test vert et vide.
    expect(
      toutes.length,
      "Moins de 50 écritures trouvées : la garde ne garde rien.",
    ).toBeGreaterThan(50);

    const nues = toutes.filter((e) => !e.scopee).map((e) => e.cle);
    expect(
      nues,
      "Ces server actions écrivent en base sans établir leur portée. " +
        "L'identifiant vient du client : le confronter au compte avec un " +
        "helper de `auth/scope.ts` (`requireDuerp`, `requireUnite`, " +
        "`assertEtablissementOwnership`…) AVANT d'écrire. Un appelant déjà " +
        "vérifié ne dispense pas : toute fonction exportée d'un module " +
        "`\"use server\"` est un point d'entrée joignable depuis le navigateur.",
    ).toEqual([]);
  });

  it("ne confond pas une directive avec sa mention", () => {
    // `reconciliation.ts` dit en commentaire pourquoi il n'est PAS un
    // `"use server"`. Un balayage au grep l'y rangeait, et dénonçait à tort
    // la seule fonction du fichier.
    const chemins = modulesServerAction().map((m) => m.chemin);
    expect(chemins).not.toContain("lib/calendrier/reconciliation.ts");
    expect(chemins).toContain("lib/risques/actions.ts");
  });
});
