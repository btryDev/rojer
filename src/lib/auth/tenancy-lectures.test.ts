import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marqueursDePortee, sansCommentairesNiChaines } from "./tenancy-sonde";

/**
 * Toute lecture d'une ligne rattachée à un établissement établit sa portée.
 *
 * ## Pourquoi ce test existe
 *
 * Huit lectures sans prédicat d'appartenance ont été corrigées la semaine du
 * 2026-08-25. La règle a été écrite dans le dépôt — `batiments/queries.ts` la
 * formule ainsi : « une lecture qui ne le porte pas devient une fuite le jour
 * où quelqu'un rend la fonction publique », et `batimentParDefaut` porte le
 * prédicat MALGRÉ un appelant déjà vérifié, avec la note « décrit l'usage, pas
 * une dispense ».
 *
 * Un neuvième cas a été écrit le 2026-08-31, dans le seul module qui ait ajouté
 * des appels Prisma ce jour-là. **Une convention écrite ne se fait pas
 * respecter par un lot pressé** : c'est le constat qui a fait écrire ce test,
 * plus que le défaut lui-même.
 *
 * ## Ce que le test vérifie, et pourquoi cette formulation
 *
 * Une première rédaction cherchait `userId` dans le `where` de chaque appel.
 * Elle rendait **treize faux positifs** : le dépôt porte la portée de plusieurs
 * façons légitimes, et exiger une seule forme aurait crié à tort — ce qui est
 * la façon la plus sûre de faire désactiver un garde-fou.
 *
 * Les trois formes recensées, toutes justes :
 *
 *  1. le prédicat dans le `where` — `etablissement: { entreprise: { userId } }` ;
 *  2. un helper de portée qui l'encapsule — `where: { etablissementId, etablissement }`
 *     où `etablissement` vient de `portee()` (`salaries/queries.ts`) ;
 *  3. la fonction établit elle-même l'appartenance et n'emploie ensuite que
 *     l'identifiant vérifié — `const { etablissement } = await requireEtablissement(id)`
 *     puis `where: { etablissementId: etablissement.id }` (`prestataires/queries.ts`).
 *
 * L'invariant retenu est donc plus faible et plus vrai : **une fonction qui lit
 * une ligne rattachée à un établissement doit établir sa portée d'une manière ou
 * d'une autre.** Il n'attrape pas tout — une fonction qui appellerait
 * `requireUser()` sans se servir du résultat le passerait — mais il attrape
 * exactement la forme des neuf défauts constatés : une lecture qui ne mentionne
 * la portée nulle part.
 *
 * ## L'exemption, et pourquoi elle est nommée une par une
 *
 * `getRegistrePublicParSlug` lit sans authentification, délibérément : le
 * registre d'accessibilité a une page publique, c'est sa raison d'être. Elle est
 * inscrite ci-dessous plutôt que détectée par une heuristique — une exemption
 * qui se devine est une exemption qu'on s'accorde sans y penser.
 */

const EXEMPTIONS = new Map<string, string>([
  [
    "accessibilite/queries.ts:getRegistrePublicParSlug",
    "Lecture publique par slug, sans auth : le registre d'accessibilité est " +
      "consultable par un tiers, c'est l'objet du module. Elle ne rend que des " +
      "champs publiables et `null` si le registre n'est pas publié.",
  ],
]);

const MARQUEURS_DE_PORTEE = marqueursDePortee();

const RACINE = join(process.cwd(), "src/lib");

function modulesQueries(): { chemin: string; source: string }[] {
  return readdirSync(RACINE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({
      chemin: `${d.name}/queries.ts`,
      complet: join(RACINE, d.name, "queries.ts"),
    }))
    .filter((f) => {
      try {
        readFileSync(f.complet);
        return true;
      } catch {
        return false;
      }
    })
    .map((f) => ({ chemin: f.chemin, source: readFileSync(f.complet, "utf8") }));
}

/** Les fonctions exportées qui lisent une ligne rattachée à un établissement. */
function lecturesDEtablissement(): { cle: string; corps: string }[] {
  const out: { cle: string; corps: string }[] = [];
  for (const { chemin, source } of modulesQueries()) {
    for (const m of source.matchAll(/export (?:async )?function (\w+)\(/g)) {
      const debut = m.index!;
      const suivante = source.indexOf("\nexport ", debut + 1);
      const corps = source.slice(
        debut,
        suivante > 0 ? suivante : source.length,
      );
      const lit =
        /prisma\.\w+\.(findMany|findFirst|findUnique|count|aggregate|groupBy)\(/.test(
          corps,
        );
      const surEtablissement =
        corps.includes("etablissementId") || corps.includes("etablissement:");
      if (lit && surEtablissement) {
        out.push({ cle: `${chemin}:${m[1]}`, corps: sansCommentairesNiChaines(corps) });
      }
    }
  }
  return out;
}

describe("les lectures rattachées à un établissement", () => {
  it("établissent toutes leur portée, ou sont exemptées nommément", () => {
    const lectures = lecturesDEtablissement();

    // Contre-épreuve d'abord : une expression régulière qui cesserait de
    // trouver les fonctions rendrait ce test vert et vide — le mode d'échec le
    // plus courant d'une garde qui lit du source.
    expect(
      lectures.length,
      "Aucune lecture d'établissement trouvée : la garde ne garde rien.",
    ).toBeGreaterThan(15);

    const nues = lectures
      .filter((l) => !MARQUEURS_DE_PORTEE.some((s) => l.corps.includes(s)))
      .filter((l) => !EXEMPTIONS.has(l.cle))
      .map((l) => l.cle);

    expect(
      nues,
      "Ces fonctions lisent des lignes rattachées à un établissement sans " +
        "établir leur portée. Portez le prédicat d'appartenance dans le " +
        "`where` — `etablissement: { entreprise: { userId } }` — ou établissez " +
        "l'appartenance dans la fonction. Un appelant déjà vérifié ne dispense " +
        "pas : il décrit l'usage d'aujourd'hui, pas celui de demain.",
    ).toEqual([]);
  });

  it("chaque exemption existe encore, et n'en couvre pas une autre", () => {
    // Une exemption qui survit à la fonction qu'elle nommait devient une porte
    // laissée ouverte pour personne — et, pire, une porte qu'un homonyme
    // franchirait sans qu'on s'en aperçoive.
    const connues = new Set(lecturesDEtablissement().map((l) => l.cle));
    const orphelines = [...EXEMPTIONS.keys()].filter((k) => !connues.has(k));
    expect(
      orphelines,
      "Ces exemptions ne désignent plus aucune fonction : les retirer.",
    ).toEqual([]);
  });
});
