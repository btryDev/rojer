import "server-only";
// Le client des lectures MCP du processus web : le client borné au compte
// (ADR-051) ET, depuis le 2026-11-09, à l'établissement configuré (portée
// d'un établissement, `clientDuProprietaire`).
//   - Clé : le compte du propriétaire de l'établissement configuré, et cet
//     établissement.
//   - ~~Porteur OAuth : le compte de son jeton vérifié (`scope.userId`)~~
//     [2026-10-31, cc : pas de connecteur OAuth sur cc (ADR-052), la branche
//     est retirée ; elle reviendra avec un connecteur OAuth de Better Auth.]
// Le client MCP n'en désigne aucun : aucun schéma d'entrée ne porte
// d'identifiant. Le serveur stdio construit le sien au démarrage
// (`sessionStdio`, `auth/compte-hors-session.ts`) et ne passe pas par ici.
//
// LA BORNE DE COMPTE S'AJOUTE À LA PORTÉE D'ÉTABLISSEMENT, ELLE NE LA
// REMPLACE PAS (seconde lecture du 2026-10-31) : chaque lecture de
// `./queries.ts` garde son `where: { etablissementId }` — en seconde ceinture
// depuis que le client pose lui-même l'établissement (2026-11-09).

import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import type { ScopeMcp } from "./tools";

/** Le client borné de la session ; `null` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function clientMcp(scope: ScopeMcp) {
  return clientDuProprietaire(scope.etablissementId);
}
