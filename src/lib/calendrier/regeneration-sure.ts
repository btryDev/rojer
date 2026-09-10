// Régénération du calendrier après une mutation DÉJÀ COMMITÉE.
//
// LE DÉFAUT QU'ELLE FERME. Cinq actions serveur enregistrent une mutation,
// puis appellent `genererCalendrier` pour recaler les échéances. L'appel était
// nu : une régénération qui échoue faisait échouer l'action serveur ENTIÈRE,
// alors que le dépôt de rapport, la levée de prescription ou la suppression
// venaient d'être commités. L'utilisateur voit une erreur, redépose son
// rapport, et se retrouve avec deux rapports pour un seul contrôle.
//
// La mutation est acquise ; le recalage ne l'est pas. Les deux ne doivent donc
// pas partager le même sort, et c'est tout ce que ce module dit.
//
// CE MODULE N'EST PAS UN `"use server"`, comme `reconciliation.ts` et pour la
// même raison : une fonction exportée d'un fichier d'actions devient un point
// d'entrée appelable depuis le navigateur. Il est ici, entre les deux, pour
// n'introduire aucun cycle — `regeneration-sure` → `actions` → `reconciliation`,
// et `regeneration-sure` → `reconciliation`.

import { genererCalendrier } from "./actions";
import { marquerCalendrierPerime } from "./reconciliation";

/**
 * Message rendu à l'utilisateur quand le recalage a échoué. Il dit les deux
 * choses qui comptent : ce qui est acquis, et que personne n'aura à réparer
 * quoi que ce soit à la main.
 */
export const MESSAGE_REGEN_ECHEC =
  "Modification enregistrée. Le calendrier des vérifications n'a pas pu être " +
  "recalculé à l'instant : il le sera automatiquement à la prochaine " +
  "ouverture de la page « Calendrier ».";

/**
 * Régénère, et **n'échoue jamais**.
 *
 * Rend `true` si le calendrier est à jour, `false` s'il ne l'est pas — auquel
 * cas il a été marqué périmé, donc la prochaine ouverture le reprendra d'elle-
 * même. L'appelant décide s'il en dit quelque chose : une action qui rend un
 * état à l'écran passe `MESSAGE_REGEN_ECHEC`, une action qui redirige n'a rien
 * à en faire, et dans les deux cas la mutation reste acquise.
 */
export async function regenererApresMutation(
  etablissementId: string,
  contexte: string,
): Promise<boolean> {
  try {
    await genererCalendrier(etablissementId);
    return true;
  } catch (err) {
    console.error(
      `[${contexte}] regen calendrier a échoué pour ${etablissementId}`,
      err,
    );
    // Sans cette marque, l'échec passerait inaperçu : le calendrier n'est ni
    // vide ni périmé en version, donc l'auto-réparation à l'affichage ne le
    // reprendrait pas. Il resterait juste faux.
    await marquerCalendrierPerime(etablissementId);
    return false;
  }
}
