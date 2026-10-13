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

/**
 * Les routes qui servent un fichier déposé (`storage/servir.ts`), en syntaxe
 * `source` de Next.
 *
 * Pourquoi la politique des fichiers vit ICI et pas seulement dans la route
 * (ASVS V3.2.1, audit du 2026-10-13) : Next pose les en-têtes de
 * `next.config.ts` avant que la route réponde, et n'ajoute ceux de la route
 * que s'ils sont absents (`server/send-response.js`). La CSP `sandbox` posée
 * par `servirFichier` était donc écrasée par la `frame-ancestors 'none'` de la
 * règle `/:path*`, et n'avait jamais atteint un navigateur.
 *
 * Choix : une seconde règle, plus bas que `/:path*`, qui porte la politique
 * FUSIONNÉE (la dernière règle qui correspond l'emporte). Écartée : exclure
 * ces chemins de la règle globale et laisser la route poser sa CSP — un 401,
 * un 404 ou une erreur rendus avant `servirFichier` sortiraient alors sans
 * aucune CSP, `frame-ancestors` compris. Ici, tout ce que sert le chemin
 * reçoit les deux directives, quel que soit le chemin de code.
 *
 * Une route ajoutée plus tard qui appelle `servirFichier` sans figurer ici
 * fait tomber `entetes-servis.test.ts` : la liste n'est pas tenue à la main
 * sans garde.
 */
export const SOURCES_FICHIERS_DEPOSES = [
  "/api/rapports/:id/fichier",
  "/api/analyses-legionelles/:id/rapport",
  "/api/prestataires/:id/pieces/:piece",
  "/api/prestataires/:id/pieces-precedentes/:pieceId",
] as const;

/** La CSP d'un fichier déposé : n'exécute rien dans notre origine, ne s'encadre pas. */
export const CSP_FICHIER_DEPOSE = "sandbox; frame-ancestors 'none'";

type RegleEntetes = { source: string; headers: Entete[] };

/** Ce que `next.config.ts` rend dans `headers()` — l'ordre compte. */
export function reglesEntetes(options: {
  supabaseUrl: string | undefined;
  developpement: boolean;
}): RegleEntetes[] {
  return [
    { source: "/:path*", headers: entetesSecurite(options) },
    ...SOURCES_FICHIERS_DEPOSES.map((source) => ({
      source,
      headers: [{ key: "Content-Security-Policy", value: CSP_FICHIER_DEPOSE }],
    })),
  ];
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
