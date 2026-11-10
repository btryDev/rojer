// Parcours Saisie et Export du test de charge (`docs/plan-test-de-charge.md`
// § 5), à l'essai avant d'entrer dans le mélange des parcours (C3).
//
//   k6 run -e SCENARIO=fumee scripts/charge/k6/ecriture.js
import http from "k6/http";
import { check } from "k6";

import { BASE, dossierDuVu, lire, ouvrir, soumettre } from "./commun.js";

const pdf = open(__ENV.RAPPORT || "../../../.charge/rapport-1mo.pdf", "b");

export const options = {
  scenarios: { fumee: { executor: "per-vu-iterations", vus: 1, iterations: Number(__ENV.ITERATIONS || 2) } },
  thresholds: { checks: ["rate==1"] },
};

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Dépôt d'un rapport de prestataire (PDF de 1 Mo) sur un contrôle ouvert. */
export function deposerRapport(d) {
  const c = d.controles[Math.floor(Math.random() * d.controles.length)];
  const chemin = `/etablissements/${d.etablissementId}/equipements/${c.equipementId}/controles/${c.id}?deposer=1`;
  return soumettre(d, chemin, "fichier", {
    faitPar: "prestataire",
    dateRapport: aujourdhui(),
    resultat: "conforme",
    organismeVerif: "Organisme du test de charge",
    commentaires: "",
    fichier: http.file(pdf, "rapport-charge.pdf", "application/pdf"),
  }, "Dépôt d'un rapport");
}

export default function () {
  const d = dossierDuVu();
  ouvrir(d, "Tableau de bord");
  const r = deposerRapport(d);
  check(r, { "dépôt : réponse": (x) => x !== null });
  lire();
}
