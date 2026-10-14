import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { helpersDAppartenance, modulesServerAction } from "./tenancy-sonde";
import { decoupe } from "./tenancy-portee";

/**
 * Un identifiant ENFANT reçu du client est rattaché, dans la requête même, à
 * l'établissement vérifié.
 *
 * ## Pourquoi ce test
 *
 * Vérification ASVS 5.0.0 du 2026-10-13 (V8.2.2, V8.4.1), mutations M8 et M9 :
 * la borne `etablissementId` retirée des `where` qui ciblent un salarié (4
 * sites), une prescription (5) ou un jeton d'accès (1). 174, 46 et 21 tests
 * restaient verts. `tenancy-ecritures` vérifie qu'un helper d'appartenance est
 * APPELÉ — `assertEtablissementOwnership(etablissementId)` l'est toujours —,
 * pas que l'identifiant enfant est rattaché à l'établissement vérifié. Après la
 * mutation, le compte A, propriétaire de son établissement, modifie le salarié
 * du compte B en passant son propre `etablissementId` et l'id d'en face.
 *
 * ## La règle
 *
 * Dans une fonction d'un module `"use server"` qui vérifie un identifiant par
 * un helper de `scope.ts` (`assertEtablissementOwnership(etablissementId)`,
 * `requireDuerp(duerpId)`…), tout littéral `where: { … id: X … }` dont `X`
 * vient du client — un autre paramètre, ou un champ de la saisie
 * (`parsed.data.…`, `d.…`) — porte aussi l'identifiant vérifié, la clé
 * `etablissementId`, ou une relation `etablissement:`.
 *
 * Un `id` lu sur une ligne déjà chargée (`existant.id`, `r.id`) n'est pas une
 * entrée : la ligne a été trouvée sous la borne.
 */

/** Rattachements faits autrement que dans le `where`, chacun avec son garde. */
const EXEMPTIONS = new Map<string, { garde: string; raison: string }>([
  [
    "lib/carnet-sanitaire/actions.ts:ajouterReleve:parsed.data.pointReleveId",
    {
      garde: "point.carnet.etablissementId !== etablissementId",
      raison:
        "Le point est lu par `findUnique`, puis son carnet est comparé à " +
        "l'établissement vérifié avant toute écriture ; absent et étranger " +
        "rendent la même erreur.",
    },
  ],
]);

const SRC = join(process.cwd(), "src");

type Site = { cle: string; enfant: string; where: string; rattache: boolean; corps: string };

/** Le littéral objet qui commence à `debut` (une accolade ouvrante). */
function objet(src: string, debut: number): string {
  let profondeur = 0;
  for (let i = debut; i < src.length; i++) {
    if (src[i] === "{") profondeur++;
    else if (src[i] === "}" && --profondeur === 0) return src.slice(debut, i + 1);
  }
  return src.slice(debut);
}

function sites(): Site[] {
  const helpers = helpersDAppartenance();
  const out: Site[] = [];
  for (const fichier of modulesServerAction()) {
    const fns = decoupe(readFileSync(fichier, "utf8"));
    for (const fn of fns.values()) {
      const signature = fn.corps.slice(0, fn.corps.indexOf(")"));
      const params = [...signature.matchAll(/(\w+)\s*:\s*string\b/g)].map((m) => m[1]);
      // Les identifiants que la fonction a fait vérifier par un helper.
      const bornes = helpers
        .flatMap((h) => [...fn.corps.matchAll(new RegExp(`\\b${h}\\((\\w+)`, "g"))])
        .map((m) => m[1])
        .filter((p) => params.includes(p));
      if (bornes.length === 0) continue;
      const rattache = new RegExp(
        `\\b(?:${bornes.join("|")}|etablissementId)\\b|\\betablissement\\s*:`,
      );
      for (const m of fn.corps.matchAll(/\bwhere\s*:\s*\{/g)) {
        const where = objet(fn.corps, m.index! + m[0].length - 1);
        const ids = [...where.matchAll(/\bid\s*:\s*([\w.]+)/g)].map((x) => x[1]);
        if (/[{,]\s*id\s*[,}]/.test(where) && params.includes("id")) ids.push("id");
        for (const enfant of new Set(ids)) {
          if (bornes.includes(enfant)) continue; // l'identifiant vérifié lui-même
          if (/^\w+\.id$/.test(enfant)) continue; // lu sur une ligne déjà bornée
          const duClient = params.includes(enfant) || /^(?:parsed\.data|d|data|input)\./.test(enfant);
          if (!duClient) continue;
          out.push({
            cle: `${fichier.slice(SRC.length + 1)}:${fn.nom}`,
            enfant,
            where: where.replace(/\s+/g, " "),
            rattache: rattache.test(where),
            corps: fn.corps,
          });
        }
      }
    }
  }
  return out;
}

describe("les identifiants enfants reçus du client", () => {
  it("sont rattachés à l'établissement vérifié dans le where même", () => {
    const tous = sites();

    // Bornes basses, par module visé par la vérification : une découpe qui
    // cesserait de voir ces sites rendrait le test vert et vide.
    const compte = (prefixe: string) => tous.filter((s) => s.cle.startsWith(prefixe)).length;
    expect(compte("lib/salaries/actions.ts"), "salariés").toBeGreaterThanOrEqual(4);
    expect(compte("lib/prescriptions/actions.ts"), "prescriptions").toBeGreaterThanOrEqual(5);
    expect(compte("lib/access-tokens/actions.ts"), "jetons d'accès").toBeGreaterThanOrEqual(1);
    expect(tous.length).toBeGreaterThanOrEqual(15);

    const nus = tous
      .filter((s) => !s.rattache && !EXEMPTIONS.has(`${s.cle}:${s.enfant}`))
      .map((s) => `${s.cle} — ${s.enfant} — ${s.where}`);
    expect(
      nus,
      "Ces requêtes ciblent un identifiant venu du client sans le rattacher à " +
        "l'établissement vérifié : `where: { id: x, etablissementId }`. Vérifier " +
        "l'établissement ne dit rien de l'enfant qu'on vous passe à côté.",
    ).toEqual([]);
  });

  it("chaque exemption désigne un site nu, et son garde est toujours là", () => {
    const parCle = new Map(sites().map((s) => [`${s.cle}:${s.enfant}`, s]));
    for (const [cle, { garde }] of EXEMPTIONS) {
      const s = parCle.get(cle);
      expect(s, `${cle} : exemption orpheline, la retirer`).toBeDefined();
      expect(s!.rattache, `${cle} : désormais rattaché, retirer l'exemption`).toBe(false);
      const normalise = (t: string) => t.replace(/\s+/g, "");
      expect(normalise(s!.corps), `${cle} : garde disparu`).toContain(normalise(garde));
    }
    expect(EXEMPTIONS.size, "la liste ne fait que rétrécir").toBeLessThanOrEqual(1);
  });
});
