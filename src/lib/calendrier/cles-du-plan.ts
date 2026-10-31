// La porte de la régénération (ADR-051, conception du calendrier, 2026-10-30) :
// aucune clé n'est écrite que la lecture de la passe n'a pas rendue.
//
// La passe écrit son plan par le client brut, en une transaction par lot (un
// aller-retour). En session, elle lit par le client borné au compte ; le plan
// est calculé sur cette lecture. Cette fonction vérifie, en mémoire, que chaque
// clé du plan vient bien de la lecture DE CET ÉTABLISSEMENT — équipements
// actifs, prescriptions actives, salariés présents, lignes de calendrier. Sinon
// elle lève, avant toute écriture. Même garantie que `creerEnLotVerifie`, sans
// requête de plus, et dans les deux chemins (session et script).

import type { PlanReconciliation } from "./generateur";
import type { LecturePasse } from "./passe";

/** Lève si une clé du plan ne vient pas de la lecture de cet établissement. */
export function clesDuPlanDansLaLecture(plan: PlanReconciliation, lecture: LecturePasse): void {
  const equipements = new Set(lecture.etab.equipements.map((e) => e.id));
  const prescriptions = new Set(lecture.etab.prescriptionsParticulieres.map((p) => p.id));
  const salaries = new Set(lecture.titresBruts.map((t) => t.salarieId));
  const lignes = new Set(lecture.existantes.map((e) => e.id));

  const etrangeres: string[] = [];
  const verifier = (genre: string, valeur: string | null | undefined, connues: Set<string>) => {
    if (valeur !== null && valeur !== undefined && !connues.has(valeur)) etrangeres.push(`${genre}:${valeur}`);
  };

  for (const c of plan.aCreer) {
    verifier("equipement", c.equipementId, equipements);
    verifier("salarie", c.salarieId, salaries);
    verifier("prescription", c.prescriptionId, prescriptions);
  }
  for (const m of plan.aMettreAJour) {
    verifier("ligne", m.id, lignes);
    verifier("prescription", m.prescriptionId, prescriptions);
  }
  for (const { id } of [...plan.aArchiver, ...plan.aDesarchiver]) verifier("ligne", id, lignes);
  for (const id of plan.aSupprimer) verifier("ligne", id, lignes);

  if (etrangeres.length > 0)
    throw new Error(
      `Régénération refusée : clés hors de la lecture de l'établissement ${lecture.etab.id} (${etrangeres.slice(0, 5).join(", ")})`,
    );
}
