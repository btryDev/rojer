/**
 * Le NIVEAU AUDIT (ADR-042, décision de la propriétaire du 2026-10-08).
 *
 * Une obligation légale que Rojer garde au référentiel — avec sa source, ses
 * notes, sa lecture — mais qu'il ne sert pas au quotidien. Le préventeur, sur
 * les chiffons imprégnés (p. 35 du référentiel annoté, « à supprimer ») : il
 * « ne veut pas qu'on tombe dans l'audit ». La propriétaire : « certes c'est
 * une obligation mais Rojer est un outil de gestion au quotidien […] on garde
 * dans le référentiel mais avec une mention audit et qu'il ne soit plus actif
 * dans l'app ». La condition posée et acceptée : l'outil ne ment pas — une
 * obligation légale sortie du quotidien reste VISIBLE, sur la page « Ce que
 * Rojer ne couvre pas ».
 *
 * CE QUE LE MARQUEUR FAIT, ET OÙ. Une seule porte : le moteur de matching
 * (`evaluerObligation`) ne rend jamais une obligation audit applicable. Tout
 * ce qui en descend — calendrier, « Ce qui doit être en place », « Quand ça
 * arrive », indice, tableau de bord, MCP, registre, dossier — ne la voit donc
 * jamais. La seconde porte est celle des titres salarié, qui ne passent pas
 * par le matching (ADR-023) : `genererVerificationsDepuisTitres` et le
 * catalogue de l'écran Équipe lisent la même fonction.
 *
 * Module feuille, sans le référentiel : il ne lit que le champ.
 */

import type { Obligation } from "./types";

/** Le seul niveau qu'une obligation peut déclarer. Absent = servi. */
export type NiveauObligation = "audit";

/**
 * L'obligation est-elle au niveau audit — au référentiel, hors du quotidien ?
 *
 * LA lecture du champ `niveau`. Aucune surface ne doit lire `o.niveau`
 * elle-même : le jour où un second niveau apparaîtrait, une comparaison
 * recopiée dirait faux sans que rien ne casse.
 */
export function estNiveauAudit(o: Pick<Obligation, "niveau">): boolean {
  return o.niveau === "audit";
}

/** La mention courte, partout où une ligne audit est nommée. */
export const MENTION_NIVEAU_AUDIT = "Audit";

/** La phrase qui dit ce que la mention veut dire, sans qualifier personne. */
export const EXPLICATION_NIVEAU_AUDIT =
  "Obligation légale tenue au référentiel au niveau audit : Rojer ne la suit pas au quotidien — ni calendrier, ni rappel à l'écran. Elle reste due si le texte vous concerne.";
