import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { helpersDAppartenance, sansCommentairesNiChaines } from "./tenancy-sonde";
import { decoupe, etablitSaPorteeLocale, LECTURE } from "./tenancy-portee";

/**
 * Chaque méthode exportée d'un `route.ts` appelle un contrôle d'accès.
 *
 * ## Pourquoi ce test
 *
 * Vérification ASVS 5.0.0 du 2026-10-13 (V8.2.1, V8.4.1), mutation M5 :
 * `requireEtablissement` retiré de l'export RGPD d'un salarié
 * (`api/etablissements/[id]/equipe/[salarieId]/donnees`) — dont la lecture,
 * `exporterDonneesSalarie`, ne borne qu'à l'`etablissementId` de l'URL —, puis
 * du ZIP de contrôle. 21 fichiers / 230 tests, puis 8 / 40, restaient verts.
 * Aucune sonde ne lisait les route handlers : les balayages de portée ne
 * regardent que les `queries.ts` et les modules `"use server"`, et le
 * middleware ne décide d'aucun accès (il redirige, il n'autorise rien).
 *
 * ## La règle
 *
 * Le corps de la méthode — ou une fonction du même fichier qu'elle appelle —
 * appelle l'un des contrôles :
 *
 *  - un helper `require…`/`assert…` de `scope.ts` (relevé, pas recopié) ;
 *  - `requireUser`, suivi d'une lecture bornée par `userId` (le balayage des
 *    lectures ne voit pas les routes : le prédicat est exigé ici aussi) ;
 *  - `verifierAccessToken` (accès externe par jeton, ADR-007) ;
 *  - pour le MCP, `handler.servir` d'un gestionnaire construit par
 *    `creerHandlerMcpHttp` dont la portée sort de `resoudreScopeDepuisCle` ou
 *    `resoudreScopeDepuisJeton` (ADR-013).
 *
 * Un appel à une query scopée importée NE COMPTE PAS : la route se garde
 * elle-même, comme chaque action. `exporterDonneesSalarie` montre pourquoi —
 * elle a l'air d'une lecture bornée, elle ne l'est qu'à l'établissement que
 * l'URL lui donne.
 *
 * Deux exceptions, nommées dans `DELEGATIONS` : les PDF de DUERP, dont la
 * seule lecture du contenu passe par une fonction qui porte le prédicat
 * propriétaire et répond 404 sans lui. Le test vérifie que la route l'appelle
 * et que cette fonction établit toujours sa portée.
 *
 * Les routes publiques sont une liste FERMÉE, motivée, qui ne lit pas la base
 * elle-même.
 */

const METHODES = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const APP = join(process.cwd(), "src/app");

/** Routes servies sans contrôle d'accès, par conception. */
const PUBLIQUES = new Map<string, string>([
  [
    "api/duerp/import/template/route.ts:GET",
    "Gabarit XLSX vierge de l'import DUERP : du contenu statique, sans donnée.",
  ],
  [
    "api/accessibilite/[slug]/affiche/route.ts:GET",
    "Affiche QR du registre public d'accessibilité : ne lit que par " +
      "`getRegistrePublicParSlug` (registre publié, champs publiables).",
  ],
  [
    "auth/verification/route.ts:GET",
    "Lien de confirmation d'adresse (ADR-052) : Better Auth juge le jeton du " +
      "lien. Il n'y a pas de session à vérifier — le compte n'est pas encore " +
      "confirmé, et la route n'en ouvre aucune.",
  ],
]);

/**
 * Routes sans contrôle propre, dont la lecture du contenu passe par UNE
 * fonction scopée qui rend `null` (donc 404) à un autre compte. Liste fermée.
 */
const DELEGATIONS = new Map<string, { fonction: string; module: string; raison: string }>([
  [
    "duerp/[id]/pdf/preview/route.ts:GET",
    {
      fonction: "construireSnapshot",
      module: "src/lib/versions/snapshot-builder.ts",
      raison:
        "Le contenu du DUERP sort de `construireSnapshot`, borné au propriétaire ; " +
        "`null` → 404. `listerVersions` est scopée aussi.",
    },
  ],
  [
    "duerp/[id]/versions/[numero]/pdf/route.ts:GET",
    {
      fonction: "getVersion",
      module: "src/lib/versions/queries.ts",
      raison: "La version figée sort de `getVersion`, bornée au propriétaire ; `null` → 404.",
    },
  ],
]);

type Methode = { cle: string; corps: string; fichier: string; source: string };

function routes(): string[] {
  return execSync(`find "${APP}" -name route.ts`).toString().trim().split("\n").sort();
}

function methodes(): Methode[] {
  const out: Methode[] = [];
  for (const fichier of routes()) {
    const brut = readFileSync(fichier, "utf8");
    const fns = decoupe(brut);
    for (const fn of fns.values()) {
      if (!fn.exportee || !METHODES.includes(fn.nom)) continue;
      // Le corps de la méthode, plus les fonctions du même fichier qu'elle appelle.
      const appelees = [...fns.values()].filter(
        (f) => f.nom !== fn.nom && new RegExp(`(?<![\\w$.])${f.nom}\\(`).test(fn.corps),
      );
      out.push({
        cle: `${fichier.slice(APP.length + 1)}:${fn.nom}`,
        corps: [fn.corps, ...appelees.map((f) => f.corps)].join("\n"),
        fichier,
        source: sansCommentairesNiChaines(brut),
      });
    }
  }
  return out;
}

const appelle = (nom: string, corps: string) =>
  new RegExp(`(?<![\\w$.])${nom}\\(`).test(corps);

/** Le contrôle d'accès que la méthode appelle, ou `null`. */
function controle(m: Methode): string | null {
  for (const h of helpersDAppartenance()) if (appelle(h, m.corps)) return h;
  if (appelle("verifierAccessToken", m.corps)) return "verifierAccessToken";
  if (appelle("requireUser", m.corps) && /\buserId\b/.test(m.corps)) {
    return "requireUser + userId";
  }
  const delegation = DELEGATIONS.get(m.cle);
  if (delegation && appelle(delegation.fonction, m.corps)) {
    const fns = decoupe(readFileSync(join(process.cwd(), delegation.module), "utf8"));
    if (etablitSaPorteeLocale(fns, delegation.fonction)) return `délégation à ${delegation.fonction}`;
  }
  if (
    /\bhandler\.servir\(/.test(m.corps) &&
    appelle("creerHandlerMcpHttp", m.source) &&
    (appelle("resoudreScopeDepuisCle", m.source) ||
      appelle("resoudreScopeDepuisJeton", m.source))
  ) {
    return "MCP";
  }
  return null;
}

describe("les route handlers", () => {
  it("sont tous découpés : chaque méthode déclarée est vue", () => {
    let declarees = 0;
    for (const fichier of routes()) {
      const src = readFileSync(fichier, "utf8");
      declarees += [
        ...src.matchAll(
          new RegExp(`^export (?:async )?(?:function|const) (?:${METHODES.join("|")})\\b`, "gm"),
        ),
      ].length;
    }
    const vues = methodes();
    // Borne basse : 22 méthodes au 2026-10-13 (inventaire ASVS).
    expect(vues.length).toBeGreaterThanOrEqual(20);
    expect(vues.length, "méthodes déclarées mais non découpées").toBe(declarees);
  });

  it("appellent toutes un contrôle d'accès, sauf les routes publiques nommées", () => {
    const sansControle = methodes()
      .filter((m) => !PUBLIQUES.has(m.cle) && controle(m) === null)
      .map((m) => m.cle);
    expect(
      sansControle,
      "Ces méthodes ne vérifient ni la session et l'appartenance, ni un jeton. " +
        "Appelez `requireEtablissement(id)` (ou le helper de `scope.ts` qui " +
        "convient) en tête de la méthode. Une query scopée appelée plus bas ne " +
        "remplace pas ce contrôle.",
    ).toEqual([]);
  });

  it("les routes publiques existent, n'ont pas de contrôle superflu, et ne lisent pas la base elles-mêmes", () => {
    const parCle = new Map(methodes().map((m) => [m.cle, m]));
    const orphelines = [...PUBLIQUES.keys()].filter((k) => !parCle.has(k));
    expect(orphelines, "Routes publiques disparues : les retirer.").toEqual([]);

    const lisent = [...PUBLIQUES.keys()].filter((k) => LECTURE.test(parCle.get(k)!.corps));
    expect(lisent, "Une route publique lit la base directement.").toEqual([]);

    const superflues = [...PUBLIQUES.keys()].filter((k) => controle(parCle.get(k)!) !== null);
    expect(superflues, "Route désormais contrôlée : la retirer de la liste.").toEqual([]);
  });

  it("la liste des routes publiques et des délégations est fermée", () => {
    // Elles se relèvent à la main, et la raison s'écrit à côté.
    expect(PUBLIQUES.size).toBeLessThanOrEqual(5);
    expect(DELEGATIONS.size).toBeLessThanOrEqual(2);
    const connues = new Set(methodes().map((m) => m.cle));
    expect([...DELEGATIONS.keys()].filter((k) => !connues.has(k))).toEqual([]);
  });
});
