// Ce que les deux balayages de portée (`tenancy-lectures.test.ts`,
// `tenancy-ecritures.test.ts`) partagent : la lecture du source et la liste
// des marqueurs. Un seul exemplaire, parce que le mode d'échec de ces gardes
// — un commentaire qui couvre du code nu — est le même pour les deux, et une
// correction faite d'un côté ne doit pas manquer de l'autre.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Retire commentaires et chaînes avant de chercher les marqueurs.
 *
 * ⚠ SANS ÇA, LA GARDE EST DÉCORATIVE, et ça a été vérifié en la cassant : la
 * première rédaction cherchait les marqueurs dans le source brut. En retirant
 * le prédicat d'appartenance de `listerEtatsPermanents` pour éprouver le test,
 * il est resté VERT — parce que le commentaire qui explique le prédicat
 * contient le mot « requireEtablissement ». Le code était nu, la prose le
 * couvrait.
 *
 * C'est le mode d'échec propre aux gardes qui lisent du source, et il est
 * d'autant plus vicieux ici que ce sont les modules les mieux commentés — donc
 * ceux qui expliquent leur portée — qui se seraient exemptés tout seuls.
 */
export function sansCommentairesNiChaines(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, " ")
    .replace(/'(?:[^'\\]|\\.)*'/g, " ");
}

/**
 * Ce qui, dans le corps d'une fonction, établit la portée au user.
 *
 * LES HELPERS DE PORTÉE SE DÉRIVENT, ILS NE SE RECOPIENT PAS.
 * `assertEtablissementOwnership` figurait à la main dans la première liste, et
 * sa jumelle `assertEntrepriseOwnership` — même corps — n'y figurait pas. Une
 * lecture parfaitement scopée a donc été dénoncée le 2026-09-04, et le remède
 * évident aurait été d'ajouter le second nom : c'est-à-dire de réparer la
 * liste en recopiant, ce que ce dépôt s'interdit — une liste qu'on répare
 * ainsi cesse de vérifier.
 *
 * Ils se relèvent donc dans `scope.ts`, qui est l'endroit où ils vivent :
 * tout export nommé `require…` ou `assert…`. Le suivant s'ajoutera de lui-même.
 * S'y ajoutent `requireUser` (qui vit dans `require-user.ts`), le constructeur
 * de prédicat `portee(` et le champ `userId` lui-même, porté dans un `where`.
 */
export function marqueursDePortee(): string[] {
  return [...helpersDAppartenance(), "requireUser", "portee(", "userId"];
}

/** Les exports `require…` / `assert…` de `scope.ts` : tous bornent au propriétaire. */
export function helpersDAppartenance(): string[] {
  helpersEnCache ??= relever();
  return helpersEnCache;
}
let helpersEnCache: string[] | undefined;

function relever(): string[] {
  const source = readFileSync(
    join(process.cwd(), "src/lib/auth/scope.ts"),
    "utf8",
  );
  const helpers = [
    ...source.matchAll(
      /export (?:async function|const) ((?:require|assert)\w+)\b/g,
    ),
  ].map((m) => m[1]);
  if (helpers.length === 0) {
    throw new Error(
      "Aucun helper de portée relevé dans auth/scope.ts. Soit ils ont été " +
        "renommés, soit ce relevé est cassé — dans les deux cas la garde ne " +
        "garde plus, et il faut regarder plutôt que la contourner.",
    );
  }
  return helpers;
}

// ─── Écritures ──────────────────────────────────────────────────────────────
//
// Ce qui suit ne sert qu'à `tenancy-ecritures.test.ts`. Les lectures gardent
// leurs marqueurs larges (`marqueursDePortee`) : elles ont été jugées saines
// avec eux, et un marqueur faible y coûte une fuite qui se voit.

/**
 * Ce qui, dans le corps d'une fonction qui ÉCRIT, établit que la donnée
 * appartient au demandeur. Plus étroit que `marqueursDePortee`, et pour deux
 * raisons éprouvées par mutation (relecture du 2026-09-19) :
 *
 *  - `requireUser` prouve l'AUTHENTIFICATION, pas l'appartenance.
 *    `await requireUser(); await prisma.salarie.delete({ where: { id } })`
 *    passait — c'est mot pour mot la forme de `supprimerActionPlan`, le défaut
 *    que ce balayage cite en motif.
 *  - `userId` reconnu comme sous-chaîne passait partout, y compris dans un
 *    `data: { userId: null }` : `poserSignatureAvecToken` ne passait que par
 *    là, une exemption de fait que personne n'avait décidée.
 *
 * Restent donc : l'APPEL (pas la mention) d'un helper `require…`/`assert…` de
 * `scope.ts`, l'appel de `portee(`, ou un `where` qui porte `userId` — y
 * compris imbriqué, `where: { etablissement: { entreprise: { userId …`.
 * `etablissementId` n'y figure pas en tant que tel : il ne borne que s'il sort
 * d'un établissement déjà vérifié, c'est-à-dire d'un des helpers ci-dessus.
 */
export function etablitLAppartenance(corps: string): boolean {
  return (
    helpersDAppartenance().some((h) => new RegExp(`\\b${h}\\(`).test(corps)) ||
    /\bportee\(/.test(corps) ||
    /\bwhere\s*:\s*\{[^}]*\buserId\b/.test(corps)
  );
}

/**
 * Une écriture Prisma, quel que soit le nom du client : `prisma.`, `tx.`,
 * `db.` — la version précédente ne reconnaissait que `prisma.`, et toute
 * écriture en transaction lui échappait. Plus les requêtes brutes d'écriture.
 *
 * NE VOIT PAS : un `$queryRaw` qui porterait un `UPDATE` (le dépôt n'en a que
 * pour `SELECT … FOR UPDATE`), ni un client Prisma rangé plus profond qu'un
 * identifiant (`this.db.x.update`).
 */
export const ECRITURE =
  /\b\w+\.\w+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\.\$executeRaw(?:Unsafe)?\b/;

export type Fonction = { nom: string; exportee: boolean; corps: string };

/**
 * Toutes les fonctions de premier niveau du fichier, exportées ou non, corps
 * commentaires et chaînes exclus. Découpées sur TOUTE déclaration : un helper
 * privé placé après une fonction exportée n'est pas absorbé dans son corps.
 *
 * `export default function` compris : c'est la forme des pages, que
 * `lecturesAvantAppartenance` balaie aussi. Et, depuis la revue du 2026-10-13 :
 * `const f: Type = async (…) =>` (V4b), `const f = async function (…)` (V4c),
 * les génériques `function f<T>(` et `const f = async <T,>(` (V11).
 *
 * NE VOIT PAS : les méthodes d'objet ou de classe, une déclaration étalée
 * sur plusieurs lignes avant sa parenthèse, `const f = g(async () => …)`. Le corps de la dernière fonction
 * s'étend jusqu'à la fin du fichier.
 */
export function fonctions(source: string): Fonction[] {
  const src = sansCommentairesNiChaines(source);
  const decl = [
    ...src.matchAll(
      /^(export (?:default )?)?(?:async )?function\s*(\w+)\s*(?:<[^>\n]*>)?\s*\(|^(export )?const (\w+)(?:\s*:[^\n]*?)?\s*=\s*(?:async\s+)?(?:function\b[^(\n]*\(|(?:<[^>\n]*>\s*)?\()/gm,
    ),
  ];
  return decl.map((m, i) => ({
    nom: m[2] ?? m[4],
    exportee: Boolean(m[1] ?? m[3]),
    corps: src.slice(m.index, decl[i + 1]?.index ?? src.length),
  }));
}

const SRC = () => join(process.cwd(), "src");

type Module = {
  fonctions: Map<string, Fonction>;
  /** nom local → (fichier source, nom exporté là-bas) */
  imports: Map<string, { fichier: string; nom: string }>;
  /** `export { a as b } from` : b → (fichier, a) */
  reexports: Map<string, { fichier: string; nom: string }>;
  /** `export * from` */
  reexportsEtoile: string[];
};

const modules = new Map<string, Module | null>();

function resoudre(depuis: string, specifiant: string): string | null {
  let base: string;
  if (specifiant.startsWith("@/")) base = join(SRC(), specifiant.slice(2));
  else if (specifiant.startsWith(".")) base = join(dirname(depuis), specifiant);
  else return null; // paquet externe : hors du dépôt
  for (const c of [`${base}.ts`, join(base, "index.ts"), base]) {
    if (c.endsWith(".ts") && existsSync(c)) return c;
  }
  return null;
}

function specifiants(liste: string): { local: string; distant: string }[] {
  return liste
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("type "))
    .map((s) => {
      const [distant, local] = s.split(/\s+as\s+/);
      return { distant, local: local ?? distant };
    });
}

function module(fichier: string): Module | null {
  if (modules.has(fichier)) return modules.get(fichier)!;
  if (!existsSync(fichier)) {
    modules.set(fichier, null);
    return null;
  }
  const brut = readFileSync(fichier, "utf8");
  // Les spécifiants d'import sont des chaînes : on ne retire que les
  // commentaires pour les lire.
  const sansCommentaires = brut
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/[^\n]*/gm, " ");
  const imports = new Map<string, { fichier: string; nom: string }>();
  for (const m of sansCommentaires.matchAll(
    /^import\s+(?:type\s+)?(?:\w+\s*,\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm,
  )) {
    if (/^import\s+type\b/.test(m[0])) continue;
    const cible = resoudre(fichier, m[2]);
    if (!cible) continue;
    for (const { local, distant } of specifiants(m[1])) {
      imports.set(local, { fichier: cible, nom: distant });
    }
  }
  const reexports = new Map<string, { fichier: string; nom: string }>();
  for (const m of sansCommentaires.matchAll(
    /^export\s+\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm,
  )) {
    const cible = resoudre(fichier, m[2]);
    if (!cible) continue;
    for (const { local, distant } of specifiants(m[1])) {
      reexports.set(local, { fichier: cible, nom: distant });
    }
  }
  const reexportsEtoile = [
    ...sansCommentaires.matchAll(/^export\s+\*\s+from\s*["']([^"']+)["']/gm),
  ]
    .map((m) => resoudre(fichier, m[1]))
    .filter((f): f is string => f !== null);
  const mod: Module = {
    fonctions: new Map(fonctions(brut).map((f) => [f.nom, f])),
    imports,
    reexports,
    reexportsEtoile,
  };
  modules.set(fichier, mod);
  return mod;
}

/** Où vit vraiment `nom` exporté par `fichier`, en suivant les ré-exports. */
function localiser(
  fichier: string,
  nom: string,
  vus = new Set<string>(),
): { fichier: string; fn: Fonction } | null {
  const cle = `${fichier}:${nom}`;
  if (vus.has(cle)) return null;
  vus.add(cle);
  const mod = module(fichier);
  if (!mod) return null;
  const fn = mod.fonctions.get(nom);
  if (fn) return { fichier, fn };
  const re = mod.reexports.get(nom);
  if (re) return localiser(re.fichier, re.nom, vus);
  for (const etoile of mod.reexportsEtoile) {
    const trouve = localiser(etoile, nom, vus);
    if (trouve) return trouve;
  }
  return null;
}

const relatif = (f: string) => f.slice(SRC().length + 1);
const reference = (nom: string, corps: string) =>
  new RegExp(`(?<![\\w$.])${nom}\\b`).test(corps);

/**
 * Le chemin par lequel `fichier:nom` écrit en base, ou `null`.
 *
 * L'écriture se propage à travers les fonctions du MÊME fichier et à travers
 * les IMPORTS NOMMÉS de modules du dépôt (`@/…` ou relatifs), ré-exports
 * compris — `supprimerRapport` écrit aussi par `recalculerLigne`,
 * `regenererSansInvalider` par `regenererUnePasse`. Une fonction compte dès
 * qu'elle est RÉFÉRENCÉE, pas seulement appelée : passée en rappel
 * (`.map(helper)`), elle écrit tout autant.
 *
 * NE VOIT PAS : un import par défaut ou par espace de noms (`import * as x`),
 * un `import()` dynamique, une méthode d'objet ou de classe, une écriture
 * atteinte par une fonction reçue en paramètre.
 */
export function cheminDEcriture(
  fichier: string,
  nom: string,
  vus = new Set<string>(),
): string[] | null {
  const lieu = localiser(fichier, nom);
  if (!lieu) return null;
  const cle = `${relatif(lieu.fichier)}:${lieu.fn.nom}`;
  if (vus.has(cle)) return null;
  vus.add(cle);
  const { corps } = lieu.fn;
  if (ECRITURE.test(corps)) return [cle];
  const mod = module(lieu.fichier)!;
  for (const [autre] of mod.fonctions) {
    if (autre === lieu.fn.nom || !reference(autre, corps)) continue;
    const suite = cheminDEcriture(lieu.fichier, autre, vus);
    if (suite) return [cle, ...suite];
  }
  for (const [local, cible] of mod.imports) {
    if (!reference(local, corps)) continue;
    const suite = cheminDEcriture(cible.fichier, cible.nom, vus);
    if (suite) return [cle, ...suite];
  }
  return null;
}

/**
 * `fichier:nom` établit l'appartenance — dans son corps ou dans une fonction du
 * MÊME fichier qu'il appelle. Un helper importé ne compte que s'il vient de
 * `scope.ts` (c'est `etablitLAppartenance` qui le reconnaît) : qu'une autre
 * server action se borne elle-même ne dit rien de l'identifiant que CELLE-CI
 * écrit.
 */
export function etablitSaPortee(
  fichier: string,
  nom: string,
  vus = new Set<string>(),
): boolean {
  if (vus.has(nom)) return false;
  vus.add(nom);
  const mod = module(fichier);
  const fn = mod?.fonctions.get(nom);
  if (!mod || !fn) return false;
  if (etablitLAppartenance(fn.corps)) return true;
  for (const [autre] of mod.fonctions) {
    if (autre === nom) continue;
    if (new RegExp(`\\b${autre}\\(`).test(fn.corps) && etablitSaPortee(fichier, autre, vus)) {
      return true;
    }
  }
  return false;
}

/** Un module est une server action si la directive est sa première instruction. */
export function estServerAction(source: string): boolean {
  // Seuls des commentaires peuvent la précéder : c'est la règle de Next, et
  // c'est ce qui distingue une directive d'une mention.
  return /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(
    source,
  );
}

export function modulesServerAction(): string[] {
  const fichiers = execSync(`find "${SRC()}" -name "*.ts" -not -name "*.test.ts"`)
    .toString()
    .trim()
    .split("\n");
  return fichiers.filter((f) => estServerAction(readFileSync(f, "utf8")));
}

export type EcritureExposee = {
  /** `lib/x/actions.ts:nom` */
  cle: string;
  /** Du corps de l'action à l'écriture : un seul maillon si elle écrit elle-même. */
  chemin: string[];
  scopee: boolean;
};

/** Toute fonction exportée d'un module `"use server"` qui écrit, directement ou non. */
export function ecrituresExposees(): EcritureExposee[] {
  const out: EcritureExposee[] = [];
  for (const fichier of modulesServerAction()) {
    const mod = module(fichier)!;
    for (const fn of mod.fonctions.values()) {
      if (!fn.exportee) continue;
      const chemin = cheminDEcriture(fichier, fn.nom);
      if (!chemin) continue;
      out.push({
        cle: `${relatif(fichier)}:${fn.nom}`,
        chemin,
        scopee: etablitSaPortee(fichier, fn.nom),
      });
    }
  }
  return out;
}

// ─── Lecture par identifiant avant le contrôle d'appartenance ───────────────
//
// Ce qui suit ne sert qu'à `tenancy-oracle.test.ts`.

/** `[a, b)` : le texte entre la parenthèse ouvrante `ouvre` et sa fermante. */
function equilibre(src: string, ouvre: number, o: string, f: string): string {
  let n = 0;
  for (let i = ouvre; i < src.length; i++) {
    if (src[i] === o) n++;
    else if (src[i] === f && --n === 0) return src.slice(ouvre, i + 1);
  }
  return src.slice(ouvre);
}

/**
 * Le `where` d'un appel Prisma dont `ouvre` est la parenthèse ouvrante, ou
 * `null` s'il n'est pas un littéral d'objet (`where: scope`, `{ where }`) —
 * auquel cas il n'est pas jugé.
 */
function whereLitteral(corps: string, ouvre: number): string | null {
  const args = equilibre(corps, ouvre, "(", ")");
  // La clé `where` DE PREMIER NIVEAU de l'objet d'arguments — profondeur 2 :
  // la parenthèse, puis l'accolade. Le premier `where:` venu pouvait être
  // celui d'un `include: { rel: { where: { userId } } }` placé avant : la
  // sonde y lisait un contrôle qui ne bornait pas la ligne lue (revue du
  // 2026-10-13, V10).
  let profondeur = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (c === "(" || c === "{" || c === "[") profondeur++;
    else if (c === ")" || c === "}" || c === "]") profondeur--;
    else if (profondeur === 2) {
      const m = /^\bwhere\s*:\s*\{/.exec(args.slice(i));
      if (m && !/[\w$]/.test(args[i - 1] ?? "")) {
        return equilibre(args, i + m[0].length - 1, "{", "}");
      }
    }
  }
  return null;
}

/**
 * Une lecture qui répond sur UNE ligne désignée : `findUnique`, `findFirst`
 * — et `count`, qui dit 0 ou 1 aussi bien (revue du 2026-10-13, V9).
 */
const LECTURE_UNITAIRE = /\b\w+\.(\w+)\.(findUnique|findFirst|count)(?:OrThrow)?\(/g;

type Evenement = { pos: number; quoi: "lecture_nue" | "appartenance"; libelle: string };

/**
 * Les événements d'une fonction, dans l'ordre du source :
 *
 *  - `lecture_nue` : un `findUnique`/`findFirst` dont le `where` littéral ne
 *    porte pas `userId` — ou l'appel d'une fonction du MÊME fichier qui en fait
 *    une avant tout contrôle (`resoudreAppareil` lisait pour ses appelants) ;
 *  - `appartenance` : une lecture dont le `where` porte `userId`, l'appel d'un
 *    helper `require…`/`assert…` de `scope.ts`, de `portee(`, ou d'une
 *    fonction du même fichier qui commence par l'un d'eux (`permisDuCompte`).
 */
function evenements(
  mod: Map<string, Fonction>,
  fn: Fonction,
  vus: Set<string>,
): Evenement[] {
  const out: Evenement[] = [];
  for (const m of fn.corps.matchAll(LECTURE_UNITAIRE)) {
    const where = whereLitteral(fn.corps, m.index + m[0].length - 1);
    // Un `where` qui étale une variable (`{ ...scope, dateFin }`) n'est pas
    // jugé, comme `where: scope` : la portée peut venir de la variable
    // (`getModulesMatrice`), et la sonde ne suit pas les variables.
    if (where === null || where.includes("...")) continue;
    out.push({
      pos: m.index,
      // Une lecture bornée au compte EST un contrôle : ce qu'elle ne trouve
      // pas est absent ou étranger, indistinctement.
      quoi: /\buserId\b/.test(where) ? "appartenance" : "lecture_nue",
      libelle: `${m[1]}.${m[2]}`,
    });
  }
  for (const h of [...helpersDAppartenance(), "portee"]) {
    for (const m of fn.corps.matchAll(new RegExp(`(?<![\\w$.])${h}\\(`, "g"))) {
      out.push({ pos: m.index, quoi: "appartenance", libelle: h });
    }
  }
  for (const autre of mod.values()) {
    if (autre.nom === fn.nom || vus.has(autre.nom)) continue;
    const appels = [...fn.corps.matchAll(new RegExp(`(?<![\\w$.])${autre.nom}\\(`, "g"))];
    if (appels.length === 0) continue;
    const siens = evenements(mod, autre, new Set([...vus, fn.nom]));
    const premier = siens.sort((a, b) => a.pos - b.pos)[0];
    if (!premier) continue;
    for (const a of appels) {
      out.push({
        pos: a.index,
        quoi: premier.quoi,
        libelle: `${autre.nom} → ${premier.libelle}`,
      });
    }
  }
  return out.sort((a, b) => a.pos - b.pos);
}

/**
 * La fonction lit une ligne SANS la borner au compte, PUIS contrôle
 * l'appartenance : le libellé de la première lecture nue, ou `null`.
 *
 * C'est la forme exacte de l'oracle d'existence (audit du 2026-10-13) : la
 * lecture par identifiant seul distingue « n'existe pas » (une réponse) de
 * « existe chez un autre client » (le 404 du contrôle qui suit). Une lecture
 * nue APRÈS le contrôle — la relecture sous verrou d'une ligne déjà bornée —
 * ne dit plus rien : elle n'est pas relevée.
 */
export function lectureAvantAppartenance(
  mod: Map<string, Fonction>,
  fn: Fonction,
): string | null {
  const ev = evenements(mod, fn, new Set());
  const controle = ev.findIndex((e) => e.quoi === "appartenance");
  if (controle <= 0) return null;
  const nue = ev.slice(0, controle).find((e) => e.quoi === "lecture_nue");
  return nue ? nue.libelle : null;
}

export type LectureAvantAppartenance = {
  /** `lib/x/actions.ts:nom` ou `app/api/…/route.ts:GET` */
  cle: string;
  lecture: string;
};

/**
 * Tout le code serveur de `src` (tests exclus) : server actions, route
 * handlers, pages, helpers. La règle ne se déclenche que si un contrôle
 * d'appartenance SUIT la lecture : l'univers peut donc être large sans crier
 * sur ce qui n'est pas du compte (la page publique d'un jeton ne contrôle
 * aucune appartenance, et n'est pas relevée).
 */
export function lecturesAvantAppartenance(): {
  examinees: number;
  fautives: LectureAvantAppartenance[];
} {
  const fichiers = execSync(
    `find "${SRC()}" \\( -name "*.ts" -o -name "*.tsx" \\) -not -name "*.test.ts" -not -name "*.test.tsx"`,
  )
    .toString()
    .trim()
    .split("\n");
  let examinees = 0;
  const fautives: LectureAvantAppartenance[] = [];
  for (const fichier of fichiers) {
    const source = readFileSync(fichier, "utf8");
    if (!/\.(findUnique|findFirst)/.test(source)) continue;
    const fns = fonctions(source);
    const mod = new Map(fns.map((f) => [f.nom, f]));
    for (const fn of fns) {
      if (LECTURE_UNITAIRE.test(fn.corps)) examinees++;
      LECTURE_UNITAIRE.lastIndex = 0;
      const lecture = lectureAvantAppartenance(mod, fn);
      if (lecture) fautives.push({ cle: `${relatif(fichier)}:${fn.nom}`, lecture });
    }
  }
  return { examinees, fautives };
}
