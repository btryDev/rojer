/**
 * Le code NAF a-t-il un référentiel sectoriel de DUERP ?
 *
 * Trois secteurs sont instruits : restauration (56.xx), commerce de détail
 * (47.xx), bureau/tertiaire (62-74, 78, 82). Ailleurs, il n'y a pas d'unités
 * de travail ni de risques types à pré-charger.
 *
 * ## Ce n'était pas la bonne question, et ça fermait la porte
 *
 * Cette fonction a longtemps décidé si l'onboarding pouvait aboutir. Elle
 * refusait la création d'un dossier hors des trois secteurs, au motif que
 * « le DUERP produit ne serait pas fiable ».
 *
 * Le raisonnement mélangeait deux choses que le produit sépare partout
 * ailleurs. Le référentiel de **conformité** — 85 obligations opposables,
 * échéances, registre de sécurité — ne lit **jamais** le code NAF : il se
 * déclenche sur les équipements déclarés et sur la typologie
 * (`lib/matching/engine.ts`). Un hôtelier qui voulait seulement tenir son
 * registre et ses échéances d'ascenseur — ce que le produit sait faire — se
 * faisait refuser pour une cotation de risques qu'il n'avait pas demandée.
 * La partie molle verrouillait l'accès à la partie dure.
 *
 * Et il n'existe **aucune** référence réglementaire du document unique par
 * secteur : `L. 4121-3` et `R. 4121-1` disent « évaluez les risques » sans
 * nommer ni secteur, ni unité de travail, ni liste. Un secteur manque au
 * produit quand l'INRS n'a pas publié son guide — c'est une limite
 * éditoriale, pas juridique. Refuser au nom du droit était donc faux au fond,
 * et pas seulement trop strict.
 *
 * ## Ce qu'elle décide maintenant : rien
 *
 * Elle **constate**, elle ne barre plus. Aucun de ses états n'empêche la
 * création d'un dossier ; ils choisissent la phrase que l'écran affiche, et
 * l'absence de référentiel se dit alors au lieu de fermer la porte.
 *
 * Ouvrir sans déclarer serait pire que refuser : `sans_referentiel` doit donc
 * toujours se lire **avec** le socle de couverture
 * (`lib/perimetre/couverture.ts`, axe `secteur_duerp`), qui reprend le constat
 * en permanence sur le dossier — pas seulement au moment de la saisie.
 *
 * La source de vérité reste `trouverReferentielParNaf` (lib/referentiels).
 */

import { trouverReferentielParNaf } from "@/lib/referentiels";

const NAF_REGEX = /^\d{2}\.?\d{2}[A-Z]?$/;

export type ScopeResult =
  /** Un référentiel sectoriel couvre ce code : le DUERP sera pré-rempli. */
  | { status: "ok"; secteurId: string; secteurNom: string }
  /** Le code saisi n'a pas la forme d'un code NAF. Le seul état qui empêche
   *  encore d'avancer — mais c'est une erreur de saisie, pas un refus de
   *  périmètre. */
  | { status: "format_invalide" }
  | {
      /**
       * Aucun référentiel sectoriel n'est instruit pour ce code.
       *
       * **Ne bloque rien, et ne s'affiche plus à l'onboarding** (2026-11-17,
       * décision de la propriétaire) : l'encadré « Pas de référentiel de
       * risques types pour ce secteur » laissait croire que Rojer ne faisait
       * pas le DUERP de ce métier, alors que le DUERP part du secteur le plus
       * proche et se complète par « + Ajouter un risque ». Le constat se dit
       * au choix du secteur (`duerp/[id]/secteur`) et sur le dossier (axe
       * `secteur_duerp`).
       */
      status: "sans_referentiel";
    };

export function evaluerScopeSecteur(codeNaf: string): ScopeResult {
  const naf = codeNaf.trim().toUpperCase();
  if (!NAF_REGEX.test(naf)) return { status: "format_invalide" };

  const ref = trouverReferentielParNaf(naf);
  if (ref) {
    return {
      status: "ok",
      secteurId: ref.id,
      secteurNom: ref.nom,
    };
  }

  return { status: "sans_referentiel" };
}
