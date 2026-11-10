// Qui peut toucher au client Prisma brut, qui voit tous les comptes (ADR-051 § 3).
// Ses portes (`@/lib/prisma`, `mcp/prisma`) ne s'importent que depuis les
// modules NOMMÉS, chacun avec son motif et ses seuls usages, ou ceux de la
// liste À MIGRER vers `requireCompte()` : un cliquet qui ne fait que
// raccourcir (vide depuis le lot 2b, voir `PORTES_BRUTES`). Les rouages du
// client borné ne s'importent que là où la portée s'établit, et la valeur
// `PrismaClient` que dans les deux modules qui fabriquent un client.
// Échappent : un chemin calculé, `globalThis.prisma`. Tests exclus (doublures).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sansCommentairesNiChaines } from "@/lib/auth/tenancy-sonde";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
// ~~`mcp/db`~~ n'est plus une porte depuis le 2026-10-31 : il ne rend que le
// client borné (lot 2b, MCP) ; la liste À MIGRER est vide depuis le même jour.
const PORTES_BRUTES = ["src/lib/prisma", "src/lib/mcp/prisma"];
const FABRIQUES = new Set(["src/lib/prisma.ts", "src/lib/mcp/prisma.ts"]);
/**
 * Les modules nommés, leur motif et les seuls usages du client brut qu'il
 * couvre : chaque `prisma.…` de leur code (commentaires et chaînes retirés)
 * doit en être un. Sans quoi le motif couvrirait le fichier entier, et une
 * lecture de modèle ajoutée demain passerait sans borne (revue du
 * 2026-10-31). La fabrique du client borné, seule, a droit au client entier —
 * et, sur cc, l'adaptateur de Better Auth.
 */
const NOMMES_PRISMA: Record<string, { motif: string; usages: string[] | "tous"; valeur?: string[] }> = {
  "src/lib/auth/portee/client.ts": {
    motif: "fabrique le client borné à partir du client brut",
    usages: "tous",
    valeur: ["etendre"],
  },
  // cc : l'adaptateur de Better Auth reçoit le client entier (prismaAdapter).
  "src/lib/auth/better-auth.ts": {
    motif:
      "adaptateur Better Auth (ADR-052) : User, Session, Account, AuthVerification, TwoFactor, hors compte, lus avant toute identité",
    usages: "tous",
    // `limitesMembresDuPlugin` (quotas.ts) : l'abonnement et les membres d'UN
    // compte, par son `compteId`, pour le plafond de l'invitation (ADR-053 § 14).
    valeur: ["prismaAdapter", "limitesMembresDuPlugin"],
  },
  "src/lib/calendrier/actions.ts": {
    motif: "écritures bornées par etablissementId, clés vérifiées contre une lecture bornée (clesDuPlanDansLaLecture)",
    usages: [
      "prisma.$transaction",
      "prisma.etablissement.update",
      "prisma.verification.createMany",
      "prisma.verification.deleteMany",
      "prisma.verification.updateMany",
    ],
    // Le script de maintenance (`regenererSansControleDeSession`) et le repère
    // effacé d'une passe qui n'a pas convergé (ADR-054 § 4).
    // `$transaction(operations)` : la forme séquentielle, `operations` est un
    // tableau de requêtes. Nommée plutôt que réécrite en `[...operations]` :
    // le code de ce module scelle le calendrier (`version-moteur.test.ts`), et
    // le toucher ferait recalculer tous les dossiers pour une forme.
    valeur: ["regenerer", "marquerCalendrierPerime", "$transaction(hors tableau)"],
  },
  "src/lib/abonnements/essai-entreprise.ts": {
    motif: "un essai par entreprise (ADR-053 § 8) : le SIREN déjà essayé, lu à travers les comptes (table hors compte `EssaiEntreprise`)",
    usages: ["prisma.essaiEntreprise.createMany", "prisma.essaiEntreprise.findUnique"],
  },
  "src/lib/abonnements/rappels.ts": {
    motif:
      "rappel de la veille de la fin de l'essai (ADR-053), joué par la tâche quotidienne hors session : les essais de tous les comptes, l'adresse de leurs propriétaires, et sa seule marque d'envoi",
    usages: ["prisma.abonnement.findMany", "prisma.abonnement.updateMany", "prisma.membre.findMany"],
  },
  "src/lib/abonnements/suppression.ts": {
    motif:
      "suppression d'un compte sans abonnement depuis douze mois (ADR-058), jouée par la tâche quotidienne hors session : les abonnements de tous les comptes, leurs avertissements, et l'effacement d'un compte entier dans une transaction",
    usages: [
      "prisma.$transaction",
      "prisma.abonnement.findMany",
      "prisma.abonnement.updateMany",
      "prisma.compteSupprime.deleteMany",
      "prisma.duerpVersion.count",
      "prisma.fichierALiberer.count",
      "prisma.fichierALiberer.deleteMany",
      "prisma.fichierALiberer.findMany",
      "prisma.fichierALiberer.update",
      "prisma.membre.findMany",
    ],
    // L'effacement d'un compte : une transaction interactive (le verrou, la
    // condition relue, puis l'ordre des suppressions).
    valeur: ["$transaction(hors tableau)"],
  },
  "src/lib/securite/limite-debit.ts": {
    motif: "compteurs techniques, hors de tout compte",
    usages: ["prisma.$executeRaw", "prisma.$queryRaw"],
  },
  "src/lib/auth/membres.ts": {
    motif:
      "appartenance d'une personne à un compte (ADR-054 § 3) : relue avant de construire la portée, que le client borné ne connaît pas encore",
    usages: [
      "prisma.compte.delete",
      "prisma.invitationCompte.findFirst",
      "prisma.invitationCompte.findMany",
      "prisma.invitationCompte.updateMany",
      "prisma.membre.findMany",
    ],
  },
  "src/lib/auth/compte-hors-session.ts": {
    motif: "accès sans session : le compte propriétaire de l'établissement d'une preuve vérifiée (jeton, signature publique, clé MCP)",
    usages: ["prisma.etablissement.findUnique"],
  },
  "src/lib/signatures/verification-publique.ts": {
    motif: "vérification publique d'une signature et confirmation /signe, sans session",
    usages: ["prisma.signature.findUnique"],
  },
  "src/lib/access-tokens/verify.ts": {
    motif: "recherche d'un jeton par son empreinte, quotas d'OTP",
    usages: [
      "prisma.accessToken.findMany",
      "prisma.accessToken.findUnique",
      "prisma.accessToken.updateMany",
      "prisma.quotaEnvoiOtp.createMany",
      "prisma.quotaEnvoiOtp.findUnique",
      "prisma.quotaEnvoiOtp.updateMany",
    ],
  },
  "src/lib/accessibilite/actions.ts": {
    motif: "slugs publics, uniques sur toute la table : seuls les slugs sont lus",
    usages: ["prisma.registreAccessibilite.findMany"],
  },
  "src/lib/stripe/evenements.ts": {
    motif: "événements Stripe reçus (ADR-053), hors compte, écrits avant toute identité ; leur aiguillage vers la file des clients",
    usages: [
      "prisma.$transaction",
      "prisma.evenementStripe.count",
      "prisma.evenementStripe.createMany",
      "prisma.evenementStripe.deleteMany",
      "prisma.evenementStripe.findMany",
      "prisma.evenementStripe.updateMany",
    ],
    // L'aiguillage : l'événement marqué et le client demandé, en une
    // transaction interactive (ADR-053 § 5, amendé le 2026-11-10).
    valeur: ["$transaction(hors tableau)"],
  },
  "src/lib/stripe/file.ts": {
    motif: "file des relectures Stripe (ADR-053 § 5, amendé le 2026-11-10) : une ligne par client Stripe, hors compte — demande, bail à jeton, clôture",
    usages: ["prisma.$executeRaw", "prisma.$queryRaw"],
  },
  "src/lib/stripe/rapprochement.ts": {
    motif: "rapprochement quotidien avec Stripe : l'identifiant du client Stripe de chaque abonnement qui court, à travers les comptes, rien d'autre",
    usages: ["prisma.abonnement.findMany"],
  },
  "src/lib/taches/jour.ts": {
    motif: "exécution des tâches quotidiennes par jour civil (bail à jeton), hors compte",
    usages: ["prisma.$queryRaw", "prisma.tacheQuotidienne.createMany", "prisma.tacheQuotidienne.updateMany"],
  },
  "src/lib/accessibilite/queries.ts": {
    motif: "registre public par son slug, sans session",
    usages: ["prisma.registreAccessibilite.findUnique"],
  },
};
/** Cliquet : importeurs du client brut encore à migrer vers requireCompte(). */
const A_MIGRER = new Set<string>([]);
/**
 * Un module nommé : son motif ; `{ motif, typesSeuls: true }` s'il n'a droit
 * qu'aux types ; `{ motif, symboles }` s'il n'a droit qu'à ces valeurs.
 */
type Nomme = string | { motif: string; typesSeuls: true } | { motif: string; symboles: string[] };
const NOMMES_ROUAGES: Record<string, Record<string, Nomme>> = {
  "src/lib/auth/portee/client": {
    "src/lib/auth/compte.ts": "requireCompte : la portée vient de la session",
    "src/lib/auth/portee/lot-verifie.ts": { motif: "types du client et de la transaction", typesSeuls: true },
    "src/test/garde-simulee.ts": "tests seuls : le client simulé que rendent les gardes simulées",
    "src/lib/auth/compte-hors-session.ts": "accès sans session : la portée vient de la preuve vérifiée",
  },
  // Un client borné à un compte tiré d'une chaîne (propriétaire d'un
  // établissement, identité OAuth) : seulement là où cette chaîne vient d'une
  // preuve vérifiée (jeton, signature, clé ou jeton MCP) — seconde lecture de
  // #146.
  "src/lib/auth/compte-hors-session": {
    // [cc : pas d'OAuth MCP (ADR-052) — ni `clientDuCompteVerifie` ni `acces-oauth-deps.ts`.]
    "src/lib/mcp/db.ts": { motif: "MCP : établissement de la clé", symboles: ["clientDuProprietaire"] },
    "src/lib/signatures/actions.ts": { motif: "pose de signature par jeton vérifié", symboles: ["clientDuProprietaire"] },
    "src/lib/signatures/verification-publique.ts": { motif: "établissement d'une signature lue par son identifiant", symboles: ["clientDuProprietaire"] },
    "src/app/acces/[token]/page.tsx": { motif: "page d'un jeton vérifié", symboles: ["clientDuProprietaire"] },
    "src/lib/stripe/synchronisation.ts": {
      motif: "webhook Stripe : le compte du client Stripe relu après une notification signée (ADR-053)",
      symboles: ["clientDuClientStripe"],
    },
  },
  // Le gel (ADR-053 § 14) : refusé dans l'extension, calculé par les plafonds.
  "src/lib/auth/portee/gel": {
    "src/lib/auth/portee/client.ts": "l'extension : le refus avant l'écriture",
    "src/lib/abonnements/quotas.ts": { motif: "le type des identifiants gelés", typesSeuls: true },
    "src/lib/abonnements/gel-saisie.ts": { motif: "la page du refus, pour le SQL brut d'une saisie", symboles: ["PAGE_DU_GEL", "ouvrirAuGel"] },
  },
  "src/lib/auth/portee/borne": {
    "src/lib/auth/portee/client.ts": "l'extension",
    "src/lib/auth/portee/lot-verifie.ts": "erreurs et classement des modèles",
    "src/lib/auth/portee/gel.ts": "le chemin vers ce qui est gelé, les relations, la borne d'un where",
    "src/lib/auth/portee/sonde-cles-croisees.ts": {
      motif: "les clés de compte telles que le client borné les lit, pour la sonde",
      symboles: ["relations"],
    },
  },
};

const fichiers = (dir: string): string[] =>
  readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(?:[mc]?[jt]s|[jt]sx)$/.test(nom) && !/\.test\.\w+$/.test(nom) ? [relative(DEPOT, chemin)] : [];
  });
const TEXTES = new Map(fichiers(join(DEPOT, "src")).map((f) => [f, readFileSync(join(DEPOT, f), "utf8")]));

const IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'`]([^"'`$]+)["'`]/g;
const cible = (f: string, spec: string) =>
  (spec.startsWith("@/") ? posix.normalize("src/" + spec.slice(2))
    : spec.startsWith(".") ? posix.join(posix.dirname(f), spec) : spec
  ).replace(/\.(?:[mc]?[jt]s|[jt]sx)$/, "").replace(/\/index$/, "");
const GRAPHE = [...TEXTES].map(([f, t]) => [f, [...t.matchAll(IMPORT)].map(([, s]) => cible(f, s))] as const);
const importeurs = (c: string) => GRAPHE.filter(([, i]) => i.includes(c)).map(([f]) => f).sort();

describe("client Prisma brut", () => {
  const brut = [...new Set(PORTES_BRUTES.flatMap(importeurs))].sort();
  it("seuls les modules nommés ou à migrer l'importent", () => {
    expect(brut.length).toBeGreaterThan(0);
    expect(brut.filter((f) => !(f in NOMMES_PRISMA) && !A_MIGRER.has(f))).toEqual([]);
  });
  it.each(Object.entries(NOMMES_PRISMA))("%s n'emploie le client brut que pour son motif", (f, { usages }) => {
    if (usages === "tous") return;
    const code = sansCommentairesNiChaines(TEXTES.get(f)!);
    // Sous son nom local : `import { prisma as db }` ne cache pas ses usages.
    const nom = nomLocal(f) ?? "prisma";
    const employes = [...code.matchAll(new RegExp(String.raw`(?<![\w$.])${nom}\s*\??\.\s*([$\w]+)(?:\s*\.\s*(\w+))?`, "g"))].map(
      ([, a, b]) => (a.startsWith("$") || !b ? `prisma.${a}` : `prisma.${a}.${b}`),
    );
    expect(employes.length).toBeGreaterThan(0);
    expect(employes.filter((u) => !usages.includes(u))).toEqual([]);
  });
  it("un module migré sort de la liste À MIGRER", () => {
    expect([...A_MIGRER].filter((f) => !brut.includes(f))).toEqual([]);
  });
});

/**
 * Le client brut ne se transmet pas plus qu'il ne s'importe (audit rls_audit du
 * 2026-11-09) : la garde ci-dessus borne qui l'IMPORTE, celle-ci borne ce qu'un
 * module nommé en fait comme VALEUR — tout emploi du nom local qui n'est pas
 * `prisma.…`. Passé en argument, il doit l'être à une fonction nommée
 * (`valeur`) ; affecté, rangé dans un objet ou ré-exporté, jamais : la fonction
 * appelée reçoit tout le client, sans borne, et ne le dit pas.
 * Lu sur le texte sans commentaires ni chaînes (`sansCommentairesNiChaines`) :
 * un `f(prisma)` en commentaire ne compte pas. Seules trois formes sont des
 * emplois (voir la liste blanche plus bas) ; tout le reste est une valeur, y
 * compris `() => prisma` (revues et simplify de #253).
 * Échappent, connus (seconde lecture de #253) :
 * - la confiance est TRANSITIVE et par NOM : la fonction nommée reçoit le
 *   client entier, et ce qu'elle en fait n'est gardé par rien ici ; une
 *   méthode homonyme (`obj.regenerer(prisma)`) passerait aussi ;
 * - un alias pris par déstructuration d'un import dynamique ;
 * - faux positifs sans conséquence : `if (prisma)` rend `if`, `x === prisma`
 *   rend `<valeur>`.
 */
function valeursDuClient(code: string, nom = "prisma"): string[] {
  // Les déclarations d'import (et `import type`) ne sont pas des emplois.
  const sansImports = code.replace(/\bimport\s+(?:type\s+)?[^;]*?\bfrom\s*(?:"[^"]*"|'[^']*'|`[^`]*`)?\s*;?/g, " ");
  const nomRe = new RegExp(String.raw`(?<![\w$.])${nom}(?![\w$])`, "g");
  const appels: string[] = [];
  for (const m of sansImports.matchAll(nomRe)) {
    const i = m.index ?? 0;
    const apres = sansImports.slice(i + nom.length);
    // LISTE BLANCHE (simplify de #253) : trois formes seulement sont des
    // emplois du client, et non le client lui-même —
    //   - `prisma.<modèle>.<opération>(` (la garde des usages les nomme) ;
    //   - `prisma.$transaction([` (un tableau de requêtes : aucun `tx` n'en sort) ;
    //   - `prisma.$queryRaw` / `$executeRaw` (la garde du SQL brut les nomme).
    // Tout le reste — `$extends`, un délégué (`prisma.equipement`), des
    // crochets, `$transaction` hors tableau — est une valeur, rattachée à la
    // fonction dont elle est l'argument direct.
    if (/^\s*\??\.\s*[A-Za-z_]\w*\s*\??\.\s*[A-Za-z_]\w*\s*\(/.test(apres)) continue;
    if (/^\s*\??\.\s*\$transaction\s*\(\s*\[/.test(apres)) continue;
    if (/^\s*\??\.\s*\$(?:queryRaw|executeRaw)\b/.test(apres)) continue;
    if (/^\s*\??\.\s*\$transaction\b/.test(apres)) {
      appels.push("$transaction(hors tableau)");
      continue;
    }
    if (/\btypeof\s*$/.test(sansImports.slice(0, i))) continue; // un type
    // Rendu par une fonction fléchée (`() => prisma`) : une valeur, pas un argument.
    if (/=>\s*$/.test(sansImports.slice(0, i))) {
      appels.push("<valeur>");
      continue;
    }
    appels.push(appelantDe(sansImports, i));
  }
  return appels;
}

/**
 * La fonction dont `i` est un argument direct : on remonte jusqu'à la première
 * parenthèse ouvrante non fermée. Une accolade ou un crochet non fermé avant
 * elle (objet, tableau, corps de fonction) : la valeur n'est pas un argument
 * direct — `<valeur>`, toujours refusé.
 */
function appelantDe(code: string, i: number): string {
  let profondeur = 0;
  for (let j = i - 1; j >= 0; j--) {
    const c = code[j];
    if (c === ")" || c === "]" || c === "}") profondeur++;
    else if (c === "(" || c === "[" || c === "{") {
      if (profondeur > 0) {
        profondeur--;
        continue;
      }
      if (c !== "(") return "<valeur>";
      return /([\w$]+)\s*$/.exec(code.slice(0, j))?.[1] ?? "<valeur>";
    } else if (profondeur === 0 && (c === ";" || c === "=")) {
      // `x = prisma`, ou une instruction précédente atteinte sans appel ouvert.
      if (c === "=" && code[j + 1] !== ">" && code[j - 1] !== "=" && code[j - 1] !== "!") return "<valeur>";
      if (c === ";") return "<valeur>";
    }
  }
  return "<valeur>";
}

/** Le nom local que le module donne au client brut (`import { prisma as p }`), s'il l'importe. */
function nomLocal(f: string): string | null {
  const texte = TEXTES.get(f)!;
  for (const [, , clause, spec] of texte.matchAll(IMPORT_STATIQUE)) {
    if (!PORTES_BRUTES.includes(cible(f, spec))) continue;
    const m = /\bprisma\b(?:\s+as\s+([\w$]+))?/.exec(clause);
    if (m) return m[1] ?? "prisma";
  }
  return null;
}

describe("client Prisma brut : la valeur", () => {
  it.each(Object.entries(NOMMES_PRISMA))("%s ne transmet le client brut qu'aux fonctions nommées", (f, { valeur = [] }) => {
    const nom = nomLocal(f);
    if (!nom) return;
    const transmis = valeursDuClient(sansCommentairesNiChaines(TEXTES.get(f)!), nom);
    expect(transmis.filter((a) => !valeur.includes(a))).toEqual([]);
  });
  it("une fonction nommée qui ne reçoit plus le client sort de la liste", () => {
    const morts = Object.entries(NOMMES_PRISMA).flatMap(([f, { valeur = [] }]) => {
      const nom = nomLocal(f);
      const transmis = nom ? valeursDuClient(sansCommentairesNiChaines(TEXTES.get(f)!), nom) : [];
      return valeur.filter((a) => !transmis.includes(a)).map((a) => `${f} → ${a}`);
    });
    expect(morts).toEqual([]);
  });
  it("une porte du client brut ne s'importe que par son nom (ni espace de noms, ni défaut)", () => {
    // `import * as brut` puis `brut.prisma` échapperait à `nomLocal` (revue de #253).
    const fautifs = [...TEXTES]
      .filter(([f]) => !FABRIQUES.has(f))
      .filter(([f, t]) =>
        [...t.matchAll(/\bimport\s+(?!type\b)(?:\*\s*as\s+[\w$]+|[\w$]+)\s*(?:,\s*\{[^}]*\}\s*)?from\s*["'`]([^"'`]+)["'`]/g)].some(
          ([, spec]) => PORTES_BRUTES.includes(cible(f, spec)),
        ) ||
        [...t.matchAll(IMPORT_DYNAMIQUE)].some(([, spec]) => PORTES_BRUTES.includes(cible(f, spec))),
      )
      .map(([f]) => f);
    expect(fautifs).toEqual([]);
  });
  it("aucun module ne ré-exporte une porte du client brut", () => {
    const REEXPORT = /\bexport\s*(?:\*|\{[^}]*\}|\*\s+as\s+\w+)\s*from\s*["'`]([^"'`]+)["'`]/g;
    const fautifs = [...TEXTES]
      .filter(([f]) => !FABRIQUES.has(f))
      .filter(([f, t]) => [...t.matchAll(REEXPORT)].some(([, spec]) => PORTES_BRUTES.includes(cible(f, spec))))
      .map(([f]) => f);
    expect(fautifs).toEqual([]);
  });
  it.each([
    ["regenerer(prisma, id);", ["regenerer"]],
    ["await (await import(\"x\")).limitesMembresDuPlugin(prisma, compteId);", ["limitesMembresDuPlugin"]],
    ["database: prismaAdapter(prisma, { provider: 1 }),", ["prismaAdapter"]],
    ["f(a, g(b), prisma)", ["f"]],
    ["prisma.equipement.findMany(); prisma?.equipement?.count(); prisma . $transaction([x]); prisma.$executeRaw`x`", []],
    ["prisma.$transaction(operations)", ["$transaction(hors tableau)"]],
    ["const p = prisma;", ["<valeur>"]],
    ["export { prisma };", ["<valeur>"]],
    ["f({ db: prisma })", ["<valeur>"]],
    ["f([prisma])", ["<valeur>"]],
    ["return prisma;", ["<valeur>"]],
    ["type C = typeof prisma;", []],
    ["import { prisma } from \"@/lib/prisma\";\nf(prisma)", ["f"]],
    ["const prismaAdapter = 1; xprisma(); prisma2", []],
    ["await fuite(prisma.$extends({}))", ["fuite"]],
    ["prisma.$transaction(async (tx) => fuite(tx))", ["$transaction(hors tableau)"]],
    ["prisma.$transaction((tx) => f(tx))", ["$transaction(hors tableau)"]],
    ["prisma.$transaction(fn => f(fn))", ["$transaction(hors tableau)"]],
    ["prisma.$transaction(faireLeTravail)", ["$transaction(hors tableau)"]],
    ["prisma.$transaction(faireLeTravail, { timeout: 1 })", ["$transaction(hors tableau)"]],
    ["run(() => prisma)", ["<valeur>"]],
    ["run(async () => prisma)", ["<valeur>"]],
    ["fuite(prisma.equipement, id)", ["fuite"]],
    ["const e = prisma.equipement;", ["<valeur>"]],
    ["prisma.$transaction([prisma.a.b()])", []],
    ['prisma?.["equipement"].deleteMany({})', ["<valeur>"]],
    ['prisma["x"]', ["<valeur>"]],
  ])("%s → %j", (code, attendu) => expect(valeursDuClient(code)).toEqual(attendu));
  it("un appel en commentaire ne compte pas", () => {
    expect(valeursDuClient(sansCommentairesNiChaines("// f(prisma)\n/* g(prisma) */ x();"))).toEqual([]);
  });
});

/**
 * Le SQL brut (`$queryRaw`, `$executeRaw`) n'est pas borné par l'extension du
 * client borné (ADR-051 § 5) : chaque module qui en écrit est nommé, avec ce
 * qui borne SA requête. Une lecture bornée au propriétaire passe par
 * `requireLectureSqlProprietaire` (`auth/scope.ts`), qui pose le prédicat et
 * exécute — elle n'a pas à être ici (revue de code du 2026-10-31).
 */
const SQL_BRUT_NOMMES: Record<string, string> = {
  "src/lib/auth/scope.ts": "requireLectureSqlProprietaire : pose le prédicat propriétaire et exécute",
  "src/lib/securite/limite-debit.ts": "compteurs techniques, hors de tout compte",
  "src/lib/signatures/verrou-contenu.ts": "verrou FOR UPDATE de la ligne, borné à l'établissement",
  "src/lib/rapports/actions.ts": "verrou FOR UPDATE d'une ligne déjà lue par le client borné",
  "src/lib/salaries/suppression.ts": "verrou FOR UPDATE borné au salarié et à l'établissement gardés",
  "src/lib/calendrier/recalcul-ligne.ts": "verrou FOR UPDATE d'une ligne déjà lue par le client borné",
  "src/lib/entreprises/cycle-de-vie.ts": "verrou FOR UPDATE d'une entreprise déjà gardée",
  "src/lib/abonnements/suppression.ts":
    "verrou FOR UPDATE de la ligne d'abonnement d'un compte à supprimer (ADR-058), dans la transaction qui relit la condition",
  "src/lib/abonnements/quotas.ts": "verrou FOR NO KEY UPDATE de la ligne du compte de la portée (plafonds, ADR-053 § 14)",
  "src/lib/stripe/file.ts":
    "file des relectures Stripe, hors compte : demande (INSERT … ON CONFLICT), bail à jeton (UPDATE … RETURNING), verrou FOR UPDATE sous le jeton, clôture",
  "src/lib/taches/jour.ts": "bail à jeton de l'exécution du jour (UPDATE … RETURNING), hors compte",
  "src/lib/abonnements/stockage.ts": "somme des tailles des fichiers du compte de la portée (plafond de stockage, ADR-053 § 14)",
  "src/lib/registre/actions.ts": "UPDATE jsonb borné à l'établissement gardé",
  "src/lib/duerps/ecrire-reponse-fermee.ts": "UPDATE jsonb d'un DUERP déjà gardé",
  "src/lib/calendrier/faux-prisma.ts": "faux client des tests",
  "src/lib/auth/tenancy-portee.ts": "sonde : le motif de détection du SQL brut, aucune requête",
  "src/lib/auth/tenancy-sonde.ts": "sonde : le motif de détection du SQL brut, aucune requête",
  "src/lib/auth/portee/client.ts": "commentaire seul : l'extension ne borne pas le SQL brut",
  "src/lib/auth/portee/sonde-cles-croisees.ts": "sonde des clés croisées : lecture seule à travers les comptes, par le client que l'appelant passe",
};
/**
 * `Prisma.raw` insère du texte SQL tel quel, sans paramètre : il échappe à la
 * forme `Unsafe` refusée plus bas (audit rls_audit du 2026-11-09). Chaque
 * module qui l'emploie est nommé, avec ce qui borne le texte inséré. Cherché
 * sur le texte brut, comme le SQL brut.
 */
const PRISMA_RAW_NOMMES: Record<string, string> = {
  "src/lib/auth/scope.ts": "requireLectureSqlProprietaire : nom de colonne vérifié par une expression régulière fermée",
  "src/lib/duerps/ecrire-reponse-fermee.ts": "nom de colonne pris dans une liste fermée",
  "src/lib/rapports/joindre-realisations.ts": "fragment SQL constant, sans entrée",
  "src/lib/auth/portee/sonde-cles-croisees.ts": "identifiants tirés du schéma (Prisma.dmmf) et constantes, aucune entrée",
};
const PRISMA_RAW = /\bPrisma\s*(?:\.\s*raw\b|\[\s*["'`]raw["'`]\s*\])/;
/**
 * Ce qui ferait échapper `Prisma.raw` au motif ci-dessus, refusé partout
 * (revue de #253) : renommer `Prisma` à l'import, déstructurer `raw`, ou
 * l'importer du moteur. Échappe, connu : `const P = Prisma; P.raw(…)`.
 */
const PRISMA_RAW_DEGUISE =
  /import\s*\{[^}]*\bPrisma\s+as\b[^}]*\}\s*from|\{[^}]*\braw\b[^}]*\}\s*=\s*Prisma\b|import\s*\{[^}]*\braw\b[^}]*\}\s*from\s*["'`]@prisma/;
/**
 * Le motif se cherche sur le texte BRUT, commentaires et chaînes compris :
 * `db["$queryRaw"]`, `const { $queryRaw: q } = db` ou une clé calculée se
 * voient, et aucun analyseur ne peut se dérégler (une apostrophe dans du JSX
 * le faisait — revue de #149, 2026-10-31). Un module qui ne fait que NOMMER le
 * motif (commentaire, sonde) est nommé comme tel.
 */
// Sans le point : l'accès par crochets ou la déstructuration s'y voient aussi.
const SQL_BRUT = /\$(?:queryRaw|executeRaw)/;
const SQL_BRUT_UNSAFE = /\$(?:queryRaw|executeRaw)Unsafe\b/;
describe("SQL brut", () => {
  const ecrivent = [...TEXTES]
    .filter(([, t]) => SQL_BRUT.test(t))
    .map(([f]) => f)
    .sort();
  it("seuls les modules nommés en écrivent", () => {
    expect(ecrivent.filter((f) => !(f in SQL_BRUT_NOMMES))).toEqual([]);
  });
  it("un module nommé qui n'en écrit plus sort de la liste", () => {
    expect(Object.keys(SQL_BRUT_NOMMES).filter((f) => !ecrivent.includes(f))).toEqual([]);
  });
  it("Prisma.raw ne se déguise pas (alias de Prisma, raw déstructuré ou importé du moteur)", () => {
    expect([...TEXTES].filter(([, t]) => PRISMA_RAW_DEGUISE.test(t)).map(([f]) => f)).toEqual([]);
  });
  it.each([
    ['import { Prisma as P } from "@prisma/client";', true],
    ["const { raw } = Prisma;", true],
    ["const { sql, raw: r } = Prisma;", true],
    ['import { raw } from "@prisma/client/runtime/library";', true],
    ['import { Prisma } from "@prisma/client";', false],
    ["Prisma.sql`x`", false],
  ])("déguisement %s → %s", (texte, attendu) => expect(PRISMA_RAW_DEGUISE.test(texte)).toBe(attendu));
  it("seuls les modules nommés emploient Prisma.raw, et chacun l'emploie encore", () => {
    const emploient = [...TEXTES].filter(([, t]) => PRISMA_RAW.test(t)).map(([f]) => f).sort();
    expect(emploient.filter((f) => !(f in PRISMA_RAW_NOMMES))).toEqual([]);
    expect(Object.keys(PRISMA_RAW_NOMMES).filter((f) => !emploient.includes(f))).toEqual([]);
  });
  it("jamais de forme Unsafe (chaîne SQL non paramétrée)", () => {
    const unsafe = [...TEXTES].filter(([, t]) => SQL_BRUT_UNSAFE.test(t)).map(([f]) => f);
    expect(unsafe).toEqual([]);
  });
  // Le helper vérifie la PRÉSENCE du prédicat, pas qu'il filtre : chaque
  // appelant est éprouvé par le résultat, sur base réelle (ADR-051 § 5). Un
  // appelant neuf qui n'entre pas dans ce test fait tomber celui-ci.
  it("chaque appelant de requireLectureSqlProprietaire est éprouvé sur base réelle", () => {
    const EPREUVE = "src/lib/auth/sql-proprietaire.integration.test.ts";
    const appelants = [...TEXTES]
      .filter(([f, t]) => f !== "src/lib/auth/scope.ts" && /\brequireLectureSqlProprietaire\b/.test(sansCommentairesNiChaines(t)))
      .map(([f]) => f.replace(/\.ts$/, ""))
      .sort();
    // Commentaires retirés : un import mis en commentaire n'éprouve plus rien.
    const code = readFileSync(join(DEPOT, EPREUVE), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const eprouves = [...code.matchAll(IMPORT)].map(([, s]) => cible(EPREUVE, s));
    expect(appelants.length).toBeGreaterThan(0);
    expect(appelants.filter((f) => !eprouves.includes(f))).toEqual([]);
  });
});

it.each(Object.entries(NOMMES_ROUAGES))("les rouages %s ne s'importent que des modules nommés", (c, nommes) => {
  expect(importeurs(c).filter((f) => !(f in nommes))).toEqual([]);
});

/**
 * Un module nommé `typesSeuls` n'importe des rouages que des TYPES : la
 * garde ci-dessus est par module, pas par symbole — sans celle-ci, un module
 * nommé pour un type pourrait appeler `clientBorne({ userId: … })` librement
 * (seconde lecture de #145).
 */
const IMPORT_STATIQUE = /(?:import|export)\s+(type\s+)?([^;"'`]*?)\s*from\s*["'`]([^"'`]+)["'`]/g;
const IMPORT_DYNAMIQUE = /(?:import|require)\s*\(\s*["'`]([^"'`]+)["'`]/g;
function importsDeValeur(f: string, c: string): string[] {
  const texte = TEXTES.get(f)!;
  const statiques = [...texte.matchAll(IMPORT_STATIQUE)].filter(([, , , spec]) => cible(f, spec) === c);
  const deValeur = statiques
    .filter(([, type, clause]) => {
      if (type) return false;
      const accolades = clause.match(/^\{([^}]*)\}$/);
      if (!accolades) return true; // défaut, espace de noms : une valeur
      return accolades[1].split(",").map((x) => x.trim()).filter(Boolean).some((x) => !x.startsWith("type "));
    })
    .map(([texteImport]) => texteImport);
  const dynamiques = [...texte.matchAll(IMPORT_DYNAMIQUE)].filter(([, spec]) => cible(f, spec) === c).map(([t]) => t);
  return [...deValeur, ...dynamiques];
}
const TYPES_SEULS = Object.entries(NOMMES_ROUAGES).flatMap(([c, nommes]) =>
  Object.entries(nommes)
    .filter(([, nomme]) => typeof nomme !== "string" && "typesSeuls" in nomme)
    .map(([f]) => [f, c] as const),
);
/**
 * Un module nommé avec ses `symboles` n'importe de la cible que ces valeurs-là
 * (les types restent libres) : nommé pour `clientDuProprietaire`, il ne peut
 * pas appeler `clientDuCompteVerifie(chaîne)` (revue du 2026-10-31).
 */
function valeursImportees(f: string, c: string): string[] {
  const texte = TEXTES.get(f)!;
  const statiques = [...texte.matchAll(IMPORT_STATIQUE)].filter(([, , , spec]) => cible(f, spec) === c);
  const valeurs = statiques.flatMap(([, type, clause]) => {
    if (type) return [];
    const accolades = clause.match(/^\{([^}]*)\}$/);
    if (!accolades) return ["<défaut ou espace de noms>"];
    return accolades[1]
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x && !x.startsWith("type "))
      .map((x) => x.split(/\s+as\s+/)[0]);
  });
  const dynamiques = [...texte.matchAll(IMPORT_DYNAMIQUE)].filter(([, spec]) => cible(f, spec) === c).map(() => "<import dynamique>");
  return [...valeurs, ...dynamiques];
}
const PAR_SYMBOLES = Object.entries(NOMMES_ROUAGES).flatMap(([c, nommes]) =>
  Object.entries(nommes).flatMap(([f, nomme]) =>
    typeof nomme !== "string" && "symboles" in nomme ? [[f, c, nomme.symboles] as const] : [],
  ),
);
it.each(PAR_SYMBOLES)("%s n'importe de %s que ses symboles nommés", (f, c, symboles) => {
  expect(valeursImportees(f, c).filter((v) => !symboles.includes(v))).toEqual([]);
});

it("les modules nommés `typesSeuls` existent", () => {
  expect(TYPES_SEULS.length).toBeGreaterThan(0);
});
it.each(TYPES_SEULS)("%s n'importe de %s que des types", (f, c) => {
  expect(importsDeValeur(f, c)).toEqual([]);
});

/** Vrai si le texte obtient la VALEUR `PrismaClient` (nommée, défaut, espace de noms, require, import()). */
const PAQUET = String.raw`["'\`](?:@prisma|\.prisma)\/client(?:\/[^"'\`]*)?["'\`]`;
function peutFabriquer(texte: string): boolean {
  // `import` comme `export … from` (ré-export, `export *`) ; `default` nommé
  // entre accolades compte comme l'import par défaut.
  const statiques = texte.matchAll(
    new RegExp(String.raw`(?:import|export)\s+(type\s+)?([^;"'\`]*?)\s*from\s*` + PAQUET, "g"),
  );
  return [...statiques].some(([, type, clause]) =>
    !type &&
    /^(?:\w|\*)|\bPrismaClient\b|\bdefault\b/.test(clause.replace(/\btype\s+\w+(?:\s+as\s+\w+)?/g, "")),
  ) || new RegExp(String.raw`(?:require|import)\s*\(\s*` + PAQUET).test(texte);
}

describe("fabrication d'un client Prisma", () => {
  it("la valeur PrismaClient ne s'obtient que dans les modules qui fabriquent un client", () => {
    expect([...TEXTES].filter(([f, t]) => peutFabriquer(t) && !FABRIQUES.has(f)).map(([f]) => f)).toEqual([]);
  });
  it.each([
    ['import { Prisma, PrismaClient as P } from "@prisma/client";', true],
    ['export { PrismaClient } from "@prisma/client";', true],
    ['export * from "@prisma/client";', true],
    ['import { default as P } from "@prisma/client";', true],
    ['export type { PrismaClient } from "@prisma/client";', false],
    ['export { Prisma } from "@prisma/client";', false],
    ['import * as client from "@prisma/client";', true],
    ['import { PrismaClient } from "@prisma/client/runtime/library";', true],
    ['import { PrismaClient } from ".prisma/client";', true],
    ['const m = require("@prisma/client/default");', true],
    ['import type { A } from "./a";\nimport { PrismaClient } from "@prisma/client";', true],
    ['import type { PrismaClient } from "@prisma/client";', false],
    ['import { type PrismaClient, Prisma } from "@prisma/client";', false],
  ])("%s → %s", (texte, attendu) => expect(peutFabriquer(texte)).toBe(attendu));
});
