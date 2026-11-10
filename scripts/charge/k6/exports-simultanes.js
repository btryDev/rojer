// Exports lancés ensemble (`docs/plan-test-de-charge.md`, scénario H2) :
// combien d'exports simultanés le serveur tient, et ce que les autres
// utilisateurs subissent pendant ce temps.
//
//   k6 run -e N=6 -e HISTORIQUE=demo scripts/charge/k6/exports-simultanes.js
//   N          : exports lancés au même instant (un par compte : la file
//                admet 2 exports par personne, `exports/limite.ts`)
//   HISTORIQUE : demo (dossiers 6-50, sans historique) | un-an (51, 55-66, 682 rapports)
//   DOSSIERS   : liste de numéros de dossier, à la place de HISTORIQUE
//   EXPORT     : registre/pdf (défaut) | controle-zip | dossier-conformite/pdf
//
// En fond, 20 utilisateurs consultent leurs pages pendant toute la durée : leur
// temps de réponse pendant la vague dit si l'application reste utilisable.
import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";

import { BASE, dossiers, lire, ouvrir } from "./commun.js";

const N = Number(__ENV.N || 6);
const EXPORT = __ENV.EXPORT || "registre/pdf";
const VIVIERS = {
  demo: Array.from({ length: 45 }, (_, i) => i + 6),
  "un-an": [51, ...Array.from({ length: 12 }, (_, i) => i + 55)],
};
// `DOSSIERS=52,68` : des dossiers désignés, à la place d'un vivier.
const vivier = __ENV.DOSSIERS
  ? __ENV.DOSSIERS.split(",").map(Number)
  : VIVIERS[__ENV.HISTORIQUE || "demo"];
if (!vivier) throw new Error(`HISTORIQUE inconnu : ${__ENV.HISTORIQUE}`);
if (N > vivier.length) throw new Error(`N = ${N} : le vivier n'a que ${vivier.length} comptes.`);

const parN = (n) => dossiers.find((d) => d.n === n);

const servis = new Counter("exports_servis");
const refuses = new Counter("exports_refuses_503");
const autres = new Counter("exports_autre_statut");
const dureeServi = new Trend("export_duree_servi", true);

export const options = {
  scenarios: {
    fond: { executor: "constant-vus", vus: 20, duration: __ENV.DUREE || "4m", exec: "fond" },
    vague: { executor: "per-vu-iterations", vus: N, iterations: 1, startTime: "30s", exec: "vague", maxDuration: "3m" },
  },
  summaryTrendStats: ["avg", "med", "p(95)", "max"],
};

/** Consultation continue sur les dossiers de démo 6 à 25. */
export function fond() {
  const d = parN(6 + ((__VU - 1) % 20));
  for (const nom of ["Tableau de bord", "Calendrier", "Équipements"]) {
    ouvrir(d, nom);
    lire();
  }
}

/** Un export par compte, tous au même instant. */
export function vague() {
  const d = parN(vivier[(__VU - 1) % vivier.length]);
  const r = http.get(`${BASE}/api/etablissements/${d.etablissementId}/${EXPORT}`, {
    headers: { cookie: d.cookie },
    redirects: 0,
    timeout: "180s",
    tags: { page: "Export (vague)" },
    responseCallback: http.expectedStatuses(200, 503),
  });
  if (r.status === 200) {
    servis.add(1);
    dureeServi.add(r.timings.duration);
  } else if (r.status === 503) refuses.add(1);
  else autres.add(1);
  check(r, { "export : 200 ou 503": (x) => x.status === 200 || x.status === 503 });
}
