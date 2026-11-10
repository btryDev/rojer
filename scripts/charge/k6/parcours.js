// Scénarios du test de charge (`docs/plan-test-de-charge.md` § 5). Parcours
// mêlés selon le plan : Consultation 70, Saisie 20, Export 5, DUERP 5 ;
// `PARCOURS=lecture` garde les seuls parcours de lecture (Consultation et
// DUERP, remis à leurs parts relatives).
//
//   k6 run -e SCENARIO=fumee scripts/charge/k6/parcours.js
//   SCENARIO : fumee | reference | paliers | nominale | pointe | endurance | rupture
//   OBJECTIF : utilisateurs de la charge nominale (50) ; DUREE : endurance (30m)
//   DOSSIER  : n du dossier pour `reference` (1 = gros, le premier démo sinon)
import http from "k6/http";
import { check, group } from "k6";

import { BASE, dossierDuVu, lire, ouvrir, pages } from "./commun.js";
import { deposerRapport } from "./ecriture.js";

const OBJECTIF = Number(__ENV.OBJECTIF || 50);

const SCENARIOS = {
  fumee: { executor: "constant-vus", vus: 1, duration: "1m" },
  reference: { executor: "per-vu-iterations", vus: 1, iterations: 3, exec: "reference" },
  paliers: {
    executor: "ramping-vus",
    startVUs: 1,
    stages: [1, 5, 10, 25, 50, 100].flatMap((n) => [
      { target: n, duration: "30s" },
      { target: n, duration: "3m" },
    ]),
  },
  nominale: { executor: "constant-vus", vus: OBJECTIF, duration: "15m" },
  pointe: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { target: OBJECTIF * 3, duration: "10s" },
      { target: OBJECTIF * 3, duration: "1m" },
      { target: OBJECTIF, duration: "10s" },
      { target: OBJECTIF, duration: "3m" },
    ],
  },
  endurance: { executor: "constant-vus", vus: OBJECTIF, duration: __ENV.DUREE || "30m" },
  // Monter jusqu'à l'échec, puis redescendre : la reprise se lit sur la fin.
  rupture: {
    executor: "ramping-vus",
    startVUs: 10,
    stages: [
      { target: 300, duration: "15m" },
      { target: 10, duration: "10s" },
      { target: 10, duration: "3m" },
    ],
  },
};

const scenario = __ENV.SCENARIO || "fumee";
if (!SCENARIOS[scenario]) throw new Error(`SCENARIO inconnu : ${scenario}`);

export const options = {
  scenarios: { [scenario]: SCENARIOS[scenario] },
  // Seuils proposés au § 6, à recaler après le scénario B (`reference`).
  thresholds: {
    "http_req_duration{page:Tableau de bord}": ["p(95)<1500"],
    "http_req_duration{page:Calendrier}": ["p(95)<1500"],
    "http_req_duration{page:Équipements}": ["p(95)<1000"],
    "http_req_duration{page:Registre}": ["p(95)<1000"],
    "http_req_duration{page:Fiche équipement}": ["p(95)<1000"],
    "http_req_duration{page:DUERP (unités)}": ["p(95)<1000"],
    "http_req_duration{page:DUERP (synthèse)}": ["p(95)<1000"],
    http_req_failed: ["rate<0.001"],
    "http_req_duration{page:Dépôt d'un rapport}": ["p(95)<3000"],
    isolation_page_d_un_autre_compte: ["rate==0"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

/** Consultation : board → calendrier → board → équipements → fiche → registre. */
function consultation(d) {
  group("consultation", () => {
    for (const nom of ["Tableau de bord", "Calendrier", "Tableau de bord", "Équipements"]) {
      ouvrir(d, nom);
      lire();
    }
    if (pages(d)["Fiche équipement"]) {
      ouvrir(d, "Fiche équipement");
      lire();
    }
    ouvrir(d, "Registre");
    lire();
  });
}

/** DUERP : unités → synthèse. */
function duerp(d) {
  group("duerp", () => {
    ouvrir(d, "DUERP (unités)");
    lire();
    ouvrir(d, "DUERP (synthèse)");
    lire();
  });
}

/** Saisie : board → dépôt d'un rapport (PDF de 1 Mo) → board. */
function saisie(d) {
  group("saisie", () => {
    ouvrir(d, "Tableau de bord");
    lire();
    deposerRapport(d);
    lire();
    ouvrir(d, "Tableau de bord");
    lire();
  });
}

/**
 * Export : le registre en PDF. Un 503 est la file des exports qui se dit
 * pleine (`exports/limite.ts`) : attendu sous forte charge, compté à part.
 */
function exporter(d) {
  group("export", () => {
    ouvrir(d, "Registre");
    lire();
    const r = http.get(`${BASE}/api/etablissements/${d.etablissementId}/registre/pdf`, {
      headers: { cookie: d.cookie },
      redirects: 0,
      tags: { page: "Export registre PDF" },
      responseCallback: http.expectedStatuses(200, 503),
    });
    check(r, { "Export : 200 ou 503": (x) => x.status === 200 || x.status === 503 });
    lire();
  });
}

export default function () {
  const d = dossierDuVu();
  const t = Math.random() * (__ENV.PARCOURS === "lecture" ? 75 : 100);
  if (t < 70) consultation(d);
  else if (t < 75) duerp(d);
  else if (t < 95) saisie(d);
  else exporter(d);
}

/** Référence par page (scénario B) : chaque page, sans pause. */
export function reference() {
  const d = dossierDuVu();
  for (const nom of Object.keys(pages(d))) ouvrir(d, nom);
}
