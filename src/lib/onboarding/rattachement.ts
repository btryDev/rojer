import { estSiretValide, normaliserSiret, sirenDuSiret } from "@/lib/etablissements/siret";

/**
 * Une entreprise déjà suivie par le compte, telle que le parcours la montre
 * quand un nouvel établissement lui appartient. Rien d'autre ne quitte le serveur :
 * ni identifiant, ni adresse.
 */
export type EntrepriseConnue = {
  siren: string;
  raisonSociale: string;
  effectif: number;
  /** Ses salariés hors Rojer : le site qui entre en sort (`rejoindreSociete`). */
  effectifHorsRojer: number;
};

/**
 * L'entreprise du compte à laquelle ce SIRET rattache le nouvel établissement, ou
 * `null` : SIRET incomplet, invalide, ou SIREN encore inconnu du compte.
 *
 * Module pur, lu par le parcours (préremplissage) ; le serveur refait le
 * rattachement lui-même, par `(userId, siren)`, sans rien croire du client.
 */
export function entrepriseRattachee(
  saisie: string,
  connues: readonly EntrepriseConnue[],
): EntrepriseConnue | null {
  const siret = normaliserSiret(saisie);
  if (!estSiretValide(siret)) return null;
  const siren = sirenDuSiret(siret);
  return connues.find((e) => e.siren === siren) ?? null;
}

/**
 * Ce que le parcours ajoute au refus de la borne quand l'effectif vient d'une
 * entreprise reprise : le champ est alors en lecture seule, il faut dire où le
 * corriger.
 */
export const MESSAGE_EFFECTIF_REPRIS =
  "L'effectif de la société est la somme de ses établissements suivis dans Rojer et de ceux qu'il ne suit pas : s'il a changé, corrigez-le dans la page Équipe de l'un d'eux.";
