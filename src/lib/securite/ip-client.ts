// L'adresse IP du client (2026-10-14). SEUL lecteur de l'IP dans l'app, et il
// sert à deux usages dont le second est une preuve :
//  - la limitation de débit (`auth/actions.ts`, `mcp/http.ts`,
//    `signatures/verification-publique.ts`) : `null` → la limite par IP ne
//    s'applique pas, celle par compte si ;
//  - la PREUVE de signature (`signatures/actions.ts`, ASVS B17, depuis le
//    2026-10-30) : `null` → la signature est enregistrée sans IP. Une IP
//    absente vaut mieux qu'une IP que le client a choisie, ce que lisait
//    l'ancienne première entrée. Changer la règle ci-dessous change ce que
//    prouve une signature : à décider pour les deux usages ensemble.
//
// RÈGLE : la DERNIÈRE entrée de `X-Forwarded-For`, celle qu'a écrite le
// dernier proxy devant l'application. Les entrées de gauche viennent de ce que
// le client a envoyé lui-même : les lire laisserait un attaquant changer
// d'« adresse » à chaque requête et contourner la limite.
//
// - **Vercel** écrase `X-Forwarded-For` avec l'adresse du client, « to prevent
//   IP spoofing » (documentation Vercel, en-têtes de requête) : une seule
//   entrée, la dernière est la bonne.
// - **Clever Cloud** : le répartiteur « adds this header to each request », et
//   « the first address in this list is your end user's original IP address »
//   (FAQ Clever Cloud). S'il AJOUTE à une valeur reçue du client, seule la
//   dernière entrée est sûre ; s'il remplace, il n'y en a qu'une. Dans les deux
//   cas la dernière est la bonne — À VÉRIFIER au premier déploiement CC en
//   envoyant un `X-Forwarded-For` forgé et en lisant ce que reçoit l'app. Un
//   CDN placé devant ajouterait une entrée : il faudrait alors lire l'avant-
//   dernière, et ce module le dire.
//
// - **Next lui-même** (`next start`, standalone) ne pose `X-Forwarded-For`
//   que s'il est ABSENT (`??=` dans `server/base-server.js`, Next 16.3.8) : il
//   n'ajoute pas l'adresse du répartiteur à droite, la règle tient derrière.
//
// Sans en-tête exploitable (développement local, appel direct), `null` : la
// limite par IP ne s'applique pas, celle par compte si.

import { isIP } from "node:net";

type LecteurEntetes = { get(nom: string): string | null };

export function ipClient(entetes: LecteurEntetes): string | null {
  const xff = entetes.get("x-forwarded-for");
  if (!xff) return null;
  const derniere = xff.split(",").at(-1)?.trim() ?? "";
  return isIP(derniere) ? derniere : null;
}
