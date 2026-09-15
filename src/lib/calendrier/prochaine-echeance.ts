// « La prochaine échéance » d'un ensemble de lignes de suivi — UNE définition.
//
// Elle se calculait deux fois, et les deux réponses divergeaient pour le même
// appareil (relecture système du 2026-09-14) : la carte du tableau de bord
// (`compterVerifsParEquipement`) ne retenait que les échéances à venir, et
// taisait donc la date d'un contrôle planifié puis manqué ; la vue du parc
// (`repartirParEquipement`) retenait le retard, mais le lisait sur le
// CLASSEMENT — si bien qu'une ligne « à planifier » dont la date de génération
// était passée, classée « en retard », y devenait « prochaine échéance » à la
// date où le dossier avait été créé. Deux erreurs opposées, chacune sur un
// écran. Le widget « Prochaine échéance » du board en portait une troisième
// copie, triée sur la page.

import { aUnRendezVous, classerVerification, cinqProchaines } from "./etats";
import type { VerificationDatee } from "@/lib/dates/retard";

/** Les seuls états qu'une échéance connue non réalisée peut porter. */
export type RegistreEcheanceConnue = "enRetard" | "proche" | "lointain";

export type EcheanceConnue<T> = {
  ligne: T;
  date: Date;
  registre: RegistreEcheanceConnue;
};

/**
 * La prochaine échéance d'un ensemble de lignes : **la plus ancienne échéance
 * CONNUE qui attend encore son contrôle.**
 *
 * POURQUOI LA PLUS ANCIENNE, RETARD COMPRIS. Pour un dirigeant, « la prochaine
 * échéance » répond à « quelle est la prochaine date qui m'engage ? ». Une
 * échéance planifiée puis manquée l'engage davantage que la suivante : le
 * contrôle est dû depuis cette date, et le taire au profit d'un rendez-vous
 * dans trois mois ferait lire un appareil en retard comme un appareil suivi.
 * La vue du parc l'avait déjà tranché ainsi (« le retard EST le prochain
 * rendez-vous ») ; le tableau de bord, qui le taisait, n'affichait nulle part
 * la date qu'il calculait — c'est lui qui s'aligne.
 *
 * POURQUOI « CONNUE ». Une ligne sans échéance connue (`aUnRendezVous` faux :
 * « à planifier », ou archivée) n'a PAS de date à fournir : sa `datePrevue` est
 * une date de génération. Elle reste comptée en retard ailleurs quand elle
 * l'est (`classerVerification`) ; elle n'est simplement jamais « la prochaine
 * échéance ». Le test porte sur le STATUT (`aUnRendezVous`), jamais sur le
 * classement : c'est précisément la lecture par le classement qui faisait de la
 * date de génération d'une « à planifier » en retard un rendez-vous manqué.
 *
 * POURQUOI « QUI ATTEND ». Une ponctuelle consommée (classée « faite ») porte un
 * statut réalisé, donc passe `aUnRendezVous` : sa date est un passé soldé, pas
 * un engagement.
 *
 * `null` quand aucune ligne n'a d'échéance connue en attente. À date égale, la
 * première rencontrée l'emporte : l'appelant qui trie garde son ordre.
 */
export function prochaineEcheanceConnue<T extends VerificationDatee>(
  lignes: Iterable<T>,
  now: Date,
): EcheanceConnue<T> | null {
  let retenue: EcheanceConnue<T> | null = null;
  for (const ligne of lignes) {
    if (!aUnRendezVous(ligne, now)) continue;
    const registre = classerVerification(ligne, now);
    if (
      registre !== "enRetard" &&
      registre !== "proche" &&
      registre !== "lointain"
    ) {
      continue;
    }
    if (retenue === null || ligne.datePrevue.getTime() < retenue.date.getTime()) {
      retenue = { ligne, date: ligne.datePrevue, registre };
    }
  }
  return retenue;
}

/**
 * Les deux lectures d'échéances du tableau de bord, prises sur la MÊME liste
 * complète : les cinq plus proches (widget « Prochaines échéances ») et la
 * prochaine échéance connue (widget « Prochaine échéance »).
 *
 * UNE FONCTION ET NON DEUX APPELS DANS LA PAGE, parce que l'ordre compte et
 * qu'une page serveur n'a pas de test. Le widget « Prochaine échéance » lisait
 * les cinq déjà coupées et filtrait ensuite les lignes sans échéance connue :
 * cinq « à planifier » datées avant une vraie échéance au 15/10 remplissaient
 * les cinq places, le filtre les écartait toutes, et la carte annonçait « Sans
 * échéance connue pour l'instant » alors que l'échéance existait (relecture de
 * contrôle du lot C, 2026-09-14). La prochaine se choisit AVANT la coupe.
 *
 * Les cinq gardent les lignes sans échéance, APRÈS les échéances connues
 * (`cinqProchaines`) : elles restent une information pour le widget, sans plus
 * cacher les vraies échéances (2026-09-15).
 */
export function echeancesDuTableauDeBord<T extends VerificationDatee>(
  lignes: T[],
  now: Date,
): { prochainesVerifs: T[]; prochaineEcheance: T | null } {
  return {
    prochainesVerifs: cinqProchaines(lignes, now),
    prochaineEcheance: prochaineEcheanceConnue(lignes, now)?.ligne ?? null,
  };
}
