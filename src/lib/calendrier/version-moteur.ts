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
 * `version-moteur.test.ts` le rappelle : il relève le code du moteur,
 * commentaires retirés, et tombe dès qu'il bouge.
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
 *
 * Module sans import, délibérément : le référentiel le lit pour composer le
 * sceau, et il ne doit rien tirer du calendrier en retour.
 */
export const VERSION_MOTEUR_CALENDRIER = 0;
