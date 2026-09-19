/**
 * En-têtes de sécurité HTTP, posés sur toutes les réponses par `next.config.ts`.
 *
 * Aucune page n'a à être encadrée : le dépôt ne contient aucun `<iframe>`, le
 * registre public d'accessibilité s'ouvre par lien ou QR code et n'offre
 * aucun code d'intégration, et les pages `/verifier`, `/signe`, `/acces` sont
 * des pages de premier niveau. L'interdiction d'encadrement vaut donc partout,
 * sans exception — vérifié le 2026-09-19.
 *
 * La CSP complète est en **Report-Only**. Next injecte des scripts en ligne
 * (`self.__next_f.push`) qu'on ne peut autoriser sans `'unsafe-inline'` qu'au
 * prix de nonces, donc d'un rendu dynamique partout ; et la page de
 * réinitialisation du mot de passe appelle Supabase depuis le navigateur, ce
 * qu'un `connect-src` mal renseigné couperait sans bruit. Aucun navigateur n'a
 * été lancé contre cette politique : elle ne bloque rien, elle signale ses
 * violations dans la console de qui ouvre les outils de développement (aucun
 * point de collecte n'est déclaré). La passer en bloquante se fera après
 * l'avoir regardée sur la production.
 *
 * Seule `frame-ancestors 'none'` est appliquée pour de bon, dans un en-tête
 * CSP à elle seule : elle ne peut rien casser, puisque rien n'encadre l'app.
 */

type Entete = { key: string; value: string };

/** Origine Supabase appelée depuis le navigateur (connect-src). */
function origineSupabase(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function politiqueContenu(options: {
  supabaseUrl: string | undefined;
  developpement: boolean;
}): string {
  const supabase = origineSupabase(options.supabaseUrl);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' : React en développement seulement (piles d'appel).
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(options.developpement ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    // next/font/google auto-héberge les polices : rien ne part chez Google.
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(supabase ? [supabase] : []),
      ...(options.developpement ? ["ws:"] : []),
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([nom, valeurs]) => `${nom} ${valeurs.join(" ")}`)
    .join("; ");
}

export function entetesSecurite(options: {
  supabaseUrl: string | undefined;
  developpement: boolean;
}): Entete[] {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    {
      key: "Content-Security-Policy-Report-Only",
      value: politiqueContenu(options),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Sans includeSubDomains : il engagerait tous les sous-domaines du nom
    // servi, dont certains ne sont pas chez Vercel (le DNS de rojer.fr reste
    // chez OVH). On s'en tient à l'hôte ; pas de preload non plus.
    { key: "Strict-Transport-Security", value: "max-age=63072000" },
    // clipboard-write reste permis à l'app : trois écrans copient un lien ou
    // un texte (accessibilité, connexion MCP, information des salariés).
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "browsing-topics=()",
        "clipboard-write=(self)",
      ].join(", "),
    },
  ];
}
