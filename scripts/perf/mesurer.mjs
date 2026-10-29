#!/usr/bin/env node
/**
 * Mesure des pages authentifiées (plan performance, lot 0).
 *
 * Par page : requêtes SQL et leur temps en base, temps du premier octet et
 * total, poids HTML et RSC, appels au serveur Auth. Médiane de N essais après
 * une chauffe. Puis les requêtes SQL les plus coûteuses, toutes pages
 * confondues, et — avec `--expliquer` — leur plan d'exécution.
 *
 * Méthode : le journal de PostgreSQL (`log_min_duration_statement = 0`, posé
 * le temps de la mesure, retiré à la fin), lu par `docker logs` et filtré
 * par nom de base. Rien n'est ajouté à l'application.
 *
 * Prérequis :
 *   - conteneur `duerp-db` démarré, base de mesure semée (seed:complet, puis
 *     scripts/perf/grossir-dossier.ts pour le gros dossier) ;
 *   - faux serveur Auth : node scripts/perf/faux-auth.mjs ;
 *   - build de prod (`next build`, jamais `pnpm build`, qui migre) servi par
 *     `next start`, construit avec NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399.
 *
 *   node scripts/perf/mesurer.mjs --base http://localhost:3101 --db duerp_perf_gros \
 *     [--essais 3] [--expliquer 5] [--sortie mesure.json]
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fabriquerCookie } from "./faux-auth.mjs";

const arg = (nom, defaut) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i === -1 ? defaut : process.argv[i + 1];
};
const BASE = arg("base", "http://localhost:3101");
const DB = arg("db");
const ESSAIS = Number(arg("essais", "3"));
const EXPLIQUER = Number(arg("expliquer", "0"));
const SORTIE = arg("sortie");
const AUTH = arg("auth", "http://localhost:54399");
// Le conteneur PostgreSQL et son utilisateur : `duerp-db` / `duerp` en local ;
// en CI, le conteneur de service du runner (`budget-requetes.yml`).
const CONTENEUR = arg("conteneur", "duerp-db");
const UTILISATEUR_PG = arg("utilisateur", "duerp");
// Budget de requêtes SQL par page (`scripts/perf/budget-requetes.json`) : avec
// `--budget`, le script sort en erreur si une page le dépasse.
const BUDGET = arg("budget");

if (!DB || !/^duerp_perf_\w+$/.test(DB)) {
  console.error("--db duerp_perf_<nom> obligatoire (seules les bases de mesure sont acceptées).");
  process.exit(1);
}

const psql = (base, sql) =>
  execFileSync("docker", ["exec", CONTENEUR, "psql", "-U", UTILISATEUR_PG, "-d", base, "-Atc", sql], {
    encoding: "utf8",
  }).trim();

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const mediane = (xs) => {
  const t = [...xs].sort((a, b) => a - b);
  return t.length ? t[Math.floor(t.length / 2)] : 0;
};

// --- Journal PostgreSQL ------------------------------------------------------

function activerJournal() {
  // Le nom de la base dans chaque ligne : seul moyen de trier ce qui vient de
  // la base mesurée quand d'autres sessions utilisent le même serveur.
  // Posé au niveau du serveur et rechargé : un réglage par base ne vaudrait
  // que pour les connexions ouvertes APRÈS lui, et le pool de Prisma du
  // serveur mesuré est déjà ouvert. Retiré à la fin de la mesure.
  psql("postgres", "ALTER SYSTEM SET log_line_prefix = '%m [%p] %d '");
  psql("postgres", "ALTER SYSTEM SET log_min_duration_statement = 0");
  psql("postgres", "SELECT pg_reload_conf()");
}

function couperJournal() {
  psql("postgres", "ALTER SYSTEM RESET log_min_duration_statement");
  psql("postgres", "ALTER SYSTEM RESET log_line_prefix");
  psql("postgres", "SELECT pg_reload_conf()");
}

function lireJournal(depuis, jusqua) {
  // PostgreSQL écrit son journal sur stderr, que `docker logs` restitue sur
  // stderr : les deux flux sont lus.
  const r = spawnSync(
    "docker",
    ["logs", "--since", depuis.toISOString(), "--until", jusqua.toISOString(), CONTENEUR],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  return `${r.stdout}\n${r.stderr}`;
}

const RE_DUREE = new RegExp(
  String.raw`\] ${DB} LOG:\s+duration: ([\d.]+) ms\s+(?:(parse|bind|execute) [^:]*|statement): (.*)$`,
);
const RE_PARAMS = new RegExp(String.raw`\] ${DB} DETAIL:\s+Parameters: (.*)$`);

/** Requêtes d'une fenêtre de journal : nombre, temps, et détail par texte SQL. */
function analyser(journal) {
  // Une requête écrite sur plusieurs lignes (SQL brut) continue sur des lignes
  // sans horodatage : elles sont recollées à leur ligne de journal.
  const lignes = [];
  for (const l of journal.split("\n")) {
    if (/^\d{4}-\d{2}-\d{2} /.test(l) || lignes.length === 0) lignes.push(l);
    else lignes[lignes.length - 1] += ` ${l.trim()}`;
  }
  const requetes = [];
  let tempsSql = 0;
  for (let i = 0; i < lignes.length; i++) {
    const m = RE_DUREE.exec(lignes[i]);
    if (!m) continue;
    const [, duree, phase, sql] = m;
    const texte = sql.replace(/\s+/g, " ").trim();
    // `SELECT 1` : le contrôle de connexion de Prisma, émis selon l'état du
    // pool et non par l'application — ni compté ni chronométré : il ferait
    // varier une page d'une mesure à l'autre.
    if (/^SELECT 1;?$/i.test(texte)) continue;
    tempsSql += Number(duree);
    // Une requête = une exécution (protocole étendu) ou une instruction simple.
    if (phase === "execute" || phase === undefined) {
      const p = RE_PARAMS.exec(lignes[i + 1] ?? "");
      requetes.push({ sql: texte, duree: Number(duree), params: p ? p[1] : null });
    } else if (phase === "parse" || phase === "bind") {
      // Le temps de parse/bind est compté dans le total, pas comme requête.
    }
  }
  return { requetes, tempsSql };
}

// --- Pages --------------------------------------------------------------------

function pagesAMesurer() {
  const etab = psql(DB, `SELECT id FROM "Etablissement" ORDER BY "createdAt" LIMIT 1`);
  const duerp = psql(DB, `SELECT id FROM "Duerp" WHERE "etablissementId" = '${etab}' LIMIT 1`);
  // L'appareil et le contrôle qui portent le plus de rapports : les fiches
  // qui relisent un historique y paient le plus. Les ex æquo sont la règle
  // (le gros dossier donne le même historique aux lignes d'un même rythme) :
  // départagés par l'obligation et le libellé de l'appareil, stables d'un
  // semis à l'autre, et non par des identifiants tirés au hasard.
  const [equipement, controle] = psql(
    DB,
    `SELECT v."equipementId" || '|' || v.id FROM "Verification" v
       JOIN "Equipement" e ON e.id = v."equipementId"
       JOIN "RapportVerification" r ON r."verificationId" = v.id
      WHERE v."etablissementId" = '${etab}'
      GROUP BY v.id, e.id
      ORDER BY count(*) DESC, v."obligationId", e.libelle, e."createdAt"
      LIMIT 1`,
  ).split("|");
  const e = `/etablissements/${etab}`;
  return [
    ["Tableau de bord", e],
    ["Calendrier", `${e}/calendrier`],
    ["Registre", `${e}/registre`],
    ["Équipements", `${e}/equipements`],
    ["Plan d'actions", `${e}/actions`],
    ["Équipe", `${e}/equipe`],
    ["Prestataires", `${e}/prestataires`],
    ["Carnet sanitaire", `${e}/carnet-sanitaire`],
    ["Documents", `${e}/documents`],
    ["DUERP (unités)", `/duerp/${duerp}/unites`],
    ["DUERP (synthèse)", `/duerp/${duerp}/synthese`],
    ...(equipement
      ? [
          ["Fiche équipement", `${e}/equipements/${equipement}`],
          ["Fiche contrôle", `${e}/equipements/${equipement}/controles/${controle}`],
        ]
      : []),
  ];
}

const COOKIE = fabriquerCookie();

async function obtenir(chemin, rsc) {
  const t0 = performance.now();
  // Next 16 vérifie le paramètre `_rsc` (empreinte des en-têtes de routage) :
  // sans en-tête de routage, la valeur attendue est vide (sinon 307).
  const url = BASE + chemin + (rsc ? `${chemin.includes("?") ? "&" : "?"}_rsc` : "");
  const r = await fetch(url, {
    headers: { cookie: COOKIE, ...(rsc ? { RSC: "1" } : {}) },
    redirect: "manual",
  });
  const premierOctet = performance.now() - t0;
  const corps = Buffer.from(await r.arrayBuffer());
  return { statut: r.status, premierOctet, total: performance.now() - t0, octets: corps.length };
}

async function appelsAuth(raz) {
  const r = await fetch(`${AUTH}/${raz ? "__raz" : "__compte"}`, { method: raz ? "POST" : "GET" });
  return raz ? 0 : (await r.json()).appels;
}

async function mesurerPage(nom, chemin) {
  await obtenir(chemin, false); // chauffe
  const essais = [];
  for (let k = 0; k < ESSAIS; k++) {
    await attendre(300);
    await appelsAuth(true);
    const debut = new Date(Date.now() - 50);
    const html = await obtenir(chemin, false);
    await attendre(400);
    const fin = new Date();
    const auth = await appelsAuth(false);
    const { requetes, tempsSql } = analyser(lireJournal(debut, fin));
    const rsc = await obtenir(chemin, true);
    essais.push({ html, rsc, requetes, tempsSql, auth });
  }
  const statut = essais[0].html.statut;
  if (statut !== 200) console.error(`  ! ${nom} : statut ${statut}`);
  return {
    nom,
    chemin,
    statut,
    sql: mediane(essais.map((e) => e.requetes.length)),
    tempsSqlMs: mediane(essais.map((e) => e.tempsSql)),
    premierOctetMs: mediane(essais.map((e) => e.html.premierOctet)),
    totalMs: mediane(essais.map((e) => e.html.total)),
    htmlOctets: mediane(essais.map((e) => e.html.octets)),
    rscOctets: mediane(essais.map((e) => e.rsc.octets)),
    appelsAuth: mediane(essais.map((e) => e.auth)),
    requetes: essais[essais.length - 1].requetes,
  };
}

// --- Plans d'exécution ----------------------------------------------------------

/** `$1 = 'a', $2 = '5'` → ["'a'", "'5'"] (valeurs déjà citées par PostgreSQL). */
function lireParams(texte) {
  const valeurs = [];
  const re = /\$(\d+) = ('(?:[^']|'')*'|NULL)/g;
  let m;
  while ((m = re.exec(texte))) valeurs[Number(m[1]) - 1] = m[2];
  return valeurs;
}

function expliquer(sql, params) {
  const valeurs = params ? lireParams(params) : [];
  const concret = sql.replace(/\$(\d+)/g, (_, n) => valeurs[Number(n) - 1] ?? "NULL");
  try {
    return psql(DB, `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${concret}`);
  } catch (e) {
    return `(plan indisponible : ${String(e.message).split("\n")[0]})`;
  }
}

// --- Principal ------------------------------------------------------------------

async function main() {
  activerJournal();
  try {
    const resultats = [];
    for (const [nom, chemin] of pagesAMesurer()) {
      process.stderr.write(`  ${nom}…\n`);
      resultats.push(await mesurerPage(nom, chemin));
    }

    console.log(`\nBase ${DB} — médiane de ${ESSAIS} essais après une chauffe.\n`);
    console.log("| Page | SQL | Temps SQL (ms) | 1er octet (ms) | Total (ms) | HTML (Ko) | RSC (Ko) | Appels Auth |");
    console.log("|---|---|---|---|---|---|---|---|");
    for (const r of resultats) {
      console.log(
        `| ${r.nom} | ${r.sql} | ${r.tempsSqlMs.toFixed(1)} | ${r.premierOctetMs.toFixed(0)} | ${r.totalMs.toFixed(0)} | ${(r.htmlOctets / 1024).toFixed(0)} | ${(r.rscOctets / 1024).toFixed(0)} | ${r.appelsAuth} |`,
      );
    }

    // Requêtes les plus coûteuses, toutes pages confondues (dernier essai).
    const parTexte = new Map();
    for (const r of resultats) {
      for (const q of r.requetes) {
        const cle = q.sql;
        const e = parTexte.get(cle) ?? { sql: cle, nombre: 0, temps: 0, pages: new Set(), params: q.params };
        e.nombre += 1;
        e.temps += q.duree;
        e.pages.add(r.nom);
        parTexte.set(cle, e);
      }
    }
    const classees = [...parTexte.values()].sort((a, b) => b.temps - a.temps);
    console.log("\nRequêtes les plus coûteuses (toutes pages, dernier essai) :\n");
    console.log("| Temps (ms) | Fois | Pages | Requête |");
    console.log("|---|---|---|---|");
    for (const e of classees.slice(0, 15)) {
      console.log(`| ${e.temps.toFixed(1)} | ${e.nombre} | ${e.pages.size} | \`${e.sql.slice(0, 140).replace(/\|/g, "\\|")}…\` |`);
    }

    const plans = [];
    for (const e of classees.slice(0, EXPLIQUER)) {
      plans.push({ sql: e.sql, plan: expliquer(e.sql, e.params) });
    }
    for (const p of plans) {
      console.log(`\n--- ${p.sql.slice(0, 160)}…\n${p.plan}`);
    }

    if (SORTIE) {
      writeFileSync(
        SORTIE,
        JSON.stringify(
          {
            date: new Date().toISOString(),
            base: DB,
            essais: ESSAIS,
            pages: resultats.map(({ requetes, ...r }) => ({
              ...r,
              requetes: requetes.map((q) => ({ sql: q.sql, duree: q.duree })),
            })),
            couteuses: classees.slice(0, 30).map((e) => ({ ...e, pages: [...e.pages] })),
            plans,
          },
          null,
          2,
        ),
      );
      console.log(`\nDétail : ${SORTIE}`);
    }

    if (BUDGET) process.exitCode = comparerAuBudget(resultats, JSON.parse(readFileSync(BUDGET, "utf8")));
  } finally {
    couperJournal();
  }
}

/**
 * Compare le nombre de requêtes de chaque page à son budget. Rend 1 (échec) si
 * une page le dépasse, n'a pas répondu 200, ou n'a pas de budget ; une page
 * sous son budget est signalée — le budget se baisse alors à la main, pour
 * qu'un gain ne soit pas reperdu en silence.
 */
function comparerAuBudget(resultats, budget) {
  const pages = budget.pages ?? {};
  const depassements = [];
  const autres = [];
  const sous = [];
  for (const r of resultats) {
    const permis = pages[r.nom];
    if (r.statut !== 200) autres.push(`${r.nom} : la page a répondu ${r.statut} — voir le journal du serveur`);
    else if (permis === undefined)
      autres.push(`${r.nom} : aucun budget (${r.sql} requêtes mesurées) — l'ajouter à ${BUDGET}`);
    else if (r.sql > permis) depassements.push(`${r.nom} : ${r.sql} requêtes, budget ${permis} (+${r.sql - permis})`);
    else if (r.sql < permis) sous.push(`${r.nom} : ${r.sql} requêtes, budget ${permis} — à baisser`);
  }
  for (const nom of Object.keys(pages)) {
    if (!resultats.some((r) => r.nom === nom))
      autres.push(`${nom} : page du budget non mesurée — le dossier semé ne la permet plus ?`);
  }
  console.log(`\nBudget de requêtes (${BUDGET}) :`);
  for (const s of sous) console.log(`  ↓ ${s}`);
  for (const f of [...depassements, ...autres]) console.log(`  ✗ ${f}`);
  if (depassements.length + autres.length === 0) console.log("  ✓ aucune page au-dessus de son budget");
  if (depassements.length > 0)
    console.log(
      "\nUne page fait plus de requêtes qu'avant. Si c'est voulu, relever son budget dans " +
        `${BUDGET}, avec la raison dans le message de commit ; sinon, chercher la ` +
        "lecture ajoutée (une boucle, un include, une lecture en double).",
    );
  return depassements.length + autres.length === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
