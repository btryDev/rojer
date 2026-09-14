// Régénération du calendrier après une mutation DÉJÀ COMMITÉE.
//
// LE DÉFAUT QU'ELLE FERME. Neuf appels directs, dans cinq modules d'actions
// serveur — celui des équipements passe par un helper que cinq actions
// partagent —, enregistrent une mutation,
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

import { genererCalendrier, regenererSansInvalider } from "./actions";
import { calendrierDesynchronise } from "./queries";
import { marquerCalendrierPerime } from "./reconciliation";

/**
 * Message rendu à l'utilisateur quand le recalage a échoué. Il dit les deux
 * choses qui comptent : ce qui est acquis, et que personne n'aura à réparer
 * quoi que ce soit à la main.
 */
export const MESSAGE_REGEN_ECHEC =
  "Modification enregistrée. Le calendrier des vérifications n'a pas pu être " +
  "recalculé à l'instant : il le sera automatiquement à la prochaine " +
  "ouverture du tableau de bord ou du calendrier.";

/**
 * Répare À L'AFFICHAGE un calendrier qui n'est pas à jour, et **n'échoue
 * jamais**. Rend `true` si une régénération a eu lieu.
 *
 * UN SEUL REPÈRE SUFFIT. `referentielVersionCalendrier` distingue à lui seul
 * les trois cas : jamais généré (vide à la création), régénération échouée
 * (`marquerCalendrierPerime` l'efface), référentiel changé depuis (le sceau
 * diffère). La page calendrier comptait en plus les lignes pour détecter un
 * calendrier vide — un comptage complet que le repère rend inutile.
 *
 * OÙ L'APPELER : en tête des pages d'ENTRÉE — le tableau de bord, où mènent la
 * connexion et « Reprendre mon dossier », et le calendrier —, AVANT leurs
 * lectures. Jamais dans le layout : Next rend le layout et la page EN
 * PARALLÈLE, la page lirait les anciennes lignes pendant la régénération, et
 * le layout n'est pas relancé d'une page à l'autre. Pas non plus dans chaque
 * page ni dans les fonctions de lecture : une page lance ses lectures en
 * parallèle, et chacune déclencherait sa régénération (revue du 2026-09-14).
 *
 * SANS INVALIDATION : Next refuse `revalidatePath` pendant un rendu. Les
 * pastilles de la barre latérale, rendues par le layout, peuvent garder
 * l'ancien compte jusqu'au rechargement suivant.
 *
 * Un échec est journalisé et laissé tel quel : le repère n'ayant pas été posé,
 * l'affichage suivant retentera. La page s'affiche sur les lignes en base
 * plutôt que de tomber en erreur.
 */
export async function assurerCalendrierAJour(
  etablissementId: string,
): Promise<boolean> {
  if (!(await calendrierDesynchronise(etablissementId))) return false;
  try {
    await regenererSansInvalider(etablissementId);
    return true;
  } catch (err) {
    console.error(
      `[affichage] regen calendrier a échoué pour ${etablissementId}`,
      err,
    );
    return false;
  }
}

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
