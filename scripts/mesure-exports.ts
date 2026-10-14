/**
 * Mesure des exports PDF et ZIP (audit Next.js du 2026-10-14, H3).
 *
 *   DATABASE_URL=…/duerp_mesure_exports MESURE_USER_ID=<userId> \
 *   MESURE_ETAB=<etablissementId> MESURE_DUERP=<duerpId> \
 *   node --expose-gc --import tsx --import ./scripts/server-only-hors-next.mjs \
 *        --import ./scripts/mesure-exports-auth.mjs scripts/mesure-exports.ts <scenario> [n] [concurrence]
 *
 * Un processus par scénario, pour que le pic de mémoire (`maxRSS`) soit le
 * sien. Le route handler est appelé tel que Next l'appelle — `GET(req, { params })`
 * —, la session remplacée par une doublure qui compte ses appels
 * (`mesure-exports-auth.mjs`) ; la réponse est lue jusqu'au dernier octet.
 *
 * Ce qui est relevé, par exécution mesurée (un tour de chauffe d'abord, non compté) :
 *   - la durée jusqu'au dernier octet ;
 *   - le plus long blocage de la boucle d'événements : un minuteur de 2 ms
 *     note le plus grand écart entre deux tops. C'est le temps pendant lequel
 *     aucune autre requête du processus n'avance ;
 *   - les lectures de session (`requireUser`/`getOptionalUser`) ;
 *   - la taille de la réponse et le statut.
 * Puis, pour le processus : le RSS avant les mesures et le pic (`maxRSS`).
 *
 * Avec [concurrence] > 1, autant d'exports partent ensemble, et le scénario
 * relève en plus combien sont refusés (503).
 */
import { performance } from "node:perf_hooks";

type Scenario = { nom: string; appel: () => Promise<Response> };

const ETAB = process.env.MESURE_ETAB ?? "";
const DUERP = process.env.MESURE_DUERP ?? "";
const req = new Request("http://localhost/mesure");

async function scenarios(): Promise<Record<string, Scenario>> {
  const p = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });
  const zip = await import("../src/app/api/etablissements/[id]/controle-zip/route");
  const dossier = await import("../src/app/api/etablissements/[id]/dossier-conformite/pdf/route");
  const registre = await import("../src/app/api/etablissements/[id]/registre/pdf/route");
  const plan = await import("../src/app/api/etablissements/[id]/plan-actions/pdf/route");
  const version = await import("../src/app/duerp/[id]/versions/[numero]/pdf/route");
  const apercu = await import("../src/app/duerp/[id]/pdf/preview/route");
  return {
    zip: { nom: "ZIP de contrôle", appel: () => zip.GET(req, p({ id: ETAB })) },
    dossier: { nom: "PDF dossier de conformité", appel: () => dossier.GET(req, p({ id: ETAB })) },
    registre: { nom: "PDF registre de sécurité", appel: () => registre.GET(req, p({ id: ETAB })) },
    plan: { nom: "PDF plan d'actions", appel: () => plan.GET(req, p({ id: ETAB })) },
    version: { nom: "PDF DUERP v1", appel: () => version.GET(req, p({ id: DUERP, numero: "1" })) },
    apercu: { nom: "PDF DUERP aperçu", appel: () => apercu.GET(req, p({ id: DUERP })) },
  };
}

const sessions = () => (globalThis as { __mesureSessions?: { n: number } }).__mesureSessions?.n ?? 0;

async function lireJusquAuBout(r: Response): Promise<number> {
  if (!r.body) return 0;
  let n = 0;
  const lecteur = r.body.getReader();
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) return n;
    n += value.byteLength;
  }
}

async function executer(s: Scenario, concurrence: number) {
  let dernier = performance.now();
  let blocage = 0;
  const top = setInterval(() => {
    const t = performance.now();
    blocage = Math.max(blocage, t - dernier - 2);
    dernier = t;
  }, 2);
  const avantSessions = sessions();
  const t0 = performance.now();
  const resultats = await Promise.all(
    Array.from({ length: concurrence }, async () => {
      const r = await s.appel();
      const octets = await lireJusquAuBout(r);
      return {
        statut: r.status,
        octets,
        retryAfter: r.headers.get("Retry-After"),
        entetes: Object.fromEntries(r.headers),
      };
    }),
  );
  const duree = performance.now() - t0;
  clearInterval(top);
  return { duree, blocage, sessions: sessions() - avantSessions, resultats };
}

async function main() {
  const [nom, nArg, concArg] = process.argv.slice(2);
  const n = Number(nArg ?? 3);
  const concurrence = Number(concArg ?? 1);
  const tous = await scenarios();
  const s = tous[nom];
  if (!s) throw new Error(`scénario inconnu : ${nom} (${Object.keys(tous).join(", ")})`);
  if (!/duerp_mesure_exports|duerp_perf/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("DATABASE_URL doit viser la base locale de mesure");
  }

  // Chauffe : modules, polices, connexion Prisma.
  await executer(s, 1);
  (globalThis as { gc?: () => void }).gc?.();
  const rssAvant = process.memoryUsage().rss;

  const mesures = [];
  for (let i = 0; i < n; i++) mesures.push(await executer(s, concurrence));
  const maxRss = process.resourceUsage().maxRSS * 1024;

  const mo = (o: number) => (o / 1024 / 1024).toFixed(1);
  const durees = mesures.map((m) => m.duree).sort((a, b) => a - b);
  const r0 = mesures[0].resultats;
  const statuts = [...new Set(mesures.flatMap((m) => m.resultats.map((r) => r.statut)))].join("/");
  console.log(
    JSON.stringify({
      scenario: nom,
      concurrence,
      n,
      dureeMedianeMs: Math.round(durees[Math.floor(durees.length / 2)]),
      dureeMaxMs: Math.round(durees[durees.length - 1]),
      blocageMaxMs: Math.round(Math.max(...mesures.map((m) => m.blocage))),
      sessionsParExport: mesures[0].sessions / concurrence,
      tailleKo: Math.round((r0.find((r) => r.statut === 200)?.octets ?? 0) / 1024),
      statuts,
      entetes: r0[0].entetes,
      refus503: mesures.reduce((a, m) => a + m.resultats.filter((r) => r.statut === 503).length, 0),
      rssAvantMo: mo(rssAvant),
      picRssMo: mo(maxRss),
    }),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
