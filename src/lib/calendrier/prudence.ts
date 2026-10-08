// « Retenue par prudence » : une ligne que seul le silence de la fiche retient
// (décision D1 (a) de la propriétaire, 2026-09-28).
//
// POURQUOI UN PRÉDICAT. La règle du non-renseigné veut que la ligne SOIT
// affichée — pas qu'elle soit comptée comme un manquement. Jusqu'ici, un bureau
// de trois personnes muet sur les matières de R. 4227-22 recevait l'exercice
// semestriel sans rapport : le compteur de retards le comptait, l'indice le
// pénalisait, et le dossier PDF imprimait « en retard » à côté de « À
// confirmer » — une affirmation qu'aucun texte ne fonde, dans un document
// remis à un tiers.
//
// LA SOURCE EST LA MARQUE, ET ELLE SEULE. Le prédicat se dérive des marques
// « à confirmer » du dossier (`marquesAConfirmerDuDossier`, calculées au rendu
// par le moteur) : pas de colonne, pas de liste. Une réponse donnée sur la
// fiche lève la marque, donc la prudence, sans que la ligne bouge.
//
// Module pur, sans dépendance au runtime.

import {
  estVerificationArchivee,
  estVerificationEnRetard,
  type VerificationDatee,
} from "@/lib/dates/retard";
import type { MarqueAConfirmer } from "@/lib/matching/marques";
import { estLignePourInformation } from "@/lib/referentiels/conformite/initiative";
import { statutAffiche, type StatutPeint } from "./etats";

/**
 * Ce que la prudence lit d'une ligne. `prescriptionId` est REQUIS, et non
 * facultatif : une lecture qui l'oublierait dans son `select` le rendrait
 * `undefined`, donc « sans prescription », et la ligne rythmée par une autorité
 * sortirait des retards en silence. Requis, l'oubli ne compile pas.
 */
export type LignePrudence = { obligationId: string; prescriptionId: string | null };

/** Vrai quand la ligne n'est retenue que par le silence de la fiche. */
export type RetenueParPrudence = (v: LignePrudence) => boolean;

/**
 * Le prédicat d'un dossier, depuis ses marques. Une obligation marquée l'est
 * pour toutes ses lignes : la marque tient à la typologie, pas au porteur
 * (`marquesParObligation`).
 */
export function retenueParPrudence(
  marques: ReadonlyMap<string, MarqueAConfirmer>,
): RetenueParPrudence {
  // UNE LIGNE RYTHMÉE PAR UNE PRESCRIPTION N'EST JAMAIS PRUDENTE (revue
  // indépendante du lot 3). Sa périodicité vient d'une autorité — assureur,
  // commission, inspection (ADR-035) —, pas du seul référentiel : le silence de
  // la fiche ne la rend pas incertaine, et elle reste en retard.
  return (v) =>
    v.prescriptionId === null &&
    (marques.get(v.obligationId)?.phrases.length ?? 0) > 0;
}

/**
 * Aucune ligne retenue par prudence — pour ce qui ne porte AUCUN dossier réel :
 * les sondes de périmètre (`perimetre/porteurs-comptes.ts`), les mesures
 * historiques (`scripts/`) et les tests qui n'éprouvent pas la prudence. Un
 * lecteur de dossier ne la passe jamais : il lit ses marques.
 */
export const AUCUNE_PRUDENCE: RetenueParPrudence = () => false;

/**
 * DEUX NOTIONS, À NE PAS CONFONDRE (contre-revue du lot 3, 2026-09-28).
 *
 *  - La ligne PORTE une marque « à confirmer » : le silence de la fiche est ce
 *    qui retient son obligation. La MENTION s'affiche alors partout, que la
 *    ligne soit prescrite ou non — une prescription (ADR-035) ne s'applique
 *    qu'à une obligation déjà applicable, et ne dit rien de ce silence.
 *  - La ligne est RETENUE PAR PRUDENCE : elle sort des retards et de l'indice.
 *    Seulement sans prescription — ce qu'une autorité a rythmé reste en retard.
 *
 * `porteSaMarque` dit la première, `retenueParSaMarque` la seconde.
 */
export function porteSaMarque(v: { aConfirmer?: readonly string[] }): boolean {
  return (v.aConfirmer?.length ?? 0) > 0;
}

/**
 * La même prudence, lue sur une ligne qui PORTE déjà ses phrases « à confirmer »
 * (`aConfirmer`, rempli depuis `marquesAConfirmerDuDossier` par la page qui la
 * sert) : les widgets du tableau de bord reçoivent la ligne, pas la carte des
 * marques. Même source, donc même verdict que `retenueParPrudence`.
 */
export function retenueParSaMarque(v: {
  aConfirmer?: readonly string[];
  prescriptionId: string | null;
}): boolean {
  return v.prescriptionId === null && porteSaMarque(v);
}

/**
 * LA LIGNE NE COMPTE PAS COMME UNE ÉCHÉANCE DE L'EXPLOITANT (C64, 2026-10-08) :
 * retenue par prudence, OU « pour information » — la visite de la commission
 * de sécurité, à l'initiative de l'administration (`conformite/initiative.ts`).
 * Pour les widgets, qui reçoivent la ligne et non la carte des marques.
 * `obligationId` est requis : un widget qui ne le projetterait pas ne
 * compilerait pas, au lieu de compter la visite en retard en silence.
 */
export function horsDesComptesDeLExploitant(v: {
  aConfirmer?: readonly string[];
  prescriptionId: string | null;
  obligationId: string;
}): boolean {
  return estLignePourInformation(v) || retenueParSaMarque(v);
}

/**
 * Le retard qui COMPTE : ce que lisent les compteurs, l'indice, les widgets et
 * les documents. Une ligne archivée ne compte déjà pas
 * (`estVerificationEnRetard`) ; une ligne retenue par prudence non plus.
 */
export function estEnRetardQuiCompte(
  v: VerificationDatee & LignePrudence,
  now: Date,
  prudence: RetenueParPrudence,
): boolean {
  // C64 : une ligne « pour information » n'est jamais un retard qui compte.
  return estVerificationEnRetard(v, now) && !prudence(v) && !estLignePourInformation(v);
}

/**
 * Une ligne ouverte retenue par prudence : ce que `repartirVerifications` sort
 * des quatre ensembles. Une ligne archivée n'est retenue par rien — elle garde
 * sa place de preuve dans `realisees12m`.
 */
export function estRetenueParPrudence(
  v: VerificationDatee & LignePrudence,
  prudence: RetenueParPrudence,
): boolean {
  return !estVerificationArchivee(v) && prudence(v);
}

/**
 * Le statut à peindre, prudence comprise : « à confirmer » là où la date seule
 * dirait « en retard ». Les autres états ne changent pas — une ligne à venir
 * reste planifiée, une ligne faite garde son résultat.
 */
export function statutAffichePrudent(
  v: VerificationDatee & LignePrudence,
  now: Date,
  prudence: RetenueParPrudence,
): StatutPeint | undefined {
  // « Pour information » (C64) n'a rien à faire ici : `statutAffiche` le peint
  // déjà, par le classement (`classerVerification` → `pourInformation`).
  const s = statutAffiche(v, now);
  return s === "en_retard" && prudence(v) ? "a_confirmer" : s;
}

/**
 * Un statut déjà peint, prudence comprise : pour les surfaces qui peignent une
 * LECTURE (`statutDeLaLecture`) plutôt qu'une ligne.
 */
export function statutPeintPrudent(
  statut: StatutPeint,
  v: LignePrudence,
  prudence: RetenueParPrudence,
): StatutPeint {
  return statut === "en_retard" && prudence(v) ? "a_confirmer" : statut;
}
