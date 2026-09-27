// Relire le corpus contre l'API Légifrance (DILA, via PISTE).
//
//   pnpm legifrance:verifier                          → tout le corpus
//   pnpm legifrance:verifier -- --ref "R. 4227-26"    → un article (répétable)
//   pnpm legifrance:verifier -- --corpus code-travail-incendie   (répétable)
//   options : --env-file <chemin>  (défaut : .env.local du répertoire courant)
//             --rapport <chemin>   (défaut : docs/revues/verification-legifrance-AAAA-MM-JJ[-selection].md)
//             --delai <ms>         (intervalle minimal entre deux appels, défaut 300)
//             --sans-rapport       (console seulement)
//
// Variables : LEGIFRANCE_CLIENT_ID, LEGIFRANCE_CLIENT_SECRET, LEGIFRANCE_ENV
// (sandbox | production). Le script les charge lui-même ; il n'en affiche,
// n'en écrit, n'en journalise JAMAIS la valeur.
//
// Code de sortie : 0 aucun écart ; 1 au moins un écart (abrogé, introuvable,
// citation, version, modificateur) ou une erreur d'API sur un article ;
// 2 configuration ou authentification (rien n'a été vérifié).
//
// Mode d'emploi et lecture du rapport : docs/outils/legifrance-api.md.

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  configurationDepuisEnv,
  creerClientLegifrance,
  ErreurLegifrance,
} from "../src/lib/legifrance/client";
import {
  aEchoueSurApi,
  CATEGORIES,
  compter,
  ecartsParImportance,
  estEcart,
  LIBELLES,
  rendreRapport,
  selectionner,
  verifierCorpus,
} from "../src/lib/legifrance/verification";
import { CORPUS } from "../src/lib/referentiels/corpus";

type Args = {
  refs: string[];
  corpus: string[];
  envFile: string;
  rapport?: string;
  delai?: number;
  sansRapport: boolean;
};

function lireArgs(argv: string[]): Args {
  const a: Args = { refs: [], corpus: [], envFile: ".env.local", sansRapport: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    const suivant = () => {
      const x = argv[++i];
      if (x === undefined) throw new Error(`${v} attend une valeur.`);
      return x;
    };
    if (v === "--") continue;
    else if (v === "--ref") a.refs.push(suivant());
    else if (v === "--corpus") a.corpus.push(suivant());
    else if (v === "--env-file") a.envFile = suivant();
    else if (v === "--rapport") a.rapport = suivant();
    else if (v === "--delai") a.delai = Number(suivant());
    else if (v === "--sans-rapport") a.sansRapport = true;
    else throw new Error(`Option inconnue : ${v}`);
  }
  return a;
}

function jour(): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main(): Promise<number> {
  const args = lireArgs(process.argv.slice(2));

  // Les variables : chargées du fichier s'il existe, jamais affichées.
  if (existsSync(args.envFile)) process.loadEnvFile(args.envFile);
  let config;
  try {
    config = configurationDepuisEnv();
  } catch (e) {
    console.error(`Configuration : ${e instanceof Error ? e.message : String(e)}`);
    console.error(`(fichier lu : ${existsSync(args.envFile) ? args.envFile : "aucun"} ; voir docs/outils/legifrance-api.md)`);
    return 2;
  }
  const client = creerClientLegifrance({ ...config, delaiMs: args.delai });

  const articles = selectionner(CORPUS, {
    refs: args.refs.length ? args.refs : undefined,
    corpus: args.corpus.length ? args.corpus : undefined,
  });
  if (articles.length === 0) {
    console.error("Aucun article ne correspond à la sélection.");
    return 2;
  }
  const selection =
    args.refs.length || args.corpus.length
      ? [
          ...args.refs.map((r) => `--ref « ${r} »`),
          ...args.corpus.map((c) => `--corpus ${c}`),
        ].join(", ")
      : "tout le corpus";
  console.log(`Légifrance (${config.env}) — ${articles.length} article(s) — ${selection}`);

  let resultats;
  try {
    resultats = await verifierCorpus(client, articles, (r, i, n) => {
      if (r.categorie !== "ok" || (i + 1) % 25 === 0 || i + 1 === n) {
        console.log(`  [${i + 1}/${n}] ${r.ref} (${r.corpusId}) : ${LIBELLES[r.categorie]}`);
      }
    });
  } catch (e) {
    if (e instanceof ErreurLegifrance) {
      console.error(`Arrêt — ${e.nature} : ${e.message}`);
      return 2;
    }
    throw e;
  }

  const n = compter(resultats);
  const cpt = client.compteurs();
  console.log("");
  console.log("Résumé");
  for (const k of CATEGORIES) console.log(`  ${LIBELLES[k].padEnd(24)} ${n[k]}`);
  const erreurs = resultats.filter(aEchoueSurApi).length;
  if (erreurs) console.log(`  dont erreurs d'API        ${erreurs}`);
  console.log(`  appels ${cpt.appels}, reprises ${cpt.reprises}, jetons ${cpt.jetons}`);

  const ecarts = ecartsParImportance(resultats);
  if (ecarts.length) {
    console.log("");
    console.log("Écarts les plus importants :");
    for (const r of ecarts.slice(0, 10)) {
      console.log(`  - ${r.ref} (${r.corpusId}) — ${r.constats.map((c) => `${LIBELLES[c.categorie]} : ${c.detail}`).join(" / ").slice(0, 400)}`);
    }
  }

  if (!args.sansRapport) {
    const partiel = args.refs.length > 0 || args.corpus.length > 0;
    const chemin =
      args.rapport ??
      path.join("docs", "revues", `verification-legifrance-${jour()}${partiel ? "-selection" : ""}.md`);
    let commit: string | undefined;
    try {
      commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      commit = undefined;
    }
    mkdirSync(path.dirname(chemin), { recursive: true });
    writeFileSync(
      chemin,
      rendreRapport(resultats, {
        date: jour(),
        env: config.env,
        selection,
        appels: cpt.appels,
        reprises: cpt.reprises,
        commit,
      }),
    );
    console.log(`\nRapport : ${chemin}`);
  }

  return resultats.some((r) => estEcart(r.categorie)) || erreurs > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    // Jamais d'objet d'erreur brut : il pourrait porter une requête.
    console.error(`Échec : ${e instanceof Error ? e.message : "erreur inconnue"}`);
    process.exit(2);
  },
);
