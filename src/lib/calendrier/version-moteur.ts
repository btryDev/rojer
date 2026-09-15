import {
  REFERENTIEL_VERSION,
  empreinteReferentiel,
} from "@/lib/referentiels/conformite";

/**
 * La version des RÈGLES de génération du calendrier — le code, pas le contenu
 * du référentiel.
 *
 * LE TROU QU'ELLE FERME (2026-09-15, `lot/fusibles-referentiel`). Le repère
 * posé sur un calendrier réconcilié, `SCEAU_CALENDRIER`, ne scellait que le
 * référentiel : sa version et l'empreinte de son contenu. Une règle changée
 * dans le réconciliateur — une branche de date, une garde d'archivage, une
 * condition de suppression — ne désynchronisait aucun dossier. Elle ne
 * s'appliquait qu'au hasard d'une mutation ou d'un « Actualiser », et deux
 * dossiers identiques pouvaient rester écrits par deux moteurs différents —
 * exactement ce que l'ADR-012 (§ E) reprochait au référentiel avant la version.
 *
 * À INCRÉMENTER À LA MAIN quand le code change CE QUE LA RÉGÉNÉRATION ÉCRIT :
 * quelles lignes existent, leurs dates, leur statut, leur archivage. Pas pour
 * un renommage, un commentaire ou un changement d'affichage.
 * `version-moteur.test.ts` le RAPPELLE — il relève le code du moteur et tombe
 * dès qu'il bouge —, il ne le garantit pas : recopier le relevé sans
 * incrémenter laisse tout vert.
 *
 * CE QUE COÛTE UN INCRÉMENT, et la décision appartient à la propriétaire :
 * chaque dossier est désynchronisé, donc RÉGÉNÉRÉ à sa prochaine ouverture du
 * tableau de bord ou du calendrier (`assurerCalendrierAJour`). C'est une
 * écriture en production sur tout le parc, idempotente (ADR-012), mais pas
 * silencieuse si la règle neuve déplace des dates.
 *
 * `0` = le moteur d'avant cette constante : le sceau garde alors sa forme
 * antérieure (`sceauCalendrier`), si bien que livrer la constante ne
 * régénère rien. C'est le premier incrément qui le fera.
 */
export const VERSION_MOTEUR_CALENDRIER = 0;

/**
 * La forme du sceau. Le moteur `0` n'y paraît pas : c'est le moteur d'avant la
 * constante, et le sceau garde la forme que les bases portent déjà — livrer la
 * constante ne désynchronise aucun dossier. Tout moteur suivant s'y ajoute, et
 * le premier incrément régénère le parc (2026-09-15).
 */
export function sceauCalendrier(
  version: string,
  empreinte: string,
  moteur: number,
): string {
  const referentiel = `${version}+${empreinte}`;
  return moteur === 0 ? referentiel : `${referentiel}+moteur.${moteur}`;
}

/**
 * Le repère posé sur un calendrier réconcilié, et comparé à l'ouverture pour
 * savoir s'il faut le reprendre. Il porte la version, l'empreinte et le moteur.
 *
 * La version seule ne suffisait pas, et le 2026-09-10 l'a montré : l'empreinte
 * a bougé sans elle, et aucun calendrier ne s'est repris. Une table d'historique
 * dans le test n'y peut rien — réécrire sa dernière ligne au lieu d'en ajouter
 * une laisse tout vert, et rien de ce qu'un fichier contient ne se souvient de
 * ce qu'il contenait (relecture du 2026-09-11). Avec l'empreinte dans le repère,
 * un changement de contenu désynchronise les calendriers par construction,
 * qu'on ait pensé à la version ou non. La version reste pour ce que l'empreinte
 * ne voit pas — fondements, descriptions —, et pour les documents qui la citent.
 *
 * COMPOSÉ ICI, CÔTÉ CALENDRIER, et non dans le référentiel qui le portait
 * jusqu'au 2026-09-15 : le moteur est une affaire du calendrier, et le
 * référentiel n'a rien à importer de lui. Seuls `actions.ts` (qui le pose) et
 * `queries.ts` (qui le compare) le lisent.
 *
 * Calculé une fois, au chargement du module : ni le référentiel ni le moteur ne
 * changent pendant la vie du processus.
 */
export const SCEAU_CALENDRIER = sceauCalendrier(
  REFERENTIEL_VERSION,
  empreinteReferentiel(),
  VERSION_MOTEUR_CALENDRIER,
);
