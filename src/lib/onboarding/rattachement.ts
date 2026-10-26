import { estSiretValide, normaliserSiret, sirenDuSiret } from "@/lib/etablissements/siret";

/**
 * Une entreprise déjà suivie par le compte, telle que le parcours la montre
 * quand un nouveau site lui appartient. Rien d'autre ne quitte le serveur :
 * ni identifiant, ni adresse.
 */
export type EntrepriseConnue = {
  siren: string;
  raisonSociale: string;
  effectif: number;
};

/**
 * L'entreprise du compte à laquelle ce SIRET rattache le nouveau site, ou
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
