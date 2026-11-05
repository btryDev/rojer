import "server-only";
// Les quotas des formules à la création (ADR-053 § 11). Au quota, seule la
// création d'un nouvel élément est refusée : ce qui existe reste lisible,
// exportable, suivi. Aucune lecture tant que l'offre n'est pas lancée.
//
// Limite acceptée : deux onboardings finis au même instant comptent le même
// nombre et peuvent dépasser le plafond d'un. Rien n'est perdu, les deux
// établissements restent visibles, et un compte au-dessus du quota n'est
// bloqué qu'à la création suivante, jamais en lecture.

import type { Db } from "@/lib/auth/compte";
import { CLES_FORMULES, FORMULES, formuleDeLookupKey, sousLeQuota } from "./formules";
import { abonnementDuCompte, contexteDroits, offreLancee } from "./saisie";

const etablissements = (n: number) => `${n} établissement${n > 1 ? "s" : ""}`;

/**
 * Le motif du refus d'un établissement de plus, ou `null`. Formule inconnue
 * ou absente (« Sur mesure », sur devis ; pas d'abonnement, déjà gardé par
 * `verifierSaisie`) : pas de plafond ici.
 */
export async function refusQuotaEtablissements(db: Db, compteId: string): Promise<string | null> {
  if (!offreLancee(contexteDroits())) return null;
  const formule = formuleDeLookupKey((await abonnementDuCompte(db, compteId))?.formule)?.formule;
  if (!formule) return null;
  const quota = FORMULES[formule].quotas.etablissements;
  const nombre = await db.etablissement.count();
  if (quota === null || sousLeQuota(quota, nombre)) return null;
  const { libelle } = FORMULES[formule];
  const plus = CLES_FORMULES.find((f) => sousLeQuota(FORMULES[f].quotas.etablissements, nombre));
  const suite = plus
    ? `passez à ${FORMULES[plus].libelle} depuis la page Abonnement de votre compte pour en ajouter.`
    : "au-delà, la formule Sur mesure s'établit sur devis.";
  return `Votre formule ${libelle} couvre ${etablissements(quota)} : ${suite}`;
}
