/**
 * Lire la base de la PRÉPRODUCTION Clever Cloud depuis un poste — lecture seule.
 *
 *   pnpm lire-preprod connexions julien@rojer.invalid [autre@…]
 *   pnpm lire-preprod activite julien@rojer.invalid
 *   pnpm lire-preprod abonnement julien@rojer.invalid
 *   pnpm lire-preprod taches
 *   pnpm lire-preprod base
 *
 * `connexions` : le compte existe-t-il, depuis quand, combien de sessions
 * ouvertes, date de la dernière. `activite` : ce que le compte de cette
 * personne porte (entreprises, établissements, équipements…), en nombres, et
 * la date de la dernière écriture. `abonnement` : la copie de l'abonnement
 * que Rojer garde pour ce compte (état, formule, dates), où en est sa
 * relecture chez Stripe, et les événements reçus pour ce client. `taches` :
 * le témoin du cron (2026-11-16) — les dernières tâches du jour finies, et
 * la file Stripe (dernier événement reçu, traité, en attente). Un cron
 * arrêté ne peut pas le dire lui-même : ses alertes partent de lui.
 *
 * POURQUOI CE SCRIPT (2026-11-13). Sans recette écrite, chaque session
 * improvisait : l'une a lancé Docker pour y trouver `psql`, tronqué puis
 * filtré son résultat, et n'a rien su répondre. Ici : ni `psql` ni Docker,
 * seulement ce que le dépôt installe (`pg`, tsx) et la CLI `clever`.
 *
 * CE QU'IL GARANTIT
 * - La cible est la préproduction, par son identifiant, en dur. Aucune option
 *   ne la change : le compte Clever Cloud porte aussi RiskBoard, et la
 *   production de Rojer n'a pas à être lue par ce chemin.
 * - L'adresse de la base est demandée à Clever Cloud à l'exécution
 *   (`clever env`), jamais écrite ni affichée.
 * - La connexion est en TLS VÉRIFIÉ contre le certificat de l'add-on
 *   (`BASE_CA_PEM`), nom d'hôte compris. Sans certificat, refus ; une URL qui
 *   porte déjà des paramètres est refusée aussi (`pg` laisserait un `sslmode`
 *   hérité remplacer l'option `ssl`, constat de GestBAT).
 *   Par `pg`, pas par Prisma : le moteur de Prisma s'en remet au trousseau de
 *   macOS, qui refuse ce certificat auto-signé (« The certificate was not
 *   trusted », essayé le 2026-11-13) — sur l'instance Linux, il l'accepte.
 * - Tout se lit dans une transaction `READ ONLY` : la base refuse l'écriture.
 *   [À durcir : l'add-on sait porter des utilisateurs en lecture seule
 *   (`read_only_users`, vide au 2026-11-13). Quand il y en aura un, s'y
 *   connecter plutôt qu'avec le propriétaire.]
 * - Les réponses sont des nombres et des dates, pour des adresses NOMMÉES. Pas
 *   de liste de comptes : ce qui s'affiche ici entre dans une conversation.
 * - Il refuse de tourner sur une instance Clever Cloud.
 */
import { execFileSync } from "node:child_process";
import { Client } from "pg";

const APP_PREPROD = "app_9bbac77c-af66-4562-81a7-0257a21401ad";
const MAX_ADRESSES = 5;

const USAGE =
  "Usage : pnpm lire-preprod connexions <e-mail> [<e-mail>…]\n" +
  "        pnpm lire-preprod activite <e-mail>\n" +
  "        pnpm lire-preprod abonnement <e-mail>\n" +
  "        pnpm lire-preprod taches\n" +
  "        pnpm lire-preprod base";

function refus(message: string): never {
  console.error(`Refusé : ${message}`);
  process.exit(1);
}

type Demande =
  | { question: "connexions"; adresses: string[] }
  | { question: "activite" | "abonnement"; adresse: string }
  | { question: "taches" | "base" };

function lireDemande(args: string[]): Demande {
  const [question, ...saisies] = args;
  if (question === "taches" || question === "base") {
    if (saisies.length > 0) refus(`${question} : aucune adresse.`);
    return { question };
  }
  // Better Auth écrit les adresses en minuscules : « Julien@… » ne trouverait rien.
  const adresses = saisies.map((a) => a.toLowerCase());
  if (question !== "connexions" && question !== "activite" && question !== "abonnement") refus(USAGE);
  if (adresses.length === 0) refus(`quelle adresse ?\n${USAGE}`);
  if (adresses.length > MAX_ADRESSES) {
    refus(`${MAX_ADRESSES} adresses au plus : ce script répond pour des comptes nommés.`);
  }
  for (const a of adresses) {
    if (!/^[^\s@]+@[^\s@]+$/.test(a)) refus(`« ${a} » n'est pas une adresse.`);
  }
  if (question === "activite" || question === "abonnement") {
    if (adresses.length !== 1) refus(`${question} : une seule adresse.`);
    return { question, adresse: adresses[0] };
  }
  return { question, adresses };
}

/**
 * Les paires nom/valeur du JSON de `clever env` : les variables de
 * l'application, puis celles de ses add-ons. La PREMIÈRE valeur d'un nom
 * l'emporte, et celles d'une application liée en dépendance sont ignorées :
 * la base lue est celle de l'add-on de Rojer, pas celle d'un voisin.
 */
function variables(noeud: unknown, vues = new Map<string, string>()): Map<string, string> {
  if (Array.isArray(noeud)) {
    for (const n of noeud) variables(n, vues);
  } else if (noeud && typeof noeud === "object") {
    const o = noeud as Record<string, unknown>;
    if (typeof o.name === "string" && typeof o.value === "string") {
      if (!vues.has(o.name)) vues.set(o.name, o.value);
    } else {
      for (const [cle, v] of Object.entries(o)) {
        if (cle !== "fromDependencies") variables(v, vues);
      }
    }
  }
  return vues;
}

/** L'adresse de la base et son certificat, demandés à Clever Cloud. */
function baseDeLaPreprod(): { base: string; ca: string } {
  let brut: string;
  try {
    brut = execFileSync("clever", ["env", "--app", APP_PREPROD, "--format", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
  } catch {
    refus("`clever env` a échoué : CLI absente (npm i -g clever-tools) ou non connectée (clever login).");
  }
  const vars = variables(JSON.parse(brut));
  const base = vars.get("POSTGRESQL_ADDON_URI");
  // Une variable sur une ligne porte parfois des « \\n » littéraux.
  const ca = vars.get("BASE_CA_PEM")?.replace(/\\n/g, "\n");
  if (!base) refus("POSTGRESQL_ADDON_URI absente de la préproduction.");
  if (!/^postgres(ql)?:\/\//.test(base) || base.includes("?")) {
    refus("l'URL de la base porte des paramètres ou une forme inattendue : à relire.");
  }
  if (!ca || !ca.includes("-----BEGIN CERTIFICATE-----")) {
    refus("BASE_CA_PEM absente ou illisible : pas de lecture sans TLS vérifié.");
  }
  return { base, ca };
}

const DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  dateStyle: "short",
  timeStyle: "short",
});
const dater = (d: Date) => DATE.format(d);

type Lecteur = Pick<Client, "query">;

// Les dates de la base sont des `timestamp` SANS fuseau, écrites en UTC par
// Prisma. `pg` les lirait à l'heure du poste : chaque date sort donc de la
// requête par `AT TIME ZONE 'UTC'`, qui en fait un instant.

async function connexions(db: Lecteur, adresses: string[]) {
  const { rows } = await db.query<{
    email: string;
    cree: Date;
    sessions: number;
    derniere: Date | null;
  }>(
    `SELECT u.email,
            u."createdAt" AT TIME ZONE 'UTC' AS cree,
            (SELECT count(*)::int FROM "Session" s
              WHERE s."userId" = u.id AND s."expiresAt" > (now() AT TIME ZONE 'UTC')) AS sessions,
            (SELECT max(s."createdAt") FROM "Session" s WHERE s."userId" = u.id) AT TIME ZONE 'UTC' AS derniere
       FROM "User" u
      WHERE u.email = ANY($1::text[])`,
    [adresses],
  );
  for (const adresse of adresses) {
    const l = rows.find((x) => x.email === adresse);
    console.log(
      l
        ? `${adresse} : compte créé le ${dater(l.cree)} ; ${l.sessions} session(s) en cours ; ` +
            (l.derniere
              ? `dernière connexion connue le ${dater(l.derniere)}.`
              : "aucune connexion gardée en base.")
        : `${adresse} : aucun compte à cette adresse.`,
    );
  }
  console.log(
    "(Heure de Paris. Une session expirée n'est pas comptée « en cours ». Se déconnecter efface la " +
      "session : « aucune connexion gardée » ne dit pas que la personne ne s'est jamais connectée.)",
  );
}

type Nombres = {
  entreprises: number;
  etablissements: number;
  equipements: number;
  verifications: number;
  rapports: number;
  actions: number;
  salaries: number;
  duerps: number;
  derniere: Date | null;
};

async function activite(db: Lecteur, adresse: string) {
  const comptes = await db.query<{ compte: string; role: string }>(
    `SELECT m."compteId"::text AS compte, m.role
       FROM "Membre" m JOIN "User" u ON u.id = m."userId"
      WHERE u.email = $1
      ORDER BY m."createdAt", m."compteId"`,
    [adresse],
  );
  if (comptes.rows.length === 0) {
    console.log(`${adresse} : aucun compte, ou membre d'aucun compte.`);
    return;
  }
  const plusieurs = comptes.rows.length > 1;
  for (const [rang, { compte, role }] of comptes.rows.entries()) {
    const {
      rows: [n],
    } = await db.query<Nombres>(
      `WITH etabs AS (
         SELECT t.id, t."updatedAt"
           FROM "Etablissement" t JOIN "Entreprise" e ON e.id = t."entrepriseId"
          WHERE e."compteId" = $1::uuid
       )
       SELECT
         (SELECT count(*)::int FROM "Entreprise" WHERE "compteId" = $1::uuid) AS entreprises,
         (SELECT count(*)::int FROM etabs) AS etablissements,
         (SELECT count(*)::int FROM "Equipement" WHERE "etablissementId" IN (SELECT id FROM etabs)) AS equipements,
         (SELECT count(*)::int FROM "Verification" WHERE "etablissementId" IN (SELECT id FROM etabs)) AS verifications,
         (SELECT count(*)::int FROM "RapportVerification" WHERE "etablissementId" IN (SELECT id FROM etabs)) AS rapports,
         (SELECT count(*)::int FROM "Action" WHERE "etablissementId" IN (SELECT id FROM etabs)) AS actions,
         (SELECT count(*)::int FROM "Salarie" WHERE "etablissementId" IN (SELECT id FROM etabs)) AS salaries,
         (SELECT count(*)::int FROM "Duerp" WHERE "etablissementId" IN (SELECT id FROM etabs)) AS duerps,
         GREATEST(
           (SELECT max("updatedAt") FROM "Entreprise" WHERE "compteId" = $1::uuid),
           (SELECT max("updatedAt") FROM etabs),
           (SELECT max("updatedAt") FROM "Equipement" WHERE "etablissementId" IN (SELECT id FROM etabs)),
           (SELECT max("updatedAt") FROM "Verification" WHERE "etablissementId" IN (SELECT id FROM etabs)),
           (SELECT max("createdAt") FROM "RapportVerification" WHERE "etablissementId" IN (SELECT id FROM etabs)),
           (SELECT max("updatedAt") FROM "Action" WHERE "etablissementId" IN (SELECT id FROM etabs)),
           (SELECT max("updatedAt") FROM "Salarie" WHERE "etablissementId" IN (SELECT id FROM etabs)),
           (SELECT max("updatedAt") FROM "Duerp" WHERE "etablissementId" IN (SELECT id FROM etabs))
         ) AT TIME ZONE 'UTC' AS derniere`,
      [compte],
    );
    console.log(
      `${adresse} (${role}${plusieurs ? `, compte ${rang + 1} sur ${comptes.rows.length}` : ""}) : ` +
        `${n.entreprises} entreprise(s), ${n.etablissements} établissement(s), ` +
        `${n.equipements} équipement(s), ${n.verifications} vérification(s), ${n.rapports} rapport(s), ` +
        `${n.actions} action(s), ${n.salaries} salarié(s), ${n.duerps} DUERP ; ` +
        (n.derniere ? `dernière écriture le ${dater(n.derniere)}.` : "aucune écriture."),
    );
  }
  console.log(
    "(Heure de Paris. Les nombres sont ceux du compte entier : ses autres membres y écrivent aussi, " +
      "et un jeu de données semé compte comme une écriture.)",
  );
}

type LigneAbonnement = {
  role: string;
  ligne: boolean;
  client: string | null;
  abonnement_lie: boolean;
  statut: string | null;
  formule: string | null;
  fin_essai: Date | null;
  fin_periode: Date | null;
  resilie: boolean | null;
  fin_prevue: Date | null;
  essai_utilise: Date | null;
  debut_payant: Date | null;
  relue: Date | null;
  creee: Date | null;
  modifiee: Date | null;
};

const ouDate = (d: Date | null) => (d ? dater(d) : "—");

/**
 * La copie de l'abonnement du compte, sa relecture et ses événements. Aucun
 * identifiant Stripe n'est affiché : il ne sert qu'à relier les trois tables.
 */
async function abonnement(db: Lecteur, adresse: string) {
  const { rows } = await db.query<LigneAbonnement>(
    `SELECT m.role,
            a.id IS NOT NULL AS ligne,
            a."stripeCustomerId" AS client,
            a."stripeSubscriptionId" IS NOT NULL AS abonnement_lie,
            a.statut, a.formule,
            a."finEssai" AT TIME ZONE 'UTC' AS fin_essai,
            a."finPeriode" AT TIME ZONE 'UTC' AS fin_periode,
            a."resilieEnFinDePeriode" AS resilie,
            a."finPrevueLe" AT TIME ZONE 'UTC' AS fin_prevue,
            a."essaiUtiliseLe" AT TIME ZONE 'UTC' AS essai_utilise,
            a."debutPayantLe" AT TIME ZONE 'UTC' AS debut_payant,
            a."relueLe" AT TIME ZONE 'UTC' AS relue,
            a."createdAt" AT TIME ZONE 'UTC' AS creee,
            a."updatedAt" AT TIME ZONE 'UTC' AS modifiee
       FROM "Membre" m
       JOIN "User" u ON u.id = m."userId"
       LEFT JOIN "Abonnement" a ON a."compteId" = m."compteId"
      WHERE u.email = $1
      ORDER BY m."createdAt", m."compteId"`,
    [adresse],
  );
  if (rows.length === 0) {
    console.log(`${adresse} : aucun compte, ou membre d'aucun compte.`);
    return;
  }
  for (const [rang, l] of rows.entries()) {
    const titre = `${adresse} (${l.role}${rows.length > 1 ? `, compte ${rang + 1} sur ${rows.length}` : ""})`;
    if (!l.ligne || !l.client) {
      console.log(`${titre} : aucune ligne d'abonnement pour ce compte.`);
      continue;
    }
    console.log(
      `${titre} : état ${l.statut ?? "VIDE"} ; formule ${l.formule ?? "VIDE"} ; ` +
        `abonnement Stripe ${l.abonnement_lie ? "lié" : "NON LIÉ"} ; fin d'essai ${ouDate(l.fin_essai)} ; ` +
        `fin de période ${ouDate(l.fin_periode)} ; résiliation en fin de période ${l.resilie ? "oui" : "non"} ; ` +
        `fin prévue ${ouDate(l.fin_prevue)} ; essai utilisé ${ouDate(l.essai_utilise)} ; ` +
        `premier paiement ${ouDate(l.debut_payant)} ; relue chez Stripe ${ouDate(l.relue)} ; ` +
        `ligne créée ${ouDate(l.creee)}, modifiée ${ouDate(l.modifiee)}.`,
    );
    const {
      rows: [s],
    } = await db.query<{
      demandes: number;
      traitees: number;
      tentatives: number;
      erreur: string | null;
      echec: Date | null;
      synchronise: Date | null;
      bail: Date | null;
    }>(
      `SELECT demandes, traitees, tentatives, "derniereErreur" AS erreur,
              "echecDurableLe" AT TIME ZONE 'UTC' AS echec,
              "synchroniseLe" AT TIME ZONE 'UTC' AS synchronise,
              "bailJusquAu" AT TIME ZONE 'UTC' AS bail
         FROM "SynchronisationStripe" WHERE "customerId" = $1`,
      [l.client],
    );
    console.log(
      s
        ? `  relecture : ${s.demandes} demandée(s), ${s.traitees} traitée(s), ${s.tentatives} tentative(s) en échec ; ` +
            `dernière réussie ${ouDate(s.synchronise)} ; bail jusqu'au ${ouDate(s.bail)} ; ` +
            `dernière erreur ${s.erreur ?? "aucune"} ; échec durable ${ouDate(s.echec)}.`
        : "  relecture : jamais demandée pour ce client.",
    );
    const { rows: evenements } = await db.query<{
      type: string;
      recus: number;
      non_traites: number;
      dernier: Date;
      erreur: string | null;
    }>(
      `SELECT type, count(*)::int AS recus,
              count(*) FILTER (WHERE "traiteLe" IS NULL)::int AS non_traites,
              max("recuLe") AT TIME ZONE 'UTC' AS dernier,
              max("derniereErreur") AS erreur
         FROM "EvenementStripe" WHERE "clientStripe" = $1
        GROUP BY type ORDER BY max("recuLe")`,
      [l.client],
    );
    if (evenements.length === 0) console.log("  événements : aucun rattaché à ce client.");
    for (const e of evenements) {
      console.log(
        `  événement ${e.type} : ${e.recus} reçu(s), ${e.non_traites} non traité(s), dernier le ${dater(e.dernier)}` +
          (e.erreur ? ` ; erreur ${e.erreur}` : "") +
          ".",
      );
    }
  }
  console.log("(Heure de Paris. « VIDE » : la colonne n'a jamais été écrite depuis Stripe.)");
}

/**
 * Le témoin du cron : les cinq derniers jours de tâches (fini à quelle heure,
 * avec ou sans tâche en échec) et l'état de la file Stripe. Aucune donnée de
 * compte : des dates et des nombres.
 */
async function taches(db: Lecteur) {
  const { rows: jours } = await db.query<{ jour: string; finie: Date | null; erreurs: number; config: number }>(
    `SELECT jour, "termineeLe" AT TIME ZONE 'UTC' AS finie,
            (SELECT count(*)::int FROM jsonb_each(COALESCE(bilan::jsonb, '{}'::jsonb)) b
              WHERE b.value @> '{"erreur": true}'::jsonb) AS erreurs,
            COALESCE((bilan::jsonb #>> '{configuration,problemes}')::int, 0) AS config
       FROM "TacheQuotidienne" ORDER BY jour DESC LIMIT 5`,
  );
  if (jours.length === 0) console.log("Tâches du jour : aucune exécution enregistrée.");
  for (const j of jours) {
    console.log(
      `Tâches du ${j.jour} : ${j.finie ? `finies le ${dater(j.finie)}` : "PAS FINIES"}` +
        (j.erreurs > 0 ? ` — ${j.erreurs} tâche(s) en échec` : "") +
        (j.config > 0 ? " — configuration à corriger" : "") +
        ".",
    );
  }
  const {
    rows: [f],
  } = await db.query<{
    recu: Date | null;
    traite: Date | null;
    attente: number;
    bloques: number;
    durables: number;
    clients: number;
  }>(
    `SELECT max("recuLe") AT TIME ZONE 'UTC' AS recu,
            max("traiteLe") AT TIME ZONE 'UTC' AS traite,
            count(*) FILTER (WHERE "traiteLe" IS NULL AND "echecDurableLe" IS NULL)::int AS attente,
            count(*) FILTER (WHERE "traiteLe" IS NULL AND "echecDurableLe" IS NULL
                             AND "recuLe" < (now() AT TIME ZONE 'UTC') - interval '1 hour')::int AS bloques,
            count(*) FILTER (WHERE "echecDurableLe" IS NOT NULL)::int AS durables,
            (SELECT count(*)::int FROM "SynchronisationStripe" WHERE "echecDurableLe" IS NOT NULL) AS clients
       FROM "EvenementStripe"`,
    // « Plus d'une heure » : le seuil de `etatDesEvenements` (stripe/evenements.ts), qui alerte chaque jour.
  );
  console.log(
    `File Stripe : dernier événement reçu ${ouDate(f.recu)}, traité ${ouDate(f.traite)} ; ` +
      `${f.attente} en attente dont ${f.bloques} depuis plus d'une heure ; ${f.durables} événement(s) et ${f.clients} client(s) en échec durable.`,
  );
  console.log(
    "(Heure de Paris. Les tâches du jour se lancent dès 9 h : « PAS FINIES » après midi, ou aucun jour récent, veut dire que le cron ne tourne plus.)",
  );
}

/**
 * Les réglages du serveur qui ferment des connexions (2026-11-16 : des
 * « Error in PostgreSQL connection: kind: Closed » au journal, à la minute du
 * cron), et l'âge des connexions de l'application ouvertes en ce moment.
 * Aucune donnée : des réglages et des durées.
 */
async function reglagesDeLaBase(db: Lecteur) {
  for (const reglage of [
    "server_version",
    "idle_session_timeout",
    "idle_in_transaction_session_timeout",
    "statement_timeout",
    "tcp_keepalives_idle",
    "tcp_keepalives_interval",
    "tcp_keepalives_count",
    "max_connections",
  ]) {
    const { rows } = await db.query<{ v: string }>(`SELECT current_setting($1, true) AS v`, [reglage]);
    console.log(`${reglage} = ${rows[0]?.v ?? "—"}`);
  }
  const { rows } = await db.query<{ etat: string | null; n: number; inactive_max: number | null }>(
    `SELECT state AS etat, count(*)::int AS n,
            max(extract(epoch FROM now() - state_change))::int AS inactive_max
       FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
      GROUP BY state ORDER BY state`,
  );
  for (const r of rows) {
    console.log(`connexions ${r.etat ?? "?"} : ${r.n}${r.inactive_max !== null ? ` (la plus ancienne dans cet état : ${r.inactive_max} s)` : ""}`);
  }
}

/** La cause, sans l'adresse de la base si un message venait à la citer. */
function echec(erreur: unknown): never {
  const e = erreur as { code?: string; message?: string };
  const cause = [e?.code, e?.message]
    .filter(Boolean)
    .join(" — ")
    .replace(/postgres(ql)?:\/\/\S+/g, "postgresql://…");
  console.error(`Lecture impossible : ${cause || "erreur inconnue"}.`);
  process.exit(1);
}

async function lire(demande: Demande) {
  const { base, ca } = baseDeLaPreprod();
  const db = new Client({
    connectionString: base,
    // Chaîne ET nom d'hôte vérifiés (défauts de Node) : rien ne les desserre.
    ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 20_000,
    statement_timeout: 15_000,
  });
  // Une coupure en cours de lecture : dite en une ligne, pas en pile d'appels.
  db.on("error", (erreur) => echec(erreur));
  await db.connect();
  try {
    // La base refuse ensuite toute écriture, quoi que fasse la suite de ce
    // fichier ; rien n'est validé, la transaction est toujours annulée.
    await db.query("BEGIN TRANSACTION READ ONLY");
    if (demande.question === "connexions") await connexions(db, demande.adresses);
    else if (demande.question === "taches") await taches(db);
    else if (demande.question === "base") await reglagesDeLaBase(db);
    else if (demande.question === "activite") await activite(db, demande.adresse);
    else await abonnement(db, demande.adresse);
  } finally {
    await db.query("ROLLBACK").catch(() => undefined);
    await db.end();
  }
}

if (process.env.CC_APP_ID || process.env.INSTANCE_ID) {
  refus("ce script se lance depuis un poste, pas sur une instance Clever Cloud.");
}
lire(lireDemande(process.argv.slice(2))).catch(echec);
