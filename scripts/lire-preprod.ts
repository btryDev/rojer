/**
 * Lire la base de la PRÉPRODUCTION Clever Cloud depuis un poste — lecture seule.
 *
 *   pnpm lire-preprod connexions julien@rojer.invalid [autre@…]
 *   pnpm lire-preprod activite julien@rojer.invalid
 *
 * `connexions` : le compte existe-t-il, depuis quand, combien de sessions
 * ouvertes, date de la dernière. `activite` : ce que le compte de cette
 * personne porte (entreprises, établissements, équipements…), en nombres, et
 * la date de la dernière écriture.
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
  "        pnpm lire-preprod activite <e-mail>";

function refus(message: string): never {
  console.error(`Refusé : ${message}`);
  process.exit(1);
}

type Demande =
  | { question: "connexions"; adresses: string[] }
  | { question: "activite"; adresse: string };

function lireDemande(args: string[]): Demande {
  const [question, ...saisies] = args;
  // Better Auth écrit les adresses en minuscules : « Julien@… » ne trouverait rien.
  const adresses = saisies.map((a) => a.toLowerCase());
  if (question !== "connexions" && question !== "activite") refus(USAGE);
  if (adresses.length === 0) refus(`quelle adresse ?\n${USAGE}`);
  if (adresses.length > MAX_ADRESSES) {
    refus(`${MAX_ADRESSES} adresses au plus : ce script répond pour des comptes nommés.`);
  }
  for (const a of adresses) {
    if (!/^[^\s@]+@[^\s@]+$/.test(a)) refus(`« ${a} » n'est pas une adresse.`);
  }
  if (question === "activite") {
    if (adresses.length !== 1) refus("activite : une seule adresse.");
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
    else await activite(db, demande.adresse);
  } finally {
    await db.query("ROLLBACK").catch(() => undefined);
    await db.end();
  }
}

if (process.env.CC_APP_ID || process.env.INSTANCE_ID) {
  refus("ce script se lance depuis un poste, pas sur une instance Clever Cloud.");
}
lire(lireDemande(process.argv.slice(2))).catch(echec);
