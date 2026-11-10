// Scénarios de lecture du test de charge (`docs/plan-test-de-charge.md` § 5) :
// parcours Consultation (70) et DUERP (5), remis à leurs parts relatives
// tant que Saisie et Export (C3) ne sont pas écrits.
//
//   k6 run -e SCENARIO=fumee scripts/charge/k6/lecture.js
//   SCENARIO : fumee | reference | paliers | nominale | pointe | endurance | rupture
//   OBJECTIF : utilisateurs de la charge nominale (50) ; DUREE : endurance (30m)
//   DOSSIER  : n du dossier pour `reference` (1 = gros, le premier démo sinon)
import { group } from "k6";

import { dossierDuVu, lire, ouvrir, pages } from "./commun.js";

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

export default function () {
  const d = dossierDuVu();
  // Parts du § 5 entre parcours de lecture : 70 / 5, soit 14 sur 15.
  if (Math.random() < 14 / 15) consultation(d);
  else duerp(d);
}

/** Référence par page (scénario B) : chaque page, sans pause. */
export function reference() {
  const d = dossierDuVu();
  for (const nom of Object.keys(pages(d))) ouvrir(d, nom);
}
