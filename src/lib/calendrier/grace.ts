// Le délai de grâce d'une ligne née d'un changement du référentiel — ADR-040.
//
// CE MODULE NE DIT QU'UNE CHOSE : à la NAISSANCE d'une ligne, a-t-elle droit à
// une grâce, et jusqu'à quel jour. La LECTURE — la ligne est-elle en grâce
// aujourd'hui ? — est `delaiDeGrace` (`lib/dates/retard.ts`), à côté des
// prédicats de retard qui la respectent.
//
// LE CRITÈRE, ET POURQUOI CELUI-LÀ. Une ligne naît dans une passe de
// régénération. La passe sait une chose que la ligne ne garde pas : POURQUOI
// elle tourne. Le repère `Etablissement.referentielVersionCalendrier` le dit
// sans ambiguïté au moment de la lecture —
//   · `null` : dossier neuf (création, onboarding) ou marqué périmé après une
//     régénération échouée → pas de grâce ;
//   · égal au sceau courant : le calendrier était à jour, la passe suit une
//     MUTATION du dirigeant (équipement, titre, prescription, fiche) → pas de
//     grâce ;
//   · présent et DIFFÉRENT du sceau courant : le référentiel ou le moteur a
//     changé depuis la dernière réconciliation → les lignes que la passe crée
//     sont nées de ce changement → grâce.
// Ce fait disparaît dès que la passe a posé le nouveau sceau : il faut donc
// l'écrire sur la ligne à sa naissance (`Verification.graceJusquAu`), aucune
// lecture ultérieure ne pouvant le reconstituer.
//
// AUCUNE HORLOGE LUE ICI : `now` est celui de la passe, le même qui écrit
// `suiviDepuis`. La grâce court donc de l'origine du suivi, au jour civil.

import { ajouterMois, debutDuJour, formaterDateFr } from "@/lib/dates";
import { delaiDeGrace, type VerificationDatee } from "@/lib/dates/retard";

/** La durée de la grâce, en mois civils (décision de la propriétaire,
 *  2026-10-08). Une ligne déjà née garde la date écrite à sa naissance : la
 *  changer ici ne vaut que pour les lignes à naître. */
export const DELAI_DE_GRACE_MOIS = 3;

/**
 * Le dernier jour de grâce d'une ligne qui naît dans cette passe, ou `null`
 * si elle n'y a pas droit.
 *
 * @param repereLu  `referentielVersionCalendrier` tel que la passe l'a LU, avant
 *                  d'écrire le sien.
 * @param sceau     le sceau courant (`SCEAU_CALENDRIER`).
 * @param now       l'horloge de la passe — l'origine du suivi de la ligne.
 */
export function graceANaissance(
  repereLu: string | null | undefined,
  sceau: string,
  now: Date,
): Date | null {
  // `==` ET NON `===` : un repère ABSENT (`undefined` — un `select` qui
  // l'oublie, une fixture) se lit comme un dossier neuf, sans grâce. C'est le
  // sens visible de l'erreur : une ligne comptée en retard se remarque, une
  // grâce accordée à tort ne se remarque pas.
  if (repereLu == null || repereLu === sceau) return null;
  return ajouterMois(debutDuJour(now), DELAI_DE_GRACE_MOIS);
}

/**
 * Ce que l'écran dit d'une ligne EN GRÂCE : « délai jusqu'au 15/04/2027 »,
 * à côté de « à planifier » — jamais une échéance, la ligne n'en a pas.
 * `null` hors grâce. Une phrase, une source : `delaiDeGrace`.
 */
export function mentionDelaiDeGrace(
  v: VerificationDatee,
  now: Date,
  { enTete = false }: { enTete?: boolean } = {},
): string | null {
  const fin = delaiDeGrace(v, now);
  if (fin === null) return null;
  return `${enTete ? "Délai" : "délai"} jusqu'au ${formaterDateFr(fin)}`;
}
