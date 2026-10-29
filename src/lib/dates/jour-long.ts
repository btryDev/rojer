// Hors de `index.ts`, et ce n'est pas un hasard : `index.ts` est relevé par
// l'empreinte du moteur de calendrier (`version-moteur.test.ts`), et une
// fonction d'affichage ajoutée là imposerait de régénérer tous les dossiers.
// Ce formateur ne décide d'aucune échéance ; il n'a rien à faire dans le sceau.

import { FUSEAU_REFERENCE } from "./index";

const FMT_JOUR_DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** « lundi 10 août 2026 » — le jour de la semaine en tête, sans zéro devant
 *  le numéro. En minuscule, comme le rend la langue : la majuscule de début
 *  de phrase est l'affaire de l'appelant. */
export function formaterJourDateLongueFr(d: Date): string {
  return FMT_JOUR_DATE_LONGUE.format(d);
}
