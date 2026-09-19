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
 * NE VOIT PAS : les méthodes d'objet ou de classe, `const f = function`, les
 * fonctions génériques `const f = async <T>(`. Le corps de la dernière fonction
 * s'étend jusqu'à la fin du fichier.
 */
export function fonctions(source: string): Fonction[] {
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
