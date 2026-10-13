/**
 * Ce que la carte d'un point de relevé a le droit d'annoncer sur sa dernière
 * mesure.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * La pastille lisait un seul champ — `conforme`, le côté du seuil où tombait le
 * dernier relevé — et en tirait « Dans la plage ». Elle ne regardait jamais sa
 * DATE. Relevé au contrôle visuel du 2026-10-13 : un relevé vieux de 70 jours
 * s'affichait en vert. Une mesure de juillet ne dit rien de l'eau d'octobre ;
 * l'afficher comme un état présent, c'est rassurer sur un fait que personne
 * n'a constaté. Le même défaut que `batiments/etat-charge.ts` (une zone vide
 * annoncée « À jour »), et le même remède.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUATRE ÉTATS FERMÉS, ÉVALUÉS DANS CET ORDRE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   - `sansReleve` — aucun relevé : rien à dire, et on le dit.
 *   - `ancien`     — le dernier relevé a plus d'un mois. On dit un FAIT, son
 *                    âge ; ni vert, ni « en retard », ni « non conforme ».
 *   - `dansLaPlage` / `horsPlage` — un relevé de moins d'un mois, lu contre le
 *                    seuil du point.
 *
 * L'ancienneté est évaluée AVANT le seuil : il n'y a pas de chemin qui mène au
 * vert avec un relevé périmé, quelle que soit sa valeur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UN MOIS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * C'est le rythme du texte : l'annexe 2 de l'arrêté du 1er février 2010 fixe la
 * température de l'eau à « 1 fois par mois » aux points d'usage représentatifs
 * des établissements autres que de santé (corpus
 * `arrete-2010-02-01-legionelles.ts`). Un relevé de moins d'un mois est donc
 * dans le rythme écrit, et le griser plus tôt suggérerait un manquement que le
 * droit ne fait pas — décision du 2026-10-13. Le tableau de bord compte, lui,
 * sur 7 jours (`SEUIL_RELEVE_CARNET_JOURS`) : écart connu, signalé, pas tranché
 * ici.
 */

import { ajouterMois, joursCivilsEntre } from "@/lib/dates";
import { estEnRetard } from "@/lib/dates/retard";

/** Le rythme écrit du relevé de température : mensuel (arrêté du 1er février 2010, annexe 2). */
export const MOIS_RELEVE_TEMPERATURE = 1;

export type EtatReleve =
  | { readonly nature: "sansReleve" }
  | { readonly nature: "ancien"; readonly joursDepuis: number }
  | { readonly nature: "dansLaPlage" }
  | { readonly nature: "horsPlage" };

export function etatDernierReleve(
  dernier: { dateReleve: Date; conforme: boolean } | null,
  now: Date,
): EtatReleve {
  if (!dernier) return { nature: "sansReleve" };
  // Périmé quand la date qui suit d'un mois le relevé est passée : un relevé
  // du 13 septembre est encore dans le rythme le 13 octobre, plus le 14.
  if (estEnRetard(ajouterMois(dernier.dateReleve, MOIS_RELEVE_TEMPERATURE), now)) {
    return {
      nature: "ancien",
      joursDepuis: joursCivilsEntre(dernier.dateReleve, now),
    };
  }
  return { nature: dernier.conforme ? "dansLaPlage" : "horsPlage" };
}

/** Le libellé d'un relevé ancien : son âge, rien d'autre. */
export function libelleReleveAncien(joursDepuis: number): string {
  return `Dernier relevé il y a ${joursDepuis} jours`;
}
