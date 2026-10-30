import "server-only";
// Les variables d'environnement, validées une fois, au démarrage du serveur.
//
// AVANT (audit Next.js du 2026-10-14, M6). Rien ne les validait : une variable
// manquante plantait à la première requête qui la lisait, avec une erreur
// obscure (`NEXT_PUBLIC_SUPABASE_URL!` passé à `createServerClient`, une URL
// Prisma vide…), et seulement sur le chemin qui la lit.
//
// MAINTENANT. `src/instrumentation.ts` appelle `validerEnvironnementAuDemarrage`
// dans `register()`, que Next exécute avant de servir la moindre requête. Un
// serveur mal configuré ne sert aucune requête (Next garde le processus et
// répond 500 partout, vérifié avec `next start` le 2026-10-14), et le message,
// au journal, NOMME chaque variable fautive — jamais sa valeur.
//
// CE QUI EST EXIGÉ, et ce qui ne l'est pas.
//   - ~~Trois variables sans lesquelles aucune page authentifiée ne répond :
//     `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
//     `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.~~ [2026-10-30, ADR-052 :
//     `DATABASE_URL` et `BETTER_AUTH_SECRET` ; en production, `PUBLIC_APP_URL`
//     aussi — sans elle, l'authentification n'a pas d'origine de confiance et
//     aucun lien d'e-mail ne peut se construire.]
//   - `APP_ENV`, seulement pour un serveur de production qui n'est pas sur
//     Vercel (pas de `VERCEL_ENV`) : sans elle, l'environnement est
//     indéterminé et la réparation du calendrier ne s'exécute jamais
//     (`lib/environnement.ts`) — une dégradation silencieuse, que le démarrage
//     rend visible à qui déploie.
//   - Les variables optionnelles RESTENT optionnelles : posées, leur FORME est
//     vérifiée (une énumération, une URL) ; absentes, rien. Les règles qui
//     dépendent du contexte restent là où elles vivent et où leur message est
//     le plus juste : stockage (`storage/index.ts`, `STORAGE_DRIVER=local`
//     refusé en production au premier dépôt), e-mail (`email/index.ts`),
//     URL publique (`refusUrlPublique`), MCP (`mcp/acces-*.ts`, route fermée
//     plutôt que serveur en panne), Légifrance (`configurationDepuisEnv`).
//     Les rapatrier ici aurait fait tomber au démarrage des serveurs qui
//     servent correctement tout le reste.
//
// CE QUI N'EST PAS MIGRÉ. Le code continue de lire `process.env.X` là où il le
// lisait. Plusieurs lecteurs prennent l'environnement en PARAMÈTRE pour être
// testés sans muter `process.env` (`mcp/hotes.ts`, `mcp/acces-*.ts`,
// `legifrance/client.ts`, `lib/environnement.ts`), et les modules Supabase sont
// au lot sécurité puis à Better Auth. Les remplacer par un objet importé d'ici
// toucherait une vingtaine de fichiers pour un gain nul : la validation, elle,
// est faite.
//
// LE BUILD. `next build` n'exige aucune vraie valeur : la validation ne vit que
// dans `register()`, appelé au démarrage d'un serveur, et l'ignore en phase de
// build (`NEXT_PHASE`) au cas où Next l'y appellerait.

import { z } from "zod";
import { ENVIRONNEMENTS_APP } from "@/lib/environnement";
import { FORME_EXPORTS_SIMULTANES } from "@/lib/exports/limite";

type Env = Record<string, string | undefined>;

/** Une variable posée vide (ou faite d'espaces) est absente. */
const vide = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const requise = (description: string) =>
  z.preprocess(vide, z.string({ error: `absente (${description})` }));

const optionnelle = z.preprocess(vide, z.string().optional());

const urlHttp = z.string().refine((v) => {
  try {
    return ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
}, "doit être une URL http(s) complète, schéma compris");

const enumeration = <T extends readonly [string, ...string[]]>(valeurs: T) =>
  z.preprocess(
    vide,
    z.enum(valeurs, { error: `doit valoir ${valeurs.map((v) => `« ${v} »`).join(" ou ")}` }).optional(),
  );

const schema = z
  .object({
    NODE_ENV: optionnelle,

    // Base de données (Prisma). `DIRECT_URL` ne sert qu'aux migrations.
    DATABASE_URL: requise("URL PostgreSQL du client Prisma").pipe(
      z.string().regex(/^postgres(ql)?:\/\//, "doit commencer par postgresql://"),
    ),
    DIRECT_URL: optionnelle,

    // Authentification : Better Auth (ADR-052). Le secret signe les cookies
    // de session : 32 caractères au moins (`openssl rand -base64 32`).
    BETTER_AUTH_SECRET: requise("secret de Better Auth").pipe(
      z.string().min(32, "doit faire au moins 32 caractères"),
    ),

    // Environnement de l'application (`lib/environnement.ts`).
    APP_ENV: enumeration(ENVIRONNEMENTS_APP),
    VERCEL_ENV: optionnelle,

    // URL publique, e-mail.
    PUBLIC_APP_URL: z.preprocess(vide, urlHttp.optional()),
    EMAIL_DRIVER: enumeration(["console", "mailpace"] as const),
    MAILPACE_API_KEY: optionnelle,
    SIGNATURE_MAIL_FROM: optionnelle,

    // Stockage des fichiers (`storage/index.ts`).
    STORAGE_DRIVER: enumeration(["local", "supabase", "s3"] as const),
    STORAGE_BUCKET: optionnelle,
    STORAGE_LOCAL_PATH: optionnelle,
    SUPABASE_SERVICE_ROLE_KEY: optionnelle,
    // URL du projet Supabase, pour le seul stockage Supabase (Vercel), d'ici
    // la bascule ; l'authentification ne la lit plus (ADR-052).
    NEXT_PUBLIC_SUPABASE_URL: z.preprocess(vide, urlHttp.optional()),
    // Cellar (Clever Cloud) : injectées par l'add-on (`storage/s3.ts`).
    CELLAR_ADDON_HOST: optionnelle,
    CELLAR_ADDON_KEY_ID: optionnelle,
    CELLAR_ADDON_KEY_SECRET: optionnelle,

    // Serveur MCP (`mcp/acces-*.ts`, `mcp/hotes.ts`).
    MCP_CLE: optionnelle,
    MCP_ETABLISSEMENT_ID: optionnelle,
    MCP_HOTES: optionnelle,

    // Exports menés de front (`exports/limite.ts`) : à dimensionner sur la RAM
    // de l'instance, environ 400 Mo par export lourd (audit Next.js, H3).
    // Une valeur fausse retombait en silence sur le défaut : elle arrête
    // désormais le démarrage (plan de bascule, 0.5).
    EXPORTS_SIMULTANES: z.preprocess(
      vide,
      z.string().regex(FORME_EXPORTS_SIMULTANES, "doit être un entier ≥ 1").optional(),
    ),

    // API Légifrance (`legifrance/client.ts`, scripts).
    LEGIFRANCE_CLIENT_ID: optionnelle,
    LEGIFRANCE_CLIENT_SECRET: optionnelle,
    LEGIFRANCE_ENV: enumeration(["sandbox", "production"] as const),
  });

/**
 * Les règles qui dépendent d'une autre variable. Hors du schéma : zod ne les
 * jouerait qu'une fois tout le reste valide, et l'erreur arriverait en deux
 * temps au lieu de nommer toutes les fautes d'un coup.
 */
function fautesDeContexte(env: Env): { variable: string; message: string }[] {
  if (vide(env.NODE_ENV) === "production" && !vide(env.PUBLIC_APP_URL)) {
    return [
      {
        variable: "PUBLIC_APP_URL",
        message:
          "requise en production : origine de confiance de l'authentification et adresse des liens envoyés par e-mail",
      },
    ];
  }
  return [];
}

export type EnvValide = z.infer<typeof schema>;

export class ErreurEnvironnement extends Error {
  constructor(readonly variables: string[], message: string) {
    super(message);
    this.name = "ErreurEnvironnement";
  }
}

/**
 * Valide `env` et rend sa forme typée, ou lève une `ErreurEnvironnement` qui
 * nomme chaque variable fautive et la raison — jamais la valeur.
 */
export function validerEnvironnement(env: Env = process.env): EnvValide {
  const r = schema.safeParse(env);
  const fautes: { variable: string; message: string }[] = [
    ...(r.success
      ? []
      : r.error.issues.map((i) => ({ variable: String(i.path[0] ?? "?"), message: i.message }))),
    ...fautesDeContexte(env),
  ];

  if (r.success && fautes.length === 0) return r.data;

  const lignes = fautes.map((f) => `  - ${f.variable} : ${f.message}`);
  throw new ErreurEnvironnement(
    [...new Set(fautes.map((f) => f.variable))],
    // Next garde le processus en vie et répond 500 à toute requête : le
    // message le dit tel quel, sans promettre un arrêt qui n'a pas lieu.
    `Configuration invalide : le serveur ne servira aucune requête. Variable(s) en cause :\n${lignes.join("\n")}\n` +
      "Modèle et explications : .env.example.",
  );
}

/**
 * Ce qui se signale sans empêcher de servir. `APP_ENV` absente d'une
 * production qui ne se dit pas Vercel : l'environnement est alors
 * « indéterminé », et `lib/environnement.ts` en tire déjà le défaut sûr — la
 * réparation automatique du calendrier ne s'exécute pas. Rien d'autre n'en
 * dépend. En faire une faute fermait TOUTE la prod (500 partout) dès que
 * Vercel n'expose pas ses variables système à l'exécution — réglage de projet
 * qu'aucune ligne du dépôt ne garantit (revue de l'intégration Next.js du
 * 2026-10-14, B1). La sanction doit être à la mesure de la conséquence.
 */
export function avertissementsEnvironnement(env: Env = process.env): string[] {
  if (vide(env.NODE_ENV) === "production" && !vide(env.APP_ENV) && !vide(env.VERCEL_ENV)) {
    return [
      "APP_ENV absente : un serveur de production hors Vercel doit dire ce qu'il est " +
        "(production | preview | development). Sans elle, la réparation automatique " +
        "du calendrier ne s'exécute pas (lib/environnement.ts).",
    ];
  }
  return [];
}

/** Appelé par `register()` ; ne fait rien pendant `next build`. */
export function validerEnvironnementAuDemarrage(env: Env = process.env): void {
  if (env.NEXT_PHASE === "phase-production-build") return;
  validerEnvironnement(env);
  for (const message of avertissementsEnvironnement(env)) {
    console.warn(JSON.stringify({ type: "avertissement_environnement", message }));
  }
}
