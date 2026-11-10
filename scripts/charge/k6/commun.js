// Ce que partagent les scénarios k6 du test de charge
// (`docs/plan-test-de-charge.md` §§ 5-6) : les dossiers et leurs sessions,
// la navigation comme un navigateur, le contrôle d'isolation.
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Counter, Rate } from "k6/metrics";

import { pagesDuDossier } from "../../perf/pages.mjs";

export const BASE = __ENV.BASE || "http://localhost:8080";

/** Écrit par `banc.sh semer` : un dossier, sa session, par compte. */
export const dossiers = new SharedArray("dossiers", () =>
  JSON.parse(open(__ENV.SESSIONS || "../../../.charge/sessions.json")),
);

/** Le dossier d'un utilisateur virtuel : le n-ième, puis on recommence. */
export function dossierDuVu() {
  if (__ENV.DOSSIER) return dossiers.find((d) => d.n === Number(__ENV.DOSSIER));
  return dossiers[(__VU - 1) % dossiers.length];
}

/** Les pages du dossier, par nom. */
export function pages(d) {
  return Object.fromEntries(pagesDuDossier(d));
}

// Un nom de dossier de charge dans une page : « Charge 07 — … ». Toute
// occurrence d'un AUTRE numéro que celui de la session est une fuite.
const RE_DOSSIER = /Charge (\d{2}) —/g;
export const fuites = Rate("isolation_page_d_un_autre_compte");
export const nomVu = Counter("isolation_nom_du_dossier_vu");

function controlerIsolation(d, corps) {
  if (typeof corps !== "string") return;
  const vus = [...corps.matchAll(RE_DOSSIER)].map((m) => Number(m[1]));
  if (vus.length > 0) nomVu.add(1);
  fuites.add(vus.some((n) => n !== d.n));
}

const fichiersCharges = {};

/**
 * Les fichiers statiques d'une page HTML (scripts, feuilles de style), chargés
 * une fois par utilisateur virtuel, comme le cache d'un navigateur.
 */
function chargerStatiques(corps) {
  const urls = [
    ...corps.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+)"/g),
    ...corps.matchAll(/<link[^>]+href="(\/_next\/static\/[^"]+\.css)"/g),
  ]
    .map((m) => m[1])
    .filter((u) => !fichiersCharges[u]);
  if (urls.length === 0) return;
  urls.forEach((u) => (fichiersCharges[u] = true));
  http.batch(urls.map((u) => ["GET", BASE + u, null, { tags: { page: "statique" } }]));
}

let dejaArrive = false;

/**
 * Ouvre une page comme un navigateur : la première en HTML (avec ses
 * fichiers statiques), les suivantes en navigation côté client (RSC). Une
 * redirection compte comme un échec : vers /login, la session est perdue.
 */
export function ouvrir(d, nom) {
  const chemin = pages(d)[nom];
  const parametres = { headers: { cookie: d.cookie }, redirects: 0, tags: { page: nom } };
  let r;
  if (!dejaArrive) {
    r = http.get(BASE + chemin, parametres);
    if (r.status === 200) chargerStatiques(r.body);
    dejaArrive = true;
  } else {
    // Next 16 vérifie le paramètre `_rsc` : sans en-tête de routage, la valeur
    // attendue est vide (même méthode que `mesurer.mjs`).
    parametres.headers.RSC = "1";
    r = http.get(`${BASE}${chemin}?_rsc`, parametres);
  }
  check(r, { [`${nom} : 200`]: (x) => x.status === 200 });
  controlerIsolation(d, r.body);
  return r;
}

/** Le temps de lecture d'une page par une personne : 3 à 10 s. */
export function lire() {
  sleep(3 + Math.random() * 7);
}

const ENTITES = { "&quot;": '"', "&#x27;": "'", "&#39;": "'", "&lt;": "<", "&gt;": ">", "&amp;": "&" };
const desEchapper = (s) => s.replace(/&(quot|#x27|#39|lt|gt|amp);/g, (e) => ENTITES[e]);

/**
 * Les champs cachés du formulaire d'action serveur qui contient `champ` :
 * `$ACTION_REF_n`, `$ACTION_n:k` (arguments liés, chiffrés), `$ACTION_KEY`,
 * plus ses propres champs cachés. `null` si la page n'en a pas.
 */
export function champsDuFormulaire(corps, champ) {
  for (const m of corps.matchAll(/<form[^>]*method="POST"[^>]*>([\s\S]*?)<\/form>/g)) {
    if (!m[1].includes(`name="${champ}"`)) continue;
    const champs = {};
    for (const i of m[1].matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
      const nom = /name="([^"]*)"/.exec(i[0]);
      const valeur = /value="([^"]*)"/.exec(i[0]);
      if (nom) champs[desEchapper(nom[1])] = valeur ? desEchapper(valeur[1]) : "";
    }
    return champs;
  }
  return null;
}

/**
 * Soumet un formulaire d'action serveur comme un navigateur sans JavaScript
 * (amélioration progressive de React) : la page en HTML, ses champs cachés,
 * puis un POST multipart sur la même adresse. Le serveur exécute la même
 * action qu'avec JavaScript, puis rend la page.
 */
export function soumettre(d, chemin, champ, valeurs, nom) {
  const page = http.get(BASE + chemin, {
    headers: { cookie: d.cookie },
    redirects: 0,
    tags: { page: `${nom} (formulaire)` },
  });
  const caches = page.status === 200 ? champsDuFormulaire(page.body, champ) : null;
  if (!check(caches, { [`${nom} : formulaire trouvé`]: (c) => c !== null })) return null;
  const r = http.post(BASE + chemin, { ...caches, ...valeurs }, {
    headers: { cookie: d.cookie },
    redirects: 0,
    tags: { page: nom },
  });
  check(r, { [`${nom} : accepté`]: (x) => x.status < 400 && !/Formulaire invalide|n'a pas été accepté/.test(x.body || "") });
  return r;
}
