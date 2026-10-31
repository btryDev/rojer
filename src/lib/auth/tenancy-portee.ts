// Ce que les gardes de portée en LECTURE ajoutent à `tenancy-sonde.ts`
// (vérification ASVS du 2026-10-13, V8.4.1), et, depuis le 2026-10-30, la
// règle « borné par construction » que les trois balayages partagent (en fin
// de fichier).
//
// `tenancy-sonde.ts` reste la sonde : son découpage (`fonctions`) et son
// critère d'appartenance (`etablitLAppartenance`) sont repris tels quels. Ce
// module n'y ajoute que trois choses, chacune née d'un trou mesuré :
//
//  1. `normaliser` (déplacé dans la sonde le 2026-10-30, qui s'en sert pour
//     `fonctionsAtteintes`) — `fonctions` ne voit ni `export const x = cache(async
//     function x(`, ni `export function f<T>(`. Trois lectures exportées de
//     `*/queries.ts` lui échappaient (`getDashboardData`,
//     `composerRegistreDeLEtablissement`, `grouperChargeParBatiment` — retirée
//     le 2026-10-25 avec la plaque des zones du hero). On
//     réécrit ces formes en déclarations ordinaires avant de découper.
//  2. `PORTEE_RELATIONNELLE` — le prédicat `entreprise: { userId …` posé hors
//     d'un littéral `where: {` (une variable `scope`, un argument de
//     `toutesLesConditions(…)`). C'est aussi la forme que prennent les
//     lectures bornées au compte d'une autre branche (`appareilDuCompte`,
//     `permisDuCompte` : `where: { id, etablissement: { entreprise: { userId
//     } } }`) : elle doit compter comme une portée établie.
//  3. `etablitSaPorteeLocale` — la même récursion que `etablitSaPortee`, mais
//     sur un découpage déjà normalisé, que `etablitSaPortee` (qui relit le
//     fichier) ne verrait pas.
//
// `requireUser` seul NE COMPTE PAS : il prouve l'authentification, pas
// l'appartenance. C'est ce qui laissait passer M2 (`getEtablissement` sans
// son prédicat `userId`, le corps gardant son `requireUser()`).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import {
  etablitLAppartenance,
  fonctions,
  fonctionsAtteintes,
  normaliser,
  sansCommentairesNiChaines,
  type Fonction,
} from "./tenancy-sonde";

/** Les fonctions de premier niveau, formes normalisées comprises. */
export function decoupe(source: string): Map<string, Fonction> {
  return new Map(fonctions(normaliser(source)).map((f) => [f.nom, f]));
}

/**
 * Les noms exportés comme valeurs, relevés le plus largement possible — pour
 * la contre-épreuve : tout ce qui est ici doit être vu par `decoupe`, ou n'être
 * pas une fonction.
 */
export function exportsDeValeur(source: string): string[] {
  return [
    ...source.matchAll(/^export (?:async )?(?:function\*? |const |let )(\w+)/gm),
  ].map((m) => m[1]);
}

/** Le prédicat propriétaire posé hors d'un littéral `where: {`. */
export const PORTEE_RELATIONNELLE = /\bentreprise\s*:\s*\{\s*userId\b/;

/** Le corps porte, à lui seul, une portée au propriétaire. */
export function portePortee(corps: string): boolean {
  return etablitLAppartenance(corps) || PORTEE_RELATIONNELLE.test(corps);
}

/** Une lecture Prisma, quel que soit le nom du client, ou une requête brute. */
export const LECTURE =
  /\b\w+\.\w+\.(?:findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy)\(|\.\$queryRaw(?:Unsafe)?\b/;

/** `nom` est référencé comme valeur dans `corps` (pas dans un `typeof`). */
function reference(nom: string, corps: string): boolean {
  return new RegExp(`(?<![\\w$.])(?<!typeof )${nom}\\b`).test(corps);
}

/** `nom` lit en base, lui-même ou par une fonction du même fichier. */
export function litDansLeFichier(
  fns: Map<string, Fonction>,
  nom: string,
  vus = new Set<string>(),
): boolean {
  if (vus.has(nom)) return false;
  vus.add(nom);
  const fn = fns.get(nom);
  if (!fn) return false;
  if (LECTURE.test(fn.corps)) return true;
  for (const autre of fns.keys()) {
    if (autre !== nom && reference(autre, fn.corps) && litDansLeFichier(fns, autre, vus)) {
      return true;
    }
  }
  return false;
}

/** `nom` établit sa portée, lui-même ou par une fonction du même fichier qu'il appelle. */
export function etablitSaPorteeLocale(
  fns: Map<string, Fonction>,
  nom: string,
  vus = new Set<string>(),
): boolean {
  if (vus.has(nom)) return false;
  vus.add(nom);
  const fn = fns.get(nom);
  if (!fn) return false;
  if (portePortee(fn.corps)) return true;
  for (const autre of fns.keys()) {
    if (
      autre !== nom &&
      new RegExp(`(?<![\\w$.])${autre}\\(`).test(fn.corps) &&
      etablitSaPorteeLocale(fns, autre, vus)
    ) {
      return true;
    }
  }
  return false;
}

// ─── Borné par construction (lot 2b de l'isolation, ADR-051) ───────────────
//
// Un module qui n'importe pas le client Prisma brut ne peut lire ou écrire que
// par le client borné : `portee/imports.test.ts` interdit toute nouvelle porte
// vers `@/lib/prisma`, `@/lib/mcp/prisma` (~~`@/lib/mcp/db`~~ [2026-10-31 :
// il ne rend plus que le client borné]) et la valeur
// `PrismaClient` hors des modules nommés et de la liste À MIGRER. Le client
// borné ajoute la borne au compte à chaque opération : le prédicat écrit à la
// main (`etablissement: { entreprise: { userId } }`) y fait une seconde
// jointure, sans rien borner de plus.
//
// LA RÈGLE « PAR FICHIER » NE SUFFIT PAS, pour deux raisons, et la fonction
// ci-dessous ferme les deux :
//
//  1. Un client REÇU EN PARAMÈTRE (`db: Db`, `tx`) vient de l'appelant. `Db`
//     est typé `PrismaClient` (`compte.ts`) : le client brut s'y passe sans
//     erreur de type, et le dépôt le fait — `lireX(prisma)` délègue à
//     `lireXDuCompte(prisma, …)` dans les modules encore À MIGRER. Une telle
//     fonction n'est bornée par construction que si aucun module qui détient
//     le client brut ne peut la joindre (`exposeeAuClientBrut`).
//  2. Une fonction d'un module migré peut appeler une fonction d'un module qui
//     ne l'est pas : celle-ci lit par SON client, le brut. On suit donc tout ce
//     que la fonction atteint (`fonctionsAtteintes`), et chaque opération
//     atteinte doit être bornée.
//
// Le SQL brut (`$queryRaw`, `$executeRaw`) n'est pas borné par l'extension :
// il ne l'est jamais par construction (sa garde : `requireProprietaireSql`).

const RACINE_SRC = () => join(process.cwd(), "src");

/** Les trois portes du client brut — les mêmes que `portee/imports.test.ts`. */
const PORTES_BRUTES = ["src/lib/prisma", "src/lib/mcp/prisma"];
/**
 * Le seul module qui détient le client brut pour n'en rendre que des clients
 * bornés : la fabrique (`clientBorne`). Toute fonction qui appelle
 * `requireCompte()` l'atteint ; la compter comme un détenteur du brut
 * reviendrait à refuser la règle à tout le monde.
 */
const FABRIQUE_DU_CLIENT_BORNE = "src/lib/auth/portee/client.ts";
const SPECIFIANT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'`]([^"'`$]+)["'`]/g;
const PRISMA_CLIENT_VALEUR =
  /import\s+(?!type\b)[^;]*\bPrismaClient\b[^;]*from\s*["'](?:@prisma|\.prisma)\/client|new\s+PrismaClient\b/;

/** Le texte (chemin relatif au dépôt) obtient le client brut. */
export function importeLeClientBrut(cheminDepot: string, source: string): boolean {
  if (PRISMA_CLIENT_VALEUR.test(source)) return true;
  for (const [, spec] of source.matchAll(SPECIFIANT)) {
    const cible = (
      spec.startsWith("@/")
        ? posix.normalize("src/" + spec.slice(2))
        : spec.startsWith(".")
          ? posix.join(posix.dirname(cheminDepot), spec)
          : spec
    )
      .replace(/\.(?:[mc]?[jt]s|[jt]sx)$/, "")
      .replace(/\/index$/, "");
    if (PORTES_BRUTES.includes(cible)) return true;
  }
  return false;
}

type Index = {
  /** chemins absolus des fichiers qui détiennent le client brut */
  bruts: Set<string>;
  /** fichier absolu → ses fonctions */
  parFichier: Map<string, Fonction[]>;
  /** fonctions exposées au client brut, `fichier:nom` */
  exposees: Set<string>;
};
let indexEnCache: Index | undefined;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return sources(chemin);
    return /\.(?:ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

/** Les paramètres d'une fonction (le texte jusqu'à la première parenthèse fermante). */
function parametres(fn: Fonction): string[] {
  const ouvre = fn.corps.indexOf("(");
  const signature = fn.corps.slice(ouvre + 1, fn.corps.indexOf(")", ouvre));
  return [...signature.matchAll(/(?<![\w$.:<|&])\b([a-zA-Z_$][\w$]*)\s*\??\s*(?=[:,=}]|$)/g)].map(
    (m) => m[1],
  );
}

const OPERATION =
  "(?:findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy|create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)";
// Un client reçu DANS un objet compte aussi (`ctx.db.action.findMany(`,
// `f(ctx.db)`) : `Db` est typé `PrismaClient`, rien n'empêche d'y glisser le
// client brut. Un cran de membre au plus — élargir n'expose que de trop.
const MEMBRE = "(?:\\s*\\.\\s*[a-zA-Z_$][\\w$]*)?";
const sert = (p: string) =>
  new RegExp(
    `(?<![\\w$.])${p}${MEMBRE}\\s*\\.\\s*(?:\\$\\w+|\\w+\\s*\\.\\s*${OPERATION}\\s*\\()`,
  );
const passe = (p: string) => new RegExp(`[(,]\\s*${p}${MEMBRE}\\s*[,)]`);

function construireIndex(): Index {
  const racine = RACINE_SRC();
  const depot = dirname(racine);
  const bruts = new Set<string>();
  const parFichier = new Map<string, Fonction[]>();
  const textes = new Map<string, string>();
  for (const f of sources(racine)) {
    const source = readFileSync(f, "utf8");
    const chemin = relative(depot, f);
    if (chemin !== FABRIQUE_DU_CLIENT_BORNE && importeLeClientBrut(chemin, source)) bruts.add(f);
    textes.set(f, sansCommentairesNiChaines(source));
    // Découpé après `normaliser`, comme `fonctionsAtteintes` : sans lui,
    // `cache(async function x(db, …))` échappe à l'index.
    parFichier.set(f, fonctions(normaliser(source)));
  }
  // Les fonctions qui REÇOIVENT leur client : un paramètre sert de client
  // (`p.modele.findMany(`, `p.$transaction`), ou est passé à une fonction qui
  // en reçoit un. Point fixe, par nom — une homonymie ne fait qu'exposer de
  // trop. Chaque fonction est lue une fois : ses paramètres qui servent de
  // client, et pour les autres, les fonctions auxquelles elle les passe.
  const recoivent = new Set<string>();
  const nomsRecevant = new Set<string>();
  const attente: { cle: string; nom: string; passeA: Set<string> }[] = [];
  for (const [f, fns] of parFichier) {
    for (const fn of fns) {
      const cle = `${f}:${fn.nom}`;
      const params = parametres(fn);
      if (params.some((p) => sert(p).test(fn.corps))) {
        recoivent.add(cle);
        nomsRecevant.add(fn.nom);
        continue;
      }
      const passes = params.map(passe);
      const passeA = new Set<string>();
      for (const m of fn.corps.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
        const args = appel(fn.corps, m.index! + m[0].length - 1);
        if (passes.some((r) => r.test(args))) passeA.add(m[1]);
      }
      if (passeA.size > 0) attente.push({ cle, nom: fn.nom, passeA });
    }
  }
  for (let change = true; change; ) {
    change = false;
    for (const { cle, nom, passeA } of attente) {
      if (recoivent.has(cle) || ![...passeA].some((n) => nomsRecevant.has(n))) continue;
      recoivent.add(cle);
      nomsRecevant.add(nom);
      change = true;
    }
  }
  // Exposée : elle reçoit son client, et son nom est cité par un module qui
  // détient le client brut, ou par une fonction déjà exposée. Point fixe.
  const exposees = new Set<string>();
  const cite = (nom: string, texte: string) => new RegExp(`(?<![\\w$.])${nom}\\b`).test(texte);
  for (let change = true; change; ) {
    change = false;
    const corpsExposes = [...exposees].map((cle) => {
      const i = cle.lastIndexOf(":");
      return parFichier.get(cle.slice(0, i))!.find((fn) => fn.nom === cle.slice(i + 1))!.corps;
    });
    for (const cle of recoivent) {
      if (exposees.has(cle)) continue;
      const nom = cle.slice(cle.lastIndexOf(":") + 1);
      if (
        [...bruts].some((b) => cite(nom, textes.get(b)!)) ||
        corpsExposes.some((c) => cite(nom, c))
      ) {
        exposees.add(cle);
        change = true;
      }
    }
  }
  return { bruts, parFichier, exposees };
}

/** Le texte de l'appel dont `ouvre` est la parenthèse ouvrante. */
function appel(corps: string, ouvre: number): string {
  let n = 0;
  for (let i = ouvre; i < corps.length; i++) {
    if (corps[i] === "(") n++;
    else if (corps[i] === ")" && --n === 0) return corps.slice(ouvre, i + 1);
  }
  return corps.slice(ouvre);
}

function index(): Index {
  indexEnCache ??= construireIndex();
  return indexEnCache;
}

/** Le fichier (chemin absolu) détient le client brut. */
export function detientLeClientBrut(fichier: string): boolean {
  return index().bruts.has(fichier);
}

/** La fonction reçoit son client en paramètre, et un module qui détient le brut peut le lui passer. */
export function exposeeAuClientBrut(fichier: string, nom: string): boolean {
  return index().exposees.has(`${fichier}:${nom}`);
}

/**
 * Les portes elles-mêmes ne disqualifient pas : on ne les atteint qu'en
 * passant par un module qui les importe — lui-même détenteur du brut, donc
 * relevé —, ou par la fabrique du client borné, qui n'en rend que des clients
 * bornés.
 */
function estUnePorte(fichier: string): boolean {
  const chemin = relative(dirname(RACINE_SRC()), fichier).replace(/\.ts$/, "");
  return PORTES_BRUTES.includes(chemin);
}

/** Le SQL brut, que l'extension ne voit pas. */
const SQL_BRUT = /\.\$(?:queryRaw|executeRaw)(?:Unsafe)?\b/;

/**
 * `fichier:nom` ne lit (ou n'écrit, selon `operation`) que par le client borné :
 * au moins une opération atteinte, et chacune vit dans un module qui ne détient
 * pas le client brut, hors SQL brut, dans une fonction que le client brut ne
 * peut pas joindre par paramètre.
 *
 * Plus stricte qu'il ne faut sur un point, délibérément : une fonction exposée
 * (appelée ailleurs avec le brut) ne compte pas, même quand CE chemin lui passe
 * le client borné. La fonction qui l'appelle garde alors son prédicat.
 */
export function borneeParConstruction(fichier: string, nom: string, operation: RegExp): boolean {
  const { fonctions: atteintes, modules } = fonctionsAtteintes(fichier, nom);
  const ops = atteintes.filter(({ fn }) => operation.test(fn.corps));
  return (
    ops.length > 0 &&
    [...modules].every((m) => !detientLeClientBrut(m) || estUnePorte(m)) &&
    ops.every(
      ({ fichier: f, fn }) =>
        !detientLeClientBrut(f) && !SQL_BRUT.test(fn.corps) && !exposeeAuClientBrut(f, fn.nom),
    )
  );
}

/** Pour la contre-épreuve : toutes les fonctions exposées, `chemin/relatif:nom`. */
export function fonctionsExposees(): string[] {
  const racine = RACINE_SRC();
  return [...index().exposees].map((cle) => cle.slice(racine.length + 1)).sort();
}
