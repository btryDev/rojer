import "server-only";
// La formule du compte, lue pour l'assistance (ADR-050, amendée le
// 2026-11-24). Comme le connecteur : la ligne d'abonnement du compte, quel que
// soit l'état du lancement de l'offre — sans formule Pro, pas de question de
// prévention. Lue par le client borné au compte (ADR-051), une fois par rendu
// (`ligneAbonnementDuCompte`, partagée avec les droits de saisie).

import { cache } from "react";
import { requireCompte, type Db } from "@/lib/auth/compte";
import { ligneAbonnementDuCompte } from "@/lib/abonnements/saisie";
import { assistanceProOuverte, libelleFormuleDuCompte } from "@/lib/abonnements/assistance";

export async function formuleDAssistance(db: Db, compteId: string): Promise<{ pro: boolean; libelle: string }> {
  const ligne = await ligneAbonnementDuCompte(db, compteId);
  return { pro: assistanceProOuverte(ligne), libelle: libelleFormuleDuCompte(ligne) };
}

/** Celle du compte de la session, une fois par rendu (les coquilles, la page Assistance). */
export const formuleDAssistanceDeLaSession = cache(async () => {
  const { compte, db } = await requireCompte();
  return formuleDAssistance(db, compte.compteId);
});
