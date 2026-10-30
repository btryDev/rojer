// Marquage de désynchronisation du calendrier.
//
// **Ce module n'est pas un `"use server"`, et c'est délibéré.** Dans un
// fichier d'actions, toute fonction exportée devient un point d'entrée
// appelable depuis le navigateur : `marquerCalendrierPerime` y serait une
// écriture sur `Etablissement` par identifiant, sans preuve que
// l'établissement appartient à l'appelant. Rien de dramatique — le pire
// effet est de faire recalculer un calendrier qui n'en avait pas besoin —
// mais c'est une écriture non autorisée sur la donnée d'autrui, et ça n'a
// pas à exister.
//
// Ici, la fonction n'est joignable que par du code serveur qui l'importe. Elle
// écrit par le client qu'on lui passe (ADR-051) : borné au compte en session —
// un établissement d'un autre compte n'est alors pas touché —, brut pour le
// script de maintenance.

import type { ClientLecture } from "./passe";

/**
 * Efface la version de référentiel d'un établissement, ce qui le replace
 * dans l'état « désynchronisé » que `calendrierDesynchronise` détecte : la
 * prochaine ouverture du calendrier le régénère d'elle-même.
 *
 * Sert au seul cas que l'auto-réparation ne voyait pas : une mutation
 * d'équipement réussit, la régénération qui la suit échoue, et le
 * calendrier reste ni vide ni périmé en version — juste faux. Sans cette
 * marque, il faudrait rendre la main à l'utilisateur (un bouton
 * « recalculer »), c'est-à-dire lui demander de réparer nos pannes.
 *
 * N'échoue jamais : elle s'exécute dans un `catch`, et si la base est
 * elle-même indisponible il n'y a rien à marquer.
 */
export async function marquerCalendrierPerime(
  client: ClientLecture,
  etablissementId: string,
): Promise<void> {
  try {
    // Par le client borné, un établissement hors du compte lève (P2025) : le
    // `catch` ci-dessous l'avale, rien n'est écrit.
    await client.etablissement.update({
      where: { id: etablissementId },
      data: { referentielVersionCalendrier: null },
    });
  } catch (err) {
    console.error(
      `[calendrier] impossible de marquer ${etablissementId} comme périmé`,
      err,
    );
  }
}
