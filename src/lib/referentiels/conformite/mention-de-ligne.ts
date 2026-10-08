/**
 * La mention de rythme retenu d'une LIGNE persistée (`Verification`), lue au
 * référentiel par son `obligationId` (ADR-039 § 4).
 *
 * Écrite une fois pour toutes les surfaces qui lisent des lignes — calendrier,
 * fiche de vérification, registre et dossier PDF, ZIP de contrôle, MCP —, sur
 * le modèle de `estEcheanceContractuelle` : chacune redemandant « l'obligation
 * a-t-elle un rythme retenu, et la ligne est-elle surchargée ? » finirait par
 * diverger d'une.
 *
 * Module serveur : il lit le référentiel entier (`obligationParId`). Un
 * composant client reçoit la mention déjà calculée, jamais l'obligation.
 */

import { obligationParId } from "./index";
import { mentionRythmeDeLigne, type MentionRythme } from "./mention-rythme";

export function mentionRythmeDeVerification(v: {
  obligationId: string;
  prescriptionId?: string | null;
  prescription?: unknown;
}): MentionRythme | null {
  // Une ligne née d'une prescription — surchargée, ou sur mesure — tient son
  // rythme de l'acte, pas de Rojer : pas de mention (préséance, ADR-039 § 3).
  return mentionRythmeDeLigne(
    obligationParId(v.obligationId),
    v.prescriptionId != null || v.prescription != null,
  );
}
