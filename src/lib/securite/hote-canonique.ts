// « www. » renvoie vers l'adresse publique (2026-11-24, bascule de rojer.fr
// sur Clever Cloud) : l'authentification n'a qu'une origine de confiance,
// `PUBLIC_APP_URL` (`auth/better-auth.ts`, `trustedOrigins`), et une page
// servie sur www y échouerait. Seul « www. » + l'hôte de l'adresse publique
// est renvoyé : les autres hôtes (adresse provisoire de Clever Cloud,
// 127.0.0.1 en développement) ne bougent pas. Appelée par `src/proxy.ts`,
// dont le matcher laisse de côté les fichiers statiques : ceux-là restent
// servis sur www, sans dommage.

/**
 * L'adresse où renvoyer une requête arrivée sur « www. » + l'hôte de
 * `adressePublique`, chemin et paramètres compris ; `null` pour tout autre
 * hôte, ou sans adresse publique lisible.
 */
export function redirectionWww(
  hote: string | null,
  chemin: string,
  recherche: string,
  adressePublique: string | null,
): string | null {
  if (!hote || !adressePublique) return null;
  let publique: URL;
  try {
    publique = new URL(adressePublique);
  } catch {
    return null;
  }
  const demande = hote.trim().toLowerCase().replace(/:\d+$/, "");
  if (demande !== `www.${publique.hostname.toLowerCase()}`) return null;
  // L'origine en tête : un chemin comme « //ailleurs.example » reste un
  // chemin de l'adresse publique, jamais un autre hôte.
  return `${publique.origin}${chemin}${recherche}`;
}

/**
 * L'hôte demandé est-il celui de l'adresse publique ? (2026-11-24, après la
 * bascule de rojer.fr.) Seul celui-là est ouvert aux moteurs : la même
 * application répond aussi sur son adresse technique de Clever Cloud
 * (`app-….cleverapps.io`), qui servirait sinon une seconde copie du site à
 * Google. Tout autre hôte reçoit `X-Robots-Tag: noindex` (`src/proxy.ts`) et
 * un `robots.txt` qui interdit tout (`app/robots.ts`). Sans hôte ou sans
 * adresse publique lisible : fermé.
 */
export function hoteOuvertAuxMoteurs(hote: string | null, adressePublique: string | null): boolean {
  if (!hote || !adressePublique) return false;
  let publique: URL;
  try {
    publique = new URL(adressePublique);
  } catch {
    return false;
  }
  return hote.trim().toLowerCase().replace(/:\d+$/, "") === publique.hostname.toLowerCase();
}
