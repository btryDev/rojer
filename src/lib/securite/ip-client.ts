// L'adresse IP du client (2026-10-14). SEUL lecteur de l'IP dans l'app, et il
// sert à deux usages dont le second est une preuve :
//  - la limitation de débit, par `ipPourLimite` (`auth/actions.ts`,
//    `signatures/verification-publique.ts`) — l'adresse réduite à son réseau
//    (voir plus bas) ; le MCP lit l'adresse complète (`mcp/http.ts`, motif
//    sur place) : `null` → la limite par IP ne s'applique pas, celle par
//    compte si ;
//  - la PREUVE de signature, par `ipClient` (`signatures/actions.ts`, ASVS
//    B17, depuis le 2026-10-30) — l'adresse complète : `null` → la signature
//    est enregistrée sans IP. Une IP absente vaut mieux qu'une IP que le
//    client a choisie, ce que lisait l'ancienne première entrée. Changer la
//    RÈGLE DE LECTURE ci-dessous (quelle entrée de l'en-tête) change ce que
//    prouve une signature : à décider pour les deux usages ensemble. Changer
//    le regroupement par réseau ne touche que les limites.
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
//
// LIMITES PAR RÉSEAU (audit de sécurité du 2026-11-10) : une IPv6 ne désigne
// pas une machine mais une adresse parmi les 2^64 d'un /64, le bloc qu'un
// fournisseur attribue d'ordinaire à UN client. Compter par adresse complète
// donnait un compteur neuf à chaque requête. Les limites lisent donc
// `ipPourLimite` : l'IPv4 telle quelle, l'IPv6 réduite à son /64 (écrite d'une
// seule façon, quelle que soit la forme reçue), l'IPv4 écrite en IPv6
// (`::ffff:a.b.c.d`) ramenée à l'IPv4. Les adresses dont les 64 premiers bits
// sont nuls (`::1`, `::a.b.c.d`) ne sont pas regroupées : elles tomberaient
// toutes dans le même compteur. La PREUVE de signature garde l'adresse
// complète (`ipClient`).
//
// Le /64 est le découpage d'usage (celui de Better Auth et des grands
// fournisseurs), pas une garantie : un client à qui l'on délègue un /56 ou un
// /48 dispose encore de 256 ou 65 536 compteurs — bien moins que 2^64.

import { isIP } from "node:net";

type LecteurEntetes = { get(nom: string): string | null };

export function ipClient(entetes: LecteurEntetes): string | null {
  const xff = entetes.get("x-forwarded-for");
  if (!xff) return null;
  const derniere = xff.split(",").at(-1)?.trim() ?? "";
  return isIP(derniere) ? derniere : null;
}

/** Les huit groupes de 16 bits d'une IPv6 valide (zone et IPv4 finale comprises). */
function groupesIpv6(ip: string): number[] {
  let s = ip.split("%")[0].toLowerCase();
  const ipv4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (ipv4) {
    const [a, b, c, d] = ipv4[1].split(".").map(Number);
    s = `${s.slice(0, -ipv4[1].length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [tete, queue] = s.split("::");
  const debut = tete ? tete.split(":") : [];
  const fin = queue === undefined ? [] : queue ? queue.split(":") : [];
  const zeros = queue === undefined ? 0 : 8 - debut.length - fin.length;
  return [...debut, ...Array<string>(zeros).fill("0"), ...fin].map((g) => parseInt(g, 16));
}

/**
 * La clé réseau d'une adresse, pour les limites de débit : l'IPv4 telle
 * quelle ; l'IPv4 écrite en IPv6 (`::ffff:a.b.c.d`) ramenée à l'IPv4 ; l'IPv6
 * réduite à son /64, sous une seule écriture.
 */
export function reseauPourLimite(ip: string): string {
  if (isIP(ip) === 4) return ip;
  const g = groupesIpv6(ip);
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    return `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
  }
  // 64 premiers bits nuls (`::1`, `::a.b.c.d`) : pas de réseau à regrouper.
  if (g.slice(0, 4).every((x) => x === 0)) return ip.split("%")[0].toLowerCase();
  return `${g.slice(0, 4).map((x) => x.toString(16)).join(":")}::/64`;
}

/** L'adresse du client sous sa clé réseau, pour les limites de débit ; `null` sans en-tête exploitable. */
export function ipPourLimite(entetes: LecteurEntetes): string | null {
  const ip = ipClient(entetes);
  return ip === null ? null : reseauPourLimite(ip);
}
